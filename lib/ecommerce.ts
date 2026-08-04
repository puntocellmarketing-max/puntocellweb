import type { RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";

export type EcommerceCategory = {
  id: number;
  parentId: number | null;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  sortOrder: number;
  active: boolean;
  productCount?: number;
};

export type CreditPlan = {
  id: number;
  label: string;
  downPayment: number;
  installments: number;
  installmentAmount: number;
  totalCredit: number;
};

export type EcommerceProduct = {
  id: number;
  categoryId: number | null;
  categoryName: string;
  categorySlug: string;
  sku: string;
  externalCode: string;
  source: "MANUAL" | "SISTEMA";
  name: string;
  slug: string;
  brand: string;
  shortDescription: string;
  description: string;
  specs: Record<string, string>;
  cashPrice: number | null;
  oldPrice: number | null;
  stock: number | null;
  availability: "EN_STOCK" | "SIN_STOCK" | "CONSULTAR";
  mainImageUrl: string;
  featured: boolean;
  offer: boolean;
  seasonal: boolean;
  active: boolean;
  sortOrder: number;
  creditPlan: CreditPlan | null;
  gallery?: string[];
};

export type EcommerceBanner = {
  id: number;
  title: string;
  subtitle: string;
  imageUrl: string;
  mobileImageUrl: string;
  buttonLabel: string;
  buttonUrl: string;
  theme: string;
  position: string;
  sortOrder: number;
};

type ProductRow = RowDataPacket & {
  id: number;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  sku: string | null;
  external_code: string | null;
  source: "MANUAL" | "SISTEMA";
  name: string;
  slug: string;
  brand: string | null;
  short_description: string | null;
  description: string | null;
  specs_json: string | null;
  cash_price: string | number | null;
  old_price: string | number | null;
  stock: string | number | null;
  availability: "EN_STOCK" | "SIN_STOCK" | "CONSULTAR";
  main_image_url: string | null;
  featured: number;
  offer: number;
  seasonal: number;
  active: number;
  sort_order: number;
  credit_id: number | null;
  credit_label: string | null;
  down_payment: string | number | null;
  installments: number | null;
  installment_amount: string | number | null;
  total_credit: string | number | null;
};

const productSelect = `
  SELECT
    p.id, p.category_id, c.name AS category_name, c.slug AS category_slug,
    p.sku, p.external_code, p.source, p.name, p.slug, p.brand,
    p.short_description, p.description, p.specs_json,
    p.cash_price, p.old_price, p.stock, p.availability, p.main_image_url,
    p.featured, p.offer, p.seasonal, p.active, p.sort_order,
    cp.id AS credit_id, cp.label AS credit_label, cp.down_payment,
    cp.installments, cp.installment_amount, cp.total_credit
  FROM ecommerce_products p
  LEFT JOIN ecommerce_categories c ON c.id = p.category_id
  LEFT JOIN ecommerce_credit_plans cp
    ON cp.id = (
      SELECT cp2.id
      FROM ecommerce_credit_plans cp2
      WHERE cp2.product_id = p.id AND cp2.active = 1
      ORDER BY cp2.sort_order ASC, cp2.id ASC
      LIMIT 1
    )
`;

function numeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}

function parseSpecs(value: string | null): Record<string, string> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([key, item]) => [String(key), String(item ?? "")])
    );
  } catch {
    return {};
  }
}

function mapProduct(row: ProductRow): EcommerceProduct {
  const downPayment = numeric(row.down_payment) ?? 0;
  const installmentAmount = numeric(row.installment_amount) ?? 0;
  const installments = Number(row.installments ?? 0);
  const calculatedTotal = downPayment + installments * installmentAmount;

  return {
    id: Number(row.id),
    categoryId: row.category_id === null ? null : Number(row.category_id),
    categoryName: row.category_name || "Sin categoría",
    categorySlug: row.category_slug || "",
    sku: row.sku || "",
    externalCode: row.external_code || "",
    source: row.source,
    name: row.name,
    slug: row.slug,
    brand: row.brand || "",
    shortDescription: row.short_description || "",
    description: row.description || "",
    specs: parseSpecs(row.specs_json),
    cashPrice: numeric(row.cash_price),
    oldPrice: numeric(row.old_price),
    stock: numeric(row.stock),
    availability: row.availability,
    mainImageUrl: row.main_image_url || "",
    featured: Boolean(row.featured),
    offer: Boolean(row.offer),
    seasonal: Boolean(row.seasonal),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order || 0),
    creditPlan: row.credit_id
      ? {
          id: Number(row.credit_id),
          label: row.credit_label || "Financiación",
          downPayment,
          installments,
          installmentAmount,
          totalCredit: numeric(row.total_credit) ?? calculatedTotal,
        }
      : null,
  };
}

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 220);
}

export function isEcommerceNotInstalled(error: unknown) {
  const candidate = error as { code?: string; message?: string };
  return candidate?.code === "ER_NO_SUCH_TABLE" || /ecommerce_/i.test(candidate?.message || "") && /doesn't exist|no existe/i.test(candidate?.message || "");
}

export async function getPublicCategories(): Promise<EcommerceCategory[]> {
  const [rows] = await pool.query<(RowDataPacket & {
    id: number; parent_id: number | null; name: string; slug: string;
    description: string | null; image_url: string | null; sort_order: number;
    active: number; product_count: number;
  })[]>(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM ecommerce_categories c
    LEFT JOIN ecommerce_products p ON p.category_id = c.id AND p.active = 1
    WHERE c.active = 1
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `);
  return rows.map((row) => ({
    id: Number(row.id), parentId: row.parent_id === null ? null : Number(row.parent_id),
    name: row.name, slug: row.slug, description: row.description || "",
    imageUrl: row.image_url || "", sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active), productCount: Number(row.product_count || 0),
  }));
}

export async function getPublicBanners(position = "HOME_MAIN"): Promise<EcommerceBanner[]> {
  const [rows] = await pool.query<(RowDataPacket & {
    id: number; title: string; subtitle: string | null; image_url: string | null;
    mobile_image_url: string | null; button_label: string | null; button_url: string | null;
    theme: string; position: string; sort_order: number;
  })[]>(`
    SELECT id, title, subtitle, image_url, mobile_image_url, button_label,
           button_url, theme, position, sort_order
    FROM ecommerce_banners
    WHERE active = 1 AND position = ?
      AND (starts_at IS NULL OR starts_at <= NOW())
      AND (ends_at IS NULL OR ends_at >= NOW())
    ORDER BY sort_order ASC, id DESC
  `, [position]);
  return rows.map((row) => ({
    id: Number(row.id), title: row.title, subtitle: row.subtitle || "",
    imageUrl: row.image_url || "", mobileImageUrl: row.mobile_image_url || "",
    buttonLabel: row.button_label || "Ver productos", buttonUrl: row.button_url || "#productos",
    theme: row.theme || "blue", position: row.position, sortOrder: Number(row.sort_order || 0),
  }));
}

export async function getPublicProducts(options: {
  featured?: boolean; offer?: boolean; seasonal?: boolean; categorySlug?: string;
  query?: string; excludeId?: number; limit?: number;
} = {}): Promise<EcommerceProduct[]> {
  const conditions = ["p.active = 1"];
  const params: unknown[] = [];
  if (options.featured) conditions.push("p.featured = 1");
  if (options.offer) conditions.push("p.offer = 1");
  if (options.seasonal) conditions.push("p.seasonal = 1");
  if (options.categorySlug) { conditions.push("c.slug = ?"); params.push(options.categorySlug); }
  if (options.excludeId) { conditions.push("p.id <> ?"); params.push(options.excludeId); }
  if (options.query?.trim()) {
    const terms = options.query.trim().split(/\s+/).filter(Boolean).slice(0, 6);
    for (const term of terms) {
      conditions.push("(p.name LIKE ? OR p.brand LIKE ? OR p.sku LIKE ? OR c.name LIKE ?)");
      const like = `%${term}%`;
      params.push(like, like, like, like);
    }
  }
  const limit = Math.max(1, Math.min(Number(options.limit || 20), 100));
  const [rows] = await pool.query<ProductRow[]>(`${productSelect}
    WHERE ${conditions.join(" AND ")}
    ORDER BY p.sort_order ASC, p.featured DESC, p.id DESC
    LIMIT ${limit}
  `, params);
  return rows.map(mapProduct);
}

export async function getPublicProductBySlug(slug: string): Promise<EcommerceProduct | null> {
  const [rows] = await pool.query<ProductRow[]>(`${productSelect} WHERE p.active = 1 AND p.slug = ? LIMIT 1`, [slug]);
  if (!rows.length) return null;
  const product = mapProduct(rows[0]);
  const [images] = await pool.query<(RowDataPacket & { image_url: string })[]>(`
    SELECT image_url FROM ecommerce_product_images WHERE product_id = ? ORDER BY sort_order ASC, id ASC
  `, [product.id]);
  product.gallery = [product.mainImageUrl, ...images.map((item) => item.image_url)].filter((value, index, all) => value && all.indexOf(value) === index);
  return product;
}

export async function getHomeCatalog() {
  try {
    const [categories, banners, featured, offers, seasonal] = await Promise.all([
      getPublicCategories(), getPublicBanners(),
      getPublicProducts({ featured: true, limit: 12 }),
      getPublicProducts({ offer: true, limit: 12 }),
      getPublicProducts({ seasonal: true, limit: 12 }),
    ]);
    return { installed: true, categories, banners, featured, offers, seasonal };
  } catch (error) {
    if (!isEcommerceNotInstalled(error)) throw error;
    return { installed: false, categories: [], banners: [], featured: [], offers: [], seasonal: [] };
  }
}

export async function getAdminDashboardMetrics() {
  try {
    const [[products], [categories], [orders], [banners]] = await Promise.all([
      pool.query<(RowDataPacket & { total: number; active: number })[]>("SELECT COUNT(*) total, SUM(active = 1) active FROM ecommerce_products"),
      pool.query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) total FROM ecommerce_categories WHERE active = 1"),
      pool.query<(RowDataPacket & { total: number; pending: number })[]>("SELECT COUNT(*) total, SUM(status IN ('BORRADOR','ENVIADO_WHATSAPP')) pending FROM ecommerce_orders"),
      pool.query<(RowDataPacket & { total: number })[]>("SELECT COUNT(*) total FROM ecommerce_banners WHERE active = 1"),
    ]);
    return {
      installed: true,
      products: Number(products[0]?.total || 0), activeProducts: Number(products[0]?.active || 0),
      categories: Number(categories[0]?.total || 0), orders: Number(orders[0]?.total || 0),
      pendingOrders: Number(orders[0]?.pending || 0), banners: Number(banners[0]?.total || 0),
    };
  } catch (error) {
    if (!isEcommerceNotInstalled(error)) throw error;
    return { installed: false, products: 0, activeProducts: 0, categories: 0, orders: 0, pendingOrders: 0, banners: 0 };
  }
}

export async function getAdminProducts(): Promise<EcommerceProduct[]> {
  const [rows] = await pool.query<ProductRow[]>(`${productSelect}
    ORDER BY p.active DESC, p.sort_order ASC, p.id DESC
  `);
  return rows.map(mapProduct);
}

export async function getAdminCategories(): Promise<EcommerceCategory[]> {
  const [rows] = await pool.query<(RowDataPacket & {
    id: number; parent_id: number | null; name: string; slug: string;
    description: string | null; image_url: string | null; sort_order: number;
    active: number; product_count: number;
  })[]>(`
    SELECT c.*, COUNT(p.id) AS product_count
    FROM ecommerce_categories c
    LEFT JOIN ecommerce_products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.active DESC, c.sort_order ASC, c.name ASC
  `);
  return rows.map((row) => ({
    id: Number(row.id), parentId: row.parent_id === null ? null : Number(row.parent_id),
    name: row.name, slug: row.slug, description: row.description || "",
    imageUrl: row.image_url || "", sortOrder: Number(row.sort_order || 0),
    active: Boolean(row.active), productCount: Number(row.product_count || 0),
  }));
}

export function formatGuaranies(value: number | null | undefined) {
  if (value === null || value === undefined) return "Consultar precio";
  return `${new Intl.NumberFormat("es-PY", { maximumFractionDigits: 0 }).format(value)} Gs.`;
}
