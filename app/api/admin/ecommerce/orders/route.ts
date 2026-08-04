import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";
import { requireAdminApi } from "@/lib/admin-ecommerce";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const [orders] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(`
    SELECT o.*, COUNT(oi.id) item_count FROM ecommerce_orders o
    LEFT JOIN ecommerce_order_items oi ON oi.order_id=o.id
    GROUP BY o.id ORDER BY o.id DESC LIMIT 300
  `);
  return NextResponse.json({ ok: true, orders });
}

