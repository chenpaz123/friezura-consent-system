"use server";

import crypto from "crypto";

export interface VerifyPinResult {
  valid: boolean;
  isSuperAdmin: boolean;
}

function secureCompare(a: string | undefined, b: string): boolean {
  if (!a) return false;
  const bufferA = Buffer.from(a, "utf-8");
  const bufferB = Buffer.from(b, "utf-8");

  if (bufferA.length !== bufferB.length) {
    // Perform dummy comparison to mitigate timing attacks based on length mismatch response time differences
    crypto.timingSafeEqual(bufferA, bufferA);
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
}

/**
 * The only place PIN values are ever compared. ADMIN_PIN and SUPER_ADMIN_PIN
 * are plain (non NEXT_PUBLIC_) environment variables, so they're read only
 * on the server and never bundled into client-side JavaScript — unlike a
 * hardcoded constant, they can't be read out of the deployed site by
 * inspecting DevTools/Network. The client only ever learns pass/fail plus
 * which tier matched, never the values themselves.
 */
export async function verifyPin(pin: string): Promise<VerifyPinResult> {
  const adminPin = process.env.ADMIN_PIN;
  const superAdminPin = process.env.SUPER_ADMIN_PIN;

  if (!pin) return { valid: false, isSuperAdmin: false };
  if (secureCompare(superAdminPin, pin)) return { valid: true, isSuperAdmin: true };
  if (secureCompare(adminPin, pin)) return { valid: true, isSuperAdmin: false };
  return { valid: false, isSuperAdmin: false };
}
