"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";
import Header from "./Header";

export default function PublicChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const internal = pathname.startsWith("/crm") || pathname.startsWith("/admin") || pathname.startsWith("/login");
  if (internal) return <>{children}</>;
  return <><Header />{children}<Footer /></>;
}
