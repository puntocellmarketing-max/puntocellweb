import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type AgendaBaseRow = RowDataPacket & {
  id_agenda: number;
  cod_cliente: number | null;
  telefono: string | null;
  id_cobrador_asignado: number | null;
  id_cobrador_creador: number | null;
  tipo_gestion: string;
  estado: string;
  prioridad: string;
  fecha_recordatorio: string;
  nota: string | null;
  resultado: string | null;
  creado_por: string | null;
  id_audiencia: number | null;
  job_id: string | null;
  origen_agenda: string;
};

type ReagendarPayload = {
  fechaRecordatorio?: string | null;
  nota?: string | null;
  resultado?: string | null;
  prioridad?: string | null;
  idCobradorAsignado?: number | null;
  creadoPor?: string | null;
};

type CobradorRow = RowDataPacket & {
  id_cobrador: number;
};

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function safeInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function isValidDatetime(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

async function resolveId(context: any) {
  const params = await context.params;
  return Number(params?.id ?? 0);
}

export async function POST(req: Request, context: any) {
  const connection = await pool.getConnection();

  try {
    const idAgenda = await resolveId(context);

    if (!idAgenda || idAgenda <= 0) {
      connection.release();
      return NextResponse.json(
        { ok: false, error: "ID de agenda inválido." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as ReagendarPayload;

    const fechaRecordatorio = normalizeText(body?.fechaRecordatorio);
    const notaNueva = normalizeText(body?.nota) || null;
    const resultadoOriginal = normalizeText(body?.resultado) || null;
    const prioridadNueva = normalizeText(body?.prioridad).toUpperCase() || null;
    const idCobradorAsignadoNuevo = safeInt(body?.idCobradorAsignado);
    const creadoPorNuevo = normalizeText(body?.creadoPor) || null;

    if (!isValidDatetime(fechaRecordatorio)) {
      connection.release();
      return NextResponse.json(
        { ok: false, error: "fechaRecordatorio inválida." },
        { status: 400 }
      );
    }

    await connection.beginTransaction();

    const [rows] = await connection.query<AgendaBaseRow[]>(
      `
      SELECT
        id_agenda,
        cod_cliente,
        telefono,
        id_cobrador_asignado,
        id_cobrador_creador,
        tipo_gestion,
        estado,
        prioridad,
        fecha_recordatorio,
        nota,
        resultado,
        creado_por,
        id_audiencia,
        job_id,
        origen_agenda
      FROM agenda_crm
      WHERE id_agenda = ?
      LIMIT 1
      `,
      [idAgenda]
    );

    if (!rows.length) {
      await connection.rollback();
      connection.release();
      return NextResponse.json(
        { ok: false, error: "Agenda no encontrada." },
        { status: 404 }
      );
    }

    const agendaOriginal = rows[0];

    let idCobradorAsignadoFinal = idCobradorAsignadoNuevo ?? agendaOriginal.id_cobrador_asignado;

    if (idCobradorAsignadoFinal) {
      const [cobradores] = await connection.query<CobradorRow[]>(
        `
        SELECT id_cobrador
        FROM crm_cobradores
        WHERE id_cobrador = ?
          AND activo = 1
        LIMIT 1
        `,
        [idCobradorAsignadoFinal]
      );

      if (!cobradores.length) {
        await connection.rollback();
        connection.release();
        return NextResponse.json(
          { ok: false, error: "El cobrador asignado no existe o está inactivo." },
          { status: 400 }
        );
      }
    }

    const prioridadFinal = prioridadNueva || agendaOriginal.prioridad;
    const notaFinal = notaNueva ?? agendaOriginal.nota;
    const creadoPorFinal = creadoPorNuevo ?? agendaOriginal.creado_por ?? null;

    const resultadoAnteriorFinal = resultadoOriginal
      ? resultadoOriginal
      : `Reagendado para ${fechaRecordatorio}`;

    const [insertResult] = await connection.execute<ResultSetHeader>(
      `
      INSERT INTO agenda_crm (
        cod_cliente,
        telefono,
        id_audiencia,
        job_id,
        origen_agenda,
        id_cobrador_asignado,
        id_cobrador_creador,
        tipo_gestion,
        estado,
        prioridad,
        fecha_recordatorio,
        nota,
        resultado,
        creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDIENTE', ?, ?, ?, NULL, ?)
      `,
      [
        agendaOriginal.cod_cliente,
        agendaOriginal.telefono,
        agendaOriginal.id_audiencia,
        agendaOriginal.job_id,
        agendaOriginal.origen_agenda || "MANUAL",
        idCobradorAsignadoFinal,
        agendaOriginal.id_cobrador_creador,
        agendaOriginal.tipo_gestion,
        prioridadFinal,
        fechaRecordatorio,
        notaFinal,
        creadoPorFinal,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `
      UPDATE agenda_crm
      SET
        estado = 'REAGENDADO',
        resultado = ?,
        fecha_gestion = NOW()
      WHERE id_agenda = ?
      `,
      [resultadoAnteriorFinal, idAgenda]
    );

    await connection.commit();
    connection.release();

    return NextResponse.json({
      ok: true,
      message: "Agenda reagendada correctamente.",
      idAgendaOriginal: idAgenda,
      idAgendaNueva: Number(insertResult.insertId ?? 0),
    });
  } catch (e: any) {
    try {
      await connection.rollback();
    } catch {}
    connection.release();

    console.error("Error POST /api/crm/agenda/[id]/reagendar:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo reagendar la agenda." },
      { status: 500 }
    );
  }
}