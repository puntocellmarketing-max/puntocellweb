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
        c.estado,
        cl.nombre,
        cl.apellido
      FROM conversaciones c
      LEFT JOIN crm_clientes cl
        ON cl.cod_cliente = c.cod_cliente
      ORDER BY c.ultimo_at DESC
      LIMIT ?
      `,
      [limit]
    );

    return NextResponse.json({
      ok: true,
      rows
    });

  } catch (err: any) {

    console.error("CRM conversaciones error:", err);

    return NextResponse.json(
      {
        ok: false,
        error: err.message
      },
      { status: 500 }
    );
  }
}