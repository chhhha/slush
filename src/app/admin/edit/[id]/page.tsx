import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { MachineEditForm } from "@/components/admin/machine-edit-form";
import { AdminHeader } from "@/components/admin/admin-header";
import type { Machine } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditMachinePage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("machines")
    .select()
    .eq("id", id)
    .single();

  if (!data) {
    notFound();
  }

  const machine = data as Machine;

  return (
    <div className="min-h-screen flex flex-col">
      <AdminHeader />
      <main className="flex-1 w-full mx-auto max-w-xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold tracking-tight">슬러시 기계 상태 변경</h1>
          <p className="text-muted-foreground text-sm mt-1 leading-relaxed">
            {machine.floor}층{" "}
            {machine.position === "left" ? "좌측" : "우측"}
          </p>
        </div>
        <MachineEditForm machine={machine} />
      </main>
    </div>
  );
}
