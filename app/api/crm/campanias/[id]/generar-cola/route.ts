import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CampaignRow = RowDataPacket & {
  id_campania: number;
  id_audiencia: number | null;
  plantilla: string | null;
  idioma: string | null;
  estado: string | null;
};

type AudienceDetailSummaryRow = RowDataPacket & {
  totalValidos: number;
};

type ExistingQueueRow = RowDataPacket & {
  totalExistentes: number;
};

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let conn: PoolConnection | null = null;

  try {
    const { id } = await params;
    const idCampania = Number(id);

    if (!Number.isInteger(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de campaña inválido." },
        { status: 400 }
      );
    }

    conn = await crmPool.getConnection();
    await conn.beginTransaction();

    const [campRows] = await conn.query<CampaignRow[]>(
      `
      SELECT
        id_campania,
        id_audiencia,
        plantilla,
        idioma,
        estado
      FROM campanias
      WHERE id_campania = ?
      LIMIT 1
      `,
      [idCampania]
    );

    if (!campRows.length) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Campaña no encontrada." },
        { status: 404 }
      );
    }

    const camp = campRows[0];

    if (!camp.id_audiencia) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La campaña no tiene audiencia asociada." },
        { status: 400 }
      );
    }

    if (!camp.plantilla || !String(camp.plantilla).trim()) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La campaña no tiene plantilla configurada." },
        { status: 400 }
      );
    }

    if (
      camp.estado === "ENVIANDO" ||
      camp.estado === "FINALIZADA" ||
      camp.estado === "CANCELADA"
    ) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: `No se puede generar cola para una campaña en estado ${camp.estado}.`,
        },
        { status: 400 }
      );
    }

    const [existingRows] = await conn.query<ExistingQueueRow[]>(
      `
      SELECT COUNT(*) AS totalExistentes
      FROM envios_whatsapp
      WHERE id_campania = ?
      `,
      [idCampania]
    );

    const totalExistentes = Number(existingRows[0]?.totalExistentes ?? 0);

    if (totalExistentes > 0) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: "La campaña ya tiene cola generada.",
          resumen: {
            totalExistentes,
          },
        },
        { status: 409 }
      );
    }

    const [summaryRows] = await conn.query<AudienceDetailSummaryRow[]>(
      `
      SELECT COUNT(*) AS totalValidos
      FROM crm_audiencia_detalle
      WHERE id_audiencia = ?
        AND telefono_valido = 1
        AND telefono IS NOT NULL
        AND telefono <> ''
      `,
      [camp.id_audiencia]
    );

    const totalValidos = Number(summaryRows[0]?.totalValidos ?? 0);

    if (totalValidos <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La audiencia no tiene destinatarios válidos para cola." },
        { status: 400 }
      );
    }

    const [insertResult] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO envios_whatsapp (
        id_campania,
        id_audiencia,
        id_audiencia_detalle,
        cod_cliente,
        telefono,
        mensaje,
        plantilla,
        idioma,
        estado,
        intentos,
        fecha_creacion
      )
      SELECT
        ?,
        d.id_audiencia,
        d.id_detalle,
        d.cod_cliente,
        d.telefono,
        NULL,
        ?,
        ?,
        'QUEUED',
        0,
        NOW()
      FROM crm_audiencia_detalle d
      WHERE d.id_audiencia = ?
        AND d.telefono_valido = 1
        AND d.telefono IS NOT NULL
        AND d.telefono <> ''
      `,
      [
        idCampania,
        String(camp.plantilla),
        String(camp.idioma || "es"),
        Number(camp.id_audiencia),
      ]
    );

    await conn.execute(
      `
      UPDATE campanias
      SET
        estado = 'LISTA',
        total_audiencia = ?,
        total_enviados = 0,
        total_error = 0,
        total_entregados = 0,
        total_leidos = 0,
        total_respondieron = 0,
        total_pagaron = 0,
        monto_total_pagado = 0.00
      WHERE id_campania = ?
      `,
      [totalValidos, idCampania]
    );

    await conn.commit();

    return NextResponse.json({
      ok: true,
      message: "Cola generada correctamente.",
      resumen: {
        idCampania,
        totalGenerados: Number(insertResult.affectedRows ?? 0),
        totalAudiencia: totalValidos,
        estadoCampania: "LISTA",
      },
    });
  } catch (e: any) {
    try {
      await conn?.rollback();
    } catch {}

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}