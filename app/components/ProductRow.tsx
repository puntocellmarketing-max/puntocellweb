import type { EcommerceProduct } from "@/lib/ecommerce";
import StoreIcon from "./StoreIcon";
import ProductCard from "./ProductCard";
export default function ProductRow({title,eyebrow,products}:{title:string;eyebrow?:string;products:EcommerceProduct[]}){if(!products.length)return null;return <section><div className="mb-5 flex items-end justify-between gap-4"><div>{eyebrow&&<p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">{eyebrow}</p>}<h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2></div><a href="#categorias" className="hidden items-center gap-2 text-sm font-bold text-blue-600 sm:flex">Ver categorías<StoreIcon name="arrow" className="h-4 w-4"/></a></div><div className="no-scrollbar flex snap-x gap-4 overflow-x-auto pb-4">{products.map(product=><ProductCard key={product.id} product={product}/>)}</div></section>}

