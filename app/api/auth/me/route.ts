import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "No autenticado." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo obtener la sesión." },
      { status: 500 }
    );
  }
}