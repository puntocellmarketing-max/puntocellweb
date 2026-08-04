import { whatsappUrl } from "../config/site";
import type { StoreProduct } from "../data/storefront";
import StoreIcon from "./StoreIcon";

function formatPrice(value?: number) {
  return value ? `${new Intl.NumberFormat("es-PY").format(value)} Gs.` : "Consultar precio";
}

export default function ProductRow({ title, eyebrow, products }: { title: string; eyebrow?: string; products: StoreProduct[] }) {
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>{eyebrow && <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">{eyebrow}</p>}<h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2></div>
        <a href="#categorias" className="hidden items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 sm:flex">Ver todo <StoreIcon name="arrow" className="h-4 w-4" /></a>
      </div>

      <div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4">
        {products.map((product) => {
          const wa = whatsappUrl(`Hola PuntoCell, quiero consultar por: ${product.name}.`);
          const externalWa = wa.startsWith("http");
          return (
            <article key={product.id} className="group min-w-[240px] max-w-[280px] flex-1 snap-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className={`relative grid h-48 place-items-center bg-gradient-to-br ${product.accent}`}>
                {product.badge && <span className="absolute left-3 top-3 rounded-full bg-slate-950 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white">{product.badge}</span>}
                <StoreIcon name={product.icon} className="h-28 w-28 text-slate-700 transition duration-300 group-hover:scale-105" />
              </div>
              <div className="p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">{product.brand}</p>
                <h3 className="mt-2 min-h-12 text-sm font-extrabold leading-5 text-slate-900">{product.name}</h3>
                <p className="mt-1 text-xs text-slate-500">{product.category}</p>
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Precio</p>
                  <p className="mt-1 text-lg font-black text-slate-950">{formatPrice(product.price)}</p>
                  {product.installment && <p className="mt-1 text-xs font-semibold text-emerald-600">{product.installment}</p>}
                </div>
                <a href={wa} target={externalWa ? "_blank" : undefined} rel={externalWa ? "noreferrer" : undefined} className="mt-4 flex h-11 w-full items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700">Consultar</a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
