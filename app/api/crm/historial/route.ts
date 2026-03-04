import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const telefono = String(searchParams.get("telefono") || "").trim();
    const limitRaw = searchParams.get("limit") || "200";
    const parsed = parseInt(limitRaw, 10);
    const limit = Number.isFinite(parsed) ? Math.max(1, Math.min(500, parsed)) : 200;

    if (!telefono) {
      return NextResponse.json({ ok: false, error: "Falta telefono" }, { status: 400 });
    }

    // IMPORTANTE: LIMIT sin placeholder para evitar mysqld_stmt_execute
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
      LIMIT ${limit}
    `;

    // Parametrizamos SOLO telefono, telefono. LIMIT va inline.
    const rows = await dbQuery(sql, [telefono, telefono]);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("Error /crm/historial:", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}