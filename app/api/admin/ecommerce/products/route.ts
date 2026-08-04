import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2/promise";
import { pool } from "@/lib/db";
import { getAdminProducts } from "@/lib/ecommerce";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi, uniqueEcommerceSlug } from "@/lib/admin-ecommerce";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ProductInput = {
  name?: string; sku?: string; externalCode?: string; categoryId?: number | string | null;
  brand?: string; shortDescription?: string; description?: string; specs?: Record<string, string>;
  cashPrice?: number | string | null; oldPrice?: number | string | null; stock?: number | string | null;
  availability?: string; mainImageUrl?: string; featured?: boolean; offer?: boolean; seasonal?: boolean;
  active?: boolean; sortOrder?: number | string; creditLabel?: string; downPayment?: number | string;
  installments?: number | string; installmentAmount?: number | string;
};

export async function GET() {
  const auth = await requireAdminApi();
  if (auth.response) return auth.response;
  try {
    return NextResponse.json({ ok: true, products: await getAdminProducts() });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "No se pudieron cargar los productos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminApi();
  if (auth.response || !auth.user) return auth.response!;
  const connection = await pool.getConnection();
  try {
    const body = await request.json() as ProductInput;
    const name = String(body.name || "").trim();
    if (!name) return NextResponse.json({ ok: false, error: "El nombre del producto es obligatorio." }, { status: 400 });
    const slug = await uniqueEcommerceSlug("ecommerce_products", name);
    const cashPrice = nullableNumber(body.cashPrice);
    const oldPrice = nullableNumber(body.oldPrice);
    const installments = Math.max(0, Math.trunc(nullableNumber(body.installments) || 0));
    const installmentAmount = nullableNumber(body.installmentAmount) || 0;
    const downPayment = nullableNumber(body.downPayment) || 0;
    const totalCredit = installments > 0 ? downPayment + installments * installmentAmount : null;
    const availability = ["EN_STOCK", "SIN_STOCK", "CONSULTAR"].includes(String(body.availability))
      ? String(body.availability)
      : "CONSULTAR";
    await connection.beginTransaction();
    const [result] = await connection.execute<ResultSetHeader>(`
      INSERT INTO ecommerce_products (
        category_id, sku, external_code, source, name, slug, brand, short_description,
        description, specs_json, cash_price, old_price, stock, availability, main_image_url,
        featured, offer, seasonal, active, sort_order
      ) VALUES (?, ?, ?, 'MANUAL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      nullableNumber(body.categoryId), String(body.sku || "").trim() || null,
      String(body.externalCode || "").trim() || null, name, slug,
      String(body.brand || "").trim() || null, String(body.shortDescription || "").trim() || null,
      String(body.description || "").trim() || null, body.specs ? JSON.stringify(body.specs) : null,
      cashPrice, oldPrice, nullableNumber(body.stock),
      availability,
      String(body.mainImageUrl || "").trim() || null,
      booleanValue(body.featured) ? 1 : 0, booleanValue(body.offer) ? 1 : 0,
      booleanValue(body.seasonal) ? 1 : 0, body.active === false ? 0 : 1,
      Math.trunc(nullableNumber(body.sortOrder) || 0),
    ]);
    if (installments > 0 && installmentAmount > 0) {
      await connection.execute(`
        INSERT INTO ecommerce_credit_plans (product_id, label, down_payment, installments, installment_amount, total_credit)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [result.insertId, String(body.creditLabel || "Plan principal").trim(), downPayment, installments, installmentAmount, totalCredit]);
    }
    await connection.commit();
    await auditEcommerce(auth.user, "CREATE", "PRODUCT", result.insertId, { name });
    return NextResponse.json({ ok: true, id: result.insertId, slug }, { status: 201 });
  } catch (error: any) {
    await connection.rollback();
    const duplicate = error?.code === "ER_DUP_ENTRY";
    return NextResponse.json({ ok: false, error: duplicate ? "El código externo o SKU ya está registrado." : error?.message || "No se pudo guardar el producto." }, { status: duplicate ? 409 : 500 });
  } finally {
    connection.release();
  }
}
