"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginClientPage({ nextPath }: { nextPath: string }) {
  const router = useRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          usuario_login: usuario,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo iniciar sesión.");
      }

      router.push(nextPath || "/crm");
      router.refresh();
    } catch (e: any) {
      setErrorMsg(e?.message || "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10">
      <div className="mx-auto grid min-h-[85vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl lg:grid-cols-[1.05fr_.95fr]">
        <section className="hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
              CRM PuntoCell
            </div>

            <h1 className="mt-6 text-4xl font-semibold tracking-tight">
              Acceso operativo
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-300">
              Ingresá con tu usuario para operar campañas, conversaciones,
              seguimientos y control de recuperación desde un solo panel.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard
              title="Campañas"
              description="Seguimiento del circuito desde audiencia hasta envío."
            />
            <InfoCard
              title="Inbox"
              description="Respuestas, gestión comercial y continuidad operativa."
            />
            <InfoCard
              title="Agenda"
              description="Promesas, recordatorios, vencidas y resolución."
            />
            <InfoCard
              title="Trazabilidad"
              description="Base para control, resultados y futura comisión."
            />
          </div>
        </section>

        <section className="flex items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700 lg:hidden">
                CRM PuntoCell
              </div>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
                Iniciar sesión
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Ingresá con tu usuario y contraseña para acceder al CRM.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <Field
                label="Usuario"
                value={usuario}
                onChange={setUsuario}
                placeholder="Ej: cesar4"
                autoComplete="username"
              />

              <div className="grid gap-1.5 text-sm">
                <span className="text-slate-700">Contraseña</span>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    autoComplete="current-password"
                    className="w-full rounded-2xl border border-slate-300 px-4 py-3 pr-24 outline-none transition focus:border-slate-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    {showPass ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>

              {errorMsg ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {errorMsg}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !usuario.trim() || !password.trim()}
                className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? "Ingresando..." : "Ingresar al CRM"}
              </button>
            </form>

            <div className="mt-6 text-center text-xs text-slate-500">
              Acceso interno del sistema CRM
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <label className="grid gap-1.5 text-sm">
      <span className="text-slate-700">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="rounded-2xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
      />
    </label>
  );
}

function InfoCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-sm font-semibold text-white">{title}</div>
      <div className="mt-1 text-sm leading-6 text-slate-300">{description}</div>
    </div>
  );
}