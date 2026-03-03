import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const telefono = String(searchParams.get("telefono") || "").trim();
    const limit = Math.max(1, Math.min(500, Number(searchParams.get("limit") || 200)));

    if (!telefono) {
      return NextResponse.json({ ok: false, error: "Falta telefono" }, { status: 400 });
    }

    const sql = `
      (
        SELECT 
          CONCAT('IN-', me.id_mensaje) AS id,
          'IN' AS dir,
          me.telefono AS telefono,
          me.contenido AS texto,
          me.tipo AS tipo,
          me.id_opcion AS id_opcion,
          me.titulo_opcion AS titulo_opcion,
          me.fecha_recibido AS fecha,
          NULL AS estado_out
        FROM mensajes_entrantes me
        WHERE me.telefono = ?
      )
      UNION ALL
      (
        SELECT
          CONCAT('OUT-', ew.id_envio) AS id,
          'OUT' AS dir,
          ew.telefono AS telefono,
          COALESCE(ew.mensaje, CONCAT('[Plantilla] ', ew.plantilla)) AS texto,
          'texto' AS tipo,
          NULL AS id_opcion,
          NULL AS titulo_opcion,
          COALESCE(ew.fecha_envio, ew.fecha_creacion) AS fecha,
          ew.estado AS estado_out
        FROM envios_whatsapp ew
        WHERE ew.telefono = ?
      )
      ORDER BY fecha ASC
      LIMIT ?
    `;

    const [rows] = await pool.execute(sql, [telefono, telefono, limit]);
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}