import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); const body = await request.json(); const name = String(body.name || "").trim();
  if (!id || !name) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const slug = await uniqueEcommerceSlug("ecommerce_collections", name, id);
  await pool.execute(`UPDATE ecommerce_collections SET name=?, slug=?, collection_type=?, description=?, image_url=?, starts_at=?, ends_at=?, active=?, sort_order=? WHERE id=?`, [name, slug, ["TEMPORADA", "OFERTA", "DESTACADOS", "PERSONALIZADA"].includes(String(body.collectionType)) ? body.collectionType : "PERSONALIZADA", String(body.description || "").trim() || null, String(body.imageUrl || "").trim() || null, body.startsAt || null, body.endsAt || null, booleanValue(body.active) ? 1 : 0, Math.trunc(nullableNumber(body.sortOrder) || 0), id]);
  if (Array.isArray(body.productIds)) {
    const connection = await pool.getConnection();
    try { await connection.beginTransaction(); await connection.execute("DELETE FROM ecommerce_collection_products WHERE collection_id=?", [id]);
      for (const [index, productId] of body.productIds.map(Number).filter((value: number) => Number.isInteger(value) && value > 0).entries()) {
        await connection.execute("INSERT INTO ecommerce_collection_products (collection_id, product_id, sort_order) VALUES (?, ?, ?)", [id, productId, index]);
      }
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; } finally { connection.release(); }
  }
  await auditEcommerce(auth.user, "UPDATE", "COLLECTION", id, { name }); return NextResponse.json({ ok: true, slug });
}
export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); await pool.execute("UPDATE ecommerce_collections SET active=0 WHERE id=?", [id]);
  await auditEcommerce(auth.user, "DEACTIVATE", "COLLECTION", id); return NextResponse.json({ ok: true });
}

