import { cookies } from "next/headers";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "default_secret"
);

export async function verifyAdminSession() {
  const token = cookies().get("admin_session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { isSuperAdmin: boolean };
  } catch (err) {
    return null;
  }
}
