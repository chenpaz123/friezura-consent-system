"use server";

import { cookies } from "next/headers";
import { SignJWT } from "jose";

export interface VerifyPinResult {
  valid: boolean;
  isSuperAdmin: boolean;
}

// In a real app we'd use a dedicated secret from env, but we'll use a fallback for this MVP
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "default_secret"
);

/**
 * The only place PIN values are ever compared. ADMIN_PIN and SUPER_ADMIN_PIN
 * are plain (non NEXT_PUBLIC_) environment variables, so they're read only
 * on the server and never bundled into client-side JavaScript.
 */
export async function verifyPin(pin: string): Promise<VerifyPinResult> {
  const adminPin = process.env.ADMIN_PIN;
  const superAdminPin = process.env.SUPER_ADMIN_PIN;

  if (!pin) return { valid: false, isSuperAdmin: false };

  let valid = false;
  let isSuperAdmin = false;

  if (superAdminPin && pin === superAdminPin) {
    valid = true;
    isSuperAdmin = true;
  } else if (adminPin && pin === adminPin) {
    valid = true;
    isSuperAdmin = false;
  }

  if (valid) {
    const token = await new SignJWT({ isSuperAdmin })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    cookies().set("admin_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 24 hours
    });
  }

  return { valid, isSuperAdmin };
}
