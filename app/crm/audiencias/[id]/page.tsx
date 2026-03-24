import Link from "next/link";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type AudienceDetailItem = {
  idDetalle: number;
  idAudiencia: number;
  codCliente: number;
  cliente: string;
  telefono: string;
  telefonoValido: number;
  motivoTelefonoInvalido: string | null;
  requiereRevision: number;
  diasAtraso: number;
  ultimoPago: string | null;
  saldo: number;
  categoria: string | null;
  zona: string | null;
  estadoEnvio: string;
  loteNumero: number | null;
  fechaCreacion: string | null;
};

type AudienceHeader = {
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

type ApiResponse = {
  ok: boolean;
  audiencia?: AudienceHeader;
  detalle?: AudienceDetailItem[];
  resumen?: {
    totalDetalle: number;
    saldoTotal: number;
    clientesConTelefono: number;
    clientesSinTelefono: number;
    clientesTelefonoValido: number;
    clientesRequierenRevision: number;
    diasAtrasoPromedio: number;
  };
  error?: string;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("es-PY");
}

function formatDateOnly(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("es-PY");
}

function formatMoney(value?: number | string | null) {
  const n = Number(value || 0);
  return new Intl.NumberFormat("es-PY", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function estadoClasses(estado: string) {
  switch (estado) {
    case "BORRADOR":
      return "border-slate-200 bg-slate-100 text-slate-700";
    case "LISTA":
      return "border-blue-200 bg-blue-100 text-blue-700";
    case "ENVIANDO":
      return "border-amber-200 bg-amber-100 text-amber-700";
    case "ENVIADA":
      return "border-emerald-200 bg-emerald-100 text-emerald-700";
    case "CANCELADA":
      return "border-red-200 bg-red-100 text-red-700";
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

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const baseUrl =
  process.env.APP_BASE_URL || "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/crm/audiencias/${id}`, {
    cache: "no-store",
  });

  const data = (await res.json()) as ApiResponse;

  if (!res.ok || !data?.ok || !data.audiencia) {
    return (
      <div className="space-y-6">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-red-800">
            No se pudo cargar la audiencia
          </h2>
          <p className="mt-2 text-sm text-red-700">
            {data?.error || "Ocurrió un error al obtener el detalle."}
          </p>

          <div className="mt-4">
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              Volver a audiencias
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const audiencia = data.audiencia;
  const detalle = Array.isArray(data.detalle) ? data.detalle : [];
  const resumen = data.resumen;

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">
              Audiencia #{audiencia.idAudiencia}
            </div>

            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
              {audiencia.nombre}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <EstadoBadge estado={audiencia.estado} />

              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                Origen: {audiencia.origen || "—"}
              </span>

              {audiencia.jobIdOrigen ? (
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                  jobId: <span className="ml-1 font-mono">{audiencia.jobIdOrigen}</span>
                </span>
              ) : null}
            </div>

            {audiencia.descripcion ? (
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                {audiencia.descripcion}
              </p>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/crm/audiencias"
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-50"
            >
              Volver
            </Link>

			<Link
			  href={`/crm/campanias/crear?idAudiencia=${audiencia.idAudiencia}`}
			  className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
			>
			  Crear campaña
			</Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Creado por:</span>{" "}
            {audiencia.creadoPor || "—"}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Fecha creación:</span>{" "}
            {formatDate(audiencia.fechaCreacion)}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Total válidos:</span>{" "}
            {audiencia.totalValidos}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <span className="font-medium text-slate-900">Total inválidos:</span>{" "}
            {audiencia.totalInvalidos}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Clientes en detalle"
          value={resumen?.totalDetalle ?? detalle.length}
        />
        <MetricCard
          label="Saldo total"
          value={`Gs. ${formatMoney(resumen?.saldoTotal || 0)}`}
        />
        <MetricCard
          label="Con teléfono"
          value={resumen?.clientesConTelefono ?? 0}
        />
        <MetricCard
          label="Requieren revisión"
          value={resumen?.clientesRequierenRevision ?? 0}
        />
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-950">
              Clientes congelados
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Snapshot de clientes incluidos en esta audiencia.
            </p>
          </div>
        </div>

        {detalle.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
            Esta audiencia no tiene detalle cargado.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr className="text-left text-slate-600">
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Validez</th>
                  <th className="px-4 py-3 font-medium">Revisión</th>
                  <th className="px-4 py-3 font-medium">Días atraso</th>
                  <th className="px-4 py-3 font-medium">Último pago</th>
                  <th className="px-4 py-3 font-medium">Saldo</th>
                  <th className="px-4 py-3 font-medium">Categoría</th>
                  <th className="px-4 py-3 font-medium">Zona</th>
                  <th className="px-4 py-3 font-medium">Estado envío</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 bg-white">
                {detalle.map((row) => (
                  <tr key={row.idDetalle} className="align-top">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{row.cliente}</div>
                      <div className="text-xs text-slate-500">
                        Cod: {row.codCliente}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.telefono || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {Number(row.telefonoValido || 0) === 1 ? (
                        <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-700">
                          Válido
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center rounded-full border border-red-200 bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-700">
                            Inválido
                          </span>
                          {row.motivoTelefonoInvalido ? (
                            <div className="text-xs text-red-600">
                              {row.motivoTelefonoInvalido}
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {Number(row.requiereRevision || 0) === 1 ? (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                          Revisar
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                          OK
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.diasAtraso ?? 0}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDateOnly(row.ultimoPago)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      Gs. {formatMoney(row.saldo)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.categoria || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.zona || "—"}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {row.estadoEnvio}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}