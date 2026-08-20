import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || (!serviceRoleKey && !anonKey)) {
  throw new Error(
    "Missing Supabase env vars. Copy .env.local.example to .env.local and fill them in."
  );
}

/**
 * Server-only Supabase client for API routes (Route Handlers).
 * Prefers the service_role key so server-side writes (e.g. creating a
 * customer + dog + consent in one request) aren't subject to RLS latency
 * quirks; falls back to the anon key if a service role key hasn't been
 * configured yet. NEVER import this file from a "use client" component.
 */
export const supabaseServer = createClient(supabaseUrl, (serviceRoleKey ?? anonKey)!, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
