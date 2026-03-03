import { NextResponse } from "next/server";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  let s = String(raw ?? "").trim();

  // si llega en notación científica (ej 5,9598E+11)
  if (/e\+?/i.test(s)) {
    s = s.replace(",", ".");
    const n = Number(s);
    if (Number.isFinite(n)) s = String(Math.trunc(n));
  }

  return s
    .replace(/\s+/g, "")
    .replace(/^\+/, "")
    .replace(/[^\d]/g, "");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const to = normalizePhone(body?.to ?? body?.phone ?? "");
    const cliente = String(body?.cliente ?? "").trim();
    const saldo = String(body?.saldo ?? "").trim();

    if (!to || to.length < 8) {
      return NextResponse.json({ ok: false, error: "Número destino inválido (campo: to)" }, { status: 400 });
    }
    if (!cliente || !saldo) {
      return NextResponse.json({ ok: false, error: "Faltan datos: cliente/saldo" }, { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
    const lang = process.env.WHATSAPP_TEMPLATE_LANG || "es";

    if (!token || !phoneNumberId || !templateName) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables en .env.local (WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_TEMPLATE_NAME)" },
        { status: 500 }
      );
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
            parameters: [
              { type: "text", text: cliente },
              { type: "text", text: String(saldo) },
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

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || "Error desconocido";
      const details = data?.error?.error_data?.details;
      return NextResponse.json(
        { ok: false, error: details ? `${msg} | ${details}` : msg, raw: data },
        { status: 400 }
      );
    }

    return NextResponse.json({
      ok: true,
      to,
      messageId: data?.messages?.[0]?.id ?? null,
      raw: data,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}