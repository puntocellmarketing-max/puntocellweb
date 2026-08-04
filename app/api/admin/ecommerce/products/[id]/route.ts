import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

export const runtime = "nodejs";

type Context = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: Context) {
  const auth = await requireAdminApi();
  if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "Producto inválido." }, { status: 400 });
  const connection = await pool.getConnection();
  try {
    const body = await request.json();
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "El nombre es obligatorio." }, { status: 400 });
    const slug = await uniqueEcommerceSlug("ecommerce_products", name, id);
    const installments = Math.max(0, Math.trunc(nullableNumber(body.installments) || 0));
    const installmentAmount = nullableNumber(body.installmentAmount) || 0;
    const downPayment = nullableNumber(body.downPayment) || 0;
    const availability = ["EN_STOCK", "SIN_STOCK", "CONSULTAR"].includes(String(body.availability))
      ? String(body.availability)
      : "CONSULTAR";
    await connection.beginTransaction();
    const [result] = await connection.execute<any>(`
      UPDATE ecommerce_products SET
        category_id=?, sku=?, external_code=?, name=?, slug=?, brand=?, short_description=?,
        description=?, specs_json=?, cash_price=?, old_price=?, stock=?, availability=?, main_image_url=?,
        featured=?, offer=?, seasonal=?, active=?, sort_order=?
      WHERE id=?
    `, [
      nullableNumber(body.categoryId), String(body.sku || "").trim() || null,
      String(body.externalCode || "").trim() || null, name, slug,
      String(body.brand || "").trim() || null, String(body.shortDescription || "").trim() || null,
      String(body.description || "").trim() || null, body.specs ? JSON.stringify(body.specs) : null,
      nullableNumber(body.cashPrice), nullableNumber(body.oldPrice), nullableNumber(body.stock),
      availability,
      String(body.mainImageUrl || "").trim() || null,
      booleanValue(body.featured) ? 1 : 0, booleanValue(body.offer) ? 1 : 0,
      booleanValue(body.seasonal) ? 1 : 0, booleanValue(body.active) ? 1 : 0,
      Math.trunc(nullableNumber(body.sortOrder) || 0), id,
    ]);
    if (!result.affectedRows) throw new Error("Producto no encontrado.");
    await connection.execute("DELETE FROM ecommerce_credit_plans WHERE product_id = ?", [id]);
    if (installments > 0 && installmentAmount > 0) {
      await connection.execute(`
        INSERT INTO ecommerce_credit_plans (product_id, label, down_payment, installments, installment_amount, total_credit)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, String(body.creditLabel || "Plan principal").trim(), downPayment, installments, installmentAmount, downPayment + installments * installmentAmount]);
    }
    await connection.commit();
    await auditEcommerce(auth.user, "UPDATE", "PRODUCT", id, { name });
    return NextResponse.json({ ok: true, slug });
  } catch (error: any) {
    await connection.rollback();
    return NextResponse.json({ ok: false, error: error?.message || "No se pudo actualizar el producto." }, { status: 500 });
  } finally { connection.release(); }
}

export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAdminApi();
  if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "Producto inválido." }, { status: 400 });
  await pool.execute("UPDATE ecommerce_products SET active = 0 WHERE id = ?", [id]);
  await auditEcommerce(auth.user, "DEACTIVATE", "PRODUCT", id);
  return NextResponse.json({ ok: true });
}
