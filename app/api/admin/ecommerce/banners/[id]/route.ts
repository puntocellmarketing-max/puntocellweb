import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auditEcommerce, booleanValue, nullableNumber, requireAdminApi } from "@/lib/admin-ecommerce";

type Context = { params: Promise<{ id: string }> };
export async function PUT(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); const body = await request.json(); const title = String(body.title || "").trim();
  if (!id || !title) return NextResponse.json({ ok: false, error: "Datos inválidos." }, { status: 400 });
  await pool.execute(`UPDATE ecommerce_banners SET title=?, subtitle=?, image_url=?, mobile_image_url=?, button_label=?, button_url=?, theme=?, position=?, starts_at=?, ends_at=?, active=?, sort_order=? WHERE id=?`, [title, String(body.subtitle || "").trim() || null, String(body.imageUrl || "").trim() || null, String(body.mobileImageUrl || "").trim() || null, String(body.buttonLabel || "").trim() || null, String(body.buttonUrl || "").trim() || null, String(body.theme || "blue"), String(body.position || "HOME_MAIN"), body.startsAt || null, body.endsAt || null, booleanValue(body.active) ? 1 : 0, Math.trunc(nullableNumber(body.sortOrder) || 0), id]);
  await auditEcommerce(auth.user, "UPDATE", "BANNER", id, { title }); return NextResponse.json({ ok: true });
}
export async function DELETE(_request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); await pool.execute("UPDATE ecommerce_banners SET active=0 WHERE id=?", [id]);
  await auditEcommerce(auth.user, "DEACTIVATE", "BANNER", id); return NextResponse.json({ ok: true });
}

