import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { pool } from "@/lib/db";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi } from "@/lib/admin-ecommerce";

export async function GET() {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  const [rows] = await pool.query<(RowDataPacket & Record<string, unknown>)[]>("SELECT * FROM ecommerce_banners ORDER BY active DESC, sort_order ASC, id DESC");
  return NextResponse.json({ ok: true, banners: rows });
}

export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  try {
    const body = await request.json(); const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ ok: false, error: "El título es obligatorio." }, { status: 400 });
    const [result] = await pool.execute<ResultSetHeader>(`
      INSERT INTO ecommerce_banners (title, subtitle, image_url, mobile_image_url, button_label, button_url, theme, position, starts_at, ends_at, active, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [title, String(body.subtitle || "").trim() || null, String(body.imageUrl || "").trim() || null, String(body.mobileImageUrl || "").trim() || null, String(body.buttonLabel || "").trim() || null, String(body.buttonUrl || "").trim() || null, String(body.theme || "blue"), String(body.position || "HOME_MAIN"), body.startsAt || null, body.endsAt || null, body.active === false ? 0 : 1, Math.trunc(nullableNumber(body.sortOrder) || 0)]);
    await auditEcommerce(auth.user, "CREATE", "BANNER", result.insertId, { title });
    return NextResponse.json({ ok: true, id: result.insertId }, { status: 201 });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || "No se pudo guardar el banner." }, { status: 500 }); }
}

