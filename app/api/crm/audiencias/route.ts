import { NextRequest, NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { ResultSetHeader, RowDataPacket, PoolConnection } from "mysql2/promise";

type DbRow = RowDataPacket & Record<string, any>;

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET() {
  try {
    const [rows] = await crmPool.query<DbRow[]>(
      `
      SELECT
        id_audiencia AS idAudiencia,
        nombre,
        descripcion,
        filtros_json AS filtrosJson,
        origen,
        total_clientes AS totalClientes,
        total_validos AS totalValidos,
        total_invalidos AS totalInvalidos,
        creado_por AS creadoPor,
        fecha_creacion AS fechaCreacion,
        estado
      FROM crm_audiencias
      ORDER BY id_audiencia DESC
      `
    );

    return json({
      ok: true,
      rows,
    });
  } catch (error: any) {
    console.error("Error GET /api/crm/audiencias:", error);
    return json(
      {
        ok: false,
        error: error?.message || "No se pudo listar audiencias.",
      },
      500
    );
  }
}

export async function POST(req: NextRequest) {
  let conn: PoolConnection | null = null;

  try {
    const body = await req.json();

    const nombre = String(body?.nombre || "").trim();
    const descripcion = String(body?.descripcion || "").trim() || null;
    const jobId = String(body?.jobId || "").trim();
    const creadoPor = String(body?.creadoPor || "").trim() || null;

    if (!nombre) {
      return json(
        {
          ok: false,
          error: "El nombre de la audiencia es obligatorio.",
        },
        400
      );
    }

    if (!jobId) {
      return json(
        {
          ok: false,
          error: "El jobId es obligatorio para crear la audiencia.",
        },
        400
      );
    }

    conn = await crmPool.getConnection();

    const [syncRows] = await conn.query<DbRow[]>(
      `
      SELECT
        cod_cliente,
        cliente,
        telefono_normalizado,
        telefono_valido,
        motivo_telefono_invalido,
        requiere_revision,
        dias_atraso,
        ultimo_pago,
        saldo,
        categoria,
        zona
      FROM crm_clientes_sync
      WHERE job_id = ?
      ORDER BY cliente ASC
      `,
      [jobId]
    );

    if (!syncRows.length) {
      return json(
        {
          ok: false,
          error: "No se encontraron registros en crm_clientes_sync para ese jobId.",
        },
        404
      );
    }

    const totalClientes = syncRows.length;
    const totalValidos = syncRows.filter(
      (r) => Number(r.telefono_valido || 0) === 1
    ).length;
    const totalInvalidos = totalClientes - totalValidos;

    const filtrosJson = JSON.stringify({
      jobId,
      source: "crm_clientes_sync",
      totalClientes,
      totalValidos,
      totalInvalidos,
    });

    await conn.beginTransaction();

    const [insertAudiencia] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO crm_audiencias
      (
        nombre,
        descripcion,
        filtros_json,
        origen,
        total_clientes,
        total_validos,
        total_invalidos,
        creado_por,
        estado
      )
      VALUES (?, ?, ?, 'SYNC', ?, ?, ?, ?, 'BORRADOR')
      `,
      [
        nombre,
        descripcion,
        filtrosJson,
        totalClientes,
        totalValidos,
        totalInvalidos,
        creadoPor,
      ]
    );

    const idAudiencia = insertAudiencia.insertId;

    for (const row of syncRows) {
      await conn.query(
        `
        INSERT INTO crm_audiencia_detalle
        (
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
          categoria,
          zona,
          estado_envio,
          lote_numero
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', NULL)
        `,
        [
          idAudiencia,
          row.cod_cliente,
          row.cliente,
          row.telefono_normalizado,
          Number(row.telefono_valido || 0),
          row.motivo_telefono_invalido || null,
          Number(row.requiere_revision || 0),
          Number(row.dias_atraso || 0),
          row.ultimo_pago || null,
          Number(row.saldo || 0),
          row.categoria || null,
          row.zona || null,
        ]
      );
    }

    await conn.commit();

    return json({
      ok: true,
      idAudiencia,
      totalClientes,
      totalValidos,
      totalInvalidos,
      message: "Audiencia creada correctamente.",
    });
  } catch (error: any) {
    try {
      await conn?.rollback();
    } catch {}

    console.error("Error POST /api/crm/audiencias:", error);

    return json(
      {
        ok: false,
        error: error?.message || "No se pudo crear la audiencia.",
      },
      500
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}