"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Cobrador = {
  id_cobrador: number;
  nombre: string;
  activo: number;
};

type FormState = {
  codCliente: string;
  telefono: string;
  idCobradorAsignado: string;
  tipoGestion: string;
  prioridad: string;
  fechaRecordatorio: string;
  nota: string;
  resultado: string;
};

const TIPOS_GESTION = [
  "RECORDATORIO",
  "LLAMAR",
  "WHATSAPP",
  "VISITA",
  "PROMESA_PAGO",
  "SEGUIMIENTO",
] as const;

const PRIORIDADES = ["BAJA", "MEDIA", "ALTA"] as const;

function todayDate() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function normalizePhone(v: string) {
  return String(v || "").replace(/[^\d]/g, "");
}

function buildReminderDatetime(dateValue: string) {
  return dateValue ? `${dateValue} 09:00:00` : "";
}

type Props = {
  telefonoParam: string;
  codClienteParam: string;
};

export default function AgendarClientPage({
  telefonoParam,
  codClienteParam,
}: Props) {
  const router = useRouter();

  const [form, setForm] = useState<FormState>({
    codCliente: codClienteParam,
    telefono: telefonoParam,
    idCobradorAsignado: "",
    tipoGestion: "SEGUIMIENTO",
    prioridad: "MEDIA",
    fechaRecordatorio: todayDate(),
    nota: "",
    resultado: "",
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

        const res = await fetch("/api/crm/cobradores", { cache: "no-store" });
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

  const fechaRecordatorioFull = useMemo(
    () => buildReminderDatetime(form.fechaRecordatorio),
    [form.fechaRecordatorio]
  );

  const cobradorAsignadoNombre = useMemo(() => {
    return (
      cobradores.find(
        (c) => String(c.id_cobrador) === form.idCobradorAsignado
      )?.nombre || "—"
    );
  }, [cobradores, form.idCobradorAsignado]);

  const canSubmit = useMemo(() => {
    return (
      !!form.fechaRecordatorio &&
      !!form.idCobradorAsignado &&
      !!form.tipoGestion &&
      !!form.prioridad &&
      (!!form.codCliente.trim() || !!normalizePhone(form.telefono))
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
        tipoGestion: form.tipoGestion,
        prioridad: form.prioridad,
        fechaRecordatorio: fechaRecordatorioFull,
        nota: form.nota.trim() || null,
        resultado: form.resultado.trim() || null,
      };

      const res = await fetch("/api/crm/agendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let data: any = {};
      try {
        data = await res.json();
      } catch {
        throw new Error("La respuesta del servidor no fue válida.");
      }

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo guardar la agenda.");
      }

      setMsg(`Agenda creada correctamente. ID: ${data.idAgenda ?? "OK"}`);

      setForm((prev) => ({
        ...prev,
        tipoGestion: "SEGUIMIENTO",
        prioridad: "MEDIA",
        nota: "",
        resultado: "",
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
              Registrar seguimiento
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Registrá recordatorios, promesas de pago y seguimientos del cliente
              de forma rápida y ordenada.
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
              href="/crm/agenda/dashboard"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Dashboard agenda
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-950">
              Cargar gestión
            </h3>

            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
              Agenda CRM
            </span>
          </div>

          <div className="mt-6 space-y-6">
            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 text-sm font-semibold text-slate-900">
                Cliente y responsable
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  label="Cod. cliente"
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
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 text-sm font-semibold text-slate-900">
                Seguimiento
              </div>

              <div className="grid gap-4 md:grid-cols-3">
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
                  label="Prioridad"
                  value={form.prioridad}
                  onChange={(v) => updateField("prioridad", v)}
                  options={PRIORIDADES.map((v) => ({
                    value: v,
                    label: v,
                  }))}
                />

                <DateField
                  label="Fecha de seguimiento"
                  value={form.fechaRecordatorio}
                  onChange={(v) => updateField("fechaRecordatorio", v)}
                />
              </div>

              <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                Se guardará automáticamente como{" "}
                <span className="font-semibold">PENDIENTE</span> con horario base{" "}
                <span className="font-semibold">09:00</span>.
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 p-4">
              <div className="mb-4 text-sm font-semibold text-slate-900">
                Observación
              </div>

              <div className="grid gap-4">
                <TextAreaField
                  label="Nota principal"
                  value={form.nota}
                  onChange={(v) => updateField("nota", v)}
                  rows={5}
                  placeholder="Ej: Cliente responde que pagará a fin de mes..."
                />

                <TextAreaField
                  label="Resultado / observación adicional"
                  value={form.resultado}
                  onChange={(v) => updateField("resultado", v)}
                  rows={4}
                  placeholder="Ej: Solicita recontacto, promete fecha, número compartido, etc."
                />
              </div>
            </section>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!canSubmit || saving}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar agenda"}
            </button>

            <button
              type="button"
              onClick={() => router.push("/crm/agenda/dashboard")}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Ver dashboard
            </button>

            <div className="text-sm text-slate-500">
              Fecha objetivo:{" "}
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
              Contexto rápido
            </h3>

            <div className="mt-5 grid gap-4">
              <SummaryItem label="Teléfono" value={form.telefono || "—"} />
              <SummaryItem label="Cod. cliente" value={form.codCliente || "—"} />
              <SummaryItem label="Cobrador asignado" value={cobradorAsignadoNombre} />
              <SummaryItem label="Tipo gestión" value={form.tipoGestion} />
              <SummaryItem label="Prioridad" value={form.prioridad} />
              <SummaryItem label="Estado al crear" value="PENDIENTE" />
              <SummaryItem label="Fecha objetivo" value={fechaRecordatorioFull || "—"} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-950">
              Recomendaciones
            </h3>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
              <p>
                Usá <span className="font-medium">PROMESA_PAGO</span> cuando el
                cliente confirme una fecha concreta.
              </p>
              <p>
                Marcá <span className="font-medium">ALTA</span> prioridad si el
                caso requiere seguimiento cercano.
              </p>
              <p>
                Para seguimiento general, <span className="font-medium">SEGUIMIENTO</span>{" "}
                suele ser el tipo más práctico.
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-slate-900">
                Continuar flujo
              </h3>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/crm/conversaciones"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Volver al inbox
                </Link>

                <Link
                  href="/crm/campanias"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
                >
                  Ver campañas
                </Link>

                <Link
                  href="/crm/agenda/dashboard"
                  className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  Abrir agenda
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

function TextAreaField({
  label,
  value,
  onChange,
  rows,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows: number;
  placeholder?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
      />
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