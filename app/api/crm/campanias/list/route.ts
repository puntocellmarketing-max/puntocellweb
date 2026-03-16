import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CampaignRow = RowDataPacket & {
  id_campania: number;
  id_audiencia: number | null;
  nombre: string;
  tipo: "VENCIMIENTO" | "ATRASO" | "GENERAL" | null;
  plantilla: string | null;
  idioma: string | null;
  estado:
    | "BORRADOR"
    | "LISTA"
    | "ENVIANDO"
    | "FINALIZADA"
    | "PAUSADA"
    | "CANCELADA"
    | "ANALIZADA"
    | null;
  fecha_lanzamiento: string | null;
  fecha_creacion: string | null;
  ventana_analisis_dias: number | null;
  total_audiencia: number | null;
  total_enviados: number | null;
  total_error: number | null;
  total_entregados: number | null;
  total_leidos: number | null;
  total_respondieron: number | null;
  total_pagaron: number | null;
  monto_total_pagado: number | null;
  creado_por: string | null;
  observaciones: string | null;
};

function safeLimit(value: string | null, fallback = 50, min = 1, max = 200) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const estado = String(searchParams.get("estado") || "").trim();
    const q = String(searchParams.get("q") || "").trim();
    const limit = safeLimit(searchParams.get("limit"), 50, 1, 200);

    const where: string[] = ["1=1"];
    const params: any[] = [];

    if (estado) {
      where.push("c.estado = ?");
      params.push(estado);
    }

    if (q) {
      where.push(`
        (
          c.nombre LIKE ?
          OR c.plantilla LIKE ?
          OR c.tipo LIKE ?
          OR CAST(c.id_campania AS CHAR) LIKE ?
        )
      `);
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    const sql = `
      SELECT
        c.id_campania,
        c.id_audiencia,
        c.nombre,
        c.tipo,
        c.plantilla,
        c.idioma,
        c.estado,
        c.fecha_lanzamiento,
        c.fecha_creacion,
        c.ventana_analisis_dias,
        c.total_audiencia,
        c.total_enviados,
        c.total_error,
        c.total_entregados,
        c.total_leidos,
        c.total_respondieron,
        c.total_pagaron,
        c.monto_total_pagado,
        c.creado_por,
        c.observaciones
      FROM campanias c
      WHERE ${where.join(" AND ")}
      ORDER BY
        c.fecha_creacion DESC,
        c.id_campania DESC
      LIMIT ${limit}
    `;

    const [rows] = await crmPool.query<CampaignRow[]>(sql, params);

    return NextResponse.json({
      ok: true,
      rows: (rows || []).map((r) => ({
        idCampania: Number(r.id_campania),
        idAudiencia: r.id_audiencia !== null ? Number(r.id_audiencia) : null,
        nombre: r.nombre,
        tipo: r.tipo,
        plantilla: r.plantilla,
        idioma: r.idioma || "es",
        estado: r.estado,
        fechaLanzamiento: r.fecha_lanzamiento,
        fechaCreacion: r.fecha_creacion,
        ventanaAnalisisDias: Number(r.ventana_analisis_dias ?? 0),
        totalAudiencia: Number(r.total_audiencia ?? 0),
        totalEnviados: Number(r.total_enviados ?? 0),
        totalError: Number(r.total_error ?? 0),
        totalEntregados: Number(r.total_entregados ?? 0),
        totalLeidos: Number(r.total_leidos ?? 0),
        totalRespondieron: Number(r.total_respondieron ?? 0),
        totalPagaron: Number(r.total_pagaron ?? 0),
        montoTotalPagado: Number(r.monto_total_pagado ?? 0),
        creadoPor: r.creado_por,
        observaciones: r.observaciones,
      })),
    });
  } catch (e: any) {
    console.error("Error /api/crm/campanias/list:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}