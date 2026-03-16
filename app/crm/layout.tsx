"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavItem = {
  label: string;
  href: string;
  enabled?: boolean;
};

const navItems: NavItem[] = [
  { label: "Inicio", href: "/crm", enabled: true },
  { label: "Sync", href: "/crm/sync-clientes", enabled: true },
  { label: "Audiencias", href: "/crm/audiencias", enabled: true },
  { label: "Campañas", href: "/crm/campanias", enabled: true },
  { label: "Conversaciones", href: "/crm/conversaciones", enabled: true },
  { label: "Agenda", href: "/crm/agendar", enabled: true },
  { label: "Reportes", href: "/crm/reportes", enabled: true },
];

function normalizeSegment(segment: string) {
  return segment
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildBreadcrumbs(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);

  return parts.map((part, index) => {
    const href = "/" + parts.slice(0, index + 1).join("/");
    const label = part === "crm" ? "CRM" : normalizeSegment(part);
    return { href, label };
  });
}

function isActivePath(pathname: string, href: string) {
  if (href === "/crm") return pathname === "/crm";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function CRMNavLink({
  item,
  pathname,
}: {
  item: NavItem;
  pathname: string;
}) {
  const active = isActivePath(pathname, item.href);

  if (item.enabled === false) {
    return (
      <span className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400">
        {item.label}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={[
        "inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition",
        active
          ? "border border-slate-900 bg-slate-900 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950",
      ].join(" ")}
    >
      {item.label}
    </Link>
  );
}

export default function CRMLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
        <div className="mx-auto max-w-7xl px-4 md:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                  Punto Cell · CRM de cobranzas
                </div>

                <div className="mt-3 flex flex-col gap-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                    Módulo CRM
                  </h1>
                  <p className="text-sm text-slate-600">
                    Sync, audiencias, campañas, conversaciones, agenda y reportes.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/crm"
                  className="inline-flex items-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
                >
                  Inicio CRM
                </Link>

                <Link
                  href="/crm/sync-clientes"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50"
                >
                  Nuevo sync
                </Link>
              </div>
            </div>

            <nav className="flex flex-wrap gap-2">
              {navItems.map((item) => (
                <CRMNavLink key={item.href} item={item} pathname={pathname} />
              ))}
            </nav>

            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
              {breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;

                return (
                  <div key={crumb.href} className="flex items-center gap-2">
                    {isLast ? (
                      <span className="font-medium text-slate-900">
                        {crumb.label}
                      </span>
                    ) : (
                      <Link
                        href={crumb.href}
                        className="transition hover:text-slate-900"
                      >
                        {crumb.label}
                      </Link>
                    )}

                    {!isLast ? <span className="text-slate-300">/</span> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}