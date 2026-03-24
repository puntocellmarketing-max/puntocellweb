import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CreateAudiencePayload = {
  jobId: string;
  nombre: string;
  descripcion?: string | null;
  creadoPor?: string | null;
  soloSeleccionados?: boolean;
  tamanoLote?: number | null;
};

type JobRow = RowDataPacket & {
  job_id: string;
  filters_json: string | null;
};

type SyncStatsRow = RowDataPacket & {
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
};

function safeInt(value: any, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as CreateAudiencePayload;

    const jobId = String(body?.jobId || "").trim();
    const nombre = String(body?.nombre || "").trim();
    const descripcion = String(body?.descripcion || "").trim() || null;
    const creadoPor = String(body?.creadoPor || "").trim() || "SYSTEM";
    const soloSeleccionados = body?.soloSeleccionados !== false;
    const tamanoLote = safeInt(body?.tamanoLote ?? 50, 50, 1, 1000);

    if (!jobId) {
      return NextResponse.json(
        { ok: false, error: "Falta jobId." },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "Falta nombre de audiencia." },
        { status: 400 }
      );
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [jobRows] = await conn.query<JobRow[]>(
      `
      SELECT job_id, filters_json
      FROM crm_sync_jobs
      WHERE job_id = ?
      LIMIT 1
      `,
      [jobId]
    );

    if (!jobRows.length) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Job no encontrado." },
        { status: 404 }
      );
    }

    const job = jobRows[0];

    const whereSync = soloSeleccionados
      ? "job_id = ? AND seleccionado_para_campania = 1"
      : "job_id = ?";

    const [statsRows] = await conn.query<SyncStatsRow[]>(
      `
      SELECT
        COUNT(*) AS total_clientes,
        COALESCE(SUM(CASE WHEN telefono_valido = 1 THEN 1 ELSE 0 END), 0) AS total_validos,
        COALESCE(SUM(CASE WHEN telefono_valido = 1 THEN 0 ELSE 1 END), 0) AS total_invalidos
      FROM crm_clientes_sync
      WHERE ${whereSync}
      `,
      [jobId]
    );

    const stats = statsRows[0];
    const totalClientes = Number(stats?.total_clientes ?? 0);
    const totalValidos = Number(stats?.total_validos ?? 0);
    const totalInvalidos = Number(stats?.total_invalidos ?? 0);

    if (totalClientes <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "No hay clientes sincronizados para ese job." },
        { status: 400 }
      );
    }

    const [insertAud] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO crm_audiencias (
        nombre,
        descripcion,
        filtros_json,
        origen,
        job_id_origen,
        total_clientes,
        total_validos,
        total_invalidos,
        creado_por,
        estado
      ) VALUES (?, ?, ?, 'SYNC', ?, ?, ?, ?, ?, 'LISTA')
      `,
      [
        nombre,
        descripcion,
        job.filters_json,
        jobId,
        totalClientes,
        totalValidos,
        totalInvalidos,
        creadoPor,
      ]
    );

    const idAudiencia = Number(insertAud.insertId);

    await conn.execute(
      `
      INSERT INTO crm_audiencia_detalle (
        id_audiencia,
        cod_cliente,
        cliente,
        telefono,
        telefono_valido,
        motivo_telefono_invalido,
        requiere_revision,
        dias_atraso,
        ultimo_pago,
        saldo,
        cod_categoria,
        categoria,
        cod_zona,
        zona,
        estado_envio,
        lote_numero
      )
      SELECT
        ? AS id_audiencia,
        x.cod_cliente,
        x.telefono_normalizado AS telefono,
        x.cliente,
        x.telefono_valido,
        x.motivo_telefono_invalido,
        x.requiere_revision,
        x.dias_atraso,
        x.ultimo_pago,
        x.saldo,
        x.cod_categoria,
        x.categoria,
        x.cod_zona,
        x.zona,
        'PENDIENTE' AS estado_envio,
        CEIL(x.rn / ?) AS lote_numero
      FROM (
        SELECT
          s.cod_cliente,
          s.cliente,
          s.telefono_normalizado,
          s.telefono_valido,
          s.motivo_telefono_invalido,
          s.requiere_revision,
          s.dias_atraso,
          s.ultimo_pago,
          s.saldo,
          s.cod_categoria,
          s.categoria,
          s.cod_zona,
          s.zona,
          ROW_NUMBER() OVER (ORDER BY s.cod_cliente) AS rn
        FROM crm_clientes_sync s
        WHERE ${whereSync}
      ) x
      `,
      [idAudiencia, tamanoLote, jobId]
    );

    await conn.commit();

    return NextResponse.json({
      ok: true,
      idAudiencia,
      message: "Audiencia creada correctamente desde el sync.",
      resumen: {
        totalClientes,
        totalValidos,
        totalInvalidos,
        tamanoLote,
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