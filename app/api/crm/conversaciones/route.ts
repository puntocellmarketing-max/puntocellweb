import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit") || "50";
    const parsed = parseInt(limitRaw, 10);
    const safeLimit = Number.isFinite(parsed) ? Math.max(1, Math.min(200, parsed)) : 50;

    // IMPORTANTe: LIMIT sin placeholder (evita mysql_stmt_execute error)
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

    const rows = await dbQuery(sql); // sin params

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error("Error /crm/conversaciones:", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}