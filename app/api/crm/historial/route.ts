import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
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
  media_id: string | null;
  mime_type: string | null;
  media_url: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const telefono = String(searchParams.get("telefono") || "").trim();
    const limitRaw = searchParams.get("limit") || "200";
    const parsed = parseInt(limitRaw, 10);
    const limit = Number.isFinite(parsed)
      ? Math.max(1, Math.min(500, parsed))
      : 200;

    if (!telefono) {
      return NextResponse.json(
        { ok: false, error: "Falta telefono" },
        { status: 400 }
      );
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
          NULL AS estado_out,
          me.media_id AS media_id,
          me.mime_type AS mime_type,
          CASE
            WHEN me.media_id IS NOT NULL AND TRIM(me.media_id) <> ''
              THEN CONCAT('/api/whatsapp/media/', me.media_id)
            ELSE NULL
          END AS media_url
        FROM mensajes_entrantes me
        WHERE me.telefono = ?
      )

      UNION ALL

      (
        SELECT
          CONCAT('OUT-', ew.id_envio) AS id,
          'OUT' AS dir,
          ew.telefono AS telefono,
          CASE
            WHEN ew.mensaje IS NOT NULL AND TRIM(ew.mensaje) <> '' THEN ew.mensaje
            WHEN ew.plantilla IS NOT NULL AND TRIM(ew.plantilla) <> '' THEN CONCAT('[Plantilla] ', ew.plantilla)
            ELSE '(sin contenido)'
          END AS texto,
          'texto' AS tipo,
          NULL AS id_opcion,
          NULL AS titulo_opcion,
          COALESCE(ew.fecha_envio, ew.fecha_creacion) AS fecha,
          ew.estado AS estado_out,
          NULL AS media_id,
          NULL AS mime_type,
          NULL AS media_url
        FROM envios_whatsapp ew
        WHERE ew.telefono = ?
      )

      ORDER BY fecha ASC
      LIMIT ${limit}
    `;

    const [rows] = await crmPool.query<HistorialRow[]>(sql, [telefono, telefono]);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("Error /crm/historial:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}