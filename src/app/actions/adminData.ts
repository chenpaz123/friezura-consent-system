"use server";

import { verifyAdminSession } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import type { ConsentWithRelations } from "@/lib/types";

const CONSENT_SELECT = "*, customers ( full_name, phone_number ), dogs ( name )";
const RESULT_LIMIT = 500;
const SEARCH_LIMIT = 25;

export async function getConsents(cutoff?: string | null): Promise<ConsentWithRelations[]> {
  const session = await verifyAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  let query = supabaseServer
    .from("consents")
    .select(CONSENT_SELECT)
    .order("created_at", { ascending: false })
    .limit(RESULT_LIMIT);

  if (cutoff) {
    query = query.gte("created_at", cutoff);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as unknown as ConsentWithRelations[];
}

export async function searchConsents(query: string): Promise<ConsentWithRelations[]> {
  const session = await verifyAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const pattern = `%${query}%`;

  const [byPhone, byOwner, byDog] = await Promise.all([
    supabaseServer
      .from("consents")
      .select("*, customers ( full_name, phone_number ), dogs ( name )")
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

  const merged = new Map<string, ConsentWithRelations>();
  for (const result of [byPhone, byOwner, byDog]) {
    for (const row of (result.data ?? []) as unknown as ConsentWithRelations[]) {
      merged.set(row.id, row);
    }
  }

  return Array.from(merged.values())
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, SEARCH_LIMIT);
}

export async function getConsentById(id: string): Promise<ConsentWithRelations | null> {
  const session = await verifyAdminSession();
  if (!session) {
    throw new Error("Unauthorized");
  }

  const { data, error } = await supabaseServer
    .from("consents")
    .select(CONSENT_SELECT)
    .eq("id", id)
    .single();

  if (error) {
    // If it's just "not found", return null
    if (error.code === 'PGRST116') return null;
    throw new Error(error.message);
  }

  return data as unknown as ConsentWithRelations;
}
