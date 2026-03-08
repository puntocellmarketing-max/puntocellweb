import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";

export const runtime = "nodejs";

type GenerateQueuePayload = {
  idCampania: number;
  soloValidos?: boolean;
  sobrescribir?: boolean;
};

type CampaignRow = RowDataPacket & {
  id_campania: number;
  id_audiencia: number;
  plantilla: string;
  idioma: string | null;
  estado: string;
  total_audiencia: number;
};

type AudienceDetailRow = RowDataPacket & {
  id_detalle: number;
  id_audiencia: number;
  cod_cliente: number;
  cliente: string;
  telefono: string | null;
  telefono_valido: number;
  estado_envio: string;
};

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as GenerateQueuePayload;

    const idCampania = Number(body?.idCampania ?? 0);
    const soloValidos = body?.soloValidos !== false;
    const sobrescribir = body?.sobrescribir === true;

    if (!Number.isFinite(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "idCampania inválido." },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // 1) Buscar campaña
    const [campRows] = await conn.query<CampaignRow[]>(
      `
      SELECT
        id_campania,
        id_audiencia,
        plantilla,
        idioma,
        estado,
        total_audiencia
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

    const campania = campRows[0];

    if (!campania.id_audiencia) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La campaña no tiene audiencia asociada." },
        { status: 400 }
      );
    }

    if (!campania.plantilla) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La campaña no tiene plantilla configurada." },
        { status: 400 }
      );
    }

    // 2) Si no se permite sobrescribir, verificar si ya existen envíos
    const [existingRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM envios_whatsapp
      WHERE id_campania = ?
      `,
      [idCampania]
    );

    const totalExistentes = Number(existingRows[0]?.total ?? 0);

    if (totalExistentes > 0 && !sobrescribir) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: "La campaña ya tiene envíos generados. Usa sobrescribir=true si deseas regenerar la cola.",
          totalExistentes,
        },
        { status: 400 }
      );
    }

    // 3) Si sobrescribir=true, limpiar cola previa de esa campaña
    if (totalExistentes > 0 && sobrescribir) {
      await conn.execute(
        `
        DELETE FROM envios_whatsapp
        WHERE id_campania = ?
        `,
        [idCampania]
      );

      await conn.execute(
        `
        UPDATE crm_audiencia_detalle
        SET estado_envio = 'PENDIENTE'
        WHERE id_audiencia = ?
        `,
        [campania.id_audiencia]
      );
    }

    // 4) Buscar detalle de audiencia apto para cola
    const whereValidos = soloValidos ? "AND d.telefono_valido = 1" : "";

    const [detailRows] = await conn.query<AudienceDetailRow[]>(
      `
      SELECT
        d.id_detalle,
        d.id_audiencia,
        d.cod_cliente,
        d.cliente,
        d.telefono,
        d.telefono_valido,
        d.estado_envio
      FROM crm_audiencia_detalle d
      WHERE d.id_audiencia = ?
        AND d.estado_envio IN ('PENDIENTE', 'ERROR', 'OMITIDO')
        ${whereValidos}
      ORDER BY d.lote_numero, d.cod_cliente
      `,
      [campania.id_audiencia]
    );

    if (!detailRows.length) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: "No hay destinatarios elegibles para generar cola.",
        },
        { status: 400 }
      );
    }

    // 5) Insertar cola en envios_whatsapp
    const sqlInsert = `
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
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, 'QUEUED', 0, NOW())
    `;

    let totalGenerados = 0;

    for (const row of detailRows) {
      await conn.execute<ResultSetHeader>(sqlInsert, [
        idCampania,
        row.id_audiencia,
        row.id_detalle,
        row.cod_cliente,
        row.telefono,
        campania.plantilla,
        campania.idioma || "es",
      ]);

      totalGenerados++;
    }

    // 6) Marcar detalle como EN_COLA
    await conn.execute(
      `
      UPDATE crm_audiencia_detalle
      SET estado_envio = 'EN_COLA'
      WHERE id_audiencia = ?
        AND id_detalle IN (${detailRows.map(() => "?").join(",")})
      `,
      [campania.id_audiencia, ...detailRows.map((r) => r.id_detalle)]
    );

    // 7) Actualizar campaña
    await conn.execute(
      `
      UPDATE campanias
      SET
        total_enviados = ?,
        total_error = 0,
        estado = 'LISTA'
      WHERE id_campania = ?
      `,
      [totalGenerados, idCampania]
    );

    await conn.commit();

    return NextResponse.json({
      ok: true,
      idCampania,
      message: "Cola de envíos generada correctamente.",
      resumen: {
        idAudiencia: campania.id_audiencia,
        totalGenerados,
        plantilla: campania.plantilla,
        idioma: campania.idioma || "es",
        soloValidos,
        sobrescribir,
      },
    });
  } catch (e: any) {
    try {
      if (conn) await conn.rollback();
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