import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
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

const PRIORIDADES_VALIDAS = new Set(["BAJA", "MEDIA", "ALTA"]);

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

function normalizeEnum(value: unknown, fallback = "") {
  return String(value ?? fallback).trim().toUpperCase();
}

function normalizeText(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeDatetimeForMySQL(value: string) {
  const d = new Date(value);

  if (Number.isNaN(d.getTime())) return null;

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AgendarPayload;

    const codCliente = safeIntOrNull(body?.codCliente);
    const telefono = normalizePhone(body?.telefono);

    const idCobradorAsignado = safeIntOrNull(body?.idCobradorAsignado);
    const idCobradorCreador =
      safeIntOrNull(body?.idCobradorCreador) ?? idCobradorAsignado;

    const tipoGestion = normalizeEnum(body?.tipoGestion);
    const estado = normalizeEnum(body?.estado, "PENDIENTE");
    const prioridad = normalizeEnum(body?.prioridad, "MEDIA");

    const fechaRecordatorioRaw = String(body?.fechaRecordatorio || "").trim();
    const fechaRecordatorio = normalizeDatetimeForMySQL(fechaRecordatorioRaw);

    const nota = normalizeText(body?.nota);
    const resultado = normalizeText(body?.resultado);
    const creadoPor = normalizeText(body?.creadoPor);

    if (!idCobradorAsignado || !idCobradorCreador) {
      return NextResponse.json(
        { ok: false, error: "Falta seleccionar cobrador asignado." },
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

    if (!fechaRecordatorio) {
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

    const [cobradores] = await crmPool.query<CobradorActivoRow[]>(
      `
      SELECT id_cobrador
      FROM crm_cobradores
      WHERE id_cobrador IN (?, ?)
        AND activo = 1
      `,
      [idCobradorAsignado, idCobradorCreador]
    );

    const idsActivos = new Set(cobradores.map((r) => Number(r.id_cobrador)));

    if (
      !idsActivos.has(idCobradorAsignado) ||
      !idsActivos.has(idCobradorCreador)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Uno o ambos cobradores no existen o están inactivos.",
        },
        { status: 400 }
      );
    }

    const [insertResult] = await crmPool.execute<ResultSetHeader>(
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