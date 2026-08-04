import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2/promise";
import { pool } from "@/lib/db";
import { getAdminCategories } from "@/lib/ecommerce";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try { return NextResponse.json({ ok: true, categories: await getAdminCategories() }); }
  catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || "No se pudieron cargar las categorías." }, { status: 500 }); }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  try {
    const body = await request.json(); const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
    const slug = await uniqueEcommerceSlug("ecommerce_categories", name);
    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO ecommerce_categories (parent_id, name, slug, description, image_url, sort_order, active)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [nullableNumber(body.parentId), name, slug, String(body.description || "").trim() || null, String(body.imageUrl || "").trim() || null, Math.trunc(nullableNumber(body.sortOrder) || 0), body.active === false ? 0 : 1]);
    await auditEcommerce(auth.user, "CREATE", "CATEGORY", result.insertId, { name });
    return NextResponse.json({ ok: true, id: result.insertId, slug }, { status: 201 });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || "No se pudo guardar la categoría." }, { status: 500 }); }
}

