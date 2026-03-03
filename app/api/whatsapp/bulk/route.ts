import { NextResponse } from "next/server";
import { parse } from "csv-parse/sync";

export const runtime = "nodejs";

type Row = { phone: string; cliente: string; saldo: string; raw?: any };

function normalizePhone(raw: string): string {
  let s = String(raw ?? "").trim();
  s = s.replace(/[^\d+]/g, ""); // deja + y dígitos
  s = s.replace(/^\+/, "");
  s = s.replace(/[^\d]/g, "");

  // Heurística PY:
  // - si viene 09xxxxxxxx (10 dígitos) => quitar 0 y prefijar 595
  // - si viene 9xxxxxxxx (9 dígitos) => prefijar 595
  // - si ya viene 595xxxxxxxxx => OK
  if (s.length === 10 && s.startsWith("0")) s = s.slice(1); // 09xxxxxxxx -> 9xxxxxxxx
  if (s.length === 9 && s.startsWith("9")) s = "595" + s;

  return s;
}

function isValidE164DigitsOnly(s: string): boolean {
  // WhatsApp Cloud API acepta E.164 sin + en "to"
  // Longitud típica 8..15; pero para PY esperamos 595 + 8..9 dígitos (11..12)
  if (!/^\d{8,15}$/.test(s)) return false;
  return true;
}

async function sendTemplate(to: string, cliente: string, saldo: string) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  const lang = process.env.WHATSAPP_TEMPLATE_LANG || "es";

  if (!token || !phoneNumberId || !templateName) {
    throw new Error("Faltan variables en .env.local (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE_NAME)");
  }

  const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: lang },
      components: [
        {
          type: "body",
          // ORDEN: 1=cliente, 2=saldo  (según tu plantilla)
          parameters: [
            { type: "text", text: String(cliente ?? "").trim() },
            { type: "text", text: String(saldo ?? "").trim() },
          ],
        },
      ],
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || "Error desconocido";
    const details = data?.error?.error_data?.details;
    throw new Error(details ? `${msg} | ${details}` : msg);
  }

  return data?.messages?.[0]?.id ?? null;
}

function pickDelimiter(csvText: string): "," | ";" {
  // si el header contiene ;, usamos ;
  const firstLine = csvText.split(/\r?\n/)[0] ?? "";
  return firstLine.includes(";") ? ";" : ",";
}

function normalizeKeys(obj: any) {
  const out: any = {};
  for (const k of Object.keys(obj ?? {})) {
    out[String(k).trim().toLowerCase()] = obj[k];
  }
  return out;
}

/**
 * Streaming NDJSON:
 * - primer evento: {"type":"start","total":N,"preview":boolean}
 * - por cada fila: {"type":"item","i":1,"ok":true/false,...}
 * - final: {"type":"done","okCount":X,"failCount":Y}
 */
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    const send = String(form.get("send") ?? "false").toLowerCase() === "true";
    const limit = Math.max(1, Math.min(200, Number(form.get("limit") ?? 5)));

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "No se recibió el archivo (field: file)" }, { status: 400 });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const csvText = buf.toString("utf-8");
    const delim = pickDelimiter(csvText);

    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: delim, // csv-parse NO acepta regex en delimiter
    }) as any[];

    const rows: Row[] = records.map((r: any) => {
      const n = normalizeKeys(r);

      const phone = normalizePhone(
        String(n.phone ?? n.celular ?? n.telefono ?? n.numero ?? n.whatsapp ?? "")
      );

      const cliente = String(n.cliente ?? n.nombre ?? n.razonsocial ?? "").trim();
      const saldo = String(n.saldo ?? n.monto ?? n.deuda ?? "").trim();

      return { phone, cliente, saldo, raw: r };
    });

    const prepared = rows
      .filter((r) => r.phone && r.cliente && r.saldo)
      .map((r) => ({
        ...r,
        phone: normalizePhone(r.phone),
      }))
      .filter((r) => isValidE164DigitsOnly(r.phone))
      .slice(0, limit);

    if (!prepared.length) {
      return NextResponse.json(
        { ok: false, error: "No hay filas válidas. CSV debe tener columnas tipo: phone/telefono/celular, cliente/nombre, saldo/monto (y números válidos)." },
        { status: 400 }
      );
    }

    // Modo preview: devolvemos JSON normal (sin stream)
    if (!send) {
      return NextResponse.json({
        ok: true,
        mode: "preview",
        delimiter: delim,
        count_total: rows.length,
        count_preview: prepared.length,
        preview: prepared,
      });
    }

    // Envío real: streaming NDJSON
    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const push = (obj: any) => controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));

        push({ type: "start", ok: true, mode: "send", delimiter: delim, total: prepared.length });

        let okCount = 0;
        let failCount = 0;

        for (let idx = 0; idx < prepared.length; idx++) {
          const r = prepared[idx];
          const i = idx + 1;

          // Validación extra “antes de pegarle a Meta”
          if (!isValidE164DigitsOnly(r.phone)) {
            failCount++;
            push({ type: "item", i, phone: r.phone, ok: false, error: "Número inválido (E.164 sin +).", cliente: r.cliente });
            continue;
          }

          try {
            const messageId = await sendTemplate(r.phone, r.cliente, r.saldo);
            okCount++;
            push({ type: "item", i, phone: r.phone, ok: true, messageId, cliente: r.cliente });
          } catch (e: any) {
            failCount++;
            push({ type: "item", i, phone: r.phone, ok: false, error: e?.message || String(e), cliente: r.cliente });
          }

          push({ type: "progress", processed: i, okCount, failCount, total: prepared.length });
        }

        push({ type: "done", ok: true, processed: prepared.length, okCount, failCount });
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}