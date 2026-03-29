import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

// service_role: RLS bypass. 서버 사이드에서만 사용. 절대 클라이언트 노출 금지.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
