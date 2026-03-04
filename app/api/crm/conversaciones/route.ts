import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {

  try {

    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit") || "50";
    const limit = parseInt(limitRaw, 10) || 50;

    // seguridad
    const safeLimit = Math.max(1, Math.min(200, limit));

    const sql = `
      SELECT
        telefono,
        cod_cliente,
        ultimo_mensaje,
        ultimo_tipo,
        ultimo_at,
        unread_count,
        estado
      FROM conversaciones
      ORDER BY ultimo_at DESC
      LIMIT ?
    `;

    const rows = await dbQuery(sql, [safeLimit]);

    return NextResponse.json({
      ok: true,
      rows
    });

  } catch (error: any) {

    console.error("Error conversaciones:", error);

    return NextResponse.json({
      ok: false,
      error: error.message
    }, { status: 500 });

  }

}