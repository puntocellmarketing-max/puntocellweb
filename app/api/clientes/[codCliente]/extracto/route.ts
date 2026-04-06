// app/api/clientes/[codCliente]/extracto/route.ts
import { NextResponse } from "next/server";
import { generateExtractoPdf } from "@/lib/extractos/generateExtractoPdf";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  context: { params: Promise<{ codCliente: string }> }
) {
  try {
    const { codCliente } = await context.params;
    const cod = Number(codCliente);
    const url = new URL(req.url);
    const download = url.searchParams.get("download") === "1";

    if (!Number.isFinite(cod) || cod <= 0) {
      return NextResponse.json(
        { ok: false, error: "Código de cliente inválido." },
        { status: 400 }
      );
    }

    const { pdf, fileName } = await generateExtractoPdf(cod);

    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message ?? "No se pudo generar el extracto.",
      },
      { status: 500 }
    );
  }
}