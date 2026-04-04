import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type HeaderRow = RowDataPacket & {
  id_cierre: number;
  id_campania: number;
  id_audiencia: number | null;
  fecha_desde: string;
  fecha_hasta: string;
  fecha_cierre: string;
  porcentaje_comision: number;
  total_notificados: number;
  total_agendados: number;
  total_no_agendados: number;
  total_clientes_con_pago: number;
  total_clientes_comisionables: number;
  total_pagos_encontrados: number;
  monto_total_recuperado: number;
  monto_total_comisionable: number;
  monto_total_comision: number;
  estado: string;
  observacion: string | null;
  creado_por: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  nombre_campania: string | null;
};

type DetailRow = RowDataPacket & {
  id_detalle: number;
  cod_cliente: number;
  cliente: string | null;
  telefono: string | null;
  fue_notificado: number;
  tiene_agenda: number;
  tiene_pago: number;
  es_comisionable: number;
  estado_envio: string | null;
  seguimiento: string | null;
  tipo_gestion: string | null;
  fecha_recordatorio: string | null;
  cantidad_pagos: number;
  monto_total_pagado: number;
  fecha_primer_pago: string | null;
  fecha_ultimo_pago: string | null;
  porcentaje_comision: number;
  comision_calculada: number;
  observacion: string | null;
};

type PagoRow = RowDataPacket & {
  id_pago_cierre: number;
  id_detalle: number;
  cod_cliente: number;
  nro_recibo: string | null;
  fecha_pago: string;
  monto_pagado: number;
  referencia: string | null;
  origen: string | null;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const idCierre = Number(id);

    if (!Number.isInteger(idCierre) || idCierre <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de cierre inválido." },
        { status: 400 }
      );
    }

    const [headerRows] = await crmPool.query<HeaderRow[]>(
      `
      SELECT
        c.*,
        ca.nombre AS nombre_campania
      FROM crm_cierres_campania c
      LEFT JOIN campanias ca
        ON ca.id_campania = c.id_campania
      WHERE c.id_cierre = ?
      LIMIT 1
      `,
      [idCierre]
    );

    const header = headerRows[0];

    if (!header) {
      return NextResponse.json(
        { ok: false, error: "El cierre no existe." },
        { status: 404 }
      );
    }

    const [detailRows] = await crmPool.query<DetailRow[]>(
      `
      SELECT
        id_detalle,
        cod_cliente,
        cliente,
        telefono,
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
      FROM crm_cierres_campania_detalle
      WHERE id_cierre = ?
      ORDER BY es_comisionable DESC, monto_total_pagado DESC, cliente ASC
      `,
      [idCierre]
    );

    const [pagoRows] = await crmPool.query<PagoRow[]>(
      `
      SELECT
        id_pago_cierre,
        id_detalle,
        cod_cliente,
        nro_recibo,
        fecha_pago,
        monto_pagado,
        referencia,
        origen
      FROM crm_cierres_campania_pagos
      WHERE id_cierre = ?
      ORDER BY fecha_pago DESC, id_pago_cierre DESC
      `,
      [idCierre]
    );

    const pagosByDetalle = new Map<number, PagoRow[]>();
    for (const pago of pagoRows) {
      const key = Number(pago.id_detalle);
      if (!pagosByDetalle.has(key)) pagosByDetalle.set(key, []);
      pagosByDetalle.get(key)!.push(pago);
    }

    return NextResponse.json({
      ok: true,
      cierre: {
        idCierre: Number(header.id_cierre),
        idCampania: Number(header.id_campania),
        idAudiencia:
          header.id_audiencia !== null ? Number(header.id_audiencia) : null,
        nombreCampania: header.nombre_campania,
        fechaDesde: header.fecha_desde,
        fechaHasta: header.fecha_hasta,
        fechaCierre: header.fecha_cierre,
        porcentajeComision: Number(header.porcentaje_comision || 0),
        totalNotificados: Number(header.total_notificados || 0),
        totalAgendados: Number(header.total_agendados || 0),
        totalNoAgendados: Number(header.total_no_agendados || 0),
        totalClientesConPago: Number(header.total_clientes_con_pago || 0),
        totalClientesComisionables: Number(
          header.total_clientes_comisionables || 0
        ),
        totalPagosEncontrados: Number(header.total_pagos_encontrados || 0),
        montoTotalRecuperado: Number(header.monto_total_recuperado || 0),
        montoTotalComisionable: Number(header.monto_total_comisionable || 0),
        montoTotalComision: Number(header.monto_total_comision || 0),
        estado: header.estado,
        observacion: header.observacion,
        creadoPor: header.creado_por,
        fechaCreacion: header.fecha_creacion,
        fechaActualizacion: header.fecha_actualizacion,
      },
      detalle: detailRows.map((d) => ({
        idDetalle: Number(d.id_detalle),
        codCliente: Number(d.cod_cliente),
        cliente: d.cliente,
        telefono: d.telefono,
        fueNotificado: !!d.fue_notificado,
        tieneAgenda: !!d.tiene_agenda,
        tienePago: !!d.tiene_pago,
        esComisionable: !!d.es_comisionable,
        estadoEnvio: d.estado_envio,
        seguimiento: d.seguimiento,
        tipoGestion: d.tipo_gestion,
        fechaRecordatorio: d.fecha_recordatorio,
        cantidadPagos: Number(d.cantidad_pagos || 0),
        montoTotalPagado: Number(d.monto_total_pagado || 0),
        fechaPrimerPago: d.fecha_primer_pago,
        fechaUltimoPago: d.fecha_ultimo_pago,
        porcentajeComision: Number(d.porcentaje_comision || 0),
        comisionCalculada: Number(d.comision_calculada || 0),
        observacion: d.observacion,
        pagos: (pagosByDetalle.get(Number(d.id_detalle)) || []).map((p) => ({
          idPagoCierre: Number(p.id_pago_cierre),
          codCliente: Number(p.cod_cliente),
          nroRecibo: p.nro_recibo,
          fechaPago: p.fecha_pago,
          montoPagado: Number(p.monto_pagado || 0),
          referencia: p.referencia,
          origen: p.origen,
        })),
      })),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}