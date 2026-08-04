import { NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin-ecommerce";
import { uploadStoreImage } from "@/lib/r2";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const auth = await requireAdminApi(); if (auth.response) return auth.response;
  try {
    const data = await request.formData(); const file = data.get("file");
    if (!(file instanceof File)) return NextResponse.json({ ok: false, error: "Seleccioná una imagen." }, { status: 400 });
    const folder = String(data.get("folder") || "products").replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "products";
    return NextResponse.json({ ok: true, url: await uploadStoreImage(file, folder) });
  } catch (error: any) { return NextResponse.json({ ok: false, error: error?.message || "No se pudo subir la imagen." }, { status: 500 }); }
}
