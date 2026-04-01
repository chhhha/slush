import type { Database, MachineStatus, ChangerType } from "./supabase";

export type Machine = Database["public"]["Tables"]["machines"]["Row"];
export type StatusLog = Database["public"]["Tables"]["status_logs"]["Row"];
export type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
export type EmailRecipient =
  Database["public"]["Tables"]["email_recipients"]["Row"];
export type AbuseRecord =
  Database["public"]["Tables"]["abuse_records"]["Row"];
export type BannedIdentifier =
  Database["public"]["Tables"]["banned_identifiers"]["Row"];
export type Faq = Database["public"]["Tables"]["faqs"]["Row"];

export type { MachineStatus, ChangerType };

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AdminTokenPayload {
  role: "admin";
  name: string;
  iat: number;
}
