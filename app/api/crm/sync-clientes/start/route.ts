import { NextResponse } from "next/server";
import mysql from "mysql2/promise";
import { crmPool } from "@/lib/db-crm";

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
    categoria?: string | null;
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

function safeInt(value: any, fallback: number, min: number, max: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

function safeNumberOrNull(value: any) {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function assertViewName(view: string) {
  if (!/^[a-zA-Z0-9_]+$/.test(view)) {
    throw new Error("Nombre de vista inválido.");
  }
}

function isValidDateOnly(value: string | null): boolean {
  if (!value) return true;
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function createJob(jobId: string, filtersJson: string | null) {
  await crmPool.execute(
    `
    INSERT INTO crm_sync_jobs (
      job_id, status, stage, progress,
      total_leidos, total_procesados, total_validos, total_invalidos,
      error_text, filters_json, started_at, finished_at
    ) VALUES (?, 'idle', 'created', 0, 0, 0, 0, 0, NULL, ?, NOW(), NULL)
    `,
    [jobId, filtersJson]
  );
}

async function appendLog(
  jobId: string,
  level: "info" | "success" | "error",
  message: string
) {
  await crmPool.execute(
    `
    INSERT INTO crm_sync_job_logs (job_id, level, message)
    VALUES (?, ?, ?)
    `,
    [jobId, level, message]
  );
}

async function updateJob(
  jobId: string,
  patch: {
    status?: "idle" | "running" | "success" | "error";
    stage?: string;
    progress?: number;
    totalLeidos?: number;
    totalProcesados?: number;
    totalValidos?: number;
    totalInvalidos?: number;
    errorText?: string | null;
    finished?: boolean;
  }
) {
  const sets: string[] = [];
  const params: any[] = [];

  if (patch.status !== undefined) {
    sets.push("status = ?");
    params.push(patch.status);
  }
  if (patch.stage !== undefined) {
    sets.push("stage = ?");
    params.push(patch.stage);
  }
  if (patch.progress !== undefined) {
    sets.push("progress = ?");
    params.push(patch.progress);
  }
  if (patch.totalLeidos !== undefined) {
    sets.push("total_leidos = ?");
    params.push(patch.totalLeidos);
  }
  if (patch.totalProcesados !== undefined) {
    sets.push("total_procesados = ?");
    params.push(patch.totalProcesados);
  }
  if (patch.totalValidos !== undefined) {
    sets.push("total_validos = ?");
    params.push(patch.totalValidos);
  }
  if (patch.totalInvalidos !== undefined) {
    sets.push("total_invalidos = ?");
    params.push(patch.totalInvalidos);
  }
  if (patch.errorText !== undefined) {
    sets.push("error_text = ?");
    params.push(patch.errorText);
  }
  if (patch.finished) {
    sets.push("finished_at = NOW()");
  }

  if (!sets.length) return;

  params.push(jobId);

  await crmPool.execute(
    `
    UPDATE crm_sync_jobs
    SET ${sets.join(", ")}
    WHERE job_id = ?
    `,
    params
  );
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as SyncPayload;

    if (!body?.local || !body?.cloud) {
      return NextResponse.json(
        { ok: false, error: "Payload inválido." },
        { status: 400 }
      );
    }

    const localHost = String(body.local.host || "").trim();
    const localPort = safeInt(body.local.port ?? 3306, 3306, 1, 65535);
    const localDb = String(body.local.database || "").trim();
    const localUser = String(body.local.user || "").trim();
    const localPass = String(body.local.password || "");
    const localView = String(body.local.view || "").trim();

    const cloudHost = String(body.cloud.host || "").trim();
    const cloudPort = safeInt(body.cloud.port ?? 3306, 3306, 1, 65535);
    const cloudDb = String(body.cloud.database || "").trim();
    const cloudUser = String(body.cloud.user || "").trim();
    const cloudPass = String(body.cloud.password || "");

    const categoria = String(body.filters?.categoria || "").trim() || null;
    const zona = String(body.filters?.zona || "").trim() || null;
    const ultimoPagoDesde =
      String(body.filters?.ultimoPagoDesde || "").trim() || null;
    const ultimoPagoHasta =
      String(body.filters?.ultimoPagoHasta || "").trim() || null;
    const diasAtrasoMin = safeNumberOrNull(body.filters?.diasAtrasoMin);
    const saldoMin = safeNumberOrNull(body.filters?.saldoMin);
    const soloTelefonosValidos = body.filters?.soloTelefonosValidos !== false;

    const limit = body.options?.limit
      ? safeInt(body.options.limit, 100, 1, 200000)
      : null;

    if (!localHost || !localDb || !localUser || !localView) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la base local." },
        { status: 400 }
      );
    }

    if (!cloudHost || !cloudDb || !cloudUser) {
      return NextResponse.json(
        { ok: false, error: "Faltan datos de la base nube." },
        { status: 400 }
      );
    }

    assertViewName(localView);

    if (!isValidDateOnly(ultimoPagoDesde)) {
      return NextResponse.json(
        { ok: false, error: "ultimoPagoDesde debe tener formato YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (!isValidDateOnly(ultimoPagoHasta)) {
      return NextResponse.json(
        { ok: false, error: "ultimoPagoHasta debe tener formato YYYY-MM-DD." },
        { status: 400 }
      );
    }

    if (ultimoPagoDesde && ultimoPagoHasta && ultimoPagoDesde > ultimoPagoHasta) {
      return NextResponse.json(
        {
          ok: false,
          error: "ultimoPagoDesde no puede ser mayor que ultimoPagoHasta.",
        },
        { status: 400 }
      );
    }

    const jobId =
      Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);

    const filtersObject = {
      categoria,
      zona,
      ultimoPagoDesde,
      ultimoPagoHasta,
      diasAtrasoMin,
      saldoMin,
      soloTelefonosValidos,
      limit,
      localView,
    };

    const filtersJson = JSON.stringify(filtersObject);

    await createJob(jobId, filtersJson);
    await appendLog(jobId, "info", "Job creado. Iniciando sincronización filtrada...");
    await appendLog(
      jobId,
      "info",
      `Filtros -> categoria: ${categoria ?? "(todas)"}, zona: ${zona ?? "(todas)"}, ultimo_pago_desde: ${ultimoPagoDesde ?? "(sin filtro)"}, ultimo_pago_hasta: ${ultimoPagoHasta ?? "(sin filtro)"}, dias_atraso_min: ${diasAtrasoMin ?? "(sin filtro)"}, saldo_min: ${saldoMin ?? "(sin filtro)"}, solo_validos: ${soloTelefonosValidos ? "SI" : "NO"}`
    );

    void runSyncJob(jobId, {
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
      categoria,
      zona,
      ultimoPagoDesde,
      ultimoPagoHasta,
      diasAtrasoMin,
      saldoMin,
      soloTelefonosValidos,
      limit,
    });

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

async function runSyncJob(
  jobId: string,
  cfg: {
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
    categoria: string | null;
    zona: string | null;
    ultimoPagoDesde: string | null;
    ultimoPagoHasta: string | null;
    diasAtrasoMin: number | null;
    saldoMin: number | null;
    soloTelefonosValidos: boolean;
    limit: number | null;
  }
) {
  let localConn: mysql.Connection | null = null;
  let cloudConn: mysql.Connection | null = null;

  try {
    await updateJob(jobId, {
      status: "running",
      stage: "connecting_local",
      progress: 5,
    });
    await appendLog(jobId, "info", "Conectando a base local...");

    localConn = await mysql.createConnection({
      host: cfg.localHost,
      port: cfg.localPort,
      user: cfg.localUser,
      password: cfg.localPass,
      database: cfg.localDb,
      charset: "utf8mb4",
      connectTimeout: 15000,
    });

    await appendLog(jobId, "success", "Conexión local OK.");

    await updateJob(jobId, {
      stage: "reading_local",
      progress: 15,
    });
    await appendLog(jobId, "info", "Construyendo consulta con filtros...");

    const where: string[] = ["1=1"];
    const params: any[] = [];

    if (cfg.categoria) {
      where.push("categoria = ?");
      params.push(cfg.categoria);
    }

    if (cfg.zona) {
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

    const limitSql = cfg.limit ? ` LIMIT ${cfg.limit}` : "";

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
        categoria,
        zona
      FROM ${cfg.localView}
      WHERE ${where.join(" AND ")}
      ${limitSql}
    `;

    await appendLog(jobId, "info", "Leyendo vista local filtrada...");

    const [rowsRaw] = await localConn.query(sqlLocal, params);
    const rows = rowsRaw as any[];

    await updateJob(jobId, {
      totalLeidos: rows.length,
      progress: 30,
    });
    await appendLog(jobId, "success", `Vista leída. Registros encontrados: ${rows.length}`);

    if (!rows.length) {
      await updateJob(jobId, {
        status: "success",
        stage: "finished",
        progress: 100,
        finished: true,
      });
      await appendLog(
        jobId,
        "success",
        "No hay registros para sincronizar con los filtros aplicados."
      );
      return;
    }

    await updateJob(jobId, {
      stage: "connecting_cloud",
      progress: 35,
    });
    await appendLog(jobId, "info", "Conectando a base nube...");

    cloudConn = await mysql.createConnection({
      host: cfg.cloudHost,
      port: cfg.cloudPort,
      user: cfg.cloudUser,
      password: cfg.cloudPass,
      database: cfg.cloudDb,
      charset: "utf8mb4",
      connectTimeout: 15000,
    });

    await appendLog(jobId, "success", "Conexión nube OK.");

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
        categoria,
        zona,
        seleccionado_para_campania,
        fecha_sync
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW()
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
        categoria = VALUES(categoria),
        zona = VALUES(zona),
        seleccionado_para_campania = 1,
        fecha_sync = NOW()
    `;

    await cloudConn.beginTransaction();

    await updateJob(jobId, {
      stage: "upserting",
      progress: 40,
    });
    await appendLog(jobId, "info", "Insertando/actualizando registros en crm_clientes_sync...");

    let totalValidos = 0;
    let totalInvalidos = 0;
    let totalProcesados = 0;

    for (const r of rows) {
      const telefonoValido = Number(r.telefono_valido ?? 0) === 1 ? 1 : 0;

      if (telefonoValido === 1) totalValidos++;
      else totalInvalidos++;

      await cloudConn.execute(sqlUpsert, [
        jobId,
        r.codCliente ?? null,
        r.cliente ?? null,
        r.celular_original ?? null,
        r.telefono_original ?? null,
        r.telefono_fuente ?? "NINGUNO",
        r.telefono_raw ?? null,
        r.telefono_normalizado ?? null,
        telefonoValido,
        r.motivo_telefono_invalido ?? null,
        Number(r.requiere_revision ?? 0) === 1 ? 1 : 0,
        Number(r.dias_atraso ?? 0),
        r.ultimo_pago ?? null,
        Number(r.saldo ?? 0),
        r.categoria ?? null,
        r.zona ?? null,
      ]);

      totalProcesados++;

      if (
        totalProcesados === 1 ||
        totalProcesados % 25 === 0 ||
        totalProcesados === rows.length
      ) {
        const progress = Math.round(40 + (totalProcesados / rows.length) * 55);

        await updateJob(jobId, {
          progress: Math.min(progress, 95),
          totalProcesados,
          totalValidos,
          totalInvalidos,
        });

        await appendLog(
          jobId,
          "info",
          `Procesados ${totalProcesados}/${rows.length} | válidos: ${totalValidos} | inválidos: ${totalInvalidos}`
        );
      }
    }

    await cloudConn.commit();

    await updateJob(jobId, {
      status: "success",
      stage: "finished",
      progress: 100,
      totalProcesados,
      totalValidos,
      totalInvalidos,
      finished: true,
    });

    await appendLog(jobId, "success", "Sincronización filtrada completada correctamente.");
  } catch (e: any) {
    try {
      if (cloudConn) await cloudConn.rollback();
    } catch {}

    await updateJob(jobId, {
      status: "error",
      stage: "failed",
      errorText: e?.message || String(e),
      finished: true,
    });

    await appendLog(jobId, "error", `Error: ${e?.message || String(e)}`);
  } finally {
    try {
      if (localConn) await localConn.end();
    } catch {}
    try {
      if (cloudConn) await cloudConn.end();
    } catch {}
  }
}