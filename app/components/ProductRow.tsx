// app/components/ProductRow.tsx
export default function ProductRow({ title }: { title: string }) {
  // Mock: luego lo conectamos a tu BD / catálogo
  const items = Array.from({ length: 8 }).map((_, idx) => ({
    id: idx + 1,
    name: `Producto destacado ${idx + 1}`,
    price: `${(idx + 1) * 150000}`.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " Gs",
  }));

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <span className="text-sm text-slate-500">Ver todo</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((p) => (
          <div
            key={p.id}
            className="min-w-[220px] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 h-28 rounded-xl bg-slate-100" />
            <div className="text-sm font-semibold text-slate-900">{p.name}</div>
            <div className="mt-1 text-sm text-slate-600">{p.price}</div>
            <button className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Consultar
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}