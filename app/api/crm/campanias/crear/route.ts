import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type CreateCampaignPayload = {
  idAudiencia: number;
  nombre: string;
  tipo?: "VENCIMIENTO" | "ATRASO" | "GENERAL" | null;
  plantilla: string;
  idioma?: string | null;
  creadoPor?: string | null;
  observaciones?: string | null;
  ventanaAnalisisDias?: number | null;
  fechaLanzamiento?: string | null; // YYYY-MM-DD o YYYY-MM-DD HH:mm:ss
};

type AudienceRow = RowDataPacket & {
  id_audiencia: number;
  nombre: string;
  descripcion: string | null;
  filtros_json: string | null;
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
  estado: string;
};

function safeInt(value: unknown, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function isValidDateTime(value: string | null): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}( \d{2}:\d{2}:\d{2})?$/.test(value);
}

function normalizeNullableString(value: unknown, maxLength?: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return maxLength ? text.slice(0, maxLength) : text;
}

export async function POST(req: Request) {
  let conn: PoolConnection | null = null;

  try {
    const body = (await req.json()) as CreateCampaignPayload;

    const idAudiencia = Number(body?.idAudiencia ?? 0);
    const nombre = String(body?.nombre || "").trim();
    const tipo = String(body?.tipo || "GENERAL").trim() as
      | "VENCIMIENTO"
      | "ATRASO"
      | "GENERAL";
    const plantilla = String(body?.plantilla || "").trim();
    const idioma = String(body?.idioma || "es").trim() || "es";
    const creadoPor = normalizeNullableString(body?.creadoPor, 100) || "SYSTEM";
    const observaciones = normalizeNullableString(body?.observaciones, 255);
    const ventanaAnalisisDias = safeInt(body?.ventanaAnalisisDias ?? 30, 30, 1, 365);
    const fechaLanzamiento = normalizeNullableString(body?.fechaLanzamiento);

    if (!Number.isInteger(idAudiencia) || idAudiencia <= 0) {
      return NextResponse.json(
        { ok: false, error: "idAudiencia inválido." },
        { status: 400 }
      );
    }

    if (!nombre) {
      return NextResponse.json(
        { ok: false, error: "El nombre de campaña es obligatorio." },
        { status: 400 }
      );
    }

    if (nombre.length > 150) {
      return NextResponse.json(
        { ok: false, error: "El nombre de campaña no puede superar 150 caracteres." },
        { status: 400 }
      );
    }

    if (!plantilla) {
      return NextResponse.json(
        { ok: false, error: "La plantilla es obligatoria." },
        { status: 400 }
      );
    }

    if (plantilla.length > 100) {
      return NextResponse.json(
        { ok: false, error: "La plantilla no puede superar 100 caracteres." },
        { status: 400 }
      );
    }

    if (!["VENCIMIENTO", "ATRASO", "GENERAL"].includes(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de campaña inválido." },
        { status: 400 }
      );
    }

    if (idioma.length > 10) {
      return NextResponse.json(
        { ok: false, error: "Idioma inválido." },
        { status: 400 }
      );
    }

    if (!isValidDateTime(fechaLanzamiento)) {
      return NextResponse.json(
        {
          ok: false,
          error: "fechaLanzamiento debe tener formato YYYY-MM-DD o YYYY-MM-DD HH:mm:ss.",
        },
        { status: 400 }
      );
    }

    conn = await crmPool.getConnection();
    await conn.beginTransaction();

    const [audRows] = await conn.query<AudienceRow[]>(
      `
      SELECT
        id_audiencia,
        nombre,
        descripcion,
        filtros_json,
        total_clientes,
        total_validos,
        total_invalidos,
        estado
      FROM crm_audiencias
      WHERE id_audiencia = ?
      LIMIT 1
      `,
      [idAudiencia]
    );

    if (!audRows.length) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "Audiencia no encontrada." },
        { status: 404 }
      );
    }

    const audiencia = audRows[0];
    const totalClientes = Number(audiencia.total_clientes ?? 0);
    const totalValidos = Number(audiencia.total_validos ?? 0);
    const totalInvalidos = Number(audiencia.total_invalidos ?? 0);

    if (totalClientes <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La audiencia no tiene clientes." },
        { status: 400 }
      );
    }

    if (totalValidos <= 0) {
      await conn.rollback();
      return NextResponse.json(
        { ok: false, error: "La audiencia no tiene clientes válidos para campaña." },
        { status: 400 }
      );
    }

    const [dupRows] = await conn.query<RowDataPacket[]>(
      `
      SELECT id_campania, nombre, estado
      FROM campanias
      WHERE id_audiencia = ?
        AND estado IN ('BORRADOR', 'LISTA', 'ENVIANDO')
      ORDER BY id_campania DESC
      LIMIT 1
      `,
      [idAudiencia]
    );

    if (dupRows.length) {
      await conn.rollback();
      return NextResponse.json(
        {
          ok: false,
          error: "Ya existe una campaña activa o en borrador para esta audiencia.",
          duplicado: {
            idCampania: Number(dupRows[0].id_campania),
            nombre: String(dupRows[0].nombre || ""),
            estado: String(dupRows[0].estado || ""),
          },
        },
        { status: 409 }
      );
    }

    const [insertCamp] = await conn.execute<ResultSetHeader>(
      `
      INSERT INTO campanias (
        id_audiencia,
        nombre,
        tipo,
        plantilla,
        idioma,
        estado,
        total_enviados,
        total_error,
        fecha_creacion,
        creado_por,
        observaciones,
        filtros_json,
        fecha_lanzamiento,
        ventana_analisis_dias,
        total_audiencia,
        total_entregados,
        total_leidos,
        total_respondieron,
        total_pagaron,
        monto_total_pagado
      ) VALUES (
        ?, ?, ?, ?, ?, 'BORRADOR',
        0, 0, NOW(), ?, ?, ?, ?, ?,
        ?, 0, 0, 0, 0, 0.00
      )
      `,
      [
        idAudiencia,
        nombre,
        tipo,
        plantilla,
        idioma,
        creadoPor,
        observaciones,
        audiencia.filtros_json,
        fechaLanzamiento,
        ventanaAnalisisDias,
        totalValidos,
      ]
    );

    const idCampania = Number(insertCamp.insertId);

    await conn.commit();

    return NextResponse.json({
      ok: true,
      idCampania,
      message: "Campaña creada correctamente desde la audiencia.",
      resumen: {
        idAudiencia,
        audienciaNombre: audiencia.nombre,
        totalClientes,
        totalValidos,
        totalInvalidos,
        totalAudiencia: totalValidos,
        plantilla,
        idioma,
        tipo,
        ventanaAnalisisDias,
      },
    });
  } catch (e: any) {
    try {
      if (conn) await conn.rollback();
    } catch {}

    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  } finally {
    try {
      conn?.release();
    } catch {}
  }
}