"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Cobrador = {
  id_cobrador: number;
  nombre: string;
  activo: number;
};

type FormState = {
  codCliente: string;
  telefono: string;
  idCobradorAsignado: string;
  idCobradorCreador: string;
  tipoGestion: string;
  estado: string;
  prioridad: string;
  fechaRecordatorio: string;
  horaRecordatorio: string;
  nota: string;
  resultado: string;
  creadoPor: string;
};

const TIPOS_GESTION = [
  "RECORDATORIO",
  "LLAMAR",
  "WHATSAPP",
  "VISITA",
  "PROMESA_PAGO",
  "SEGUIMIENTO",
] as const;

const ESTADOS = [
  "PENDIENTE",
  "REALIZADO",
  "REAGENDADO",
  "CANCELADO",
  "PAGADO",
  "NO_RESPONDE",
  "ERRONEO",
] as const;

const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;

function todayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function currentTimeRounded() {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);

  if (d.getMinutes() === 60) {
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
  }

  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

function normalizePhone(v: string) {
  return String(v || "").replace(/[^\d]/g, "");
}

type Props = {
  telefonoParam: string;
  codClienteParam: string;
};

export default function AgendarClientPage({
  telefonoParam,
  codClienteParam,
}: Props) {
  const [form, setForm] = useState<FormState>({
    codCliente: codClienteParam,
    telefono: telefonoParam,
    idCobradorAsignado: "",
    idCobradorCreador: "",
    tipoGestion: "SEGUIMIENTO",
    estado: "PENDIENTE",
    prioridad: "MEDIA",
    fechaRecordatorio: todayDate(),
    horaRecordatorio: currentTimeRounded(),
    nota: "",
    resultado: "",
    creadoPor: "",
  });

  const [cobradores, setCobradores] = useState<Cobrador[]>([]);
  const [loadingCobradores, setLoadingCobradores] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      telefono: telefonoParam || prev.telefono,
      codCliente: codClienteParam || prev.codCliente,
    }));
  }, [telefonoParam, codClienteParam]);

  useEffect(() => {
    async function loadCobradores() {
      try {
        setLoadingCobradores(true);
        setErrorMsg("");

        const res = await fetch("/api/crm/cobradores", {
          cache: "no-store",
        });

        const data = await res.json();

        if (!res.ok || !data?.ok) {
          throw new Error(data?.error || "No se pudieron cargar los cobradores.");
        }

        const rows = Array.isArray(data.rows) ? (data.rows as Cobrador[]) : [];
        setCobradores(rows);

        if (rows.length > 0) {
          setForm((prev) => ({
            ...prev,
            idCobradorAsignado:
              prev.idCobradorAsignado || String(rows[0].id_cobrador),
            idCobradorCreador:
              prev.idCobradorCreador || String(rows[0].id_cobrador),
          }));
        }
      } catch (e: any) {
        setErrorMsg(e?.message || "Error cargando cobradores.");
      } finally {
        setLoadingCobradores(false);
      }
    }

    loadCobradores();
  }, []);

  const fechaRecordatorioFull = useMemo(() => {
    if (!form.fechaRecordatorio) return "";
    return `${form.fechaRecordatorio} ${form.horaRecordatorio || "00:00"}:00`;
  }, [form.fechaRecordatorio, form.horaRecordatorio]);

  const canSubmit = useMemo(() => {
    return (
      !!form.fechaRecordatorio &&
      !!form.horaRecordatorio &&
      !!form.idCobradorAsignado &&
      !!form.idCobradorCreador &&
      !!form.tipoGestion &&
      !!form.estado &&
      !!form.prioridad
    );
  }, [form]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setErrorMsg("");

    if (!canSubmit) {
      setErrorMsg("Completá los campos obligatorios.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        codCliente: form.codCliente ? Number(form.codCliente) : null,
        telefono: normalizePhone(form.telefono) || null,
        idCobradorAsignado: Number(form.idCobradorAsignado),
        idCobradorCreador: Number(form.idCobradorCreador),
        tipoGestion: form.tipoGestion,
        estado: form.estado,
        prioridad: form.prioridad,
        fechaRecordatorio: fechaRecordatorioFull,
        nota: form.nota.trim() || null,
        resultado: form.resultado.trim() || null,
        creadoPor: form.creadoPor.trim() || null,
      };

      const res = await fetch("/api/crm/agendar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const raw = await res.text();
      const data = raw ? JSON.parse(raw) : {};

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar la agenda.");
      }

      setMsg(`Agenda creada correctamente. ID: ${data.idAgenda ?? "OK"}`);

      setForm((prev) => ({
        ...prev,
        nota: "",
        resultado: "",
        estado: "PENDIENTE",
        prioridad: "MEDIA",
        tipoGestion: "SEGUIMIENTO",
      }));
    } catch (e: any) {
      setErrorMsg(e?.message || "Error guardando agenda.");
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
              Fase 7 · Agenda operativa
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              Registrar gestión
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Cargá recordatorios, promesas de pago y seguimientos asociados al
              cliente, al teléfono y al cobrador responsable.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/conversaciones"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Inbox
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

      <section className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-950">
              Datos de la gestión
            </h3>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Agenda CRM
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Field
              label="cod_cliente"
              value={form.codCliente}
              onChange={(v) => updateField("codCliente", v)}
              placeholder="Ej: 1234"
            />

            <Field
              label="Teléfono"
              value={form.telefono}
              onChange={(v) => updateField("telefono", v)}
              placeholder="59598..."
            />

            <SelectField
              label="Cobrador asignado"
              value={form.idCobradorAsignado}
              onChange={(v) => updateField("idCobradorAsignado", v)}
              disabled={loadingCobradores}
              options={cobradores.map((c) => ({
                value: String(c.id_cobrador),
                label: c.nombre,
              }))}
            />

            <SelectField
              label="Cobrador creador"
              value={form.idCobradorCreador}
              onChange={(v) => updateField("idCobradorCreador", v)}
              disabled={loadingCobradores}
              options={cobradores.map((c) => ({
                value: String(c.id_cobrador),
                label: c.nombre,
              }))}
            />

            <SelectField
              label="Tipo de gestión"
              value={form.tipoGestion}
              onChange={(v) => updateField("tipoGestion", v)}
              options={TIPOS_GESTION.map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <SelectField
              label="Estado"
              value={form.estado}
              onChange={(v) => updateField("estado", v)}
              options={ESTADOS.map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <SelectField
              label="Prioridad"
              value={form.prioridad}
              onChange={(v) => updateField("prioridad", v)}
              options={PRIORIDADES.map((v) => ({
                value: v,
                label: v,
              }))}
            />

            <Field
              label="Creado por"
              value={form.creadoPor}
              onChange={(v) => updateField("creadoPor", v)}
              placeholder="Ej: Cesar / Admin / Supervisor"
            />

            <DateField
              label="Fecha recordatorio"
              value={form.fechaRecordatorio}
              onChange={(v) => updateField("fechaRecordatorio", v)}
            />

            <TimeField
              label="Hora recordatorio"
              value={form.horaRecordatorio}
              onChange={(v) => updateField("horaRecordatorio", v)}
            />
          </div>

          <div className="mt-5 grid gap-1.5 text-sm">
            <span className="text-slate-700">Nota</span>
            <textarea
              value={form.nota}
              onChange={(e) => updateField("nota", e.target.value)}
              rows={5}
              className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              placeholder="Ej: Cliente responde que pagará a fin de mes..."
            />
          </div>

          <div className="mt-5 grid gap-1.5 text-sm">
            <span className="text-slate-700">Resultado / observación adicional</span>
            <textarea
              value={form.resultado}
              onChange={(e) => updateField("resultado", e.target.value)}
              rows={4}
              className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
              placeholder="Ej: Solicita recontacto el 30/03..."
            />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar agenda"}
            </button>

            <div className="text-sm text-slate-500">
              Fecha/hora objetivo:{" "}
              <span className="font-mono text-slate-700">
                {fechaRecordatorioFull || "—"}
              </span>
            </div>
          </div>

          {msg ? (
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {msg}
            </div>
          ) : null}

          {errorMsg ? (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {errorMsg}
            </div>
          ) : null}
        </form>

        <div className="space-y-6">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">
              Resumen rápido
            </h3>

            <div className="mt-5 grid gap-4">
              <SummaryItem label="Teléfono" value={form.telefono || "—"} />
              <SummaryItem label="cod_cliente" value={form.codCliente || "—"} />
              <SummaryItem
                label="Cobrador asignado"
                value={
                  cobradores.find(
                    (c) => String(c.id_cobrador) === form.idCobradorAsignado
                  )?.nombre || "—"
                }
              />
              <SummaryItem
                label="Cobrador creador"
                value={
                  cobradores.find(
                    (c) => String(c.id_cobrador) === form.idCobradorCreador
                  )?.nombre || "—"
                }
              />
              <SummaryItem label="Tipo gestión" value={form.tipoGestion} />
              <SummaryItem label="Estado" value={form.estado} />
              <SummaryItem label="Prioridad" value={form.prioridad} />
              <SummaryItem
                label="Recordatorio"
                value={fechaRecordatorioFull || "—"}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">
              Recomendaciones
            </h3>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                Usá <span className="font-medium">PROMESA_PAGO</span> cuando el
                cliente confirma una fecha concreta.
              </p>
              <p>
                Marcá <span className="font-medium">ALTA</span> prioridad si el
                caso requiere seguimiento cercano.
              </p>
              <p>
                El cobrador asignado te va a servir luego para reportes y
                comisión.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Continuar flujo
                </h3>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Después de registrar esta gestión, podés volver al inbox o seguir
                  revisando campañas y resultados.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/crm/conversaciones"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Volver al inbox
                </Link>

                <Link
                  href="/crm/campanias"
                  className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Ver campañas
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
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
        className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500"
      />
    </label>
  );
}

function TimeField({
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
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="rounded-xl border border-slate-300 px-3 py-2.5 outline-none transition focus:border-slate-500 disabled:opacity-50"
      >
        <option value="">Seleccionar...</option>
        {options.map((opt) => (
          <option key={`${label}-${opt.value}`} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}