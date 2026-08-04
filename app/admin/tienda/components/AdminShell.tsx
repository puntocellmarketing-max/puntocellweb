"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Boxes, ImageIcon, LayoutDashboard, LogOut, Menu, PackageOpen, ShoppingBag, Tags, X } from "lucide-react";
import { useState } from "react";

const items = [
  { href: "/admin/tienda", label: "Resumen", icon: LayoutDashboard },
  { href: "/admin/tienda/productos", label: "Productos", icon: PackageOpen },
  { href: "/admin/tienda/categorias", label: "Categorías", icon: Tags },
  { href: "/admin/tienda/colecciones", label: "Temporadas", icon: Boxes },
  { href: "/admin/tienda/banners", label: "Banners", icon: ImageIcon },
  { href: "/admin/tienda/pedidos", label: "Pedidos", icon: ShoppingBag },
];

export default function AdminShell({ children, userName }: { children: React.ReactNode; userName: string }) {
  const pathname = usePathname(); const router = useRouter(); const [open, setOpen] = useState(false);
  async function logout() { await fetch("/api/auth/logout", { method: "POST" }); router.replace("/login"); router.refresh(); }
  const nav = <>{items.map(({ href, label, icon: Icon }) => { const active = href === "/admin/tienda" ? pathname === href : pathname.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${active ? "bg-blue-600 text-white shadow-lg shadow-blue-600/15" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}><Icon className="h-5 w-5" />{label}</Link>; })}</>;
  return (
    <div className="min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-600 font-black text-white">PC</span><div><p className="font-black text-slate-950">PuntoCell</p><p className="text-xs font-medium text-slate-500">Administración tienda</p></div></div>
        <nav className="grid gap-1 p-4">{nav}</nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-100 p-4"><p className="truncate px-3 text-xs font-semibold text-slate-500">{userName}</p><button type="button" onClick={logout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50"><LogOut className="h-5 w-5" />Cerrar sesión</button></div>
      </aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Cerrar menú" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} /><aside className="relative h-full w-[280px] bg-white shadow-2xl"><div className="flex h-20 items-center justify-between border-b px-5"><strong>PuntoCell Admin</strong><button onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X /></button></div><nav className="grid gap-1 p-4">{nav}</nav></aside></div>}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8"><button onClick={() => setOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><Menu className="h-5 w-5" /></button><p className="hidden text-sm font-semibold text-slate-500 sm:block">Panel ecommerce</p><div className="flex items-center gap-2"><Link href="/" target="_blank" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50">Ver tienda</Link><Link href="/crm" className="hidden rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 sm:block">Ir al CRM</Link></div></header>
        <main className="mx-auto max-w-[1500px] px-4 py-7 md:px-8">{children}</main>
      </div>
    </div>
  );
}

