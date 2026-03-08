import Link from "next/link";

type ModuleCard = {
  title: string;
  description: string;
  href?: string;
  status: "DISPONIBLE" | "EN CONSTRUCCION";
  cta: string;
  step: string;
};

const modules: ModuleCard[] = [
  {
    step: "01",
    title: "Sincronizar clientes",
    description:
      "Ejecuta el sync filtrado desde la vista local hacia crm_clientes_sync, dejando trazabilidad por job_id.",
    href: "/crm/sync-clientes",
    status: "DISPONIBLE",
    cta: "Abrir sync",
  },
  {
    step: "02",
    title: "Audiencias",
    description:
      "Crear y administrar audiencias generadas desde una corrida de sync, con su detalle congelado para campañas.",
    status: "EN CONSTRUCCION",
    cta: "Próxima fase",
  },
  {
    step: "03",
    title: "Campañas",
    description:
      "Crear campañas desde audiencias, ver su estado, plantilla, ventana de análisis y métricas operativas.",
    status: "EN CONSTRUCCION",
    cta: "Próxima fase",
  },
  {
    step: "04",
    title: "Conversaciones",
    description:
      "Inbox operativo para ver chats, responder, marcar leídos y registrar seguimiento manual.",
    status: "EN CONSTRUCCION",
    cta: "Próxima fase",
  },
  {
    step: "05",
    title: "Resultados y reportes",
    description:
      "Analizar entregados, leídos, respuestas, pagos posteriores y recuperación por campaña.",
    status: "EN CONSTRUCCION",
    cta: "Próxima fase",
  },
];

const flowSteps = [
  {
    title: "Sync filtrado",
    text: "Traer solo clientes notificables desde la base del sistema y dejarlos trazables por corrida.",
  },
  {
    title: "Crear audiencia",
    text: "Congelar la selección de clientes con su snapshot técnico y comercial.",
  },
  {
    title: "Crear campaña",
    text: "Definir plantilla, tipo, idioma y ventana de análisis sobre una audiencia existente.",
  },
  {
    title: "Generar cola",
    text: "Materializar los envíos en envios_whatsapp y dejar todo listo para ejecución.",
  },
  {
    title: "Enviar y medir",
    text: "Ejecutar la campaña, recibir webhooks, medir respuestas y pagos posteriores.",
  },
];

function StatusBadge({ status }: { status: ModuleCard["status"] }) {
  const styles =
    status === "DISPONIBLE"
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : "bg-amber-100 text-amber-800 border-amber-200";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${styles}`}
    >
      {status === "DISPONIBLE" ? "Disponible" : "En construcción"}
    </span>
  );
}

function CardAction({
  href,
  cta,
  disabled,
}: {
  href?: string;
  cta: string;
  disabled?: boolean;
}) {
  if (disabled || !href) {
    return (
      <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500">
        {cta}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
    >
      {cta}
    </Link>
  );
}

export default function CRMHomePage() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
        {/* Hero */}
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_.9fr] md:p-8">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                CRM de Cobranzas por WhatsApp Cloud API
              </div>

              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
                Panel principal del CRM
              </h1>

              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 md:text-base">
                Desde este panel vas a poder controlar el flujo completo del sistema:
                sincronización filtrada, audiencias, campañas, cola de envíos,
                seguimiento de conversaciones y análisis de resultados.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/crm/sync-clientes"
                  className="inline-flex items-center rounded-xl bg-blue-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  Iniciar flujo desde sync
                </Link>

                <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-5 py-3 text-sm font-medium text-slate-500">
                  Audiencias y campañas: siguiente fase
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado actual
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  Ya están validadas las bases del flujo:
                </div>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>• Sync filtrado con job_id</li>
                  <li>• Creación de audiencia desde sync</li>
                  <li>• Creación de campaña desde audiencia</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Próximo objetivo
                </div>
                <div className="mt-2 text-sm text-slate-700">
                  Generar y operar la cola de envíos desde la interfaz del sistema,
                  sin depender de PowerShell ni pruebas manuales.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPIs estáticos de fase */}
        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Fase actual
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              5A.1
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Ordenando la operación desde la interfaz principal.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Back-end validado
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              3 fases
            </div>
            <div className="mt-1 text-sm text-slate-600">
              Sync, audiencia y campaña ya probados en base de datos.
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Prioridad operativa
            </div>
            <div className="mt-2 text-2xl font-semibold text-slate-900">
              Cola
            </div>
            <div className="mt-1 text-sm text-slate-600">
              El siguiente paso es controlar la cola y el envío desde pantalla.
            </div>
          </div>
        </section>

        {/* Módulos */}
        <section className="mt-8">
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-slate-900">
              Módulos del sistema
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Esta vista organiza el CRM por etapas funcionales para que el flujo
              quede claro y controlado.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <article
                key={module.step + module.title}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-semibold text-white">
                    {module.step}
                  </div>
                  <StatusBadge status={module.status} />
                </div>

                <h3 className="mt-4 text-lg font-semibold text-slate-900">
                  {module.title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {module.description}
                </p>

                <div className="mt-5">
                  <CardAction
                    href={module.href}
                    cta={module.cta}
                    disabled={module.status !== "DISPONIBLE"}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* Flujo operativo */}
        <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Flujo operativo del CRM
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Este es el proceso ideal que vamos a dejar completamente operable desde la interfaz.
            </p>

            <div className="mt-6 space-y-4">
              {flowSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="flex gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {step.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">
                      {step.text}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">
              Buenas prácticas del flujo
            </h2>

            <div className="mt-5 space-y-4 text-sm leading-6 text-slate-600">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">
                  1. No mezclar prueba y producción
                </div>
                <div className="mt-1">
                  Las campañas de prueba deben trabajar con audiencias pequeñas y teléfonos controlados.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">
                  2. Toda acción importante debe quedar trazada
                </div>
                <div className="mt-1">
                  Jobs, audiencias, campañas, cola y resultados deben poder reconstruirse después.
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="font-semibold text-slate-900">
                  3. Un paso por vez
                </div>
                <div className="mt-1">
                  Primero consolidamos la interfaz y recién después abrimos ejecución real y análisis.
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Footer operativo */}
        <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Siguiente entrega recomendada
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Crear el módulo de campañas para operar la generación de cola y luego el envío real desde la interfaz.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/crm/sync-clientes"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-50"
              >
                Ir a Sync
              </Link>

              <span className="inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white">
                Próxima fase: Campañas
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}