// app/components/CategoryGrid.tsx
export default function CategoryGrid() {
  const cats = [
    { name: "Celulares", desc: "Android / iPhone" },
    { name: "Accesorios", desc: "Cables, cargadores, fundas" },
    { name: "Audio", desc: "Parlantes y auriculares" },
    { name: "Smart Home", desc: "Cámaras, routers, IoT" },
    { name: "Computación", desc: "Notebooks y periféricos" },
    { name: "Servicios", desc: "Soporte y asesoría" },
  ];

  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <h3 className="text-lg font-semibold text-slate-900">Categorías</h3>
        <span className="text-sm text-slate-500">Explorá lo más buscado</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cats.map((c) => (
          <div
            key={c.name}
            className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200"
          >
            <div className="text-sm font-semibold text-slate-900 group-hover:text-blue-700">
              {c.name}
            </div>
            <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
            <div className="mt-3 text-sm font-semibold text-blue-700">
              Ver más →
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}