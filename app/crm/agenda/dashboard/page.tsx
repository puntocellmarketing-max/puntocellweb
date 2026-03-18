import AgendaDashboardClientPage from "./AgendaDashboardClientPage";

type SearchParamsInput = {
  bucket?: string;
  q?: string;
  estado?: string;
  prioridad?: string;
  tipoGestion?: string;
  idCobrador?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  jobId?: string;
  idAudiencia?: string;
  page?: string;
  [key: string]: string | string[] | undefined;
};

type PageProps = {
  searchParams?: Promise<SearchParamsInput>;
};

function readString(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  return (
    <AgendaDashboardClientPage
      initialFilters={{
        bucket: readString(params.bucket),
        q: readString(params.q),
        estado: readString(params.estado),
        prioridad: readString(params.prioridad),
        tipoGestion: readString(params.tipoGestion),
        idCobrador: readString(params.idCobrador),
        fechaDesde: readString(params.fechaDesde),
        fechaHasta: readString(params.fechaHasta),
        jobId: readString(params.jobId),
        idAudiencia: readString(params.idAudiencia),
        page: readString(params.page),
      }}
    />
  );
}