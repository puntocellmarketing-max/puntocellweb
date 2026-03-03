import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "";

function pickText(msg: any): string | null {
  if (!msg) return null;
  if (msg.type === "text") return msg.text?.body ?? null;
  if (msg.type === "button") return msg.button?.text ?? null;
  if (msg.type === "interactive") {
    const i = msg.interactive;
    const t = i?.type;
    if (t === "button_reply") return i?.button_reply?.title ?? null;
    if (t === "list_reply") return i?.list_reply?.title ?? null;
    return null;
  }
  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ ok: false, error: "verify_token inválido" }, { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1) extraer mensajes entrantes (si existen)
    const messages: any[] =
      body?.entry?.[0]?.changes?.[0]?.value?.messages ??
      [];

    // 2) extraer statuses (si existen)
    const statuses: any[] =
      body?.entry?.[0]?.changes?.[0]?.value?.statuses ??
      [];

    // Guardar “log crudo” opcional (si querés, te paso una tabla eventos_whatsapp)
    // await pool.query("INSERT INTO eventos_whatsapp (payload) VALUES (?)", [JSON.stringify(body)]);

    // A) Procesar inbound messages
    for (const m of messages) {
      const telefono = String(m.from || "").trim();
      const wamid = String(m.id || "").trim();
      const type = String(m.type || "text").trim();

      const contenido = pickText(m) ?? JSON.stringify(m);

      // insertar en mensajes_entrantes (dedupe por wamid)
      // Si querés dedupe real, poné UNIQUE(id_mensaje_whatsapp)
      await pool.query(
        `INSERT INTO mensajes_entrantes
          (telefono, id_mensaje_whatsapp, tipo, contenido, fecha_recibido)
         VALUES (?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           contenido = VALUES(contenido)`,
        [
          telefono,
          wamid || null,
          // map tipo a tu enum
          type === "text" ? "texto"
          : type === "interactive" ? "lista"
          : type === "button" ? "boton"
          : type === "image" ? "imagen"
          : type === "audio" ? "audio"
          : type === "document" ? "documento"
          : "desconocido",
          contenido,
        ]
      );

      // upsert conversación
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

    // B) Procesar statuses (cuando Meta manda sent/delivered/read/failed)
    // Si todavía no tenés tabla mensajes_salientes, no pasa nada: lo ignoramos.
    for (const s of statuses) {
      const status = String(s.status || "").toUpperCase(); // sent/delivered/read/failed
      const wamid = String(s.id || "").trim();

      if (!wamid) continue;

      // mapeo simple
      let estado = "ENVIADO";
      if (status === "DELIVERED") estado = "ENVIADO";
      if (status === "READ") estado = "ENVIADO";
      if (status === "FAILED") estado = "ERROR";

      // Actualizar si existe la tabla (si no existe, esto tira error y cortaría)
      // Entonces lo envolvemos en try/catch independiente:
      try {
        await pool.query(
          `UPDATE mensajes_salientes
           SET estado = ?
           WHERE id_mensaje_whatsapp = ?`,
          [estado, wamid]
        );
      } catch {
        // si no existe mensajes_salientes, ignorar
      }
    }

    return NextResponse.json({ ok: true, inbound: messages.length, statuses: statuses.length });
  } catch (e: any) {
    console.error("WEBHOOK ERROR:", e);
    return NextResponse.json({ ok: false, error: e?.message || "Error webhook" }, { status: 500 });
  }
}