import ProductGrid from "@/app/components/ProductGrid";
import { getPublicProducts, isEcommerceNotInstalled, type EcommerceProduct } from "@/lib/ecommerce";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = String((await searchParams).q || "").trim();
  let products: EcommerceProduct[] = [];
  try {
    products = q ? await getPublicProducts({ query: q, limit: 100 }) : [];
  } catch (error) {
    if (!isEcommerceNotInstalled(error)) throw error;
  }
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <p className="text-xs font-extrabold uppercase tracking-[.18em] text-blue-600">Resultados</p>
      <h1 className="mt-2 text-3xl font-black">{q ? `Buscar “${q}”` : "Buscar productos"}</h1>
      <form action="/buscar" className="mt-6 flex max-w-2xl">
        <input autoFocus name="q" defaultValue={q} placeholder="Producto, marca o código..." className="h-12 flex-1 rounded-l-xl border px-4 outline-none focus:border-blue-500" />
        <button className="rounded-r-xl bg-blue-600 px-6 text-sm font-black text-white">Buscar</button>
      </form>
      <p className="mt-7 text-sm font-semibold text-slate-500">{products.length} productos encontrados</p>
      <div className="mt-5">
        {products.length ? <ProductGrid products={products} /> : q && <div className="grid min-h-64 place-items-center rounded-2xl border bg-white text-center"><div><p className="font-black">No encontramos coincidencias</p><p className="mt-2 text-sm text-slate-500">Probá con menos palabras o buscá por marca.</p></div></div>}
      </div>
    </main>
  );
}
