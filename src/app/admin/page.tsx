import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { requireAdmin } from "@/lib/admin-guard";
import { redirect } from "next/navigation";
import type { Machine } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const guard = await requireAdmin();
  if (!guard.success) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("machines")
    .select()
    .order("floor", { ascending: true })
    .order("position", { ascending: true });

  const machines: Machine[] = (data as Machine[]) ?? [];

  return <AdminDashboard initialMachines={machines} />;
}
