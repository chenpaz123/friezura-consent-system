"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { verifyPin } from "@/app/actions/verifyPin";
import { cutoffForFilter, type TimeFilterId } from "@/lib/timeFilters";
import type { ConsentWithRelations } from "@/lib/types";

const CONSENT_SELECT = "*, customers ( full_name, phone_number ), dogs ( name )";
const QUEUE_LIMIT = 500;
const SEARCH_LIMIT = 25;

interface AdminDataResult<T> {
  data?: T;
  error?: string;
}

/**
 * Every function in this file is the only thing standing between the
 * service_role key (which bypasses RLS entirely) and the browser. There is
 * no server-side session/cookie of any kind — the caller passes the PIN it
 * has on hand (from adminSession.ts) on every call, and it's independently
 * re-verified here against ADMIN_PIN/SUPER_ADMIN_PIN, exactly like
 * deleteConsent.ts already does for deletes. A client calling one of these
 * actions directly with no valid PIN gets nothing back.
 */
async function requireAdmin(pin: string): Promise<boolean> {
  const { valid } = await verifyPin(pin);
  return valid;
}

/** Powers the Live Queue's initial (and per-filter-change) load. */
export async function getConsents(
  pin: string,
  filter: TimeFilterId
): Promise<AdminDataResult<ConsentWithRelations[]>> {
  if (!(await requireAdmin(pin))) return { error: "אין הרשאה לפעולה זו." };

  try {
    const cutoff = cutoffForFilter(filter);
    let query = supabaseServer
      .from("consents")
      .select(CONSENT_SELECT)
      .order("created_at", { ascending: false })
      .limit(QUEUE_LIMIT);
    if (cutoff) query = query.gte("created_at", cutoff);

    const { data, error } = await query;
    if (error) return { error: error.message };
    return { data: (data ?? []) as unknown as ConsentWithRelations[] };
  } catch {
    return { error: "שגיאה בטעינת הנתונים. נסו שוב." };
  }
}

/**
 * Fetches one consent by id. Used by the Live Queue whenever an
 * `admin_events` Realtime ping reports a new consent — the ping itself
 * carries only an id, never row data, so this is what turns it into
 * something displayable.
 */
export async function getConsentById(pin: string, id: string): Promise<AdminDataResult<ConsentWithRelations>> {
  if (!(await requireAdmin(pin))) return { error: "אין הרשאה לפעולה זו." };

  try {
    const { data, error } = await supabaseServer.from("consents").select(CONSENT_SELECT).eq("id", id).maybeSingle();
    if (error) return { error: error.message };
    if (!data) return { error: "הרשומה לא נמצאה." };
    return { data: data as unknown as ConsentWithRelations };
  } catch {
    return { error: "שגיאה בטעינת הרשומה." };
  }
}

/** Powers the Search tab: same phone/owner-name/dog-name matching the client previously ran directly against Supabase. */
export async function searchConsents(pin: string, query: string): Promise<AdminDataResult<ConsentWithRelations[]>> {
  if (!(await requireAdmin(pin))) return { error: "אין הרשאה לפעולה זו." };

  try {
    const pattern = `%${query}%`;
    const [byPhone, byOwner, byDog] = await Promise.all([
      supabaseServer
        .from("consents")
        .select(CONSENT_SELECT)
        .ilike("customer_phone", pattern)
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT),
      supabaseServer
        .from("consents")
        .select("*, customers!inner ( full_name, phone_number ), dogs ( name )")
        .ilike("customers.full_name", pattern)
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT),
      supabaseServer
        .from("consents")
        .select("*, customers ( full_name, phone_number ), dogs!inner ( name )")
        .ilike("dogs.name", pattern)
        .order("created_at", { ascending: false })
        .limit(SEARCH_LIMIT),
    ]);

    for (const result of [byPhone, byOwner, byDog]) {
      if (result.error) return { error: result.error.message };
    }

    const merged = new Map<string, ConsentWithRelations>();
    for (const result of [byPhone, byOwner, byDog]) {
      for (const row of (result.data ?? []) as unknown as ConsentWithRelations[]) {
        merged.set(row.id, row);
      }
    }

    return {
      data: Array.from(merged.values())
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, SEARCH_LIMIT),
    };
  } catch {
    return { error: "החיפוש נכשל. נסו שוב." };
  }
}
