import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.max(1, Math.min(200, Number(searchParams.get("limit") || 50)));
    const q = String(searchParams.get("q") || "").trim();

    const sql = `
      SELECT
        id_conversacion,
        telefono,
        cod_cliente,
        ultimo_mensaje,
        ultimo_tipo,
        ultimo_at,
        unread_count,
        estado,
        updated_at
      FROM conversaciones
      WHERE (? = '' OR telefono LIKE CONCAT('%', ?, '%'))
      ORDER BY COALESCE(ultimo_at, updated_at) DESC
      LIMIT ?
    `;

    const [rows] = await pool.execute(sql, [q, q, limit]);
    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}