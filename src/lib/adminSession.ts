"use client";

import { useEffect, useState } from "react";

/**
 * Single source of truth for admin sessionStorage state. Previously the
 * base unlock key lived inline in AdminGate.tsx and the super-admin key
 * lived in its own module — easy to update one and forget the other (which
 * is exactly what happened: nothing ever cleared either flag on exit).
 *
 * There is no server-side session of any kind here (no cookies, no JWTs) —
 * the admin dashboard's data reads go through Server Actions
 * (src/app/actions/adminData.ts) that independently re-verify a PIN against
 * ADMIN_PIN/SUPER_ADMIN_PIN on every call, exactly like deleteConsent
 * already does for deletes. So the PIN itself, not just a boolean, is
 * stored here — that's what lets the Live Queue/Search forward it on every
 * fetch without re-prompting on every navigation or page refresh. Anyone
 * with sessionStorage access to an unlocked admin tab already has full
 * functional admin access today via the gated UI; this doesn't meaningfully
 * change that, and the one genuinely destructive action (deleting a
 * consent) still always re-collects the PIN fresh rather than trusting
 * anything read from here.
 */
const ADMIN_SESSION_KEY = "friezura_admin_unlocked";
const SUPER_ADMIN_SESSION_KEY = "friezura_super_admin";
const ADMIN_PIN_KEY = "friezura_admin_pin";

export function isAdminUnlocked(): boolean {
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
}

/** Call once, right after a PIN is accepted and the dashboard unlocks. */
export function markAdminUnlocked(pin: string) {
  sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
  setAdminPin(pin);
}

/**
 * Re-stores the PIN after a fresh, successful entry that doesn't otherwise
 * change the base unlock flag — e.g. the Manual Entry "Staff Exit" gate,
 * which is already unlocked and only re-verifies which tier to step back
 * to. Keeps the stored PIN in sync with whichever one was just typed;
 * either tier is equally valid for the admin data Server Actions.
 */
export function setAdminPin(pin: string) {
  sessionStorage.setItem(ADMIN_PIN_KEY, pin);
}

/** The PIN forwarded to the admin data Server Actions — see the module comment above. */
export function getAdminPin(): string | null {
  return sessionStorage.getItem(ADMIN_PIN_KEY);
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

/** Fully logs out of the admin dashboard: clears all session state. */
export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(SUPER_ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_PIN_KEY);
}
