import AgendarClientPage from "./AgendarClientPage";

type PageProps = {
  searchParams?: Promise<{
    telefono?: string;
    codCliente?: string;
    [key: string]: string | string[] | undefined;
  }>;
};

export default async function Page({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};

  const telefonoParam =
    typeof params.telefono === "string" ? params.telefono : "";

  const codClienteParam =
    typeof params.codCliente === "string" ? params.codCliente : "";

  return (
    <AgendarClientPage
      telefonoParam={telefonoParam}
      codClienteParam={codClienteParam}
    />
  );
}