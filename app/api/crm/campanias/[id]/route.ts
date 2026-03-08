import { NextResponse } from "next/server";
import { dbQuery } from "@/lib/db";

export const runtime = "nodejs";

type CampaignRow = {
  id_campania: number;
  id_audiencia: number | null;
  nombre: string;
  tipo: string | null;
  plantilla: string | null;
  idioma: string | null;
  estado: string | null;
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

type AudienceDetailRow = {
  id_detalle: number;
  id_audiencia: number;
  cod_cliente: number;
  cliente: string;
  telefono: string | null;
  telefono_valido: number;
  requiere_revision: number;
  dias_atraso: number | null;
  ultimo_pago: string | null;
  saldo: number | null;
  categoria: string | null;
  zona: string | null;
  estado_envio: string;
  lote_numero: number | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idCampania = Number(id);

    if (!Number.isFinite(idCampania) || idCampania <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de campaña inválido." },
        { status: 400 }
      );
    }

    const campaignRows = await dbQuery<CampaignRow[]>(
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

    if (!campaignRows.length) {
      return NextResponse.json(
        { ok: false, error: "Campaña no encontrada." },
        { status: 404 }
      );
    }

    const campaign = campaignRows[0];

    let destinatarios: AudienceDetailRow[] = [];

    if (campaign.id_audiencia) {
      destinatarios = await dbQuery<AudienceDetailRow[]>(
        `
        SELECT
          id_detalle,
          id_audiencia,
          cod_cliente,
          cliente,
          telefono,
          telefono_valido,
          requiere_revision,
          dias_atraso,
          ultimo_pago,
          saldo,
          categoria,
          zona,
          estado_envio,
          lote_numero
        FROM crm_audiencia_detalle
        WHERE id_audiencia = ?
        ORDER BY lote_numero ASC, cod_cliente ASC
        LIMIT 200
        `,
        [campaign.id_audiencia]
      );
    }

    return NextResponse.json({
      ok: true,
      campaign: {
        idCampania: Number(campaign.id_campania),
        idAudiencia:
          campaign.id_audiencia !== null ? Number(campaign.id_audiencia) : null,
        nombre: campaign.nombre,
        tipo: campaign.tipo,
        plantilla: campaign.plantilla,
        idioma: campaign.idioma || "es",
        estado: campaign.estado,
        fechaLanzamiento: campaign.fecha_lanzamiento,
        fechaCreacion: campaign.fecha_creacion,
        ventanaAnalisisDias: Number(campaign.ventana_analisis_dias ?? 0),
        totalAudiencia: Number(campaign.total_audiencia ?? 0),
        totalEnviados: Number(campaign.total_enviados ?? 0),
        totalError: Number(campaign.total_error ?? 0),
        totalEntregados: Number(campaign.total_entregados ?? 0),
        totalLeidos: Number(campaign.total_leidos ?? 0),
        totalRespondieron: Number(campaign.total_respondieron ?? 0),
        totalPagaron: Number(campaign.total_pagaron ?? 0),
        montoTotalPagado: Number(campaign.monto_total_pagado ?? 0),
        creadoPor: campaign.creado_por,
        observaciones: campaign.observaciones,
        filtrosJson: campaign.filtros_json,
      },
      destinatarios: destinatarios.map((d) => ({
        idDetalle: Number(d.id_detalle),
        idAudiencia: Number(d.id_audiencia),
        codCliente: Number(d.cod_cliente),
        cliente: d.cliente,
        telefono: d.telefono,
        telefonoValido: Number(d.telefono_valido ?? 0),
        requiereRevision: Number(d.requiere_revision ?? 0),
        diasAtraso: Number(d.dias_atraso ?? 0),
        ultimoPago: d.ultimo_pago,
        saldo: Number(d.saldo ?? 0),
        categoria: d.categoria,
        zona: d.zona,
        estadoEnvio: d.estado_envio,
        loteNumero: Number(d.lote_numero ?? 0),
      })),
    });
  } catch (e: any) {
    console.error("Error /api/crm/campanias/[id]:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}