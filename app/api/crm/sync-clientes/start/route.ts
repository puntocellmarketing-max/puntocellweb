import { NextResponse } from "next/server";
import mysql from "mysql2/promise";

export const runtime = "nodejs";

type SyncPayload = {
  local: {
    host: string;
    port?: number;
    database: string;
    user: string;
    password?: string;
    view: string;
  };
  cloud: {
    host: string;
    port?: number;
    database: string;
    user: string;
    password?: string;
  };
  filters?: {
    codCategoria?: number | null;
    categoria?: string | null;
    codZona?: number | null;
    zona?: string | null;
    ultimoPagoDesde?: string | null;
    ultimoPagoHasta?: string | null;
    diasAtrasoMin?: number | null;
    saldoMin?: number | null;
    soloTelefonosValidos?: boolean;
  };
  options?: {
    limit?: number | null;
  };
};

type JobUpdate = {
  status?: "idle" | "running" | "success" | "error";
  stage?: string | null;
  progress?: number | null;
  totalLeidos?: number | null;
  totalProcesados?: number | null;
  totalValidos?: number | null;
  totalInvalidos?: number | null;
  finished?: boolean;
  errorText?: string | null;
};

type RunSyncConfig = {
  localHost: string;
  localPort: number;
  localDb: string;
  localUser: string;
  localPass: string;
  localView: string;
  cloudHost: string;
  cloudPort: number;
  cloudDb: string;
  cloudUser: string;
  cloudPass: string;
  codCategoria: number | null;
  categoria: string | null;
  codZona: number | null;
  zona: string | null;
  ultimoPagoDesde: string | null;
  ultimoPagoHasta: string | null;
  diasAtrasoMin: number | null;
  saldoMin: number | null;
  soloTelefonosValidos: boolean;
  limit: number | null;
};

function safeNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeStringOrNull(value: unknown): string | null {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

function sanitizeViewName(view: string): string {
  const clean = String(view || "").trim();
  if (!/^[A-Za-z0-9_$.]+$/.test(clean)) {
    throw new Error("Nombre de vista inválido.");
  }
  return clean;
}

function createJobId(): string {
  return `${Math.random().toString(36).slice(2, 10)}-${Date.now()
    .toString(36)
    .slice(-6)}`;
}

async function openCloudConnection(cfg: RunSyncConfig) {
  return mysql.createConnection({
    host: cfg.cloudHost,
    port: cfg.cloudPort,
    user: cfg.cloudUser,
    password: cfg.cloudPass,
    database: cfg.cloudDb,
    charset: "utf8mb4",
    connectTimeout: 15000,
  });
}

async function appendLog(
  jobId: string,
  level: string,
  message: string,
  cfg: RunSyncConfig
) {
  const conn = await openCloudConnection(cfg);
  try {
    await conn.execute(
      `
      INSERT INTO crm_sync_job_logs (
        job_id,
        level,
        message
      ) VALUES (?, ?, ?)
      `,
      [jobId, level, message]
    );
  } finally {
    await conn.end();
  }
}

async function updateJob(jobId: string, data: JobUpdate, cfg: RunSyncConfig) {
  const conn = await openCloudConnection(cfg);
  try {
    const fields: string[] = [];
    const params: any[] = [];

    if (data.status !== undefined) {
      fields.push("status = ?");
      params.push(data.status);
    }
    if (data.stage !== undefined) {
      fields.push("stage = ?");
      params.push(data.stage);
    }
    if (data.progress !== undefined) {
      fields.push("progress = ?");
      params.push(data.progress);
    }
    if (data.totalLeidos !== undefined) {
      fields.push("total_leidos = ?");
      params.push(data.totalLeidos);
    }
    if (data.totalProcesados !== undefined) {
      fields.push("total_procesados = ?");
      params.push(data.totalProcesados);
    }
    if (data.totalValidos !== undefined) {
      fields.push("total_validos = ?");
      params.push(data.totalValidos);
    }
    if (data.totalInvalidos !== undefined) {
      fields.push("total_invalidos = ?");
      params.push(data.totalInvalidos);
    }
    if (data.errorText !== undefined) {
      fields.push("error_text = ?");
      params.push(data.errorText);
    }
    if (data.finished === true) {
      fields.push("finished_at = NOW()");
    }

    if (!fields.length) return;

    await conn.execute(
      `
      UPDATE crm_sync_jobs
      SET ${fields.join(", ")}
      WHERE job_id = ?
      `,
      [...params, jobId]
    );
  } finally {
    await conn.end();
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SyncPayload;

    const localHost = safeStringOrNull(body.local?.host);
    const localPort = safeNumberOrNull(body.local?.port) ?? 3306;
    const localDb = safeStringOrNull(body.local?.database);
    const localUser = safeStringOrNull(body.local?.user);
    const localPass = String(body.local?.password ?? "");
    const localView = sanitizeViewName(body.local?.view || "");

    const cloudHost = safeStringOrNull(body.cloud?.host);
    const cloudPort = safeNumberOrNull(body.cloud?.port) ?? 3306;
    const cloudDb = safeStringOrNull(body.cloud?.database);
    const cloudUser = safeStringOrNull(body.cloud?.user);
    const cloudPass = String(body.cloud?.password ?? "");

    if (!localHost || !localDb || !localUser) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de conexión local." },
        { status: 400 }
      );
    }

    if (!cloudHost || !cloudDb || !cloudUser) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de conexión nube." },
        { status: 400 }
      );
    }

    const codCategoria = safeNumberOrNull(body.filters?.codCategoria);
    const categoria = safeStringOrNull(body.filters?.categoria);

    const codZona = safeNumberOrNull(body.filters?.codZona);
    const zona = safeStringOrNull(body.filters?.zona);

    const ultimoPagoDesde = safeStringOrNull(body.filters?.ultimoPagoDesde);
    const ultimoPagoHasta = safeStringOrNull(body.filters?.ultimoPagoHasta);
    const diasAtrasoMin = safeNumberOrNull(body.filters?.diasAtrasoMin);
    const saldoMin = safeNumberOrNull(body.filters?.saldoMin);
    const soloTelefonosValidos = Boolean(body.filters?.soloTelefonosValidos);
    const limit = safeNumberOrNull(body.options?.limit);

    const cfg: RunSyncConfig = {
      localHost,
      localPort,
      localDb,
      localUser,
      localPass,
      localView,
      cloudHost,
      cloudPort,
      cloudDb,
      cloudUser,
      cloudPass,
      codCategoria,
      categoria,
      codZona,
      zona,
      ultimoPagoDesde,
      ultimoPagoHasta,
      diasAtrasoMin,
      saldoMin,
      soloTelefonosValidos,
      limit,
    };

    const filtersObject = {
      codCategoria,
      categoria,
      codZona,
      zona,
      ultimoPagoDesde,
      ultimoPagoHasta,
      diasAtrasoMin,
      saldoMin,
      soloTelefonosValidos,
      limit,
      localView,
    };

    const jobId = createJobId();

    const cloudConn = await openCloudConnection(cfg);
    try {
      await cloudConn.execute(
        `
        INSERT INTO crm_sync_jobs (
          job_id,
          status,
          stage,
          progress,
          filters_json,
          total_leidos,
          total_procesados,
          total_validos,
          total_invalidos,
          error_text,
          started_at,
          finished_at
        ) VALUES (?, 'idle', 'queued', 0, ?, 0, 0, 0, 0, NULL, NOW(), NULL)
        `,
        [jobId, JSON.stringify(filtersObject)]
      );

      await cloudConn.execute(
        `
        INSERT INTO crm_sync_job_logs (
          job_id,
          level,
          message
        ) VALUES (?, 'info', ?)
        `,
        [
          jobId,
          `Sync iniciado. codCategoria: ${codCategoria ?? "(sin filtro)"}, categoria: ${
            categoria ?? "(sin filtro)"
          }, codZona: ${codZona ?? "(sin filtro)"}, zona: ${
            zona ?? "(sin filtro)"
          }, ultimo_pago_desde: ${ultimoPagoDesde ?? "(sin filtro)"}, ultimo_pago_hasta: ${
            ultimoPagoHasta ?? "(sin filtro)"
          }, dias_atraso_min: ${diasAtrasoMin ?? "(sin filtro)"}, saldo_min: ${
            saldoMin ?? "(sin filtro)"
          }, solo_validos: ${soloTelefonosValidos ? "SI" : "NO"}`
        ]
      );
    } finally {
      await cloudConn.end();
    }

    void runSyncJob(jobId, cfg);

    return NextResponse.json({
      ok: true,
      jobId,
      message: "Sincronización filtrada iniciada.",
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

async function runSyncJob(jobId: string, cfg: RunSyncConfig) {
  let localConn: mysql.Connection | null = null;
  let cloudConn: mysql.Connection | null = null;

  try {
    await updateJob(
      jobId,
      {
        status: "running",
        stage: "connecting_local",
        progress: 5,
      },
      cfg
    );
    await appendLog(jobId, "info", "Conectando a base local.", cfg);

    localConn = await mysql.createConnection({
      host: cfg.localHost,
      port: cfg.localPort,
      user: cfg.localUser,
      password: cfg.localPass,
      database: cfg.localDb,
      charset: "utf8mb4",
      connectTimeout: 15000,
    });

    await appendLog(jobId, "success", "Conexión local OK.", cfg);

    await updateJob(
      jobId,
      {
        stage: "reading_local",
        progress: 15,
      },
      cfg
    );
    await appendLog(jobId, "info", "Construyendo consulta con filtros...", cfg);

    const where: string[] = ["1=1"];
    const params: any[] = [];

    if (cfg.codCategoria !== null) {
      where.push("codCategoria = ?");
      params.push(cfg.codCategoria);
    } else if (cfg.categoria) {
      where.push("categoria = ?");
      params.push(cfg.categoria);
    }

    if (cfg.codZona !== null) {
      where.push("codZona = ?");
      params.push(cfg.codZona);
    } else if (cfg.zona) {
      where.push("zona = ?");
      params.push(cfg.zona);
    }

    if (cfg.ultimoPagoDesde) {
      where.push("DATE(ultimo_pago) >= ?");
      params.push(cfg.ultimoPagoDesde);
    }

    if (cfg.ultimoPagoHasta) {
      where.push("DATE(ultimo_pago) <= ?");
      params.push(cfg.ultimoPagoHasta);
    }

    if (cfg.diasAtrasoMin !== null) {
      where.push("dias_atraso >= ?");
      params.push(cfg.diasAtrasoMin);
    }

    if (cfg.saldoMin !== null) {
      where.push("saldo >= ?");
      params.push(cfg.saldoMin);
    }

    if (cfg.soloTelefonosValidos) {
      where.push("telefono_valido = 1");
    }

    const limitSql = cfg.limit && cfg.limit > 0 ? ` LIMIT ${cfg.limit}` : "";

    const sqlLocal = `
      SELECT
        codCliente,
        cliente,
        celular_original,
        telefono_original,
        telefono_fuente,
        telefono_raw,
        telefono AS telefono_normalizado,
        telefono_valido,
        motivo_telefono_invalido,
        requiere_revision,
        dias_atraso,
        ultimo_pago,
        saldo,
        codCategoria,
        categoria,
        codZona,
        zona
      FROM ${cfg.localView}
      WHERE ${where.join(" AND ")}
      ${limitSql}
    `;

    await appendLog(jobId, "info", "Leyendo vista local filtrada.", cfg);

    const [rowsRaw] = await localConn.query(sqlLocal, params);
    const rows = rowsRaw as any[];

    await updateJob(
      jobId,
      {
        totalLeidos: rows.length,
        progress: 30,
      },
      cfg
    );
    await appendLog(
      jobId,
      "success",
      `Vista leída. Registros encontrados: ${rows.length}`,
      cfg
    );

    if (!rows.length) {
      await updateJob(
        jobId,
        {
          status: "success",
          stage: "finished",
          progress: 100,
          finished: true,
        },
        cfg
      );
      await appendLog(
        jobId,
        "success",
        "No hay registros para sincronizar con los filtros aplicados.",
        cfg
      );
      return;
    }

    await updateJob(
      jobId,
      {
        stage: "connecting_cloud",
        progress: 35,
      },
      cfg
    );
    await appendLog(jobId, "info", "Conectando a base nube...", cfg);

    cloudConn = await openCloudConnection(cfg);

    await appendLog(jobId, "success", "Conexión nube OK.", cfg);

    const sqlUpsert = `
      INSERT INTO crm_clientes_sync (
        job_id,
        cod_cliente,
        cliente,
        celular_original,
        telefono_original,
        telefono_fuente,
        telefono_raw,
        telefono_normalizado,
        telefono_valido,
        motivo_telefono_invalido,
        requiere_revision,
        dias_atraso,
        ultimo_pago,
        saldo,
        cod_categoria,
        categoria,
        cod_zona,
        zona,
        seleccionado_para_campania,
        fecha_sync,
        fecha_actualizacion
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW()
      )
      ON DUPLICATE KEY UPDATE
        job_id = VALUES(job_id),
        cliente = VALUES(cliente),
        celular_original = VALUES(celular_original),
        telefono_original = VALUES(telefono_original),
        telefono_fuente = VALUES(telefono_fuente),
        telefono_raw = VALUES(telefono_raw),
        telefono_normalizado = VALUES(telefono_normalizado),
        telefono_valido = VALUES(telefono_valido),
        motivo_telefono_invalido = VALUES(motivo_telefono_invalido),
        requiere_revision = VALUES(requiere_revision),
        dias_atraso = VALUES(dias_atraso),
        ultimo_pago = VALUES(ultimo_pago),
        saldo = VALUES(saldo),
        cod_categoria = VALUES(cod_categoria),
        categoria = VALUES(categoria),
        cod_zona = VALUES(cod_zona),
        zona = VALUES(zona),
        seleccionado_para_campania = 1,
        fecha_actualizacion = NOW()
    `;

    let processed = 0;
    let validos = 0;
    let invalidos = 0;

    await updateJob(
      jobId,
      {
        stage: "writing_cloud",
        progress: 45,
      },
      cfg
    );

    for (const row of rows) {
      const telefonoValido = Number(row.telefono_valido ?? 0);
      if (telefonoValido === 1) validos += 1;
      else invalidos += 1;

      await cloudConn.execute(sqlUpsert, [
        jobId,
        Number(row.codCliente),
        row.cliente ?? null,
        row.celular_original ?? null,
        row.telefono_original ?? null,
        row.telefono_fuente ?? null,
        row.telefono_raw ?? null,
        row.telefono_normalizado ?? null,
        telefonoValido,
        row.motivo_telefono_invalido ?? null,
        Number(row.requiere_revision ?? 0),
        row.dias_atraso == null ? null : Number(row.dias_atraso),
        row.ultimo_pago ?? null,
        row.saldo == null ? 0 : Number(row.saldo),
        row.codCategoria == null ? null : Number(row.codCategoria),
        row.categoria ?? null,
        row.codZona == null ? null : Number(row.codZona),
        row.zona ?? null,
      ]);

      processed += 1;

      if (processed % 50 === 0 || processed === rows.length) {
        const progress = Math.min(95, 45 + Math.round((processed / rows.length) * 50));

        await updateJob(
          jobId,
          {
            totalProcesados: processed,
            totalValidos: validos,
            totalInvalidos: invalidos,
            progress,
          },
          cfg
        );
      }
    }

    await updateJob(
      jobId,
      {
        status: "success",
        stage: "finished",
        progress: 100,
        totalProcesados: processed,
        totalValidos: validos,
        totalInvalidos: invalidos,
        finished: true,
      },
      cfg
    );

    await appendLog(
      jobId,
      "success",
      `Sincronización completada. Procesados: ${processed}, válidos: ${validos}, inválidos: ${invalidos}.`,
      cfg
    );
  } catch (e: any) {
    const msg = e?.message || String(e);

    try {
      await updateJob(
        jobId,
        {
          status: "error",
          stage: "failed",
          progress: 100,
          errorText: msg,
          finished: true,
        },
        cfg
      );
      await appendLog(jobId, "error", msg, cfg);
    } catch {}

    console.error("SYNC CLIENTES ERROR:", e);
  } finally {
    if (localConn) {
      try {
        await localConn.end();
      } catch {}
    }
    if (cloudConn) {
      try {
        await cloudConn.end();
      } catch {}
    }
  }
}