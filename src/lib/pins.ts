/**
 * The actual staff PIN values are NOT here — they live only in the
 * server-only ADMIN_PIN / SUPER_ADMIN_PIN environment variables (see
 * .env.local.example) and are checked exclusively by the verifyPin Server
 * Action (src/app/actions/verifyPin.ts), so they're never bundled into
 * client-side JavaScript.
 *
 * PIN_LENGTH is just a UI constant — how many digits the pad collects
 * before submitting for verification — not sensitive on its own.
 */
export const PIN_LENGTH = 4;
