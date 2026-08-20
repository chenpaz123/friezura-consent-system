"use server";

import { createClient } from "@supabase/supabase-js";
import { SUPER_ADMIN_PIN } from "@/lib/pins";

export interface DeleteConsentResult {
  success: boolean;
  error?: string;
}

/**
 * Permanently deletes a consent row. Super-admin only, and always runs with
 * the service_role key: the `consents` table has no RLS DELETE policy for
 * the anon key (see supabase/schema.sql), so a normal client-side delete is
 * already blocked at the database layer — this bypasses that deliberately,
 * for clearing out test data.
 *
 * This is called from a client component, so it cannot trust that the
 * caller only invokes it when the UI's isSuperAdmin flag is set (that's
 * just client-side state, not real auth) — it independently re-checks the
 * pin against the same SUPER_ADMIN_PIN constant the client PIN gate uses,
 * so hitting this action directly with no valid pin does nothing.
 */
export async function deleteConsent(id: string, pin: string): Promise<DeleteConsentResult> {
  if (pin !== SUPER_ADMIN_PIN) {
    return { success: false, error: "אין הרשאה לפעולה זו." };
  }
  if (!id) {
    return { success: false, error: "מזהה רשומה חסר." };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return {
      success: false,
      error: "חסרה הגדרת SUPABASE_SERVICE_ROLE_KEY בשרת — לא ניתן למחוק רשומות.",
    };
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabaseAdmin.from("consents").delete().eq("id", id);
  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
