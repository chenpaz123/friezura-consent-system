import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { LookupCustomerResponse } from "@/lib/types";

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = typeof body?.phone === "string" ? normalizePhone(body.phone) : "";

  if (!phone || phone.length < 7) {
    return NextResponse.json({ error: "יש להזין מספר טלפון תקין." }, { status: 400 });
  }

  const { data: customer, error: customerError } = await supabaseServer
    .from("customers")
    .select("*")
    .eq("phone_number", phone)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  if (!customer) {
    const response: LookupCustomerResponse = { exists: false, customer: null, dogs: [] };
    return NextResponse.json(response);
  }

  const { data: dogs, error: dogsError } = await supabaseServer
    .from("dogs")
    .select("*")
    .eq("customer_phone", phone)
    .order("created_at", { ascending: true });

  if (dogsError) {
    return NextResponse.json({ error: dogsError.message }, { status: 500 });
  }

  const response: LookupCustomerResponse = {
    exists: true,
    customer,
    dogs: dogs ?? [],
  };
  return NextResponse.json(response);
}
