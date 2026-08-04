import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getAdminUser } from "@/lib/admin-ecommerce";
import AdminShell from "./components/AdminShell";

export const dynamic = "force-dynamic";

export default async function StoreAdminLayout({ children }: { children: ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/login?next=/admin/tienda");
  return <AdminShell userName={user.nombre}>{children}</AdminShell>;
}

