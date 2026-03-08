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
  cliente: string | null;
  saldo: number | null;
};

function safeInt(value: unknown, fallback: number, min: number, max: number) {
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
  bodyParameters?: string[];
}) {
  const url = `https://graph.facebook.com/${params.apiVersion}/${params.phoneNumberId}/messages`;

  const payload: any = {
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

  if (params.bodyParameters?.length) {
    payload.template.components = [
      {
        type: "body",
        parameters: params.bodyParameters.map((value) => ({
          type: "text",
          text: String(value ?? ""),
        })),
      },
    ];
  }

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
    const limit = safeInt(body?.limit ?? 50, 50, 1, 500);

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
        ew.id_envio,
        ew.telefono,
        ew.plantilla,
        ew.idioma,
        ad.cliente,
        ad.saldo
      FROM envios_whatsapp ew
      LEFT JOIN crm_audiencia_detalle ad
        ON ad.id_detalle = ew.id_audiencia_detalle
      WHERE ew.id_campania = ?
        AND ew.estado = 'QUEUED'
      ORDER BY ew.id_envio ASC
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
    const details: Array<{
      idEnvio: number;
      telefono: string;
      status: "SENT" | "FAILED";
      messageId?: string | null;
      error?: string;
    }> = [];

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

        const nombreCliente = (row.cliente || "Cliente").trim();
        const primerNombre = nombreCliente.split(" ")[0] || "Cliente";
        const saldoTexto = Math.round(Number(row.saldo ?? 0)).toLocaleString("es-PY");

        const result = await sendTemplateMessage({
          token,
          phoneNumberId,
          apiVersion,
          to: row.telefono,
          templateName: row.plantilla,
          languageCode: row.idioma || "es",
          bodyParameters: [primerNombre, saldoTexto],
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
      } catch (err: unknown) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : "Error desconocido";

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
          [message, row.id_envio]
        );

        failCount++;
        details.push({
          idEnvio: row.id_envio,
          telefono: row.telefono,
          status: "FAILED",
          error: message,
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
  } catch (e: unknown) {
    try {
      if (conn) await conn.rollback();
    } catch {}

    const message =
      e instanceof Error && e.message ? e.message : "Error interno del servidor";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}