import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type AgendaRow = RowDataPacket & {
  id_agenda: number;
  cod_cliente: number | null;
  cliente: string | null;
  telefono: string | null;
  id_cobrador_asignado: number | null;
  cobrador_asignado: string | null;
  id_cobrador_creador: number | null;
  cobrador_creador: string | null;
  tipo_gestion: string;
  estado: string;
  prioridad: string;
  fecha_creacion: string;
  fecha_recordatorio: string;
  fecha_gestion: string | null;
  nota: string | null;
  resultado: string | null;
  creado_por: string | null;
  updated_at: string;
  id_audiencia: number | null;
  job_id: string | null;
  origen_agenda: string;
  saldo: number | null;
  dias_atraso: number | null;
  ultimo_pago_sync: string | null;
  monto_ultimo_pago_sync: number | null;
  ultimo_pago_cliente_sync: string | null;
  requiere_revision: number | null;
  zona: string | null;
  categoria: string | null;
  dias_vencido: number;
};

type SummaryRow = RowDataPacket & {
  total_filtrados: number;
  hoy: number;
  vencidas: number;
  proximas: number;
  resueltas: number;
  pagadas: number;
  no_responde: number;
};

type CountRow = RowDataPacket & {
  total: number;
};

type CobradorRow = RowDataPacket & {
  id_cobrador: number;
  nombre: string;
};

const ESTADOS_RESUELTOS = [
  "REALIZADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
  "CANCELADO",
] as const;

function safeInt(value: string | null, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function normalizeText(value: string | null) {
  return String(value ?? "").trim();
}

function buildBaseFilters(searchParams: URLSearchParams) {
  const conditions: string[] = ["1=1"];
  const params: Array<string | number> = [];

  const estado = normalizeText(searchParams.get("estado")).toUpperCase();
  const prioridad = normalizeText(searchParams.get("prioridad")).toUpperCase();
  const tipoGestion = normalizeText(searchParams.get("tipoGestion")).toUpperCase();
  const q = normalizeText(searchParams.get("q"));
  const jobId = normalizeText(searchParams.get("jobId"));
  const fechaDesde = normalizeText(searchParams.get("fechaDesde"));
  const fechaHasta = normalizeText(searchParams.get("fechaHasta"));
  const idCobrador = safeInt(searchParams.get("idCobrador"), 0);
  const idAudiencia = safeInt(searchParams.get("idAudiencia"), 0);

  if (estado) {
    conditions.push("a.estado = ?");
    params.push(estado);
  }

  if (prioridad) {
    conditions.push("a.prioridad = ?");
    params.push(prioridad);
  }

  if (tipoGestion) {
    conditions.push("a.tipo_gestion = ?");
    params.push(tipoGestion);
  }

  if (jobId) {
    conditions.push("a.job_id = ?");
    params.push(jobId);
  }

  if (idCobrador > 0) {
    conditions.push("a.id_cobrador_asignado = ?");
    params.push(idCobrador);
  }

  if (idAudiencia > 0) {
    conditions.push("a.id_audiencia = ?");
    params.push(idAudiencia);
  }

  if (fechaDesde) {
    conditions.push("DATE(a.fecha_recordatorio) >= DATE(?)");
    params.push(fechaDesde);
  }

  if (fechaHasta) {
    conditions.push("DATE(a.fecha_recordatorio) <= DATE(?)");
    params.push(fechaHasta);
  }

  if (q) {
    const like = `%${q}%`;
    conditions.push(`
      (
        CAST(a.id_agenda AS CHAR) LIKE ?
        OR CAST(a.cod_cliente AS CHAR) LIKE ?
        OR COALESCE(a.telefono, '') LIKE ?
        OR COALESCE(cs.cliente, '') LIKE ?
        OR COALESCE(ca.nombre, '') LIKE ?
        OR COALESCE(a.job_id, '') LIKE ?
      )
    `);
    params.push(like, like, like, like, like, like);
  }

  return { conditions, params };
}

function buildBucketCondition(bucket: string) {
  switch (bucket) {
    case "hoy":
      return `
        DATE(a.fecha_recordatorio) = CURDATE()
        AND a.estado NOT IN ('REALIZADO','PAGADO','NO_RESPONDE','ERRONEO','CANCELADO')
      `;
    case "vencidas":
      return `
        a.fecha_recordatorio < NOW()
        AND a.estado = 'PENDIENTE'
      `;
    case "proximas":
      return `
        a.fecha_recordatorio > NOW()
        AND a.estado = 'PENDIENTE'
      `;
    case "resueltas":
      return `
        a.estado IN ('REALIZADO','PAGADO','NO_RESPONDE','ERRONEO','CANCELADO')
      `;
    default:
      return "";
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const bucket = normalizeText(searchParams.get("bucket")).toLowerCase();
    const page = Math.max(1, safeInt(searchParams.get("page"), 1));
    const pageSize = Math.min(100, Math.max(10, safeInt(searchParams.get("pageSize"), 20)));
    const offset = (page - 1) * pageSize;

    const { conditions, params } = buildBaseFilters(searchParams);
    const bucketCondition = buildBucketCondition(bucket);

    const whereBase = [...conditions];
    const paramsBase = [...params];

    if (bucketCondition) {
      whereBase.push(bucketCondition);
    }

    const whereBaseSql = whereBase.join(" AND ");
    const whereSummarySql = conditions.join(" AND ");

    const fromAndJoins = `
      FROM agenda_crm a
      LEFT JOIN crm_clientes_sync cs
        ON cs.cod_cliente = a.cod_cliente
      LEFT JOIN crm_cobradores ca
        ON ca.id_cobrador = a.id_cobrador_asignado
      LEFT JOIN crm_cobradores cc
        ON cc.id_cobrador = a.id_cobrador_creador
      LEFT JOIN (
        SELECT p.cod_cliente, p.fecha_pago, p.monto_pago
        FROM crm_pagos_sync p
        INNER JOIN (
          SELECT cod_cliente, MAX(fecha_pago) AS max_fecha
          FROM crm_pagos_sync
          GROUP BY cod_cliente
        ) x
          ON x.cod_cliente = p.cod_cliente
         AND x.max_fecha = p.fecha_pago
      ) ups
        ON ups.cod_cliente = a.cod_cliente
    `;

    const [items] = await pool.query<AgendaRow[]>(
      `
      SELECT
        a.id_agenda,
        a.cod_cliente,
        COALESCE(cs.cliente, NULL) AS cliente,
        COALESCE(NULLIF(a.telefono, ''), cs.telefono_normalizado) AS telefono,
        a.id_cobrador_asignado,
        ca.nombre AS cobrador_asignado,
        a.id_cobrador_creador,
        cc.nombre AS cobrador_creador,
        a.tipo_gestion,
        a.estado,
        a.prioridad,
        a.fecha_creacion,
        a.fecha_recordatorio,
        a.fecha_gestion,
        a.nota,
        a.resultado,
        a.creado_por,
        a.updated_at,
        a.id_audiencia,
        a.job_id,
        a.origen_agenda,
        cs.saldo,
        cs.dias_atraso,
        cs.ultimo_pago AS ultimo_pago_cliente_sync,
        cs.requiere_revision,
        cs.zona,
        cs.categoria,
        ups.fecha_pago AS ultimo_pago_sync,
        ups.monto_pago AS monto_ultimo_pago_sync,
        CASE
          WHEN a.estado = 'PENDIENTE' AND a.fecha_recordatorio < NOW()
            THEN TIMESTAMPDIFF(DAY, a.fecha_recordatorio, NOW())
          ELSE 0
        END AS dias_vencido
      ${fromAndJoins}
      WHERE ${whereBaseSql}
      ORDER BY
        CASE
          WHEN a.estado = 'PENDIENTE' AND a.fecha_recordatorio < NOW() THEN 0
          WHEN a.estado = 'PENDIENTE' AND DATE(a.fecha_recordatorio) = CURDATE() THEN 1
          WHEN a.estado = 'PENDIENTE' THEN 2
          ELSE 3
        END,
        a.fecha_recordatorio ASC,
        a.id_agenda DESC
      LIMIT ?
      OFFSET ?
      `,
      [...paramsBase, pageSize, offset]
    );

    const [countRows] = await pool.query<CountRow[]>(
      `
      SELECT COUNT(*) AS total
      ${fromAndJoins}
      WHERE ${whereBaseSql}
      `,
      paramsBase
    );

    const [summaryRows] = await pool.query<SummaryRow[]>(
      `
      SELECT
        COUNT(*) AS total_filtrados,
        SUM(
          CASE
            WHEN DATE(a.fecha_recordatorio) = CURDATE()
              AND a.estado NOT IN ('REALIZADO','PAGADO','NO_RESPONDE','ERRONEO','CANCELADO')
            THEN 1 ELSE 0
          END
        ) AS hoy,
        SUM(
          CASE
            WHEN a.fecha_recordatorio < NOW()
              AND a.estado = 'PENDIENTE'
            THEN 1 ELSE 0
          END
        ) AS vencidas,
        SUM(
          CASE
            WHEN a.fecha_recordatorio > NOW()
              AND a.estado = 'PENDIENTE'
            THEN 1 ELSE 0
          END
        ) AS proximas,
        SUM(
          CASE
            WHEN a.estado IN ('REALIZADO','PAGADO','NO_RESPONDE','ERRONEO','CANCELADO')
            THEN 1 ELSE 0
          END
        ) AS resueltas,
        SUM(CASE WHEN a.estado = 'PAGADO' THEN 1 ELSE 0 END) AS pagadas,
        SUM(CASE WHEN a.estado = 'NO_RESPONDE' THEN 1 ELSE 0 END) AS no_responde
      ${fromAndJoins}
      WHERE ${whereSummarySql}
      `,
      params
    );

    const [cobradores] = await pool.query<CobradorRow[]>(
      `
      SELECT id_cobrador, nombre
      FROM crm_cobradores
      WHERE activo = 1
      ORDER BY nombre ASC
      `
    );

    const total = Number(countRows?.[0]?.total ?? 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const summary = summaryRows?.[0] ?? {
      total_filtrados: 0,
      hoy: 0,
      vencidas: 0,
      proximas: 0,
      resueltas: 0,
      pagadas: 0,
      no_responde: 0,
    };

    return NextResponse.json({
      ok: true,
      items,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        bucket: bucket || "todos",
        estadosResueltos: ESTADOS_RESUELTOS,
      },
      summary,
      filterOptions: {
        cobradores: cobradores.map((c) => ({
          id: Number(c.id_cobrador),
          nombre: c.nombre,
        })),
      },
    });
  } catch (e: any) {
    console.error("Error GET /api/crm/agenda:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo listar la agenda." },
      { status: 500 }
    );
  }
}