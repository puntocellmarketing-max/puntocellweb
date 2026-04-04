import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type EnvioRow = RowDataPacket & {
  id_envio: number;
  cod_cliente: number | null;
  cliente: string | null;
  telefono: string | null;
  plantilla: string | null;
  idioma: string | null;
  estado: string | null;
  id_mensaje_whatsapp: string | null;
  error_mensaje: string | null;
  intentos: number | null;
  fecha_creacion: string | null;
  fecha_envio: string | null;
  fecha_entregado: string | null;
  fecha_leido: string | null;
  fecha_fallo: string | null;

  id_agenda: number | null;
  estado_agenda: string | null;
  tipo_gestion: string | null;
  fecha_recordatorio: string | null;
};

function safeInt(
  value: string | null,
  fallback: number,
  min: number,
  max: number
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function buildSeguimiento(row: EnvioRow) {
  if (!row.id_agenda) return "SIN_AGENDA";
  if (!row.estado_agenda) return "AGENDADO";
  return row.estado_agenda;
}

function buildAgendaSql(agenda: string) {
  if (agenda === "CON_AGENDA") {
    return "AND ag.id_agenda IS NOT NULL";
  }

  if (agenda === "SIN_AGENDA") {
    return "AND ag.id_agenda IS NULL";
  }

  return "";
}

const agendaJoinSql = `
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
    ),
    (
      SELECT a3.id_agenda
      FROM agenda_crm a3
      WHERE a3.cod_cliente IS NOT NULL
        AND ew.cod_cliente IS NOT NULL
        AND a3.cod_cliente = ew.cod_cliente
      ORDER BY
        a3.fecha_recordatorio DESC,
        a3.fecha_creacion DESC,
        a3.id_agenda DESC
      LIMIT 1
    ),
    (
      SELECT a4.id_agenda
      FROM agenda_crm a4
      WHERE a4.telefono IS NOT NULL
        AND ew.telefono IS NOT NULL
        AND a4.telefono COLLATE utf8mb4_unicode_ci =
            ew.telefono COLLATE utf8mb4_unicode_ci
      ORDER BY
        a4.fecha_recordatorio DESC,
        a4.fecha_creacion DESC,
        a4.id_agenda DESC
      LIMIT 1
    )
  )
`;

export async function GET(
  req: Request,
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

    const { searchParams } = new URL(req.url);

    const estado = (searchParams.get("estado") || "").trim();
    const agenda = (searchParams.get("agenda") || "TODOS").trim();

    const page = safeInt(searchParams.get("page"), 1, 1, 100000);
    const pageSize = safeInt(searchParams.get("pageSize"), 20, 1, 200);
    const offset = (page - 1) * pageSize;

    const where: string[] = ["ew.id_campania = ?"];
    const values: Array<string | number> = [idCampania];

    if (estado) {
      where.push("ew.estado = ?");
      values.push(estado);
    }

    const whereSql = `WHERE ${where.join(" AND ")}`;
    const agendaSql = buildAgendaSql(agenda);

    const [countRows] = await crmPool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) AS total
      FROM envios_whatsapp ew
      ${agendaJoinSql}
      ${whereSql}
      ${agendaSql}
      `,
      values
    );

    const total = Number(countRows[0]?.total ?? 0);

    const [rows] = await crmPool.query<EnvioRow[]>(
      `
      SELECT
        ew.id_envio,
        ew.cod_cliente,
        cs.cliente,
        ew.telefono,
        ew.plantilla,
        ew.idioma,
        ew.estado,
        ew.id_mensaje_whatsapp,
        ew.error_mensaje,
        ew.intentos,
        ew.fecha_creacion,
        ew.fecha_envio,
        ew.fecha_entregado,
        ew.fecha_leido,
        ew.fecha_fallo,

        ag.id_agenda,
        ag.estado AS estado_agenda,
        ag.tipo_gestion,
        ag.fecha_recordatorio

      FROM envios_whatsapp ew

      LEFT JOIN crm_clientes_sync cs
        ON cs.cod_cliente = ew.cod_cliente

      ${agendaJoinSql}

      ${whereSql}
      ${agendaSql}
      ORDER BY ew.id_envio DESC
      LIMIT ? OFFSET ?
      `,
      [...values, pageSize, offset]
    );

    return NextResponse.json({
      ok: true,
      items: rows.map((row) => ({
        idEnvio: Number(row.id_envio),
        codCliente: row.cod_cliente !== null ? Number(row.cod_cliente) : null,
        cliente: row.cliente || null,
        telefono: row.telefono,
        plantilla: row.plantilla,
        idioma: row.idioma || "es",
        estado: row.estado,
        idMensajeWhatsapp: row.id_mensaje_whatsapp,
        errorMensaje: row.error_mensaje,
        intentos: Number(row.intentos ?? 0),
        fechaCreacion: row.fecha_creacion,
        fechaEnvio: row.fecha_envio,
        fechaEntregado: row.fecha_entregado,
        fechaLeido: row.fecha_leido,
        fechaFallo: row.fecha_fallo,

        idAgenda: row.id_agenda !== null ? Number(row.id_agenda) : null,
        agendado: !!row.id_agenda,
        estadoAgenda: row.estado_agenda,
        tipoGestion: row.tipo_gestion,
        fechaRecordatorio: row.fecha_recordatorio,
        seguimiento: buildSeguimiento(row),
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}