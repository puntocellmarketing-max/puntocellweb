import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type ConversacionRow = RowDataPacket & {
  telefono: string;
  codCliente: number | null;
  cliente: string | null;
  ultimoMensaje: string | null;
  ultimoTipo: string | null;
  ultimoAt: string | null;
  unreadCount: number | null;
  estado: string | null;
};

function normalizeLikeSearch(value: string) {
  return `%${value.trim()}%`;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const limitRaw = searchParams.get("limit") || "50";
    const parsed = parseInt(limitRaw, 10);
    const safeLimit = Number.isFinite(parsed)
      ? Math.max(1, Math.min(200, parsed))
      : 50;

    const q = String(searchParams.get("q") || "").trim();
    const estado = String(searchParams.get("estado") || "").trim().toUpperCase();
    const soloNoLeidos =
      searchParams.get("soloNoLeidos") === "1" ||
      searchParams.get("soloNoLeidos") === "true";

    const where: string[] = ["1=1"];
    const params: any[] = [];

    if (estado && estado !== "TODOS") {
      where.push("c.estado = ?");
      params.push(estado);
    }

    if (soloNoLeidos) {
      where.push("COALESCE(c.unread_count, 0) > 0");
    }

    if (q) {
      const like = normalizeLikeSearch(q);
      where.push(`
        (
          c.telefono LIKE ?
          OR COALESCE(cs.cliente, '') LIKE ?
          OR CAST(COALESCE(c.cod_cliente, cs.cod_cliente) AS CHAR) LIKE ?
          OR COALESCE(c.ultimo_mensaje, '') LIKE ?
        )
      `);
      params.push(like, like, like, like);
    }

    const sql = `
      SELECT
        c.telefono AS telefono,
        COALESCE(c.cod_cliente, cs.cod_cliente) AS codCliente,
        COALESCE(cs.cliente, NULL) AS cliente,
        c.ultimo_mensaje AS ultimoMensaje,
        c.ultimo_tipo AS ultimoTipo,
        c.ultimo_at AS ultimoAt,
        c.unread_count AS unreadCount,
        c.estado AS estado
      FROM conversaciones c
      LEFT JOIN crm_clientes_sync cs
        ON cs.telefono_normalizado = c.telefono
      WHERE ${where.join(" AND ")}
      ORDER BY c.ultimo_at DESC
      LIMIT ${safeLimit}
    `;

    const [rows] = await crmPool.query<ConversacionRow[]>(sql, params);

    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        telefono: r.telefono,
        codCliente: r.codCliente !== null ? Number(r.codCliente) : null,
        cliente: r.cliente || null,
        ultimoMensaje: r.ultimoMensaje || null,
        ultimoTipo: r.ultimoTipo || null,
        ultimoAt: r.ultimoAt || null,
        unreadCount: Number(r.unreadCount ?? 0),
        estado: r.estado || "NUEVO",
      })),
    });
  } catch (e: any) {
    console.error("Error /api/crm/conversaciones:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}