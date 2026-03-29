import { createAdminClient } from "@/lib/supabase/admin";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import type { Machine } from "@/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("machines")
    .select()
    .order("floor", { ascending: true })
    .order("position", { ascending: true });

  const machines: Machine[] = (data as Machine[]) ?? [];

  return <AdminDashboard initialMachines={machines} />;
}
