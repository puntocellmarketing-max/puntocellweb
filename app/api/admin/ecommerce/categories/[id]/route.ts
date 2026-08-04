import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); const body = await request.json(); const name = String(body.name || "").trim();
  if (!id || !name) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  const slug = await uniqueEcommerceSlug("ecommerce_categories", name, id);
  await pool.execute(`UPDATE ecommerce_categories SET parent_id=?, name=?, slug=?, description=?, image_url=?, sort_order=?, active=? WHERE id=?`, [nullableNumber(body.parentId), name, slug, String(body.description || "").trim() || null, String(body.imageUrl || "").trim() || null, Math.trunc(nullableNumber(body.sortOrder) || 0), booleanValue(body.active) ? 1 : 0, id]);
  await auditEcommerce(auth.user, "UPDATE", "CATEGORY", id, { name });
  return NextResponse.json({ ok: true, slug });
}
export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); await pool.execute("UPDATE ecommerce_categories SET active=0 WHERE id=?", [id]);
  await auditEcommerce(auth.user, "DEACTIVATE", "CATEGORY", id); return NextResponse.json({ ok: true });
}
