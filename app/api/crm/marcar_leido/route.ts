import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const telefono = String(body?.telefono || "").trim();

    if (!telefono) {
      return NextResponse.json({ ok: false, error: "Falta telefono" }, { status: 400 });
    }

    const result: any = await dbQuery(
      `
      UPDATE conversaciones
      SET unread_count = 0
      WHERE telefono = ?
      `,
      [telefono]
    );

    // mysql2 devuelve OkPacket con affectedRows
    const affectedRows = Number(result?.affectedRows ?? 0);

    return NextResponse.json({ ok: true, affectedRows });
  } catch (e: any) {
    console.error("Error /crm/marcar_leido:", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}