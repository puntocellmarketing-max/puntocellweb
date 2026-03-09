import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

type CobradorRow = {
  id_cobrador: number;
  cod_cobrador_origen: number | null;
  nombre: string;
  activo: number;
  usuario_login: string | null;
  observaciones: string | null;
};

export async function GET() {
  try {
    const rows = await dbQuery<CobradorRow[]>(
      `
      SELECT
        id_cobrador,
        cod_cobrador_origen,
        nombre,
        activo,
        usuario_login,
        observaciones
      FROM crm_cobradores
      WHERE activo = 1
      ORDER BY nombre ASC
      `
    );

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        id_cobrador: Number(r.id_cobrador),
        cod_cobrador_origen:
          r.cod_cobrador_origen !== null ? Number(r.cod_cobrador_origen) : null,
        nombre: r.nombre,
        activo: Number(r.activo ?? 0),
        usuario_login: r.usuario_login ?? null,
        observaciones: r.observaciones ?? null,
      })),
    });
  } catch (e: any) {
    console.error("Error /api/crm/cobradores:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudieron cargar los cobradores." },
      { status: 500 }
    );
  }
}