import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ConversacionRow = RowDataPacket & {
  telefono: string;
  cod_cliente: number | null;
  ultimo_mensaje: string | null;
  ultimo_tipo: string | null;
  ultimo_at: string | null;
  unread_count: number | null;
  estado: string | null;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit") || "50";
    const parsed = parseInt(limitRaw, 10);
    const safeLimit = Number.isFinite(parsed) ? Math.max(1, Math.min(200, parsed)) : 50;

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
      LIMIT ${safeLimit}
    `;

    const [rows] = await pool.query<ConversacionRow[]>(sql);

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("Error /crm/conversaciones:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}