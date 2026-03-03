import { NextResponse } from "next/server";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";

/**
 * Extrae texto “humano” de distintos tipos de mensaje
 */
function pickText(msg: any): string | null {
  if (!msg) return null;

  if (msg.type === "text") return msg.text?.body ?? null;
  if (msg.type === "button") return msg.button?.text ?? null;

  // interactive -> puede ser list_reply o button_reply
  if (msg.type === "interactive") {
    const i = msg.interactive;
    const t = i?.type;
    if (t === "button_reply") return i?.button_reply?.title ?? null;
    if (t === "list_reply") return i?.list_reply?.title ?? null;
  }

  return null;
}

/**
 * Mapea tipo Meta -> enum tuyo
 */
function mapTipo(type: string): string {
  const t = String(type || "").toLowerCase();
  if (t === "text") return "texto";
  if (t === "button") return "boton";
  if (t === "interactive") return "lista";
  if (t === "image") return "imagen";
  if (t === "audio") return "audio";
  if (t === "document") return "documento";
  return "desconocido";
}

/**
 * GET: Validación webhook (Meta)
 * Debe devolver el challenge como texto plano.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  // Meta manda subscribe + verify_token + challenge
  if (mode === "subscribe" && token && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Para debug humano (cuando abrís en el navegador sin challenge)
  // devolvemos 403 para que Meta rechace cuando token no coincide.
  return new NextResponse("Forbidden", { status: 403 });
}

/**
 * POST: eventos (mensajes entrantes y statuses)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Lazy import: así GET nunca intenta levantar la DB
    const { pool } = await import("@/lib/db");

    let inboundCount = 0;
    let statusesCount = 0;

    const entries = Array.isArray(body?.entry) ? body.entry : [];

    for (const entry of entries) {
      const changes = Array.isArray(entry?.changes) ? entry.changes : [];
      for (const ch of changes) {
        const value = ch?.value || {};

        const messages: any[] = Array.isArray(value?.messages) ? value.messages : [];
        const statuses: any[] = Array.isArray(value?.statuses) ? value.statuses : [];

        // A) Inbound messages
        for (const m of messages) {
          inboundCount++;

          const telefono = String(m.from || "").trim();
          const wamid = String(m.id || "").trim();
          const type = String(m.type || "text").trim();
          const contenido = pickText(m) ?? JSON.stringify(m);

          await pool.query(
            `INSERT INTO mensajes_entrantes
              (telefono, id_mensaje_whatsapp, tipo, contenido, fecha_recibido)
             VALUES (?, ?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE
               contenido = VALUES(contenido),
               fecha_recibido = VALUES(fecha_recibido)`,
            [telefono, wamid || null, mapTipo(type), contenido]
          );

          // Upsert conversación
          await pool.query(
            `INSERT INTO conversaciones_whatsapp
              (telefono, estado, fecha_actualizacion)
             VALUES (?, 'RESPONDIO', NOW())
             ON DUPLICATE KEY UPDATE
               estado='RESPONDIO',
               fecha_actualizacion=NOW()`,
            [telefono]
          );
        }

        // B) Statuses
        for (const s of statuses) {
          statusesCount++;

          const status = String(s.status || "").toUpperCase(); // sent/delivered/read/failed
          const wamid = String(s.id || "").trim();
          if (!wamid) continue;

          let estado = "ENVIADO";
          if (status === "FAILED") estado = "ERROR";

          // Si no existe mensajes_salientes, ignoramos sin romper webhook
          try {
            await pool.query(
              `UPDATE mensajes_salientes
               SET estado = ?
               WHERE id_mensaje_whatsapp = ?`,
              [estado, wamid]
            );
          } catch {
            // ignore
          }
        }
      }
    }

    return NextResponse.json({ ok: true, inbound: inboundCount, statuses: statusesCount });
  } catch (e: any) {
    console.error("WEBHOOK ERROR:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error webhook" }, { status: 500 });
  }
}