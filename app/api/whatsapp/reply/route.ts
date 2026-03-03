import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export async function POST(req: Request) {
  const { telefono, mensaje, cod_cliente } = await req.json();

  if (!telefono || !mensaje) {
    return NextResponse.json({ ok: false, error: "Falta telefono o mensaje" }, { status: 400 });
  }

  // Registrar salida antes
  const [ins]: any = await pool.query(
    `INSERT INTO mensajes_salientes (cod_cliente, telefono, mensaje, estado, intentos, fecha_creacion)
     VALUES (?, ?, ?, 'SENDING', 1, NOW())`,
    [cod_cliente ?? null, telefono, mensaje]
  );
  const id_envio = ins.insertId;

  // Enviar a Meta
  const url = `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    to: telefono,
    type: "text",
    text: { body: mensaje },
  };

  const r = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await r.json().catch(() => ({}));

  if (!r.ok) {
    await pool.query(
      `UPDATE mensajes_salientes
       SET estado='FAILED', error_mensaje=?, fecha_fallo=NOW()
       WHERE id_envio=?`,
      [JSON.stringify(data), id_envio]
    );
    return NextResponse.json({ ok: false, error: "Meta error", details: data }, { status: 500 });
  }

  const wamid = data?.messages?.[0]?.id ?? null;

  await pool.query(
    `UPDATE mensajes_salientes
     SET estado='SENT', id_mensaje_whatsapp=?, fecha_envio=NOW()
     WHERE id_envio=?`,
    [wamid, id_envio]
  );

  // Marcar conversación notificada
  await pool.query(
    `INSERT INTO conversaciones_whatsapp (telefono, cod_cliente, estado, fecha_creacion, fecha_actualizacion)
     VALUES (?, ?, 'NOTIFICADO', NOW(), NOW())
     ON DUPLICATE KEY UPDATE
       estado='NOTIFICADO',
       fecha_actualizacion=NOW()`,
    [telefono, cod_cliente ?? null]
  );

  return NextResponse.json({ ok: true, id_envio, wamid });
}