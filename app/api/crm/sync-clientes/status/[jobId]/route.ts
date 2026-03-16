import { NextResponse } from "next/server";
import { crmPool } from "@/lib/db-crm";
import type { RowDataPacket } from "mysql2/promise";

export const runtime = "nodejs";

type JobRow = RowDataPacket & {
  job_id: string;
  status: "idle" | "running" | "success" | "error";
  stage: string;
  progress: number;
  total_leidos: number;
  total_procesados: number;
  total_validos: number;
  total_invalidos: number;
  error_text: string | null;
  started_at: string;
  finished_at: string | null;
};

type LogRow = RowDataPacket & {
  level: "info" | "success" | "error";
  message: string;
  created_at: string;
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await context.params;

    const [jobs] = await crmPool.query<JobRow[]>(
      `
      SELECT
        job_id,
        status,
        stage,
        progress,
        total_leidos,
        total_procesados,
        total_validos,
        total_invalidos,
        error_text,
        started_at,
        finished_at
      FROM crm_sync_jobs
      WHERE job_id = ?
      LIMIT 1
      `,
      [jobId]
    );

    if (!jobs.length) {
      return NextResponse.json(
        { ok: false, error: "Job no encontrado." },
        { status: 404 }
      );
    }

    const [logs] = await crmPool.query<LogRow[]>(
      `
      SELECT level, message, created_at
      FROM crm_sync_job_logs
      WHERE job_id = ?
      ORDER BY id ASC
      `,
      [jobId]
    );

    const row = jobs[0];

    return NextResponse.json({
      ok: true,
      job: {
        id: row.job_id,
        status: row.status,
        stage: row.stage,
        progress: Number(row.progress ?? 0),
        totalLeidos: Number(row.total_leidos ?? 0),
        totalProcesados: Number(row.total_procesados ?? 0),
        totalValidos: Number(row.total_validos ?? 0),
        totalInvalidos: Number(row.total_invalidos ?? 0),
        startedAt: row.started_at,
        finishedAt: row.finished_at,
        error: row.error_text,
        logs: logs.map((l) => ({
          ts: l.created_at,
          level: l.level,
          message: l.message,
        })),
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}