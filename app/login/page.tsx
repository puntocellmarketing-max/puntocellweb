import LoginClientPage from "./LoginClientPage";

type PageProps = {
  searchParams?: Promise<{
    next?: string;
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const next =
    typeof params.next === "string" && params.next.trim()
      ? params.next
      : "/crm";

  return <LoginClientPage nextPath={next} />;
}