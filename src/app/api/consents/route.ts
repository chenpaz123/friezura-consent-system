import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import type { CreateConsentPayload } from "@/lib/types";

function normalizePhone(raw: string) {
  return raw.replace(/[^\d+]/g, "");
}

/**
 * Creates (or reuses) the customer + dog, then records a signed consent.
 * Used by both the QR client flow and the admin "Manual Entry" flow.
 */
export async function POST(req: NextRequest) {
  const payload = (await req.json().catch(() => null)) as CreateConsentPayload | null;

  if (!payload) {
    return NextResponse.json({ error: "בקשה לא תקינה." }, { status: 400 });
  }

  const phone = normalizePhone(payload.customerPhone || "");
  const fullName = payload.fullName?.trim();

  if (!phone || phone.length < 7) {
    return NextResponse.json({ error: "יש להזין מספר טלפון תקין." }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: "יש להזין שם מלא." }, { status: 400 });
  }
  const dogName = payload.dogName?.trim();
  if (!dogName) {
    return NextResponse.json({ error: "יש להזין שם כלב או לבחור כלב קיים." }, { status: 400 });
  }
  if (!payload.agreedToTerms) {
    return NextResponse.json({ error: "יש לאשר את תנאי הטיפול." }, { status: 400 });
  }
  if (!payload.signatureData) {
    return NextResponse.json({ error: "נדרשת חתימה." }, { status: 400 });
  }

  // 1. Upsert the customer.
  const { error: customerError } = await supabaseServer
    .from("customers")
    .upsert({ phone_number: phone, full_name: fullName }, { onConflict: "phone_number" });

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }

  // 2. Resolve the dog: reuse an existing one for this customer (matched by
  // name, case-insensitively — the lookup API never hands the client a dog
  // id to submit back), or create a new one.
  const { data: customerDogs, error: dogsLookupError } = await supabaseServer
    .from("dogs")
    .select("id, name")
    .eq("customer_phone", phone);

  if (dogsLookupError) {
    return NextResponse.json({ error: dogsLookupError.message }, { status: 500 });
  }

  let dogId = customerDogs?.find((dog) => dog.name.trim().toLowerCase() === dogName.toLowerCase())?.id;
  if (!dogId) {
    const { data: newDog, error: dogError } = await supabaseServer
      .from("dogs")
      .insert({ customer_phone: phone, name: dogName })
      .select("id")
      .single();

    if (dogError) {
      return NextResponse.json({ error: dogError.message }, { status: 500 });
    }
    dogId = newDog.id;
  }

  // 3. Record the consent.
  const { data: consent, error: consentError } = await supabaseServer
    .from("consents")
    .insert({
      customer_phone: phone,
      dog_id: dogId,
      has_medical_issue: payload.hasMedicalIssue,
      // The client always sends a meaningful value now (the typed complaint,
      // or "בריא" when the dog is healthy), so just store it as-is.
      medical_details: payload.medicalDetails?.trim() || null,
      has_behavioral_issue: payload.hasBehavioralIssue,
      behavioral_details: payload.hasBehavioralIssue ? payload.behavioralDetails?.trim() || null : null,
      agreed_to_terms: payload.agreedToTerms,
      signature_data: payload.signatureData,
    })
    .select("*")
    .single();

  if (consentError) {
    return NextResponse.json({ error: consentError.message }, { status: 500 });
  }

  return NextResponse.json({ consent }, { status: 201 });
}
