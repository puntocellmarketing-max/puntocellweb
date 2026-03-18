import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

const ESTADOS_VALIDOS = new Set([
  "PENDIENTE",
  "REALIZADO",
  "REAGENDADO",
  "CANCELADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
]);

const PRIORIDADES_VALIDAS = new Set(["BAJA", "MEDIA", "ALTA"]);

const ESTADOS_QUE_MARCAN_GESTION = new Set([
  "REALIZADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
  "CANCELADO",
  "REAGENDADO",
]);

type AgendaDetalleRow = RowDataPacket & {
  id_agenda: number;
  cod_cliente: number | null;
  telefono: string | null;
  id_cobrador_asignado: number | null;
  id_cobrador_creador: number | null;
  tipo_gestion: string;
  estado: string;
  prioridad: string;
  fecha_recordatorio: string;
  fecha_gestion: string | null;
  nota: string | null;
  resultado: string | null;
  creado_por: string | null;
  id_audiencia: number | null;
  job_id: string | null;
  origen_agenda: string;
};

type PatchPayload = {
  estado?: string | null;
  resultado?: string | null;
  prioridad?: string | null;
  idCobradorAsignado?: number | null;
};

type CobradorRow = RowDataPacket & {
  id_cobrador: number;
};

async function resolveId(context: any) {
  const params = await context.params;
  return Number(params?.id ?? 0);
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function safeInt(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export async function GET(_: Request, context: any) {
  try {
    const idAgenda = await resolveId(context);

    if (!idAgenda || idAgenda <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de agenda inválido." },
        { status: 400 }
      );
    }

    const [rows] = await pool.query<AgendaDetalleRow[]>(
      `
      SELECT
        a.id_agenda,
        a.cod_cliente,
        a.telefono,
        a.id_cobrador_asignado,
        a.id_cobrador_creador,
        a.tipo_gestion,
        a.estado,
        a.prioridad,
        a.fecha_recordatorio,
        a.fecha_gestion,
        a.nota,
        a.resultado,
        a.creado_por,
        a.id_audiencia,
        a.job_id,
        a.origen_agenda
      FROM agenda_crm a
      WHERE a.id_agenda = ?
      LIMIT 1
      `,
      [idAgenda]
    );

    if (!rows.length) {
      return NextResponse.json(
        { ok: false, error: "Agenda no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, item: rows[0] });
  } catch (e: any) {
    console.error("Error GET /api/crm/agenda/[id]:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo leer la agenda." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request, context: any) {
  try {
    const idAgenda = await resolveId(context);

    if (!idAgenda || idAgenda <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de agenda inválido." },
        { status: 400 }
      );
    }

    const body = (await req.json()) as PatchPayload;

    const estado = normalizeText(body?.estado).toUpperCase();
    const resultado = normalizeText(body?.resultado) || null;
    const prioridad = normalizeText(body?.prioridad).toUpperCase();
    const idCobradorAsignado = safeInt(body?.idCobradorAsignado);

    const updates: string[] = [];
    const params: Array<string | number | null> = [];

    if (estado) {
      if (!ESTADOS_VALIDOS.has(estado)) {
        return NextResponse.json(
          { ok: false, error: "Estado inválido." },
          { status: 400 }
        );
      }

      updates.push("estado = ?");
      params.push(estado);

      if (ESTADOS_QUE_MARCAN_GESTION.has(estado)) {
        updates.push("fecha_gestion = NOW()");
      }
    }

    if (resultado !== null) {
      updates.push("resultado = ?");
      params.push(resultado);
    }

    if (prioridad) {
      if (!PRIORIDADES_VALIDAS.has(prioridad)) {
        return NextResponse.json(
          { ok: false, error: "Prioridad inválida." },
          { status: 400 }
        );
      }

      updates.push("prioridad = ?");
      params.push(prioridad);
    }

    if (idCobradorAsignado !== null) {
      const [cobradores] = await pool.query<CobradorRow[]>(
        `
        SELECT id_cobrador
        FROM crm_cobradores
        WHERE id_cobrador = ?
          AND activo = 1
        LIMIT 1
        `,
        [idCobradorAsignado]
      );

      if (!cobradores.length) {
        return NextResponse.json(
          { ok: false, error: "El cobrador asignado no existe o está inactivo." },
          { status: 400 }
        );
      }

      updates.push("id_cobrador_asignado = ?");
      params.push(idCobradorAsignado);
    }

    if (!updates.length) {
      return NextResponse.json(
        { ok: false, error: "No hay cambios para guardar." },
        { status: 400 }
      );
    }

    params.push(idAgenda);

    const [result] = await pool.execute<ResultSetHeader>(
      `
      UPDATE agenda_crm
      SET ${updates.join(", ")}
      WHERE id_agenda = ?
      `,
      params
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { ok: false, error: "Agenda no encontrada." },
        { status: 404 }
      );
    }

    const [rows] = await pool.query<AgendaDetalleRow[]>(
      `
      SELECT
        a.id_agenda,
        a.cod_cliente,
        a.telefono,
        a.id_cobrador_asignado,
        a.id_cobrador_creador,
        a.tipo_gestion,
        a.estado,
        a.prioridad,
        a.fecha_recordatorio,
        a.fecha_gestion,
        a.nota,
        a.resultado,
        a.creado_por,
        a.id_audiencia,
        a.job_id,
        a.origen_agenda
      FROM agenda_crm a
      WHERE a.id_agenda = ?
      LIMIT 1
      `,
      [idAgenda]
    );

    return NextResponse.json({
      ok: true,
      message: "Agenda actualizada correctamente.",
      item: rows[0] ?? null,
    });
  } catch (e: any) {
    console.error("Error PATCH /api/crm/agenda/[id]:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo actualizar la agenda." },
      { status: 500 }
    );
  }
}