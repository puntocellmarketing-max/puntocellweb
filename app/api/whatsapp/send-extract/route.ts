// app/api/whatsapp/send-extract/route.ts
import { NextResponse } from "next/server";
import { generateExtractoPdf } from "@/lib/extractos/generateExtractoPdf";

export const runtime = "nodejs";

function normalizePhone(raw: string): string {
  let s = String(raw ?? "").trim();

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

    const codCliente = Number(body?.codCliente);
    const telefono = normalizePhone(body?.telefono);

    if (!Number.isFinite(codCliente) || codCliente <= 0) {
      return NextResponse.json(
        { ok: false, error: "codCliente inválido." },
        { status: 400 }
      );
    }

    if (!telefono || telefono.length < 8) {
      return NextResponse.json(
        { ok: false, error: "Teléfono inválido." },
        { status: 400 }
      );
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        { ok: false, error: "Faltan variables WHATSAPP_TOKEN o WHATSAPP_PHONE_NUMBER_ID." },
        { status: 500 }
      );
    }

// 1) Generar PDF
const { pdf, fileName, data } = await generateExtractoPdf(codCliente);

// 2) Convertir a Buffer
const pdfBuffer = Buffer.from(pdf);

// 3) Subir media a Meta
const form = new FormData();
form.append("messaging_product", "whatsapp");

const blob = new Blob([pdfBuffer], { type: "application/pdf" });
form.append("file", blob, fileName);

const uploadRes = await fetch(
  `https://graph.facebook.com/v23.0/${phoneNumberId}/media`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  }
);
    const uploadJson = await uploadRes.json();

    if (!uploadRes.ok || !uploadJson?.id) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo subir el PDF a Meta.",
          detail: uploadJson,
        },
        { status: 500 }
      );
    }

    const mediaId = uploadJson.id;

    // 3) Enviar documento
    const payload = {
      messaging_product: "whatsapp",
      to: telefono,
      type: "document",
      document: {
        id: mediaId,
        filename: fileName,
      },
    };

    const sendRes = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const sendJson = await sendRes.json();

    if (!sendRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: "No se pudo enviar el extracto por WhatsApp.",
          detail: sendJson,
        },
        { status: 500 }
      );
    }

    const wamid = sendJson?.messages?.[0]?.id ?? null;

    // Aquí luego se integra guardado en BD:
    // - conversaciones
    // - mensajes
    // - crm_envios / cola si corresponde

    return NextResponse.json({
      ok: true,
      codCliente,
      cliente: data.cliente,
      telefono,
      fileName,
      mediaId,
      wamid,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "Error interno al enviar extracto.",
      },
      { status: 500 }
    );
  }
}