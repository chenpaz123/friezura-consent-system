"use client";

import { useEffect, useState } from "react";

const SUPER_ADMIN_SESSION_KEY = "friezura_super_admin";

/** Call once, right after the super-admin PIN is accepted. */
export function markSuperAdmin() {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
}

/**
 * Reads the super-admin flag set by admin/layout.tsx after a successful
 * SUPER_ADMIN_PIN entry. Scoped to the browser tab's session, same as the
 * base admin unlock — see admin/layout.tsx.
 */
export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setIsSuperAdmin(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY) === "true");
  }, []);

  return isSuperAdmin;
}
