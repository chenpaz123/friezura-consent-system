/**
 * Staff PIN constants, shared between client components (PinGate) and the
 * deleteConsent Server Action so both sides always agree on what counts as
 * valid — no duplicated magic strings, and the server independently
 * re-verifies the super-admin PIN rather than trusting client-side state.
 *
 * Note: this app has no real auth/session backend, so these PINs are a UX
 * deterrent for a single-location internal tool, not a security boundary —
 * anyone can read them out of the client bundle. The Server Action's own
 * pin check exists to make sure a super-admin delete can't be triggered by
 * calling the action directly with no credentials at all, not to make the
 * PIN itself secret.
 */
export const ADMIN_PIN = "1717";

/** Grants isSuperAdmin (destructive actions like deleting a consent). Not shown anywhere in the UI. */
export const SUPER_ADMIN_PIN = "1301";
