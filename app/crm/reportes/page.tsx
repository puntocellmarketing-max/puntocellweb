import Link from "next/link";

type ReportCard = {
  title: string;
  description: string;
  href: string;
  status: "OPERATIVO" | "PROXIMAMENTE";
};

const reportCards: ReportCard[] = [
  {
    title: "Cierre de campaña",
    description:
      "Ejecutar el corte de una campaña, cruzar pagos reales, calcular base comisionable y comisión final.",
    href: "/crm/reportes/cierres-campania",
    status: "OPERATIVO",
  },
  {
    title: "Recuperación por cobrador",
    description:
      "Resumen de recuperación, clientes gestionados y comisión acumulada por cobrador.",
    href: "#",
    status: "PROXIMAMENTE",
  },
  {
    title: "Resultados por campaña",
    description:
      "Comparar campañas por clientes notificados, pagos encontrados, recuperado y efectividad.",
    href: "#",
    status: "PROXIMAMENTE",
  },
  {
    title: "Pagos recuperados",
    description:
      "Detalle consolidado de pagos encontrados en cierres, con trazabilidad por cliente y recibo.",
    href: "#",
    status: "PROXIMAMENTE",
  },
];

function statusClasses(status: ReportCard["status"]) {
  switch (status) {
    case "OPERATIVO":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-600";
  }
}

function StatusBadge({ status }: { status: ReportCard["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${statusClasses(
        status
      )}`}
    >
      {status === "PROXIMAMENTE" ? "Próximamente" : "Operativo"}
    </span>
  );
}

function ReportLinkCard({ title, description, href, status }: ReportCard) {
  const disabled = status !== "OPERATIVO";

  const content = (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      <div className="mt-5">
        {disabled ? (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-400">
            Disponible próximamente
          </span>
        ) : (
          <span className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50">
            Abrir reporte
          </span>
        )}
      </div>
    </article>
  );

  if (disabled) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

export default function CRMReportsPage() {
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-700">
                CRM · Reportes
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                Centro de reportes
              </h1>

              <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-600">
                Accedé a los módulos de análisis del CRM para validar recuperación,
                revisar cierres, controlar pagos encontrados y medir comisiones.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/crm"
                className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
              >
                Volver al inicio
              </Link>

              <Link
                href="/crm/reportes/cierres-campania"
                className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Ir a cierre de campaña
              </Link>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          {reportCards.map((item) => (
            <ReportLinkCard key={item.title} {...item} />
          ))}
        </section>
      </div>
    </main>
  );
}