import AudienciasClientPage from "./AudienciasClientPage";

type PageProps = {
  searchParams?: Promise<{
    jobId?: string;
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const jobIdParam = typeof params.jobId === "string" ? params.jobId : "";

  return <AudienciasClientPage jobIdParam={jobIdParam} />;
}