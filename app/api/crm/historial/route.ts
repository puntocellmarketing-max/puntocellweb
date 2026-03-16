import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type HistorialRow = RowDataPacket & {
  id: string;
  dir: "IN" | "OUT";
  telefono: string;
  texto: string | null;
  tipo: string | null;
  id_opcion: string | null;
  titulo_opcion: string | null;
  fecha: string | null;
  estado_out: string | null;
};

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

    const [rows] = await pool.query<HistorialRow[]>(sql, [telefono, telefono]);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("Error /crm/historial:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}