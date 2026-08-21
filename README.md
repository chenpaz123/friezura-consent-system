# Friezura — Digital Consent & Check-In

A Hebrew, RTL, mobile-first digital consent and expectation-management system
for a dog grooming salon. Two apps in one Next.js project:

- **Client check-in** (`/consent`) — a customer scans a QR code at the salon,
  fills in their info, answers a checkbox-driven health/behavior/legal
  questionnaire, and signs on a canvas.
- **Admin dashboard** (`/admin`) — an installable PWA for staff, scoped so
  only `/admin/*` is installable: a realtime, filterable customer registry
  (flagged red/green for medical or behavioral issues), search, a
  PIN-gated kiosk "Manual Entry" mode for walk-ins, and a hidden
  super-admin tier that can hard-delete a record.

## Tech stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS) — Route Handlers and
  a Server Action
- **Supabase** (Postgres + Realtime) for data and live updates
- **Vercel** for serverless hosting

## Project structure

```
src/
  app/
    page.tsx                     Landing page (logo + links to client + admin)
    consent/page.tsx             Client QR check-in entry point
    actions/
      deleteConsent.ts           Server Action — super-admin-only hard delete (service_role key)
    admin/
      layout.tsx                 Server Component: owns the /admin-only PWA manifest metadata
      page.tsx                   Redirects /admin -> /admin/queue
      queue/page.tsx             Customer registry (realtime, today/7d/30d/all filter)
      search/page.tsx            Search past consents
      manual/page.tsx            Manual Entry — kiosk mode, dual-PIN "Staff Exit"
    api/
      customers/lookup/route.ts  POST — look up a customer + their dogs by phone
      consents/route.ts          POST — create customer/dog (if needed) + consent
  components/
    client/                      FriezuraConsentForm, SignaturePad, DateInput, CheckboxRow, CheckInSuccess
    admin/                       AdminGate, BottomNav, LiveQueue, ConsentCard, ConsentDetailsModal, PinGate
    ui/                          Shared primitives (Button)
  lib/
    supabase/client.ts           Browser Supabase client (anon key)
    supabase/server.ts           Server-only Supabase client (service role key)
    pins.ts                      Shared ADMIN_PIN / SUPER_ADMIN_PIN constants
    adminSession.ts              sessionStorage helpers for the admin unlock + super-admin flag
    date.ts                      DD/MM/YYYY-only date helpers (no locale-dependent native <input type="date">)
    types.ts                     Shared TypeScript types
supabase/
  schema.sql                     Full SQL schema, RLS policies, Realtime setup
public/
  manifest.json                 PWA manifest, scoped to /admin only (start_url + scope = "/admin")
```

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`. It creates:
   - `customers` (`phone_number` PK), `dogs`, `consents`
   - indexes on the common lookup/query paths
   - RLS policies (permissive by default for select/insert/update — see the
     comment in the file for why, and how to tighten them once staff auth is
     added). There is deliberately **no DELETE policy** on `consents` — that's
     what makes a normal client delete impossible and is what the
     super-admin `deleteConsent` Server Action bypasses on purpose via the
     service_role key.
   - `alter publication supabase_realtime add table public.consents;` so the
     registry gets instant updates over websockets (including deletes, so
     other open admin tabs drop a removed row live)
3. Copy your project's URL and keys from **Project Settings → API**.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only; required for the super-admin delete action
```

On Vercel, set the same variables in **Project Settings → Environment
Variables** for Production/Preview/Development.

Staff PINs are fixed constants in `src/lib/pins.ts`, not environment
variables — change them there if they ever need to differ per environment:

- **`1717`** (`ADMIN_PIN`) — unlocks `/admin` normally.
- **`1301`** (`SUPER_ADMIN_PIN`) — also unlocks `/admin`, but additionally
  marks the session super-admin, which surfaces a "מחק רשומה" (delete)
  button on a consent's detail view. It's undisclosed anywhere in the UI on
  purpose. Neither PIN is a real security boundary (both are readable in the
  client bundle) — they're a UX deterrent for a single-location internal
  tool, so the delete Server Action independently re-checks the PIN
  server-side rather than trusting client state.

## Local development

```bash
npm install
npm run dev
```

- Client flow: http://localhost:3000/consent
- Admin dashboard: http://localhost:3000/admin/queue

## Deploying

Push to a Git repo connected to Vercel, or run `vercel deploy`. The API
routes (`/api/customers/lookup`, `/api/consents`) and the `deleteConsent`
Server Action run as serverless functions; everything else is static or
client-rendered.

## Notes on the client form

`FriezuraConsentForm` (`src/components/client/FriezuraConsentForm.tsx`) is a
single, continuous Hebrew form:

1. **Basic info** — phone (used as the customer's identifier), name, dog,
   date (strict DD/MM/YYYY via `DateInput`, never the locale-dependent
   native date picker). As soon as a full phone number is typed, it's looked
   up in the background; an existing customer's name is prefilled and their
   dogs on file appear as quick-select chips (with a "+ כלב חדש" option).
2. **Health, behavior & declarations questionnaire** — one flat list of
   required checkboxes:
   - "healthy, no medication" and "has a medical issue" are mutually
     exclusive; the latter reveals a required details textarea. When
     healthy, `medical_details` is explicitly stored as the literal string
     `"בריא"` rather than left blank.
   - "sensitive to certain actions during treatment" reveals its own
     required details textarea when checked.
   - Three standalone required acknowledgement checkboxes: shared all
     relevant info with the groomer; expectations were set for the haircut
     *and* the coat condition/dog's cooperation may affect the outcome
     (this one maps to `consents.agreed_to_terms` — there's no separate
     coat-waiver section anymore, it's folded into this checkbox); and an
     18+/legal-owner declaration.
3. **Final signature** — the confirmation text, a read-only name/date
   summary, and the `SignaturePad` canvas component, which exports a base64
   PNG (`consents.signature_data`) on submit.

The same component powers the admin's **Manual Entry** screen
(`variant="manual"`).

## Notes on the admin dashboard

- **Access tiers**: entering `1717` at `/admin` unlocks it normally; `1301`
  also marks the session super-admin (`src/lib/adminSession.ts`,
  sessionStorage-backed, scoped to the browser tab). A super-admin sees a
  red "מחק רשומה" button at the bottom of `ConsentDetailsModal` — clicking
  it, after a native `confirm()`, calls the `deleteConsent` Server Action,
  which independently re-verifies the PIN and hard-deletes via the
  service_role key.
- **Registry & filtering**: `LiveQueue.tsx` (rendered at `/admin/queue`) is a
  realtime, filterable customer registry — chips for today / last 7 days /
  last 30 days / all — that re-queries and re-subscribes to Realtime on
  filter change. Tapping a `ConsentCard` opens `ConsentDetailsModal` with the
  full record, including the rendered signature.
- **Manual Entry kiosk mode**: `/admin/manual` hides the bottom nav entirely
  (`AdminGate.tsx` checks the pathname) so a customer holding the device to
  sign can't reach Search or the registry. The "יציאת צוות" (Staff Exit)
  button accepts either PIN and syncs the super-admin flag to whichever one
  was just entered — re-entering the regular PIN correctly steps a
  super-admin session back down — then returns to the dashboard normally.
- **Logout**: the admin header's "יציאה" button clears both session flags
  and drops back to the PIN screen from any admin page.
- **PWA scope**: only `/admin/layout.tsx` sets `metadata.manifest`; the root
  layout deliberately doesn't, so the public `/consent` form never shows an
  "Add to Home Screen" prompt. `manifest.json`'s `start_url`/`scope` are both
  `/admin`.
