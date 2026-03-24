import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type AudienceHeaderRow = RowDataPacket & {
  id_audiencia: number;
  nombre: string;
  descripcion: string | null;
  filtros_json: string | null;
  origen: string;
  job_id_origen: string | null;
  total_clientes: number;
  total_validos: number;
  total_invalidos: number;
  creado_por: string | null;
  fecha_creacion: string | null;
  estado: string;
};

type AudienceSummaryRow = RowDataPacket & {
  totalDetalle: number;
  saldoTotal: number;
  clientesConTelefono: number;
  clientesSinTelefono: number;
  clientesTelefonoValido: number;
  clientesRequierenRevision: number;
};

type AudienceDetailRow = RowDataPacket & {
  id_detalle: number;
  id_audiencia: number;
  cod_cliente: number;
  cliente: string;
  telefono: string | null;
  telefono_valido: number;
  motivo_telefono_invalido: string | null;
  requiere_revision: number;
  dias_atraso: number | null;
  saldo: number | null;
  ultimo_pago: string | null;
  categoria: string | null;
  zona: string | null;
  estado_envio: string | null;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const idAudiencia = Number(id);

    if (!Number.isInteger(idAudiencia) || idAudiencia <= 0) {
      return NextResponse.json(
        { ok: false, error: "ID de audiencia inválido." },
        { status: 400 }
      );
    }

    const [audRows] = await crmPool.query<AudienceHeaderRow[]>(
      `
      SELECT
        id_audiencia,
        nombre,
        descripcion,
        filtros_json,
        origen,
        job_id_origen,
        total_clientes,
        total_validos,
        total_invalidos,
        creado_por,
        fecha_creacion,
        estado
      FROM crm_audiencias
      WHERE id_audiencia = ?
      LIMIT 1
      `,
      [idAudiencia]
    );

    if (!audRows.length) {
      return NextResponse.json(
        { ok: false, error: "Audiencia no encontrada." },
        { status: 404 }
      );
    }

    const [summaryRows] = await crmPool.query<AudienceSummaryRow[]>(
      `
      SELECT
        COUNT(*) AS totalDetalle,
        COALESCE(SUM(saldo), 0) AS saldoTotal,
        COALESCE(SUM(CASE WHEN telefono IS NOT NULL AND telefono <> '' THEN 1 ELSE 0 END), 0) AS clientesConTelefono,
        COALESCE(SUM(CASE WHEN telefono IS NULL OR telefono = '' THEN 1 ELSE 0 END), 0) AS clientesSinTelefono,
        COALESCE(SUM(CASE WHEN telefono_valido = 1 THEN 1 ELSE 0 END), 0) AS clientesTelefonoValido,
        COALESCE(SUM(CASE WHEN requiere_revision = 1 THEN 1 ELSE 0 END), 0) AS clientesRequierenRevision
      FROM crm_audiencia_detalle
      WHERE id_audiencia = ?
      `,
      [idAudiencia]
    );

	const [detailRows] = await crmPool.query<AudienceDetailRow[]>(
	  `
	  SELECT
		id_detalle,
		id_audiencia,
		cod_cliente,
		cliente,
		telefono,
		telefono_valido,
		motivo_telefono_invalido,
		requiere_revision,
		dias_atraso,
		saldo,
		ultimo_pago,
		categoria,
		zona,
		estado_envio
	  FROM crm_audiencia_detalle
	  WHERE id_audiencia = ?
	  ORDER BY cliente ASC
	  `,
	  [idAudiencia]
	);

    const audiencia = audRows[0];
    const resumen = summaryRows[0] || {
      totalDetalle: 0,
      saldoTotal: 0,
      clientesConTelefono: 0,
      clientesSinTelefono: 0,
      clientesTelefonoValido: 0,
      clientesRequierenRevision: 0,
    };

    return NextResponse.json({
      ok: true,
      audiencia: {
        idAudiencia: Number(audiencia.id_audiencia),
        nombre: audiencia.nombre,
        descripcion: audiencia.descripcion,
        filtrosJson: audiencia.filtros_json,
        origen: audiencia.origen,
        jobIdOrigen: audiencia.job_id_origen,
        totalClientes: Number(audiencia.total_clientes ?? 0),
        totalValidos: Number(audiencia.total_validos ?? 0),
        totalInvalidos: Number(audiencia.total_invalidos ?? 0),
        creadoPor: audiencia.creado_por,
        fechaCreacion: audiencia.fecha_creacion,
        estado: audiencia.estado,
      },
      resumen: {
        totalDetalle: Number(resumen.totalDetalle ?? 0),
        saldoTotal: Number(resumen.saldoTotal ?? 0),
        clientesConTelefono: Number(resumen.clientesConTelefono ?? 0),
        clientesSinTelefono: Number(resumen.clientesSinTelefono ?? 0),
        clientesTelefonoValido: Number(resumen.clientesTelefonoValido ?? 0),
        clientesRequierenRevision: Number(resumen.clientesRequierenRevision ?? 0),
      },
		detalle: detailRows.map((row) => ({
		  idDetalle: Number(row.id_detalle),
		  idAudiencia: Number(row.id_audiencia),
		  codCliente: Number(row.cod_cliente),
		  cliente: row.cliente,
		  telefono: row.telefono,
		  telefonoValido: Number(row.telefono_valido ?? 0),
		  motivoTelefonoInvalido: row.motivo_telefono_invalido,
		  requiereRevision: Number(row.requiere_revision ?? 0),
		  diasAtraso: row.dias_atraso == null ? null : Number(row.dias_atraso),
		  saldo: row.saldo == null ? 0 : Number(row.saldo),
		  ultimoPago: row.ultimo_pago,
		  categoria: row.categoria,
		  zona: row.zona,
		  estadoEnvio: row.estado_envio,
		})),
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}