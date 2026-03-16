import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CampaignRow = RowDataPacket & {
  id_campania: number;
  id_audiencia: number | null;
  nombre: string;
  tipo: "VENCIMIENTO" | "ATRASO" | "GENERAL" | null;
  plantilla: string | null;
  idioma: string | null;
  estado:
    | "BORRADOR"
    | "LISTA"
    | "ENVIANDO"
    | "FINALIZADA"
    | "PAUSADA"
    | "CANCELADA"
    | "ANALIZADA"
    | null;
  fecha_lanzamiento: string | null;
  fecha_creacion: string | null;
  ventana_analisis_dias: number | null;
  total_audiencia: number | null;
  total_enviados: number | null;
  total_error: number | null;
  total_entregados: number | null;
  total_leidos: number | null;
  total_respondieron: number | null;
  total_pagaron: number | null;
  monto_total_pagado: number | null;
  creado_por: string | null;
  observaciones: string | null;
  filtros_json: string | null;
};

type AudienceRow = RowDataPacket & {
  id_audiencia: number;
  nombre: string;
  descripcion: string | null;
  origen: string;
  job_id_origen: string | null;
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
  estado: string;
  fecha_creacion: string | null;
};

type QueueSummaryRow = RowDataPacket & {
  totalCola: number;
  totalQueued: number;
  totalSending: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalFailed: number;
  totalCanceled: number;
};

export async function GET(
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

    const [campRows] = await crmPool.query<CampaignRow[]>(
      `
      SELECT
        id_campania,
        id_audiencia,
        nombre,
        tipo,
        plantilla,
        idioma,
        estado,
        fecha_lanzamiento,
        fecha_creacion,
        ventana_analisis_dias,
        total_audiencia,
        total_enviados,
        total_error,
        total_entregados,
        total_leidos,
        total_respondieron,
        total_pagaron,
        monto_total_pagado,
        creado_por,
        observaciones,
        filtros_json
      FROM campanias
      WHERE id_campania = ?
      LIMIT 1
      `,
      [idCampania]
    );

    if (!campRows.length) {
      return NextResponse.json(
        { ok: false, error: "Campaña no encontrada." },
        { status: 404 }
      );
    }

    const camp = campRows[0];

    let audience: AudienceRow | null = null;

    if (camp.id_audiencia) {
      const [audRows] = await crmPool.query<AudienceRow[]>(
        `
        SELECT
          id_audiencia,
          nombre,
          descripcion,
          origen,
          job_id_origen,
          total_clientes,
          total_validos,
          total_invalidos,
          estado,
          fecha_creacion
        FROM crm_audiencias
        WHERE id_audiencia = ?
        LIMIT 1
        `,
        [camp.id_audiencia]
      );

      audience = audRows[0] || null;
    }

    const [queueRows] = await crmPool.query<QueueSummaryRow[]>(
      `
      SELECT
        COUNT(*) AS totalCola,
        COALESCE(SUM(CASE WHEN estado = 'QUEUED' THEN 1 ELSE 0 END), 0) AS totalQueued,
        COALESCE(SUM(CASE WHEN estado = 'SENDING' THEN 1 ELSE 0 END), 0) AS totalSending,
        COALESCE(SUM(CASE WHEN estado = 'SENT' THEN 1 ELSE 0 END), 0) AS totalSent,
        COALESCE(SUM(CASE WHEN estado = 'DELIVERED' THEN 1 ELSE 0 END), 0) AS totalDelivered,
        COALESCE(SUM(CASE WHEN estado = 'READ' THEN 1 ELSE 0 END), 0) AS totalRead,
        COALESCE(SUM(CASE WHEN estado = 'FAILED' THEN 1 ELSE 0 END), 0) AS totalFailed,
        COALESCE(SUM(CASE WHEN estado = 'CANCELED' THEN 1 ELSE 0 END), 0) AS totalCanceled
      FROM envios_whatsapp
      WHERE id_campania = ?
      `,
      [idCampania]
    );

    const queue = queueRows[0] || {
      totalCola: 0,
      totalQueued: 0,
      totalSending: 0,
      totalSent: 0,
      totalDelivered: 0,
      totalRead: 0,
      totalFailed: 0,
      totalCanceled: 0,
    };

    return NextResponse.json({
      ok: true,
      campania: {
        idCampania: Number(camp.id_campania),
        idAudiencia: camp.id_audiencia !== null ? Number(camp.id_audiencia) : null,
        nombre: camp.nombre,
        tipo: camp.tipo,
        plantilla: camp.plantilla,
        idioma: camp.idioma || "es",
        estado: camp.estado,
        fechaLanzamiento: camp.fecha_lanzamiento,
        fechaCreacion: camp.fecha_creacion,
        ventanaAnalisisDias: Number(camp.ventana_analisis_dias ?? 0),
        totalAudiencia: Number(camp.total_audiencia ?? 0),
        totalEnviados: Number(camp.total_enviados ?? 0),
        totalError: Number(camp.total_error ?? 0),
        totalEntregados: Number(camp.total_entregados ?? 0),
        totalLeidos: Number(camp.total_leidos ?? 0),
        totalRespondieron: Number(camp.total_respondieron ?? 0),
        totalPagaron: Number(camp.total_pagaron ?? 0),
        montoTotalPagado: Number(camp.monto_total_pagado ?? 0),
        creadoPor: camp.creado_por,
        observaciones: camp.observaciones,
        filtrosJson: camp.filtros_json,
      },
      audiencia: audience
        ? {
            idAudiencia: Number(audience.id_audiencia),
            nombre: audience.nombre,
            descripcion: audience.descripcion,
            origen: audience.origen,
            jobIdOrigen: audience.job_id_origen,
            totalClientes: Number(audience.total_clientes ?? 0),
            totalValidos: Number(audience.total_validos ?? 0),
            totalInvalidos: Number(audience.total_invalidos ?? 0),
            estado: audience.estado,
            fechaCreacion: audience.fecha_creacion,
          }
        : null,
      cola: {
        totalCola: Number(queue.totalCola ?? 0),
        totalQueued: Number(queue.totalQueued ?? 0),
        totalSending: Number(queue.totalSending ?? 0),
        totalSent: Number(queue.totalSent ?? 0),
        totalDelivered: Number(queue.totalDelivered ?? 0),
        totalRead: Number(queue.totalRead ?? 0),
        totalFailed: Number(queue.totalFailed ?? 0),
        totalCanceled: Number(queue.totalCanceled ?? 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}