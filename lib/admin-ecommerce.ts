import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { getCurrentUser, type AuthUser } from "@/lib/auth";
import { pool } from "@/lib/db";
import { slugify } from "@/lib/ecommerce";

export async function getAdminUser(): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  return user?.rol === "ADMIN" ? user : null;
}

export async function requireAdminApi() {
  const user = await getAdminUser();
  if (!user) {
    return { user: null, response: NextResponse.json({ ok: false, error: "Acceso exclusivo para administradores." }, { status: 403 }) };
  }
  return { user, response: null };
}

export async function auditEcommerce(user: AuthUser, action: string, entityType: string, entityId?: number | null, detail?: unknown) {
  try {
    await pool.execute(`
      INSERT INTO ecommerce_audit_log (user_id, user_name, action, entity_type, entity_id, detail_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [user.id_cobrador, user.nombre, action, entityType, entityId ?? null, detail ? JSON.stringify(detail) : null]);
  } catch (error) {
    console.error("No se pudo registrar auditoría ecommerce:", error);
  }
}

export async function uniqueEcommerceSlug(table: "ecommerce_products" | "ecommerce_categories" | "ecommerce_collections", value: string, excludeId?: number) {
  const base = slugify(value) || `item-${Date.now()}`;
  let candidate = base;
  let suffix = 2;
  while (true) {
    const params: unknown[] = [candidate];
    let sql = `SELECT id FROM ${table} WHERE slug = ?`;
    if (excludeId) { sql += " AND id <> ?"; params.push(excludeId); }
    sql += " LIMIT 1";
    const [rows] = await pool.query<(RowDataPacket & { id: number })[]>(sql, params);
    if (!rows.length) return candidate;
    candidate = `${base}-${suffix++}`;
  }
}

export function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function booleanValue(value: unknown) {
  return value === true || value === 1 || value === "1" || value === "true";
}
