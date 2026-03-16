"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AudienceItem = {
  idAudiencia: number;
  nombre: string;
  descripcion: string | null;
  filtrosJson: string | null;
  origen: string;
  totalClientes: number;
  totalValidos: number;
  totalInvalidos: number;
  creadoPor: string | null;
  fechaCreacion: string | null;
  estado: string;
};

type Props = {
  jobIdParam: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function estadoClasses(estado: string) {
  switch (estado) {
    case "BORRADOR":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "LISTA":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "ACTIVA":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "CERRADA":
      return "border-violet-200 bg-violet-100 text-violet-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function EstadoBadge({ estado }: { estado: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${estadoClasses(
        estado
      )}`}
    >
      {estado || "SIN ESTADO"}
    </span>
  );
}

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
      {hint ? <div className="mt-1 text-sm text-slate-600">{hint}</div> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "danger" | "success";
}) {
  const colorClass =
    tone === "danger"
      ? "text-red-700"
      : tone === "success"
      ? "text-emerald-700"
      : "text-slate-950";

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`mt-1 text-lg font-semibold ${colorClass}`}>{value}</div>
    </div>
  );
}

export default function AudienciasClientPage({ jobIdParam }: Props) {
  const jobId = jobIdParam;

  const [rows, setRows] = useState<AudienceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [creadoPor, setCreadoPor] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [createdAudienceId, setCreatedAudienceId] = useState<number | null>(null);

  useEffect(() => {
    if (jobId && !nombre) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      setNombre(`Audiencia sync ${yyyy}-${mm}-${dd}`);
    }
  }, [jobId, nombre]);

  async function loadAudiencias() {
    try {
      setLoading(true);
      setErrorMsg("");

      const res = await fetch("/api/crm/audiencias", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudieron cargar las audiencias.");
      }

      setRows(Array.isArray(data.rows) ? data.rows : []);
    } catch (e: any) {
      setRows([]);
      setErrorMsg(e?.message || "Error cargando audiencias.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAudiencias();
  }, []);

  async function handleCreateAudience(e: React.FormEvent) {
    e.preventDefault();
    setSaveMsg("");
    setErrorMsg("");

    if (!jobId) {
      setErrorMsg("No llegó jobId desde el sync.");
      return;
    }

    if (!nombre.trim()) {
      setErrorMsg("El nombre de la audiencia es obligatorio.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/crm/audiencias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim() || null,
          jobId,
          creadoPor: creadoPor.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear la audiencia.");
      }

      setSaveMsg(
        `Audiencia creada correctamente. ID: ${data.idAudiencia} · Clientes: ${data.totalClientes}`
      );
      setCreatedAudienceId(data.idAudiencia ?? null);
      setDescripcion("");

      await loadAudiencias();
    } catch (e: any) {
      setErrorMsg(e?.message || "Error creando audiencia.");
    } finally {
      setSaving(false);
    }
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      borrador: rows.filter((r) => r.estado === "BORRADOR").length,
      totalClientes: rows.reduce(
        (acc, r) => acc + Number(r.totalClientes || 0),
        0
      ),
      totalValidos: rows.reduce(
        (acc, r) => acc + Number(r.totalValidos || 0),
        0
      ),
    };
  }, [rows]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Fase 3 · Audiencias
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Gestión de audiencias
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Congelá clientes provenientes del sync para trabajar campañas sobre
              un snapshot estable y trazable.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/sync-clientes"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Sync
            </Link>

            <Link
              href="/crm/campanias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Campañas
            </Link>

            <Link
              href="/crm"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total audiencias" value={stats.total} />
        <MetricCard label="En borrador" value={stats.borrador} />
        <MetricCard label="Clientes acumulados" value={stats.totalClientes} />
        <MetricCard label="Válidos acumulados" value={stats.totalValidos} />
      </section>

      {jobId ? (
        <section className="rounded-3xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950">
                Crear audiencia desde sync
              </h3>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                Se detectó un <span className="font-mono">jobId</span> en la URL.
                Podés convertir ese resultado del sync en una audiencia congelada.
              </p>

              <div className="mt-3 rounded-2xl border border-blue-200 bg-white px-4 py-3 text-sm text-slate-700">
                <span className="font-medium text-slate-900">jobId:</span>{" "}
                <span className="font-mono">{jobId}</span>
              </div>
            </div>

            <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <form onSubmit={handleCreateAudience} className="space-y-4">
                <div className="grid gap-1.5 text-sm">
                  <label htmlFor="nombre" className="text-slate-700">
                    Nombre de audiencia
                  </label>
                  <input
                    id="nombre"
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Clientes atraso 60+"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div className="grid gap-1.5 text-sm">
                  <label htmlFor="descripcion" className="text-slate-700">
                    Descripción
                  </label>
                  <textarea
                    id="descripcion"
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Ej: Generada desde sync del día..."
                    className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div className="grid gap-1.5 text-sm">
                  <label htmlFor="creadoPor" className="text-slate-700">
                    Creado por
                  </label>
                  <input
                    id="creadoPor"
                    type="text"
                    value={creadoPor}
                    onChange={(e) => setCreadoPor(e.target.value)}
                    placeholder="Ej: Cesar"
                    className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
                  >
                    {saving ? "Creando..." : "Crear audiencia"}
                  </button>

                  {createdAudienceId ? (
                    <Link
                      href={`/crm/audiencias/${createdAudienceId}`}
                      className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                    >
                      Ver detalle creado
                    </Link>
                  ) : null}
                </div>
              </form>
            </div>
          </div>
        </section>
      ) : null}

      {saveMsg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 shadow-sm">
          {saveMsg}
        </div>
      ) : null}

      {errorMsg ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm">
          {errorMsg}
        </div>
      ) : null}

      <section>
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h3 className="text-xl font-semibold text-slate-950">
              Audiencias registradas
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Listado de snapshots creados para preparar campañas.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
            Cargando audiencias...
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-lg font-semibold text-slate-950">
              No hay audiencias para mostrar
            </div>
            <div className="mt-2 text-sm leading-6 text-slate-600">
              Primero ejecutá un sync exitoso y luego creá una audiencia desde ese
              job.
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/crm/sync-clientes"
                className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Ir a sync
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {rows.map((row) => (
              <article
                key={row.idAudiencia}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Audiencia #{row.idAudiencia}
                    </div>

                    <h3 className="mt-1 text-xl font-semibold text-slate-950">
                      {row.nombre}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <EstadoBadge estado={row.estado} />

                      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                        Origen: {row.origen || "—"}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-slate-600">
                    <div>
                      <span className="font-medium text-slate-900">Creación:</span>{" "}
                      {formatDate(row.fechaCreacion)}
                    </div>
                    <div className="mt-1">
                      <span className="font-medium text-slate-900">Creado por:</span>{" "}
                      {row.creadoPor || "—"}
                    </div>
                  </div>
                </div>

                {row.descripcion ? (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                    {row.descripcion}
                  </div>
                ) : null}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Clientes" value={row.totalClientes} />
                  <MiniStat
                    label="Válidos"
                    value={row.totalValidos}
                    tone="success"
                  />
                  <MiniStat
                    label="Inválidos"
                    value={row.totalInvalidos}
                    tone="danger"
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/crm/audiencias/${row.idAudiencia}`}
                    className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Ver detalle
                  </Link>

                  <Link
                    href={`/crm/campanias/crear?idAudiencia=${row.idAudiencia}`}
                    className="inline-flex items-center rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Crear campaña
                  </Link>

                  <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-500">
                    Siguiente paso: crear campaña
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}