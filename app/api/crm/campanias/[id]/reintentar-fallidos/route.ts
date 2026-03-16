import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { ResultSetHeader } from "mysql2/promise";

export const runtime = "nodejs";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idCampania = Number(id);

    if (!Number.isInteger(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de campaña inválido." },
        { status: 400 }
      );
    }

    const [result] = await crmPool.execute<ResultSetHeader>(
      `
      UPDATE envios_whatsapp
      SET
        estado = 'QUEUED',
        error_mensaje = NULL
      WHERE id_campania = ?
        AND estado = 'FAILED'
      `,
      [idCampania]
    );

    return NextResponse.json({
      ok: true,
      message: "Fallidos enviados nuevamente a cola.",
      resumen: {
        idCampania,
        reprocesados: Number(result.affectedRows ?? 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}