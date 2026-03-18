import Link from "next/link";

type Status = "OPERATIVO" | "PARCIAL" | "PENDIENTE";

type QuickAccess = {
  title: string;
  description: string;
  href: string;
  primary?: boolean;
};

type FlowStep = {
  step: string;
  title: string;
  description: string;
  href?: string;
  cta: string;
  status: Status;
};

type ControlItem = {
  title: string;
  value: string;
  helper: string;
};

type HeroMetric = {
  label: string;
  value: string;
};

const quickAccess: QuickAccess[] = [
  {
    title: "Iniciar sync",
    description: "Traer clientes filtrados desde el sistema local y arrancar el circuito.",
    href: "/crm/sync-clientes",
    primary: true,
  },
  {
    title: "Campañas",
    description: "Preparar campañas, cola y ejecución operativa.",
    href: "/crm/campanias",
  },
  {
    title: "Conversaciones",
    description: "Revisar respuestas y continuar la gestión comercial.",
    href: "/crm/conversaciones",
  },
  {
    title: "Agenda dashboard",
    description: "Controlar seguimientos, alertas, promesas y resolución.",
    href: "/crm/agenda/dashboard",
  },
];

const heroMetrics: HeroMetric[] = [
  { label: "Foco actual", value: "Campañas" },
  { label: "Trabajo diario", value: "Inbox + Agenda" },
  { label: "Entrada", value: "Sync" },
  { label: "Cierre", value: "Pago + Reporte" },
];

const flowSteps: FlowStep[] = [
  {
    step: "01",
    title: "Sincronizar clientes",
    description: "Subir clientes filtrados y dejar trazabilidad por job.",
    href: "/crm/sync-clientes",
    cta: "Abrir sync",
    status: "OPERATIVO",
  },
  {
    step: "02",
    title: "Validar teléfonos",
    description: "Revisar números válidos, inválidos o pendientes.",
    href: "/crm/sync-clientes",
    cta: "Revisar sync",
    status: "PARCIAL",
  },
  {
    step: "03",
    title: "Crear audiencia",
    description: "Congelar la selección de clientes lista para campaña.",
    href: "/crm/audiencias",
    cta: "Abrir audiencias",
    status: "OPERATIVO",
  },
  {
    step: "04",
    title: "Crear campaña",
    description: "Definir campaña, plantilla, idioma y ventana de análisis.",
    href: "/crm/campanias",
    cta: "Abrir campañas",
    status: "PARCIAL",
  },
  {
    step: "05",
    title: "Generar y enviar",
    description: "Preparar cola, ejecutar envíos y revisar estados.",
    href: "/crm/campanias",
    cta: "Gestionar envíos",
    status: "PARCIAL",
  },
  {
    step: "06",
    title: "Operar conversaciones",
    description: "Responder, marcar leído y continuar gestión.",
    href: "/crm/conversaciones",
    cta: "Abrir inbox",
    status: "OPERATIVO",
  },
  {
    step: "07",
    title: "Operar agenda",
    description: "Controlar alertas, resolver seguimientos y registrar promesas.",
    href: "/crm/agenda/dashboard",
    cta: "Abrir dashboard",
    status: "OPERATIVO",
  },
  {
    step: "08",
    title: "Verificar resultados",
    description: "Controlar pagos, recuperación y reportes.",
    href: "/crm/reportes",
    cta: "Abrir reportes",
    status: "PENDIENTE",
  },
];

const controlItems: ControlItem[] = [
  {
    title: "Inicio del flujo",
    value: "Sync",
    helper: "Toda operación debe arrancar desde clientes sincronizados y filtrados.",
  },
  {
    title: "Siguiente foco",
    value: "Campañas",
    helper: "Después de audiencia, el siguiente paso operativo es preparar campaña y envío.",
  },
  {
    title: "Trabajo diario",
    value: "Inbox + Agenda",
    helper: "La gestión diaria vive entre conversaciones, seguimientos y promesas.",
  },
  {
    title: "Cierre esperado",
    value: "Pago + Reporte",
    helper: "El circuito se cierra cuando el resultado queda verificado y medible.",
  },
];

function statusClasses(status: Status) {
  switch (status) {
    case "OPERATIVO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "PARCIAL":
      return "border-amber-200 bg-amber-50 text-amber-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses(
        status
      )}`}
    >
      {status}
    </span>
  );
}

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-xl font-semibold tracking-tight text-slate-950 md:text-2xl">
        {title}
      </h2>
      {subtitle ? (
        <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
      ) : null}
    </div>
  );
}

function QuickAccessCard({
  title,
  description,
  href,
  primary = false,
}: QuickAccess) {
  return (
    <Link
      href={href}
      className={`rounded-2xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        primary
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-950"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={`text-base font-semibold ${
              primary ? "text-white" : "text-slate-950"
            }`}
          >
            {title}
          </div>
          <div
            className={`mt-2 text-sm leading-6 ${
              primary ? "text-slate-300" : "text-slate-600"
            }`}
          >
            {description}
          </div>
        </div>

        <div
          className={`rounded-xl border px-3 py-1 text-xs font-semibold ${
            primary
              ? "border-white/15 bg-white/10 text-white"
              : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          Abrir
        </div>
      </div>
    </Link>
  );
}

function HeroMetricCard({ label, value }: HeroMetric) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold text-white">{value}</div>
    </div>
  );
}

function FlowCard({ step, title, description, href, cta, status }: FlowStep) {
  const disabled = status === "PENDIENTE";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
          {step}
        </div>
        <StatusBadge status={status} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 min-h-[56px] text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-5">
        {disabled || !href ? (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
            {cta}
          </span>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
          >
            {cta}
          </Link>
        )}
      </div>
    </article>
  );
}

function ControlCard({ title, value, helper }: ControlItem) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{helper}</div>
    </div>
  );
}

function ActionButton({
  href,
  label,
  primary = false,
}: {
  href: string;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
        primary
          ? "bg-slate-950 text-white hover:bg-slate-800"
          : "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

export default function CRMHomePage() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-10 px-4 pb-10 sm:px-6 xl:px-8">
      <section className="grid gap-6 xl:grid-cols-[1.45fr_.75fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-7 text-white md:px-8 md:py-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
              Panel principal
            </div>

            <h2 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">
              Centro operativo del CRM
            </h2>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 md:text-[15px]">
              Gestioná el flujo completo desde sincronización, campañas y conversaciones
              hasta agenda, seguimiento y cierre de resultados.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {heroMetrics.map((item) => (
                <HeroMetricCard key={item.label} {...item} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 md:p-8">
            {quickAccess.map((item) => (
              <QuickAccessCard key={item.title} {...item} />
            ))}
          </div>
        </div>

        <aside className="grid gap-4">
          {controlItems.map((item) => (
            <ControlCard key={item.title} {...item} />
          ))}
        </aside>
      </section>

      <section>
        <SectionHeader
          title="Fases del proceso"
          subtitle="El circuito operativo del CRM, ordenado de principio a fin."
        />

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map((item) => (
            <FlowCard key={item.step + item.title} {...item} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-slate-950">
              Centro de acción
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Acciones operativas del día para avanzar sin salir del circuito del CRM.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <ActionButton href="/crm/sync-clientes" label="Validar datos" />
            <ActionButton href="/crm/audiencias" label="Crear audiencia" />
            <ActionButton href="/crm/conversaciones" label="Revisar inbox" />
            <ActionButton href="/crm/agenda/dashboard" label="Abrir agenda" />
            <ActionButton href="/crm/agendar" label="Registrar seguimiento" primary />
          </div>
        </div>
      </section>
    </div>
  );
}