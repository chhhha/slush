import { createAdminClient } from "@/lib/supabase/admin";
import { EmailSettingsView } from "@/components/admin/email-settings-view";
import { BanListView } from "@/components/admin/ban-list-view";
import { AdminHeader } from "@/components/admin/admin-header";
import { requireAdmin } from "@/lib/admin-guard";
import { redirect } from "next/navigation";
import type { Machine } from "@/types";

export const metadata = { title: "설정 - 슬러시 관리자" };

export default async function SettingsPage() {
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
      <main className="flex-1 mx-auto max-w-4xl px-4 py-8">
      {/* 차단 관리 */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold tracking-tight">품절 알림 차단 관리</h2>
        <div className="rounded-lg border border-border p-3 sm:p-4">
          <BanListView />
        </div>
      </section>

      {/* 이메일 알림 설정 */}
      <section>
        <h2 className="mb-4 text-lg font-bold tracking-tight">품절 알림 이메일 설정</h2>
        <div className="rounded-lg border border-border p-3 sm:p-4">
          <EmailSettingsView machines={(machines as Machine[]) ?? []} />
        </div>
      </section>
      </main>
    </>
  );
}
