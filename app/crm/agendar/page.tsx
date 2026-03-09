import AgendarClientPage from "./AgendarClientPage";

type PageProps = {
  searchParams?: {
    telefono?: string;
    codCliente?: string;
  };
};

export default function Page({ searchParams }: PageProps) {
  const telefonoParam =
    typeof searchParams?.telefono === "string" ? searchParams.telefono : "";

  const codClienteParam =
    typeof searchParams?.codCliente === "string" ? searchParams.codCliente : "";

  return (
    <AgendarClientPage
      telefonoParam={telefonoParam}
      codClienteParam={codClienteParam}
    />
  );
}