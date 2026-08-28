"use server";

import { headers } from "next/headers";
import { isRateLimited, incrementRateLimit, resetRateLimit } from "@/lib/rateLimit";

export interface VerifyPinResult {
  valid: boolean;
  isSuperAdmin: boolean;
  rateLimited?: boolean;
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
  const headersList = headers();
  const rawIp = headersList.get("x-forwarded-for") ?? "unknown";
  const ip = rawIp.split(',')[0].trim();

  if (isRateLimited(ip)) {
    return { valid: false, isSuperAdmin: false, rateLimited: true };
  }

  const adminPin = process.env.ADMIN_PIN;
  const superAdminPin = process.env.SUPER_ADMIN_PIN;

  if (!pin) {
    incrementRateLimit(ip);
    return { valid: false, isSuperAdmin: false };
  }

  if (superAdminPin && pin === superAdminPin) {
    resetRateLimit(ip);
    return { valid: true, isSuperAdmin: true };
  }

  if (adminPin && pin === adminPin) {
    resetRateLimit(ip);
    return { valid: true, isSuperAdmin: false };
  }

  incrementRateLimit(ip);
  return { valid: false, isSuperAdmin: false };
}
