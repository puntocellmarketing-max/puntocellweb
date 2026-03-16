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

type ModuleCard = {
  title: string;
  description: string;
  href?: string;
  status: Status;
  cta: string;
};

type ControlItem = {
  title: string;
  value: string;
  helper: string;
};

const quickAccess: QuickAccess[] = [
  {
    title: "Iniciar sync",
    description: "Traer clientes filtrados desde el sistema local.",
    href: "/crm/sync-clientes",
    primary: true,
  },
  {
    title: "Audiencias",
    description: "Congelar clientes listos para campaña.",
    href: "/crm/audiencias",
  },
  {
    title: "Campañas",
    description: "Preparar campaña, cola y ejecución.",
    href: "/crm/campanias",
  },
  {
    title: "Inbox",
    description: "Responder conversaciones y continuar gestión.",
    href: "/crm/conversaciones",
  },
  {
    title: "Agenda",
    description: "Registrar seguimiento y promesas de pago.",
    href: "/crm/agendar",
  },
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
    description: "Congelar la selección de clientes para campañas.",
    href: "/crm/audiencias",
    cta: "Abrir audiencias",
    status: "OPERATIVO",
  },
  {
    step: "04",
    title: "Crear campaña",
    description: "Definir campaña, plantilla, idioma y análisis.",
    href: "/crm/campanias",
    cta: "Abrir campañas",
    status: "PARCIAL",
  },
  {
    step: "05",
    title: "Generar y enviar",
    description: "Preparar cola, ejecutar envío y revisar estados.",
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
    title: "Agendar seguimiento",
    description: "Registrar gestión, promesa y recordatorio.",
    href: "/crm/agendar",
    cta: "Abrir agenda",
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

const modules: ModuleCard[] = [
  {
    title: "Sync clientes",
    description: "Entrada del circuito operativo.",
    href: "/crm/sync-clientes",
    status: "OPERATIVO",
    cta: "Abrir",
  },
  {
    title: "Audiencias",
    description: "Snapshot de clientes listos para campaña.",
    href: "/crm/audiencias",
    status: "OPERATIVO",
    cta: "Abrir",
  },
  {
    title: "Campañas",
    description: "Gestión de campañas, cola y envío.",
    href: "/crm/campanias",
    status: "PARCIAL",
    cta: "Abrir",
  },
  {
    title: "Conversaciones",
    description: "Inbox operativo y respuesta manual.",
    href: "/crm/conversaciones",
    status: "OPERATIVO",
    cta: "Abrir",
  },
  {
    title: "Agenda",
    description: "Seguimiento por cobrador y promesas.",
    href: "/crm/agendar",
    status: "OPERATIVO",
    cta: "Abrir",
  },
  {
    title: "Reportes",
    description: "Resultados, pagos y recuperación.",
    href: "/crm/reportes",
    status: "PENDIENTE",
    cta: "Pendiente",
  },
];

const controlItems: ControlItem[] = [
  {
    title: "Inicio del flujo",
    value: "Sync",
    helper: "Toda operación debe arrancar desde clientes sincronizados.",
  },
  {
    title: "Siguiente foco",
    value: "Campañas",
    helper: "Ya podés crear audiencias desde sync y continuar el flujo.",
  },
  {
    title: "Uso diario",
    value: "Inbox + Agenda",
    helper: "Gestión operativa posterior al envío.",
  },
  {
    title: "Cierre final",
    value: "Pago + Reporte",
    helper: "El circuito termina con resultado verificado.",
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

function FlowCard({ step, title, description, href, cta, status }: FlowStep) {
  const disabled = status === "PENDIENTE";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-sm font-semibold text-white">
          {step}
        </div>
        <StatusBadge status={status} />
      </div>

      <h3 className="mt-4 text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

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

function ModuleSystemCard({
  title,
  description,
  href,
  status,
  cta,
}: ModuleCard) {
  const disabled = status === "PENDIENTE";

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        <StatusBadge status={status} />
      </div>

      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>

      <div className="mt-5">
        {disabled || !href ? (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
            {cta}
          </span>
        ) : (
          <Link
            href={href}
            className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm leading-6 text-slate-600">{helper}</div>
    </div>
  );
}

export default function CRMHomePage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white md:px-8">
            <div className="inline-flex items-center rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-200">
              Flujo de trabajo
            </div>

            <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
              Orden operativo del CRM
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              Sync → Validación → Audiencia → Campaña → Envío → Inbox → Agenda →
              Reporte
            </p>
          </div>

          <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3 md:p-8">
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
          subtitle="Entrá a cada etapa según el avance operativo."
        />

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {flowSteps.map((item) => (
            <FlowCard key={item.step + item.title} {...item} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader
          title="Módulos del sistema"
          subtitle="Acceso rápido a las pantallas principales del CRM."
        />

        <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <ModuleSystemCard key={module.title} {...module} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Control operativo
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Antes de enviar, validá teléfonos, creá audiencia y luego avanzá con
              campañas, inbox y agenda.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/sync-clientes"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Validar datos
            </Link>
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Crear audiencia
            </Link>
            <Link
              href="/crm/conversaciones"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Revisar inbox
            </Link>
            <Link
              href="/crm/agendar"
              className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Registrar seguimiento
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}