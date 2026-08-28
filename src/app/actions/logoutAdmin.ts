"use server";

import { cookies } from "next/headers";

export async function logoutAdmin() {
  cookies().delete("admin_session");
}
