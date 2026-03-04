// app/api/crm/conversaciones/route.ts
import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = searchParams.get("limit") ?? "50";
    const limit = Math.max(1, Math.min(200, parseInt(limitRaw, 10) || 50));

    const rows = await dbQuery(
      `
      SELECT
        c.telefono,
        c.cod_cliente,
        c.ultimo_mensaje,
        c.ultimo_tipo,
        c.ultimo_at,
        c.unread_count,
        c.estado
      FROM conversaciones c
      ORDER BY c.ultimo_at DESC
      LIMIT ?
      `,
      [limit] // ✅ ESTO es clave
    );

    return NextResponse.json({ ok: true, rows });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}