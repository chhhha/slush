import { AdminSoldoutWatcher } from "@/components/admin/admin-soldout-watcher";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AdminSoldoutWatcher />
      {children}
    </>
  );
}
