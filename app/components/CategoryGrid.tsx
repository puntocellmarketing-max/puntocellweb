import StoreIcon, { type StoreIconName } from "./StoreIcon";
import type { EcommerceCategory } from "@/lib/ecommerce";

const categories: { name: string; desc: string; icon: StoreIconName; href: string; color: string }[] = [
  { name: "Celulares", desc: "Smartphones y teléfonos", icon: "phone", href: "#celulares", color: "bg-blue-50 text-blue-600" },
  { name: "Televisores", desc: "Smart TV y entretenimiento", icon: "tv", href: "#electrodomesticos", color: "bg-violet-50 text-violet-600" },
  { name: "Electrodomésticos", desc: "Todo para tu hogar", icon: "washer", href: "#electrodomesticos", color: "bg-cyan-50 text-cyan-600" },
  { name: "Audio", desc: "Parlantes y auriculares", icon: "audio", href: "#electrodomesticos", color: "bg-rose-50 text-rose-600" },
  { name: "Informática", desc: "Notebooks y periféricos", icon: "notebook", href: "#productos", color: "bg-amber-50 text-amber-600" },
  { name: "Accesorios", desc: "Cables, fundas y cargadores", icon: "accessory", href: "#celulares", color: "bg-emerald-50 text-emerald-600" },
];

export default function CategoryGrid({ items }: { items?: EcommerceCategory[] }) {
  const dynamicCategories = items?.length ? items.slice(0, 12).map((item, index) => ({ name: item.name, desc: item.description || `${item.productCount || 0} productos`, icon: categories[index % categories.length].icon, href: `/categoria/${item.slug}`, color: categories[index % categories.length].color })) : categories;
  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Encontrá lo que necesitás</p><h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">Comprá por categoría</h2></div>
        <a href="#productos" className="hidden items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-700 sm:flex">Ver todo <StoreIcon name="arrow" className="h-4 w-4" /></a>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {dynamicCategories.map((category) => (
          <a key={category.name} href={category.href} className="group rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg">
            <span className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl transition group-hover:scale-105 ${category.color}`}><StoreIcon name={category.icon} className="h-9 w-9" /></span>
            <h3 className="mt-4 text-sm font-extrabold text-slate-900">{category.name}</h3>
            <p className="mt-1 hidden text-xs leading-5 text-slate-500 sm:block">{category.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
