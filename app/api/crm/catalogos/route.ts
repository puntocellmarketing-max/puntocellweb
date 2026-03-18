import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CategoriaRow = RowDataPacket & {
  codCategoria: number;
  Descripcion: string;
};

type ZonaRow = RowDataPacket & {
  codZona: number;
  Descripcion: string;
};

export async function GET() {
  try {
    const [categorias] = await pool.query<CategoriaRow[]>(
      `
      SELECT codCategoria, Descripcion
      FROM crm_categorias
      ORDER BY Descripcion ASC
      `
    );

    const [zonas] = await pool.query<ZonaRow[]>(
      `
      SELECT codZona, Descripcion
      FROM crm_zona
      ORDER BY Descripcion ASC
      `
    );

    return NextResponse.json({
      ok: true,
      categorias,
      zonas,
    });
  } catch (error: any) {
    console.error("GET /api/crm/catalogos error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "No se pudieron cargar los catálogos.",
      },
      { status: 500 }
    );
  }
}