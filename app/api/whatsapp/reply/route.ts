import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ReplyPayload = {
  telefono: string;
  mensaje: string;
  cod_cliente?: number | null;
};

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d]/g, "");
  return cleaned || null;
}

async function upsertConversation(params: {
  conn: PoolConnection;
  telefono: string;
  codCliente?: number | null;
  ultimoMensaje: string | null;
  ultimoTipo: "IN" | "OUT";
}) {
  const { conn, telefono, codCliente = null, ultimoMensaje, ultimoTipo } = params;

  await conn.execute(
    `
    INSERT INTO conversaciones (
      telefono,
      cod_cliente,
      ultimo_mensaje,
      ultimo_tipo,
      ultimo_at,
      unread_count,
      estado,
      updated_at
    ) VALUES (
      ?, ?, ?, ?, NOW(), 0, 'EN_GESTION', NOW()
    )
    ON DUPLICATE KEY UPDATE
      cod_cliente = COALESCE(VALUES(cod_cliente), cod_cliente),
      ultimo_mensaje = VALUES(ultimo_mensaje),
      ultimo_tipo = VALUES(ultimo_tipo),
      ultimo_at = NOW(),
      estado = 'EN_GESTION',
      updated_at = NOW()
    `,
    [telefono, codCliente, ultimoMensaje, ultimoTipo]
  );
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as ReplyPayload;

    const telefono = normalizePhone(body?.telefono);
    const mensaje = String(body?.mensaje || "").trim();
    const codCliente = body?.cod_cliente ?? null;

    if (!telefono || !mensaje) {
      return NextResponse.json(
        { ok: false, error: "Falta telefono o mensaje." },
        { status: 400 }
      );
    }

    const token =
      process.env.WHATSAPP_CLOUD_API_TOKEN ||
      process.env.WHATSAPP_TOKEN ||
      "";

    const phoneNumberId =
      process.env.WHATSAPP_PHONE_NUMBER_ID ||
      "";

    const apiVersion =
      process.env.WHATSAPP_API_VERSION ||
      "v22.0";

    if (!token || !phoneNumberId) {
      return NextResponse.json(
        {
          ok: false,
          error: "Faltan variables de entorno de WhatsApp (TOKEN o PHONE_NUMBER_ID).",
        },
        { status: 500 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [ins] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO envios_whatsapp (
        id_campania,
        id_audiencia,
        id_audiencia_detalle,
        id_importacion,
        id_staging,
        cod_cliente,
        telefono,
        mensaje,
        plantilla,
        idioma,
        estado,
        intentos,
        fecha_creacion
      ) VALUES (
        NULL, NULL, NULL, NULL, NULL,
        ?, ?, ?, NULL, 'es',
        'SENDING', 1, NOW()
      )
      `,
      [codCliente, telefono, mensaje]
    );

    const idEnvio = ins.insertId;

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const payload = {
      messaging_product: "whatsapp",
      to: telefono,
      type: "text",
      text: {
        body: mensaje,
      },
    };

    const r = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      const errorText =
        data?.error?.message ||
        data?.message ||
        JSON.stringify(data) ||
        "Meta error";

      await conn.execute(
        `
        UPDATE envios_whatsapp
        SET
          estado = 'FAILED',
          error_mensaje = ?,
          fecha_fallo = NOW()
        WHERE id_envio = ?
        `,
        [errorText, idEnvio]
      );

      await conn.commit();

      return NextResponse.json(
        { ok: false, error: "Meta error", details: data },
        { status: 500 }
      );
    }

    const wamid = data?.messages?.[0]?.id ?? null;

    await conn.execute(
      `
      UPDATE envios_whatsapp
      SET
        estado = 'SENT',
        id_mensaje_whatsapp = ?,
        error_mensaje = NULL,
        fecha_envio = NOW()
      WHERE id_envio = ?
      `,
      [wamid, idEnvio]
    );

    await upsertConversation({
      conn,
      telefono,
      codCliente,
      ultimoMensaje: mensaje,
      ultimoTipo: "OUT",
    });

    await conn.commit();

    return NextResponse.json({
      ok: true,
      id_envio: idEnvio,
      wamid,
    });
  } catch (error: any) {
    try {
      if (conn) await conn.rollback();
    } catch {}

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Error interno enviando respuesta.",
      },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}