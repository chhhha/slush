import { createAdminClient } from "@/lib/supabase/admin";
import { LogsView } from "@/components/admin/logs-view";
import { AdminHeader } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/admin-guard";
import { redirect } from "next/navigation";
import type { Machine } from "@/types";

export const metadata = { title: "히스토리 로그 - 슬러시 관리자" };

export default async function LogsPage() {
  const guard = await requireAdmin();
  if (!guard.success) redirect("/admin/login");

  const supabase = createAdminClient();
  const { data: machines } = await supabase
    .from("machines")
    .select()
    .order("floor", { ascending: true })
    .order("position", { ascending: true });

  return (
    <>
      <AdminHeader />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8">
        <LogsView machines={(machines as Machine[]) ?? []} />
      </main>
    </>
  );
}
