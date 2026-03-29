import type { ApiResponse } from "@/types";

export async function fetchApi<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });
    const json = (await res.json()) as ApiResponse<T>;
    if (!res.ok)
      return { success: false, error: json.error ?? "HTTP " + res.status };
    return json;
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "네트워크 오류",
    };
  }
}
