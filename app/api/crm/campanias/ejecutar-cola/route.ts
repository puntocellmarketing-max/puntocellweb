import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ExecuteQueuePayload = {
  idCampania: number;
  limit?: number;
};

type QueueRow = RowDataPacket & {
  id_envio: number;
  telefono: string;
  plantilla: string;
  idioma: string | null;
};

function safeInt(value: any, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

async function sendTemplateMessage(params: {
  token: string;
  phoneNumberId: string;
  apiVersion: string;
  to: string;
  templateName: string;
  languageCode: string;
}) {
  const url = `https://graph.facebook.com/${params.apiVersion}/${params.phoneNumberId}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: params.to,
    type: "template",
    template: {
      name: params.templateName,
      language: {
        code: params.languageCode,
      },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message =
      data?.error?.message ||
      data?.message ||
      `Error HTTP ${res.status} enviando a WhatsApp`;
    throw new Error(message);
  }

  const messageId =
    data?.messages?.[0]?.id ||
    data?.messages?.[0]?.message_id ||
    null;

  return {
    raw: data,
    messageId,
  };
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
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
          error:
            "Faltan variables de entorno de WhatsApp Cloud API (TOKEN o PHONE_NUMBER_ID).",
        },
        { status: 500 }
      );
    }

    const body = (await req.json()) as ExecuteQueuePayload;

    const idCampania = Number(body?.idCampania ?? 0);
    const limit = safeInt(body?.limit ?? 5, 5, 1, 100);

    if (!Number.isFinite(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "idCampania inválido." },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [rows] = await conn.query<QueueRow[]>(
      `
      SELECT
        id_envio,
        telefono,
        plantilla,
        idioma
      FROM envios_whatsapp
      WHERE id_campania = ?
        AND estado = 'QUEUED'
      ORDER BY id_envio ASC
      LIMIT ?
      `,
      [idCampania, limit]
    );

    if (!rows.length) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: "No hay envíos en estado QUEUED para esta campaña.",
        },
        { status: 400 }
      );
    }

    let sentCount = 0;
    let failCount = 0;
    const details: any[] = [];

    for (const row of rows) {
      try {
        await conn.execute(
          `
          UPDATE envios_whatsapp
          SET estado = 'SENDING'
          WHERE id_envio = ?
          `,
          [row.id_envio]
        );

        const result = await sendTemplateMessage({
          token,
          phoneNumberId,
          apiVersion,
          to: row.telefono,
          templateName: row.plantilla,
          languageCode: row.idioma || "es",
        });

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
          [result.messageId, row.id_envio]
        );

        sentCount++;
        details.push({
          idEnvio: row.id_envio,
          telefono: row.telefono,
          status: "SENT",
          messageId: result.messageId,
        });
      } catch (err: any) {
        await conn.execute(
          `
          UPDATE envios_whatsapp
          SET
            estado = 'FAILED',
            error_mensaje = ?,
            fecha_fallo = NOW(),
            intentos = COALESCE(intentos, 0) + 1
          WHERE id_envio = ?
          `,
          [err?.message || "Error desconocido", row.id_envio]
        );

        failCount++;
        details.push({
          idEnvio: row.id_envio,
          telefono: row.telefono,
          status: "FAILED",
          error: err?.message || "Error desconocido",
        });
      }
    }

    await conn.execute(
      `
      UPDATE campanias
      SET
        estado = CASE
          WHEN ? > 0 THEN 'ENVIANDO'
          ELSE estado
        END,
        total_error = COALESCE(total_error, 0) + ?
      WHERE id_campania = ?
      `,
      [sentCount, failCount, idCampania]
    );

    await conn.commit();

    return NextResponse.json({
      ok: true,
      message: "Ejecución de cola completada.",
      resumen: {
        idCampania,
        procesados: rows.length,
        enviados: sentCount,
        fallidos: failCount,
      },
      details,
    });
  } catch (e: any) {
    try {
      if (conn) await conn.rollback();
    } catch {}

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}