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
  const [errorMsg, setErrorMsg] = useState("");

  const pollRef = useRef<NodeJS.Timeout | null>(null);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const canSubmit = useMemo(() => {
    return Boolean(
      form.localHost.trim() &&
        form.localDatabase.trim() &&
        form.localUser.trim() &&
        form.localView.trim() &&
        form.cloudHost.trim() &&
        form.cloudDatabase.trim() &&
        form.cloudUser.trim()
    );
  }, [form]);

  const isJobFinished = useMemo(() => {
    if (!job) return false;

    return (
      job.status === "success" ||
      job.status === "error" ||
      (job.totalLeidos > 0 && job.totalProcesados >= job.totalLeidos)
    );
  }, [job]);

  const canContinueToAudience = useMemo(() => {
    if (!job) return false;
    return job.status === "success" && job.totalValidos > 0;
  }, [job]);

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
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Fase 1 · Sincronización
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Sync de clientes
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Filtra la vista local y realiza UPSERT en{" "}
              <span className="font-mono text-slate-800">crm_clientes_sync</span>{" "}
              para preparar clientes candidatos a notificación.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Dashboard CRM
            </Link>
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Audiencias
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="text-sm font-semibold text-amber-900">Uso recomendado</div>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Aplicá filtros por categoría, zona, último pago, atraso y saldo para subir
          solo clientes listos para revisión o notificación.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="grid gap-6 xl:grid-cols-2">
          <CardSection
            title="Base local"
            subtitle="Origen: vista local consolidada."
          >
            <div className="grid gap-4">
              <Field label="Host" value={form.localHost} onChange={(v) => updateField("localHost", v)} />
              <Field label="Puerto" value={form.localPort} onChange={(v) => updateField("localPort", v)} />
              <Field label="Base de datos" value={form.localDatabase} onChange={(v) => updateField("localDatabase", v)} />
              <Field label="Usuario" value={form.localUser} onChange={(v) => updateField("localUser", v)} />
              <Field label="Password" type="password" value={form.localPassword} onChange={(v) => updateField("localPassword", v)} />
              <Field label="Vista" value={form.localView} onChange={(v) => updateField("localView", v)} />
            </div>
          </CardSection>

          <CardSection
            title="Base en la nube"
            subtitle="Destino: tabla crm_clientes_sync."
          >
            <div className="grid gap-4">
              <Field label="Host" value={form.cloudHost} onChange={(v) => updateField("cloudHost", v)} />
              <Field label="Puerto" value={form.cloudPort} onChange={(v) => updateField("cloudPort", v)} />
              <Field label="Base de datos" value={form.cloudDatabase} onChange={(v) => updateField("cloudDatabase", v)} />
              <Field label="Usuario" value={form.cloudUser} onChange={(v) => updateField("cloudUser", v)} />
              <Field label="Password" type="password" value={form.cloudPassword} onChange={(v) => updateField("cloudPassword", v)} />
              <Field
                label="Límite para prueba"
                value={form.limit}
                onChange={(v) => updateField("limit", v)}
                placeholder="Ej: 100"
              />
            </div>
          </CardSection>
        </section>

        <CardSection
          title="Filtros del sync"
          subtitle="Dejalos vacíos si no querés aplicarlos."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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

            <DateField
              label="Último pago desde"
              value={form.ultimoPagoDesde}
              onChange={(v) => updateField("ultimoPagoDesde", v)}
            />

            <DateField
              label="Último pago hasta"
              value={form.ultimoPagoHasta}
              onChange={(v) => updateField("ultimoPagoHasta", v)}
            />

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

          <div className="mt-5">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.soloTelefonosValidos}
                onChange={(e) => updateField("soloTelefonosValidos", e.target.checked)}
              />
              Solo teléfonos válidos
            </label>
          </div>
        </CardSection>

        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Ejecutar sincronización
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Se subirán solo los clientes que cumplan los filtros definidos.
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sincronizando..." : "Ejecutar sync"}
            </button>
          </div>

          {errorMsg ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
        </section>
      </form>

      {job ? (
        <section className="space-y-6">
          <CardSection title="Resultado del job" subtitle={`ID: ${job.id}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-600">
                Etapa actual: <span className="font-medium text-slate-900">{job.stage}</span>
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
                <span>Progreso</span>
                <span>{job.progress}%</span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-3 rounded-full transition-all ${
                    job.status === "error" ? "bg-red-500" : "bg-blue-600"
                  }`}
                  style={{ width: `${job.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Stat label="Leídos" value={job.totalLeidos} />
              <Stat label="Procesados" value={job.totalProcesados} />
              <Stat label="Válidos" value={job.totalValidos} color="emerald" />
              <Stat label="Inválidos" value={job.totalInvalidos} color="red" />
            </div>

            {job.error ? (
              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <strong>Error:</strong> {job.error}
              </div>
            ) : null}
          </CardSection>

          {isJobFinished ? (
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Continuar flujo
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {job.status === "success"
                      ? `El sync finalizó correctamente. ${job.totalValidos} clientes válidos quedaron listos para el siguiente paso.`
                      : "El sync terminó con error. Revisá logs y corregí antes de continuar."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/crm"
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Dashboard
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      setJob(null);
                      setErrorMsg("");
                    }}
                    className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                  >
                    Nuevo sync
                  </button>

                  {canContinueToAudience ? (
                    <Link
                      href={`/crm/audiencias?jobId=${encodeURIComponent(job.id)}`}
                      className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Crear audiencia
                    </Link>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}

          <CardSection title="Logs del proceso" subtitle="Seguimiento técnico del job">
            <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-2xl bg-slate-50 p-3">
              {job.logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    log.level === "error"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : log.level === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                >
                  <div className="font-mono text-[11px] opacity-70">{log.ts}</div>
                  <div>{log.message}</div>
                </div>
              ))}
            </div>
          </CardSection>
        </section>
      ) : null}
    </div>
  );
}

function CardSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle ? (
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
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
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400"
        placeholder={placeholder}
      />
    </label>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-200 px-3 py-2.5 text-slate-900 outline-none transition focus:border-slate-400"
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
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}