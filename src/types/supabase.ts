export type MachineStatus = "preparing" | "cooling" | "available" | "sold_out" | "broken";
export type ChangerType = "admin" | "employee" | "system";

export interface Database {
  public: {
    Tables: {
      machines: {
        Row: {
          id: string;
          floor: number;
          position: "left" | "right";
          flavor: string;
          status: MachineStatus;
          cooling_end_at: string | null;
          available_since: string | null;
          last_cleaned_at: string | null;
          updated_at: string;
          updated_by: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["machines"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["machines"]["Insert"]>;
        Relationships: [];
      };
      status_logs: {
        Row: {
          id: number;
          machine_id: string;
          previous_status: MachineStatus | null;
          new_status: MachineStatus;
          changed_by_type: ChangerType;
          changed_by_name: string | null;
          device_id: string | null;
          ip_address: string | null;
          fingerprint: string | null;
          note: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["status_logs"]["Row"],
          "id" | "created_at" | "fingerprint"
        > & {
          created_at?: string;
          fingerprint?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["status_logs"]["Insert"]>;
        Relationships: [];
      };
      announcements: {
        Row: {
          id: string;
          content: string;
          is_active: boolean;
          created_by: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["announcements"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["announcements"]["Insert"]>;
        Relationships: [];
      };
      email_recipients: {
        Row: {
          id: string;
          machine_id: string;
          email: string;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["email_recipients"]["Row"],
          "id" | "created_at"
        > & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["email_recipients"]["Insert"]
        >;
        Relationships: [];
      };
      abuse_records: {
        Row: {
          id: number;
          device_id: string;
          ip_address: string;
          machine_id: string;
          fingerprint: string | null;
          cookie_id: string | null;
          reported_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["abuse_records"]["Row"],
          "id" | "reported_at" | "fingerprint" | "cookie_id"
        > & {
          reported_at?: string;
          fingerprint?: string | null;
          cookie_id?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["abuse_records"]["Insert"]
        >;
        Relationships: [];
      };
      banned_identifiers: {
        Row: {
          id: number;
          identifier_type: "device_id" | "ip_address" | "fingerprint" | "cookie_id";
          identifier_value: string;
          banned_by: string;
          reason: string | null;
          created_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["banned_identifiers"]["Row"],
          "id" | "created_at"
        > & {
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["banned_identifiers"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      machine_status: MachineStatus;
      changer_type: ChangerType;
    };
  };
}
