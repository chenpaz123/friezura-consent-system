"use client";

import { useEffect, useState } from "react";

/**
 * Single source of truth for both admin sessionStorage flags. Previously
 * the base unlock key lived inline in AdminGate.tsx and the super-admin key
 * lived in its own module — easy to update one and forget the other (which
 * is exactly what happened: nothing ever cleared either flag on exit).
 */
const ADMIN_SESSION_KEY = "friezura_admin_unlocked";
const SUPER_ADMIN_SESSION_KEY = "friezura_super_admin";

export function isAdminUnlocked(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

export function markAdminUnlocked() {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
}

/** Call once, right after the super-admin PIN is accepted. */
export function markSuperAdmin() {
  sessionStorage.setItem(SUPER_ADMIN_SESSION_KEY, "true");
}

/** Steps a session back down from super-admin (e.g. re-entering the regular PIN). */
export function clearSuperAdmin() {
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}

/**
 * Reads the super-admin flag set by AdminGate/the Manual Entry exit gate
 * after a successful SUPER_ADMIN_PIN entry. Scoped to the browser tab's
 * session, same as the base admin unlock. Re-derives on every mount, so a
 * page reached via client-side navigation (e.g. exiting Manual Entry back
 * to the Live Queue) always reflects the current flag, not a stale value.
 */
export function useIsSuperAdmin() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    setIsSuperAdmin(sessionStorage.getItem(SUPER_ADMIN_SESSION_KEY) === "true");
  }, []);

  return isSuperAdmin;
}

/** Fully logs out of the admin dashboard: clears BOTH session flags. */
export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
}
