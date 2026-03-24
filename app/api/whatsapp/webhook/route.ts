import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ConversationRow = RowDataPacket & {
  telefono: string;
};

function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const cleaned = String(phone).replace(/[^\d]/g, "");
  return cleaned || null;
}

async function insertEvento(
  conn: PoolConnection,
  tipoEvento: string,
  payload: unknown,
  idMensajeWhatsapp?: string | null,
  telefono?: string | null
) {
  await conn.execute(
    `
    INSERT INTO eventos_whatsapp (
      tipo_evento,
      id_mensaje_whatsapp,
      telefono,
      payload,
      fecha_creacion
    ) VALUES (?, ?, ?, ?, NOW())
    `,
    [
      tipoEvento,
      idMensajeWhatsapp ?? null,
      telefono ?? null,
      JSON.stringify(payload),
    ]
  );
}

async function upsertConversation(params: {
  conn: PoolConnection;
  telefono: string;
  codCliente?: number | null;
  ultimoMensaje: string | null;
  ultimoTipo: "IN" | "OUT";
  ultimoAt?: string | null;
  incrementarUnread?: boolean;
}) {
  const {
    conn,
    telefono,
    codCliente = null,
    ultimoMensaje,
    ultimoTipo,
    ultimoAt = null,
    incrementarUnread = false,
  } = params;

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
      ?, ?, ?, ?, COALESCE(?, NOW()), ?, 'NUEVO', NOW()
    )
    ON DUPLICATE KEY UPDATE
      cod_cliente = COALESCE(VALUES(cod_cliente), cod_cliente),
      ultimo_mensaje = VALUES(ultimo_mensaje),
      ultimo_tipo = VALUES(ultimo_tipo),
      ultimo_at = COALESCE(VALUES(ultimo_at), NOW()),
      unread_count = CASE
        WHEN ? = 1 THEN unread_count + 1
        ELSE unread_count
      END,
      updated_at = NOW()
    `,
    [
      telefono,
      codCliente,
      ultimoMensaje,
      ultimoTipo,
      ultimoAt,
      incrementarUnread ? 1 : 0,
      incrementarUnread ? 1 : 0,
    ]
  );
}

async function handleMessageStatus(
  conn: PoolConnection,
  statusItem: any,
  rawPayload: unknown
) {
  const idMensajeWhatsapp = String(statusItem?.id || "").trim();
  const estadoMeta = String(statusItem?.status || "").trim().toLowerCase();
  const recipientId = normalizePhone(statusItem?.recipient_id);

  if (!idMensajeWhatsapp) return;

  let newEstado: string | null = null;
  let dateFieldSql = "";
  let errorMensaje: string | null = null;

  if (estadoMeta === "sent") {
    newEstado = "SENT";
  } else if (estadoMeta === "delivered") {
    newEstado = "DELIVERED";
    dateFieldSql = "fecha_entregado = NOW(),";
  } else if (estadoMeta === "read") {
    newEstado = "READ";
    dateFieldSql = "fecha_leido = NOW(),";
  } else if (estadoMeta === "failed") {
    newEstado = "FAILED";
    dateFieldSql = "fecha_fallo = NOW(),";

    const firstError = statusItem?.errors?.[0];
    if (firstError) {
      const code = firstError?.code ? `(${firstError.code}) ` : "";
      const title = firstError?.title ? `${firstError.title} - ` : "";
      const message = firstError?.message || "Error desconocido";
      errorMensaje = `${code}${title}${message}`.trim();
    }
  }

  await insertEvento(
    conn,
    `status_${estadoMeta || "unknown"}`,
    rawPayload,
    idMensajeWhatsapp,
    recipientId
  );

  if (!newEstado) return;

  await conn.execute(
    `
    UPDATE envios_whatsapp
    SET
      estado = ?,
      ${dateFieldSql}
      error_mensaje = CASE
        WHEN ? IS NOT NULL THEN ?
        ELSE error_mensaje
      END
    WHERE id_mensaje_whatsapp = ?
    `,
    [newEstado, errorMensaje, errorMensaje, idMensajeWhatsapp]
  );

  if (recipientId) {
    await upsertConversation({
      conn,
      telefono: recipientId,
      ultimoMensaje:
        estadoMeta === "read"
          ? "Mensaje leído por el cliente."
          : estadoMeta === "delivered"
          ? "Mensaje entregado al cliente."
          : estadoMeta === "failed"
          ? "Error en entrega del mensaje."
          : "Mensaje saliente actualizado.",
      ultimoTipo: "OUT",
      incrementarUnread: false,
    });
  }
}

async function findCodClienteByPhone(
  conn: PoolConnection,
  telefono: string
): Promise<number | null> {
  const [rows] = await conn.query<RowDataPacket[]>(
    `
    SELECT cod_cliente
    FROM conversaciones
    WHERE telefono = ?
    LIMIT 1
    `,
    [telefono]
  );

  if (rows.length && rows[0].cod_cliente) {
    return Number(rows[0].cod_cliente);
  }

  const [syncRows] = await conn.query<RowDataPacket[]>(
    `
    SELECT cod_cliente
    FROM crm_clientes_sync
    WHERE telefono_normalizado = ?
    LIMIT 1
    `,
    [telefono]
  );

  if (syncRows.length && syncRows[0].cod_cliente) {
    return Number(syncRows[0].cod_cliente);
  }

  return null;
}

async function handleIncomingMessage(
  conn: PoolConnection,
  msg: any,
  rawPayload: unknown
) {
  const from = normalizePhone(msg?.from);
  if (!from) return;

  const wamid = msg?.id ? String(msg.id) : null;
  const tipo = String(msg?.type || "unknown").toLowerCase();

  const codCliente = await findCodClienteByPhone(conn, from);

  let contenido: string | null = null;
  let idOpcion: string | null = null;
  let tituloOpcion: string | null = null;

  let mediaId: string | null = null;
  let mimeType: string | null = null;
  let mediaSha256: string | null = null;

  if (tipo === "text") {
    contenido = msg?.text?.body ? String(msg.text.body) : null;
  } else if (tipo === "button") {
    contenido = msg?.button?.text ? String(msg.button.text) : "[Botón]";
    idOpcion = msg?.button?.payload ? String(msg.button.payload) : null;
    tituloOpcion = msg?.button?.text ? String(msg.button.text) : null;
  } else if (tipo === "interactive") {
    const interactiveType = String(msg?.interactive?.type || "").toLowerCase();

    if (interactiveType === "button_reply") {
      contenido = msg?.interactive?.button_reply?.title
        ? String(msg.interactive.button_reply.title)
        : "[Respuesta botón]";
      idOpcion = msg?.interactive?.button_reply?.id
        ? String(msg.interactive.button_reply.id)
        : null;
      tituloOpcion = msg?.interactive?.button_reply?.title
        ? String(msg.interactive.button_reply.title)
        : null;
    } else if (interactiveType === "list_reply") {
      contenido = msg?.interactive?.list_reply?.title
        ? String(msg.interactive.list_reply.title)
        : "[Respuesta lista]";
      idOpcion = msg?.interactive?.list_reply?.id
        ? String(msg.interactive.list_reply.id)
        : null;
      tituloOpcion = msg?.interactive?.list_reply?.title
        ? String(msg.interactive.list_reply.title)
        : null;
    } else {
      contenido = "[Interacción recibida]";
    }
  } else if (tipo === "audio") {
    contenido = "[Audio recibido]";
    mediaId = msg?.audio?.id ? String(msg.audio.id) : null;
    mimeType = msg?.audio?.mime_type ? String(msg.audio.mime_type) : null;
    mediaSha256 = msg?.audio?.sha256 ? String(msg.audio.sha256) : null;
  } else if (tipo === "image") {
    contenido = msg?.image?.caption
      ? String(msg.image.caption)
      : "[Imagen recibida]";
    mediaId = msg?.image?.id ? String(msg.image.id) : null;
    mimeType = msg?.image?.mime_type ? String(msg.image.mime_type) : null;
    mediaSha256 = msg?.image?.sha256 ? String(msg.image.sha256) : null;
  } else if (tipo === "video") {
    contenido = msg?.video?.caption
      ? String(msg.video.caption)
      : "[Video recibido]";
    mediaId = msg?.video?.id ? String(msg.video.id) : null;
    mimeType = msg?.video?.mime_type ? String(msg.video.mime_type) : null;
    mediaSha256 = msg?.video?.sha256 ? String(msg.video.sha256) : null;
  } else if (tipo === "document") {
    contenido = msg?.document?.filename
      ? `[Documento recibido] ${String(msg.document.filename)}`
      : "[Documento recibido]";
    mediaId = msg?.document?.id ? String(msg.document.id) : null;
    mimeType = msg?.document?.mime_type ? String(msg.document.mime_type) : null;
    mediaSha256 = msg?.document?.sha256 ? String(msg.document.sha256) : null;
  } else {
    contenido = `[Mensaje ${tipo} recibido]`;
  }

  await conn.execute(
    `
    INSERT INTO mensajes_entrantes (
      id_mensaje_whatsapp,
      telefono,
      contenido,
      tipo,
      id_opcion,
      titulo_opcion,
      media_id,
      mime_type,
      media_sha256,
      fecha_recibido
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      wamid,
      from,
      contenido,
      tipo,
      idOpcion,
      tituloOpcion,
      mediaId,
      mimeType,
      mediaSha256,
    ]
  );

  await insertEvento(
    conn,
    "incoming_message",
    rawPayload,
    wamid,
    from
  );

  await upsertConversation({
    conn,
    telefono: from,
    codCliente,
    ultimoMensaje: contenido,
    ultimoTipo: "IN",
    incrementarUnread: true,
  });
}

async function processWebhookPayload(payload: any) {
  const entries = Array.isArray(payload?.entry) ? payload.entry : [];
  if (!entries.length) return;

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];

      for (const change of changes) {
        const value = change?.value ?? {};

        const statuses = Array.isArray(value?.statuses) ? value.statuses : [];
        for (const statusItem of statuses) {
          await handleMessageStatus(conn, statusItem, payload);
        }

        const messages = Array.isArray(value?.messages) ? value.messages : [];
        for (const msg of messages) {
          await handleIncomingMessage(conn, msg, payload);
        }
      }
    }

    await conn.commit();
  } catch (error) {
    try {
      await conn.rollback();
    } catch {}
    throw error;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  const url = new URL(req.url);

  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge || "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { ok: false, error: "Verificación inválida." },
    { status: 403 }
  );
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();

    await processWebhookPayload(payload);

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Webhook WhatsApp error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Error procesando webhook." },
      { status: 500 }
    );
  }
}