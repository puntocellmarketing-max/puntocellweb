import { NextResponse } from "next/server";
import mysql, {
  type Pool,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { crmPool } from "@/lib/db-crm";

export const runtime = "nodejs";

type CampaignRow = RowDataPacket & {
  id_campania: number;
  id_audiencia: number | null;
  nombre: string | null;
  fecha_lanzamiento: string | null;
  fecha_creacion: string | null;
};

type BaseClienteRow = RowDataPacket & {
  id_envio: number | null;
  cod_cliente: number | null;
  cliente: string | null;
  telefono: string | null;
  plantilla: string | null;
  estado_envio: string | null;

  id_agenda: number | null;
  estado_agenda: string | null;
  tipo_gestion: string | null;
  fecha_recordatorio: string | null;
};

type PagoLocalRow = RowDataPacket & {
  cod_cliente: number;
  nro_recibo: string | null;
  fecha_pago: string;
  monto_pagado: number;
  referencia: string | null;
};

type ClosePayload = {
  idCampania?: number;
  fechaHasta?: string;
  porcentajeComision?: number;
  soloConAgenda?: boolean;
  creadoPor?: string | null;
  observacion?: string | null;
};

let localPool: Pool | null = null;

function getLocalPool() {
  if (localPool) return localPool;

  localPool = mysql.createPool({
    host: process.env.LOCAL_DB_HOST,
    port: Number(process.env.LOCAL_DB_PORT || 3306),
    user: process.env.LOCAL_DB_USER,
    password: process.env.LOCAL_DB_PASS,
    database: process.env.LOCAL_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
  });

  return localPool;
}

function toSqlDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  return d.toISOString().slice(0, 10);
}

function toSqlDateTimeEndOfDay(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Fecha inválida: ${value}`);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} 23:59:59`;
}

function buildSeguimiento(row: BaseClienteRow) {
  if (!row.id_agenda) return "SIN_AGENDA";
  if (!row.estado_agenda) return "AGENDADO";
  return row.estado_agenda;
}

function round2(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

async function getCampaign(idCampania: number) {
  const [rows] = await crmPool.query<CampaignRow[]>(
    `
    SELECT
      id_campania,
      id_audiencia,
      nombre,
      fecha_lanzamiento,
      fecha_creacion
    FROM campanias
    WHERE id_campania = ?
    LIMIT 1
    `,
    [idCampania]
  );

  return rows[0] || null;
}

async function getClientesCampania(idCampania: number) {
  const [rows] = await crmPool.query<BaseClienteRow[]>(
    `
    SELECT
      ew.id_envio,
      ew.cod_cliente,
      cs.cliente,
      ew.telefono,
      ew.plantilla,
      ew.estado AS estado_envio,

      ag.id_agenda,
      ag.estado AS estado_agenda,
      ag.tipo_gestion,
      ag.fecha_recordatorio

    FROM envios_whatsapp ew

    LEFT JOIN crm_clientes_sync cs
      ON cs.cod_cliente = ew.cod_cliente

    LEFT JOIN agenda_crm ag
      ON ag.id_agenda = COALESCE(
        (
          SELECT a1.id_agenda
          FROM agenda_crm a1
          WHERE a1.id_campania = ew.id_campania
            AND a1.cod_cliente IS NOT NULL
            AND ew.cod_cliente IS NOT NULL
            AND a1.cod_cliente = ew.cod_cliente
          ORDER BY
            a1.fecha_recordatorio DESC,
            a1.fecha_creacion DESC,
            a1.id_agenda DESC
          LIMIT 1
        ),
        (
          SELECT a2.id_agenda
          FROM agenda_crm a2
          WHERE a2.id_campania = ew.id_campania
            AND a2.telefono IS NOT NULL
            AND ew.telefono IS NOT NULL
            AND a2.telefono COLLATE utf8mb4_unicode_ci =
                ew.telefono COLLATE utf8mb4_unicode_ci
          ORDER BY
            a2.fecha_recordatorio DESC,
            a2.fecha_creacion DESC,
            a2.id_agenda DESC
          LIMIT 1
        )
      )

    INNER JOIN (
      SELECT
        COALESCE(cod_cliente, 0) AS cod_cliente_group,
        MAX(id_envio) AS max_id_envio
      FROM envios_whatsapp
      WHERE id_campania = ?
      GROUP BY COALESCE(cod_cliente, 0)
    ) ult
      ON ult.max_id_envio = ew.id_envio

    WHERE ew.id_campania = ?
    ORDER BY ew.id_envio DESC
    `,
    [idCampania, idCampania]
  );

  return rows.filter((r) => r.cod_cliente !== null);
}

async function getPagosLocales(
  codClientes: number[],
  fechaDesde: string,
  fechaHasta: string
) {
  if (!codClientes.length) return [];

  const localDb = getLocalPool();
  const placeholders = codClientes.map(() => "?").join(",");

  // AJUSTE IMPORTANTE:
  // Esta consulta asume que en tu sistema local:
  // - ve_recibo tiene: codCliente, Fecha, Total, NroRecibo
  // Si los nombres exactos cambian, solo se corrige este bloque.
  const [rows] = await localDb.query<PagoLocalRow[]>(
    `
    SELECT
      r.codCliente AS cod_cliente,
      CAST(r.NroRecibo AS CHAR) AS nro_recibo,
      r.Fecha AS fecha_pago,
      r.Total AS monto_pagado,
      CAST(r.NroRecibo AS CHAR) AS referencia
    FROM ve_recibo r
    WHERE r.codCliente IN (${placeholders})
      AND r.Fecha >= ?
      AND r.Fecha <= ?
      AND (r.Estado IS NULL OR r.Estado <> 'ANULADO')
    ORDER BY r.codCliente, r.Fecha ASC
    `,
    [...codClientes, fechaDesde, fechaHasta]
  );

  return rows;
}

export async function POST(req: Request) {
  let conn: Awaited<ReturnType<typeof crmPool.getConnection>> | null = null;

  try {
    const body = (await req.json().catch(() => ({}))) as ClosePayload;

    const idCampania = Number(body.idCampania);
    const porcentajeComision = Number(body.porcentajeComision ?? 2);
    const soloConAgenda = body.soloConAgenda !== false;
    const creadoPor = body.creadoPor?.trim() || null;
    const observacion = body.observacion?.trim() || null;

    if (!Number.isInteger(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de campaña inválido." },
        { status: 400 }
      );
    }

    if (!body.fechaHasta) {
      return NextResponse.json(
        { ok: false, error: "Debes enviar la fechaHasta del cierre." },
        { status: 400 }
      );
    }

    if (!Number.isFinite(porcentajeComision) || porcentajeComision < 0) {
      return NextResponse.json(
        { ok: false, error: "Porcentaje de comisión inválido." },
        { status: 400 }
      );
    }

    const campania = await getCampaign(idCampania);

    if (!campania) {
      return NextResponse.json(
        { ok: false, error: "La campaña no existe." },
        { status: 404 }
      );
    }

    const fechaDesdeBase =
      campania.fecha_lanzamiento || campania.fecha_creacion || null;

    if (!fechaDesdeBase) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "La campaña no tiene fecha de lanzamiento ni fecha de creación.",
        },
        { status: 400 }
      );
    }

    const fechaDesde = toSqlDate(fechaDesdeBase);
    const fechaHasta = toSqlDate(body.fechaHasta);
    const fechaHastaDateTime = toSqlDateTimeEndOfDay(body.fechaHasta);

    const clientesCampania = await getClientesCampania(idCampania);
    const codClientes = clientesCampania
      .map((r) => Number(r.cod_cliente))
      .filter((n) => Number.isInteger(n) && n > 0);

    const pagosLocales = await getPagosLocales(
      codClientes,
      `${fechaDesde} 00:00:00`,
      fechaHastaDateTime
    );

    const pagosPorCliente = new Map<number, PagoLocalRow[]>();
    for (const pago of pagosLocales) {
      const cod = Number(pago.cod_cliente);
      if (!pagosPorCliente.has(cod)) pagosPorCliente.set(cod, []);
      pagosPorCliente.get(cod)!.push(pago);
    }

    conn = await crmPool.getConnection();
    await conn.beginTransaction();

    const [cabeceraResult] = await conn.query<ResultSetHeader>(
      `
      INSERT INTO crm_cierres_campania (
        id_campania,
        id_audiencia,
        fecha_desde,
        fecha_hasta,
        porcentaje_comision,
        estado,
        observacion,
        creado_por
      )
      VALUES (?, ?, ?, ?, ?, 'PROCESANDO', ?, ?)
      `,
      [
        idCampania,
        campania.id_audiencia,
        fechaDesde,
        fechaHasta,
        porcentajeComision,
        observacion,
        creadoPor,
      ]
    );

    const idCierre = Number(cabeceraResult.insertId);

    let totalNotificados = 0;
    let totalAgendados = 0;
    let totalNoAgendados = 0;
    let totalClientesConPago = 0;
    let totalClientesComisionables = 0;
    let totalPagosEncontrados = 0;
    let montoTotalRecuperado = 0;
    let montoTotalComisionable = 0;
    let montoTotalComision = 0;

    for (const row of clientesCampania) {
      const codCliente = Number(row.cod_cliente);
      const pagosCliente = pagosPorCliente.get(codCliente) || [];

      const tieneAgenda = !!row.id_agenda;
      const tienePago = pagosCliente.length > 0;
      const esComisionable = soloConAgenda
        ? tieneAgenda && tienePago
        : tienePago;

      const cantidadPagos = pagosCliente.length;
      const montoTotalPagado = round2(
        pagosCliente.reduce((acc, p) => acc + Number(p.monto_pagado || 0), 0)
      );

      const fechaPrimerPago =
        pagosCliente.length > 0 ? pagosCliente[0].fecha_pago : null;
      const fechaUltimoPago =
        pagosCliente.length > 0
          ? pagosCliente[pagosCliente.length - 1].fecha_pago
          : null;

      const comisionCalculada = esComisionable
        ? round2(montoTotalPagado * (porcentajeComision / 100))
        : 0;

      const seguimiento = buildSeguimiento(row);

      const [detalleResult] = await conn.query<ResultSetHeader>(
        `
        INSERT INTO crm_cierres_campania_detalle (
          id_cierre,
          id_campania,
          id_audiencia,
          cod_cliente,
          cliente,
          telefono,
          id_envio,
          id_agenda,
          fue_notificado,
          tiene_agenda,
          tiene_pago,
          es_comisionable,
          estado_envio,
          seguimiento,
          tipo_gestion,
          fecha_recordatorio,
          cantidad_pagos,
          monto_total_pagado,
          fecha_primer_pago,
          fecha_ultimo_pago,
          porcentaje_comision,
          comision_calculada,
          observacion
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          idCierre,
          idCampania,
          campania.id_audiencia,
          codCliente,
          row.cliente || null,
          row.telefono || null,
          row.id_envio || null,
          row.id_agenda || null,
          1,
          tieneAgenda ? 1 : 0,
          tienePago ? 1 : 0,
          esComisionable ? 1 : 0,
          row.estado_envio || null,
          seguimiento,
          row.tipo_gestion || null,
          row.fecha_recordatorio || null,
          cantidadPagos,
          montoTotalPagado,
          fechaPrimerPago,
          fechaUltimoPago,
          porcentajeComision,
          comisionCalculada,
          tieneAgenda
            ? null
            : "Notificado sin agenda. No genera comisión.",
        ]
      );

      const idDetalle = Number(detalleResult.insertId);

      for (const pago of pagosCliente) {
        await conn.query<ResultSetHeader>(
          `
          INSERT INTO crm_cierres_campania_pagos (
            id_cierre,
            id_detalle,
            cod_cliente,
            nro_recibo,
            fecha_pago,
            monto_pagado,
            referencia,
            origen
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'RECIBO_LOCAL')
          `,
          [
            idCierre,
            idDetalle,
            codCliente,
            pago.nro_recibo || null,
            pago.fecha_pago,
            Number(pago.monto_pagado || 0),
            pago.referencia || null,
          ]
        );
      }

      totalNotificados += 1;
      if (tieneAgenda) totalAgendados += 1;
      else totalNoAgendados += 1;

      if (tienePago) totalClientesConPago += 1;
      if (esComisionable) totalClientesComisionables += 1;

      totalPagosEncontrados += cantidadPagos;
      montoTotalRecuperado = round2(montoTotalRecuperado + montoTotalPagado);

      if (esComisionable) {
        montoTotalComisionable = round2(
          montoTotalComisionable + montoTotalPagado
        );
        montoTotalComision = round2(montoTotalComision + comisionCalculada);
      }
    }

    await conn.query(
      `
      UPDATE crm_cierres_campania
      SET
        total_notificados = ?,
        total_agendados = ?,
        total_no_agendados = ?,
        total_clientes_con_pago = ?,
        total_clientes_comisionables = ?,
        total_pagos_encontrados = ?,
        monto_total_recuperado = ?,
        monto_total_comisionable = ?,
        monto_total_comision = ?,
        estado = 'FINALIZADO'
      WHERE id_cierre = ?
      `,
      [
        totalNotificados,
        totalAgendados,
        totalNoAgendados,
        totalClientesConPago,
        totalClientesComisionables,
        totalPagosEncontrados,
        montoTotalRecuperado,
        montoTotalComisionable,
        montoTotalComision,
        idCierre,
      ]
    );

    await conn.commit();

    return NextResponse.json({
      ok: true,
      resumen: {
        idCierre,
        idCampania,
        fechaDesde,
        fechaHasta,
        porcentajeComision,
        totalNotificados,
        totalAgendados,
        totalNoAgendados,
        totalClientesConPago,
        totalClientesComisionables,
        totalPagosEncontrados,
        montoTotalRecuperado,
        montoTotalComisionable,
        montoTotalComision,
      },
    });
  } catch (e: any) {
    if (conn) {
      try {
        await conn.rollback();
      } catch {}
    }

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  } finally {
    if (conn) conn.release();
  }
}