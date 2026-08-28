import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

/**
 * Looks up the dog names on file for a phone number, for the client form's
 * "pick your dog" prefill. Deliberately returns nothing else — no customer
 * name, no ids, no medical/behavioral history, and no signal about whether
 * the phone number belongs to a known customer at all (an unknown number
 * and a known customer with no dogs yet both come back as `[]`), so this
 * unauthenticated endpoint can't be used to enumerate or profile customers.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : "";

  if (!phone || phone.length < 7) {
    return NextResponse.json({ error: "יש להזין מספר טלפון תקין." }, { status: 400 });
  }

  const { data: dogs, error } = await supabaseServer
    .from("dogs")
    .select("name")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const dogNames: string[] = (dogs ?? []).map((dog) => dog.name);
  return NextResponse.json(dogNames);
}
