"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type AudienceApiData = {
  ok: boolean;
  audiencia?: {
    idAudiencia: number;
    nombre: string;
    descripcion: string | null;
    filtrosJson: string | null;
    origen: string;
    jobIdOrigen: string | null;
    totalClientes: number;
    totalValidos: number;
    totalInvalidos: number;
    creadoPor: string | null;
    fechaCreacion: string | null;
    estado: string;
  };
  resumen?: {
    totalDetalle: number;
    saldoTotal: number;
    clientesConTelefono: number;
    clientesSinTelefono: number;
    clientesTelefonoValido: number;
    clientesRequierenRevision: number;
  };
  error?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function formatGs(value?: number | null) {
  const n = Number(value || 0);
  return `Gs. ${n.toLocaleString("es-PY")}`;
}

export default function CrearCampaniaPage() {
  const [idAudiencia, setIdAudiencia] = useState<number | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(true);
  const [audienceError, setAudienceError] = useState("");
  const [audience, setAudience] = useState<AudienceApiData["audiencia"] | null>(null);
  const [summary, setSummary] = useState<AudienceApiData["resumen"] | null>(null);

  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<"VENCIMIENTO" | "ATRASO" | "GENERAL">("GENERAL");
  const [plantilla, setPlantilla] = useState("");
  const [idioma, setIdioma] = useState("es");
  const [creadoPor, setCreadoPor] = useState("CESAR");
  const [observaciones, setObservaciones] = useState("");
  const [ventanaAnalisisDias, setVentanaAnalisisDias] = useState("30");
  const [fechaLanzamiento, setFechaLanzamiento] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveOk, setSaveOk] = useState("");
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const rawId = url.searchParams.get("idAudiencia");
    const parsed = Number(rawId);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      setAudienceError("idAudiencia inválido o ausente en la URL.");
      setLoadingAudience(false);
      return;
    }

    setIdAudiencia(parsed);

    async function loadAudience() {
      try {
        setLoadingAudience(true);
        setAudienceError("");

        const res = await fetch(`/api/crm/audiencias/${parsed}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as AudienceApiData;

        if (!res.ok || !data?.ok || !data.audiencia) {
          throw new Error(data?.error || "No se pudo cargar la audiencia.");
        }

        setAudience(data.audiencia);
        setSummary(data.resumen || null);

        if (!nombre) {
          setNombre(`Campaña - ${data.audiencia.nombre}`);
        }
      } catch (e: any) {
        setAudienceError(e?.message || "Error cargando audiencia.");
      } finally {
        setLoadingAudience(false);
      }
    }

    loadAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = useMemo(() => {
    return (
      !!idAudiencia &&
      !!audience &&
      audience.totalValidos > 0 &&
      nombre.trim().length > 0 &&
      plantilla.trim().length > 0 &&
      !saving
    );
  }, [idAudiencia, audience, nombre, plantilla, saving]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveError("");
    setSaveOk("");
    setCreatedCampaignId(null);

    if (!idAudiencia) {
      setSaveError("Falta idAudiencia.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/crm/campanias/crear", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idAudiencia,
          nombre: nombre.trim(),
          tipo,
          plantilla: plantilla.trim(),
          idioma: idioma.trim() || "es",
          creadoPor: creadoPor.trim() || "SYSTEM",
          observaciones: observaciones.trim() || null,
          ventanaAnalisisDias: Number(ventanaAnalisisDias || 30),
          fechaLanzamiento: fechaLanzamiento.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo crear la campaña.");
      }

      setCreatedCampaignId(Number(data.idCampania));
      setSaveOk(`Campaña creada correctamente. ID: ${data.idCampania}`);
    } catch (e: any) {
      setSaveError(e?.message || "Error creando campaña.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Fase 4 · Crear campaña
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Crear campaña desde audiencia
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              La campaña se crea en estado borrador y toma como base la audiencia
              seleccionada. No envía mensajes todavía.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Audiencias
            </Link>

            {idAudiencia ? (
              <Link
                href={`/crm/audiencias/${idAudiencia}`}
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Volver a audiencia
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {loadingAudience ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Cargando audiencia...
        </div>
      ) : audienceError ? (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
          {audienceError}
        </div>
      ) : audience ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Audiencia #{audience.idAudiencia}
                </div>

                <h3 className="mt-1 text-xl font-semibold text-slate-950">
                  {audience.nombre}
                </h3>

                {audience.descripcion ? (
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {audience.descripcion}
                  </p>
                ) : null}
              </div>

              <div className="text-sm text-slate-600">
                <div>
                  <span className="font-medium text-slate-900">Estado:</span>{" "}
                  {audience.estado}
                </div>
                <div className="mt-1">
                  <span className="font-medium text-slate-900">Creación:</span>{" "}
                  {formatDate(audience.fechaCreacion)}
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Clientes" value={audience.totalClientes} />
              <MetricCard label="Válidos" value={audience.totalValidos} />
              <MetricCard label="Inválidos" value={audience.totalInvalidos} />
              <MetricCard
                label="Saldo total"
                value={formatGs(summary?.saldoTotal || 0)}
              />
            </div>
          </section>

          <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid gap-5 xl:grid-cols-2">
              <Field
                label="Nombre de campaña"
                value={nombre}
                onChange={setNombre}
                placeholder="Ej: Notificación marzo"
              />

              <SelectField
                label="Tipo"
                value={tipo}
                onChange={(v) => setTipo(v as "VENCIMIENTO" | "ATRASO" | "GENERAL")}
                options={[
                  { value: "GENERAL", label: "GENERAL" },
                  { value: "VENCIMIENTO", label: "VENCIMIENTO" },
                  { value: "ATRASO", label: "ATRASO" },
                ]}
              />

              <Field
                label="Plantilla"
                value={plantilla}
                onChange={setPlantilla}
                placeholder="Ej: recordatorio_pago"
              />

              <Field
                label="Idioma"
                value={idioma}
                onChange={setIdioma}
                placeholder="es"
              />

              <Field
                label="Creado por"
                value={creadoPor}
                onChange={setCreadoPor}
                placeholder="Ej: CESAR"
              />

              <Field
                label="Ventana análisis (días)"
                value={ventanaAnalisisDias}
                onChange={setVentanaAnalisisDias}
                placeholder="30"
                type="number"
              />

              <Field
                label="Fecha de lanzamiento"
                value={fechaLanzamiento}
                onChange={setFechaLanzamiento}
                placeholder="YYYY-MM-DD HH:mm:ss"
              />

              <div className="xl:col-span-2">
                <TextAreaField
                  label="Observaciones"
                  value={observaciones}
                  onChange={setObservaciones}
                  placeholder="Ej: Primera campaña de notificación para clientes con atraso."
                />
              </div>
            </div>

            {saveError ? (
              <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {saveError}
              </div>
            ) : null}

            {saveOk ? (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
                {saveOk}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Creando campaña..." : "Crear campaña"}
              </button>

				{createdCampaignId ? (
				  <Link
					href={`/crm/campanias/${createdCampaignId}`}
					className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
				  >
					Ver detalle creado
				  </Link>
				) : null}
            </div>
          </form>
        </>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
      />
    </label>
  );
}