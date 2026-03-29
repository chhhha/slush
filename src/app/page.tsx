import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { EmployeeView } from "@/components/employee-view";

/**
 * 서버 컴포넌트: SSR로 machines 초기 데이터를 로드해 EmployeeView에 전달.
 * Supabase 서버 클라이언트를 직접 생성 (Next.js App Router 서버 컴포넌트).
 */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 서버 컴포넌트에서 직접 Supabase 클라이언트 생성
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // machines 전체 조회 (층 오름차순 정렬)
  const { data: machines } = await supabase
    .from("machines")
    .select("*")
    .order("floor", { ascending: true });

  return <EmployeeView initialMachines={machines ?? []} />;
}
