import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";
import { auditEcommerce, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>(`
    SELECT c.*, COUNT(cp.product_id) product_count FROM ecommerce_collections c
    LEFT JOIN ecommerce_collection_products cp ON cp.collection_id=c.id
    GROUP BY c.id ORDER BY c.active DESC, c.sort_order ASC, c.id DESC
  `);
  return NextResponse.json({ ok: true, collections: rows });
}
export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const body = await request.json(); const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
  const slug = await uniqueEcommerceSlug("ecommerce_collections", name);
  const [result] = await pool.execute<ResultSetHeader>(`
    INSERT INTO ecommerce_collections (name, slug, collection_type, description, image_url, starts_at, ends_at, active, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [name, slug, ["TEMPORADA", "OFERTA", "DESTACADOS", "PERSONALIZADA"].includes(String(body.collectionType)) ? body.collectionType : "PERSONALIZADA", String(body.description || "").trim() || null, String(body.imageUrl || "").trim() || null, body.startsAt || null, body.endsAt || null, body.active === false ? 0 : 1, Math.trunc(nullableNumber(body.sortOrder) || 0)]);
  await auditEcommerce(auth.user, "CREATE", "COLLECTION", result.insertId, { name });
  return NextResponse.json({ ok: true, id: result.insertId, slug }, { status: 201 });
}

