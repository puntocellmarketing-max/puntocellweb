import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type AgendarPayload = {
  codCliente?: number | null;
  telefono?: string | null;
  idCobradorAsignado?: number | null;
  idCobradorCreador?: number | null;
  tipoGestion?: string | null;
  estado?: string | null;
  prioridad?: string | null;
  fechaRecordatorio?: string | null;
  nota?: string | null;
  resultado?: string | null;
  creadoPor?: string | null;
};

type CobradorActivoRow = RowDataPacket & {
  id_cobrador: number;
};

const TIPOS_GESTION_VALIDOS = new Set([
  "RECORDATORIO",
  "LLAMAR",
  "WHATSAPP",
  "VISITA",
  "PROMESA_PAGO",
  "SEGUIMIENTO",
]);

const ESTADOS_VALIDOS = new Set([
  "PENDIENTE",
  "REALIZADO",
  "REAGENDADO",
  "CANCELADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
]);

const PRIORIDADES_VALIDAS = new Set([
  "BAJA",
  "MEDIA",
  "ALTA",
]);

function normalizePhone(v: unknown): string | null {
  const cleaned = String(v ?? "").replace(/[^\d]/g, "").trim();
  return cleaned || null;
}

function safeIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.trunc(n);
}

function isValidDatetime(value: string | null | undefined) {
  if (!value) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgendarPayload;

    const codCliente = safeIntOrNull(body?.codCliente);
    const telefono = normalizePhone(body?.telefono);
    const idCobradorAsignado = safeIntOrNull(body?.idCobradorAsignado);
    const idCobradorCreador = safeIntOrNull(body?.idCobradorCreador);

    const tipoGestion = String(body?.tipoGestion || "").trim().toUpperCase();
    const estado = String(body?.estado || "").trim().toUpperCase();
    const prioridad = String(body?.prioridad || "").trim().toUpperCase();

    const fechaRecordatorio = String(body?.fechaRecordatorio || "").trim();
    const nota = String(body?.nota || "").trim() || null;
    const resultado = String(body?.resultado || "").trim() || null;
    const creadoPor = String(body?.creadoPor || "").trim() || null;

    if (!idCobradorAsignado || !idCobradorCreador) {
      return NextResponse.json(
        { ok: false, error: "Falta seleccionar cobrador asignado y creador." },
        { status: 400 }
      );
    }

    if (!TIPOS_GESTION_VALIDOS.has(tipoGestion)) {
      return NextResponse.json(
        { ok: false, error: "tipoGestion inválido." },
        { status: 400 }
      );
    }

    if (!ESTADOS_VALIDOS.has(estado)) {
      return NextResponse.json(
        { ok: false, error: "estado inválido." },
        { status: 400 }
      );
    }

    if (!PRIORIDADES_VALIDAS.has(prioridad)) {
      return NextResponse.json(
        { ok: false, error: "prioridad inválida." },
        { status: 400 }
      );
    }

    if (!isValidDatetime(fechaRecordatorio)) {
      return NextResponse.json(
        { ok: false, error: "fechaRecordatorio inválida." },
        { status: 400 }
      );
    }

    if (!codCliente && !telefono) {
      return NextResponse.json(
        { ok: false, error: "Debes enviar codCliente o telefono." },
        { status: 400 }
      );
    }

    const [cobradores] = await pool.query<CobradorActivoRow[]>(
      `
      SELECT id_cobrador
      FROM crm_cobradores
      WHERE id_cobrador IN (?, ?)
        AND activo = 1
      `,
      [idCobradorAsignado, idCobradorCreador]
    );

    const idsActivos = new Set(cobradores.map((r) => Number(r.id_cobrador)));

    if (!idsActivos.has(idCobradorAsignado) || !idsActivos.has(idCobradorCreador)) {
      return NextResponse.json(
        { ok: false, error: "Uno o ambos cobradores no existen o están inactivos." },
        { status: 400 }
      );
    }

    const [insertResult] = await pool.execute<ResultSetHeader>(
      `
      INSERT INTO agenda_crm (
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
        creado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        codCliente,
        telefono,
        idCobradorAsignado,
        idCobradorCreador,
        tipoGestion,
        estado,
        prioridad,
        fechaRecordatorio,
        nota,
        resultado,
        creadoPor,
      ]
    );

    return NextResponse.json({
      ok: true,
      message: "Agenda creada correctamente.",
      idAgenda: Number(insertResult?.insertId ?? 0),
    });
  } catch (e: any) {
    console.error("Error /api/crm/agendar:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || "No se pudo guardar la agenda." },
      { status: 500 }
    );
  }
}