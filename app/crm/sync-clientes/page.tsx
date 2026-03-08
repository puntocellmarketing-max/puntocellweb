"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

type FormState = {
  localHost: string;
  localPort: string;
  localDatabase: string;
  localUser: string;
  localPassword: string;
  localView: string;

  cloudHost: string;
  cloudPort: string;
  cloudDatabase: string;
  cloudUser: string;
  cloudPassword: string;

  categoria: string;
  zona: string;
  ultimoPagoDesde: string;
  ultimoPagoHasta: string;
  diasAtrasoMin: string;
  saldoMin: string;
  soloTelefonosValidos: boolean;

  limit: string;
};

type SyncJob = {
  id: string;
  status: "idle" | "running" | "success" | "error";
  stage: string;
  progress: number;
  totalLeidos: number;
  totalProcesados: number;
  totalValidos: number;
  totalInvalidos: number;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
  logs: {
    ts: string;
    level: "info" | "error" | "success";
    message: string;
  }[];
};

export default function SyncClientesPage() {
  const [form, setForm] = useState<FormState>({
    localHost: "localhost",
    localPort: "3306",
    localDatabase: "",
    localUser: "root",
    localPassword: "",
    localView: "vw_crm_clientes_export",

    cloudHost: "",
    cloudPort: "3306",
    cloudDatabase: "railway",
    cloudUser: "root",
    cloudPassword: "",

    categoria: "",
    zona: "",
    ultimoPagoDesde: "",
    ultimoPagoHasta: "",
    diasAtrasoMin: "1",
    saldoMin: "1",
    soloTelefonosValidos: true,

    limit: "100",
  });

  const [loading, setLoading] = useState(false);
  const [job, setJob] = useState<SyncJob | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return (
      form.localHost.trim() &&
      form.localDatabase.trim() &&
      form.localUser.trim() &&
      form.localView.trim() &&
      form.cloudHost.trim() &&
      form.cloudDatabase.trim() &&
      form.cloudUser.trim()
    );
  }, [form]);

  async function fetchJobStatus(id: string) {
    const res = await fetch(`/api/crm/sync-clientes/status/${id}`, {
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok || !data?.ok) {
      throw new Error(data?.error || "No se pudo consultar el estado del job.");
    }

    const nextJob = data.job as SyncJob;
    setJob(nextJob);

    const terminado =
      nextJob.status === "success" ||
      nextJob.status === "error" ||
      (nextJob.totalLeidos > 0 &&
        nextJob.totalProcesados >= nextJob.totalLeidos);

    if (terminado) {
      setLoading(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }

      if (
        nextJob.status === "running" &&
        nextJob.totalLeidos > 0 &&
        nextJob.totalProcesados >= nextJob.totalLeidos
      ) {
        setJob({
          ...nextJob,
          status: "success",
          stage: "finished",
          progress: 100,
        });
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    setJob(null);

    try {
      const res = await fetch("/api/crm/sync-clientes/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          local: {
            host: form.localHost,
            port: Number(form.localPort || 3306),
            database: form.localDatabase,
            user: form.localUser,
            password: form.localPassword,
            view: form.localView,
          },
          cloud: {
            host: form.cloudHost,
            port: Number(form.cloudPort || 3306),
            database: form.cloudDatabase,
            user: form.cloudUser,
            password: form.cloudPassword,
          },
          filters: {
            categoria: form.categoria.trim() || null,
            zona: form.zona.trim() || null,
            ultimoPagoDesde: form.ultimoPagoDesde || null,
            ultimoPagoHasta: form.ultimoPagoHasta || null,
            diasAtrasoMin: form.diasAtrasoMin ? Number(form.diasAtrasoMin) : null,
            saldoMin: form.saldoMin ? Number(form.saldoMin) : null,
            soloTelefonosValidos: form.soloTelefonosValidos,
          },
          options: {
            limit: form.limit ? Number(form.limit) : null,
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo iniciar la sincronización.");
      }

      await fetchJobStatus(data.jobId);

      pollRef.current = setInterval(() => {
        fetchJobStatus(data.jobId).catch((err) => {
          setErrorMsg(err?.message || "Error consultando progreso.");
          setLoading(false);
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
        });
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err?.message || "Error inesperado.");
      setLoading(false);
    }
  }

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Sincronizar clientes
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Filtra la vista local y hace UPSERT en{" "}
              <span className="font-mono">crm_clientes_sync</span>.
            </p>
          </div>

          <Link
            href="/crm"
            className="inline-flex items-center rounded-xl border bg-white px-4 py-2 text-sm font-medium text-slate-900 shadow-sm hover:bg-slate-50"
          >
            Volver al CRM
          </Link>
        </div>

        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">Idea de uso</div>
          <div className="mt-1">
            Ejemplo: clientes con <span className="font-mono">Categoría=DEFINIR</span>,
            zona específica, último pago entre dos fechas, con atraso y saldo pendiente,
            listos para notificar por lotes.
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Base local
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Origen: vista local consolidada.
              </p>

              <div className="mt-4 grid gap-3">
                <Field label="Host" value={form.localHost} onChange={(v) => updateField("localHost", v)} />
                <Field label="Puerto" value={form.localPort} onChange={(v) => updateField("localPort", v)} />
                <Field label="Base de datos" value={form.localDatabase} onChange={(v) => updateField("localDatabase", v)} />
                <Field label="Usuario" value={form.localUser} onChange={(v) => updateField("localUser", v)} />
                <Field label="Password" type="password" value={form.localPassword} onChange={(v) => updateField("localPassword", v)} />
                <Field label="Vista" value={form.localView} onChange={(v) => updateField("localView", v)} />
              </div>
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">
                Base en la nube
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Destino: tabla crm_clientes_sync.
              </p>

              <div className="mt-4 grid gap-3">
                <Field label="Host" value={form.cloudHost} onChange={(v) => updateField("cloudHost", v)} />
                <Field label="Puerto" value={form.cloudPort} onChange={(v) => updateField("cloudPort", v)} />
                <Field label="Base de datos" value={form.cloudDatabase} onChange={(v) => updateField("cloudDatabase", v)} />
                <Field label="Usuario" value={form.cloudUser} onChange={(v) => updateField("cloudUser", v)} />
                <Field label="Password" type="password" value={form.cloudPassword} onChange={(v) => updateField("cloudPassword", v)} />
                <Field label="Límite para prueba (opcional)" value={form.limit} onChange={(v) => updateField("limit", v)} placeholder="Ej: 100" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">
              Filtros dinámicos
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Déjalos vacíos si no quieres aplicarlos.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Field
                label="Categoría"
                value={form.categoria}
                onChange={(v) => updateField("categoria", v)}
                placeholder="Ej: DEFINIR"
              />

              <Field
                label="Zona"
                value={form.zona}
                onChange={(v) => updateField("zona", v)}
                placeholder="Ej: Concepción"
              />

              <div className="grid gap-1 text-sm">
                <span className="text-slate-700">Último pago desde</span>
                <input
                  type="date"
                  value={form.ultimoPagoDesde}
                  onChange={(e) => updateField("ultimoPagoDesde", e.target.value)}
                  className="rounded-xl border px-3 py-2"
                />
              </div>

              <div className="grid gap-1 text-sm">
                <span className="text-slate-700">Último pago hasta</span>
                <input
                  type="date"
                  value={form.ultimoPagoHasta}
                  onChange={(e) => updateField("ultimoPagoHasta", e.target.value)}
                  className="rounded-xl border px-3 py-2"
                />
              </div>

              <Field
                label="Días de atraso mínimo"
                value={form.diasAtrasoMin}
                onChange={(v) => updateField("diasAtrasoMin", v)}
                placeholder="Ej: 1"
              />

              <Field
                label="Saldo mínimo"
                value={form.saldoMin}
                onChange={(v) => updateField("saldoMin", v)}
                placeholder="Ej: 1"
              />
            </div>

            <div className="mt-4">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={form.soloTelefonosValidos}
                  onChange={(e) => updateField("soloTelefonosValidos", e.target.checked)}
                />
                Solo teléfonos válidos
              </label>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!canSubmit || loading}
                className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? "Sincronizando..." : "Ejecutar sincronización"}
              </button>

              <div className="text-sm text-slate-500">
                Sube solo los clientes que cumplen los filtros definidos.
              </div>
            </div>

            {errorMsg && (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {errorMsg}
              </div>
            )}
          </div>
        </form>

        {job && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Estado del job
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    ID: <span className="font-mono">{job.id}</span>
                  </div>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    job.status === "success"
                      ? "bg-emerald-100 text-emerald-800"
                      : job.status === "error"
                      ? "bg-red-100 text-red-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {job.status.toUpperCase()}
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                  <span>Etapa: {job.stage}</span>
                  <span>{job.progress}%</span>
                </div>
                <div className="h-4 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-4 rounded-full transition-all ${
                      job.status === "error" ? "bg-red-500" : "bg-blue-600"
                    }`}
                    style={{ width: `${job.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-4">
                <Stat label="Leídos" value={job.totalLeidos} />
                <Stat label="Procesados" value={job.totalProcesados} />
                <Stat label="Válidos" value={job.totalValidos} color="emerald" />
                <Stat label="Inválidos" value={job.totalInvalidos} color="red" />
              </div>

              {job.error && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <strong>Error:</strong> {job.error}
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Logs</div>
              <div className="mt-3 max-h-[320px] overflow-y-auto space-y-2 rounded-xl bg-slate-50 p-3">
                {job.logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      log.level === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : log.level === "success"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <div className="font-mono text-[11px] opacity-70">
                      {log.ts}
                    </div>
                    <div>{log.message}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border px-3 py-2"
        placeholder={placeholder}
      />
    </label>
  );
}

function Stat({
  label,
  value,
  color = "slate",
}: {
  label: string;
  value: number;
  color?: "slate" | "emerald" | "red";
}) {
  const colorClass =
    color === "emerald"
      ? "text-emerald-700"
      : color === "red"
      ? "text-red-700"
      : "text-slate-900";

  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}