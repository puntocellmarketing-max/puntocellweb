import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { auditEcommerce, requireAdminApi } from "@/lib/admin-ecommerce";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  const auth = await requireAdminApi(); if (auth.response || !auth.user) return auth.response!;
  const id = Number((await context.params).id); const body = await request.json();
  const statuses = ["BORRADOR", "ENVIADO_WHATSAPP", "CONFIRMADO", "VENDIDO", "CANCELADO"];
  const status = String(body.status || "");
  if (!id || !statuses.includes(status)) return NextResponse.json({ ok: false, error: "Estado inválido." }, { status: 400 });
  await pool.execute("UPDATE ecommerce_orders SET status=?, whatsapp_sent=? WHERE id=?", [status, status === "ENVIADO_WHATSAPP" ? 1 : 0, id]);
  await auditEcommerce(auth.user, "STATUS", "ORDER", id, { status }); return NextResponse.json({ ok: true });
}

