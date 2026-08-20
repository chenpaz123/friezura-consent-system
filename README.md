# Friezura — Digital Consent & Check-In

A Hebrew, RTL, mobile-first digital consent and expectation-management system
for a dog grooming salon. Two apps in one Next.js project:

- **Client check-in** (`/consent`) — a customer scans a QR code at the salon,
  fills in their info, answers a short health/behavior questionnaire, agrees
  to the coat-condition/matting waiver, and signs on a canvas.
- **Admin dashboard** (`/admin`) — an installable PWA for staff: a realtime
  "today's check-ins" queue (flagged red/green for medical or behavioral
  issues), search, and a PIN-gated "Manual Entry" mode for walk-ins.

## Tech stack

- **Next.js 14** (App Router, TypeScript, Tailwind CSS)
- **Supabase** (Postgres + Realtime) for data and live updates
- **Vercel** for serverless hosting

## Project structure

```
src/
  app/
    page.tsx                     Landing page (links to client + admin)
    consent/page.tsx             Client QR check-in entry point
    admin/
      layout.tsx                 Bottom-nav shell (PWA chrome)
      queue/page.tsx             Live Queue (realtime)
      search/page.tsx            Search past consents
      manual/page.tsx            Manual Entry (PIN-gated exit)
    api/
      customers/lookup/route.ts  POST — look up a customer + their dogs by phone
      consents/route.ts          POST — create customer/dog (if needed) + consent
  components/
    client/                      FriezuraConsentForm, SignaturePad, CheckboxRow, CheckInSuccess
    admin/                       BottomNav, LiveQueue, ConsentCard, PinGate
    ui/                          Shared primitives (Button)
  lib/
    supabase/client.ts           Browser Supabase client (anon key)
    supabase/server.ts           Server-only Supabase client (service role key)
    types.ts                     Shared TypeScript types
supabase/
  schema.sql                     Full SQL schema, RLS policies, Realtime setup
public/
  manifest.json                  PWA manifest (Hebrew, RTL, installable admin app)
```

## Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run `supabase/schema.sql`. It creates:
   - `customers` (`phone_number` PK), `dogs`, `consents`
   - indexes on the common lookup/query paths
   - RLS policies (permissive by default — see the comment in the file for
     why, and how to tighten them once staff auth is added)
   - `alter publication supabase_realtime add table public.consents;` so the
     Live Queue gets instant updates over websockets
3. Copy your project's URL and keys from **Project Settings → API**.

## Environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key   # server-only, never exposed to the browser
NEXT_PUBLIC_ADMIN_EXIT_PIN=1234                   # staff PIN to leave Manual Entry mode
```

On Vercel, set the same variables in **Project Settings → Environment
Variables** for Production/Preview/Development.

## Local development

```bash
npm install
npm run dev
```

- Client flow: http://localhost:3000/consent
- Admin dashboard: http://localhost:3000/admin/queue

## Deploying

Push to a Git repo connected to Vercel, or run `vercel deploy`. The API
routes (`/api/customers/lookup`, `/api/consents`) run as serverless
functions; everything else is static or client-rendered.

## Notes on the client form

`FriezuraConsentForm` (`src/components/client/FriezuraConsentForm.tsx`) is a
single, continuous Hebrew form:

1. **Basic info** — phone (used as the customer's identifier), name, dog,
   date. As soon as a full phone number is typed, it's looked up in the
   background; an existing customer's name is prefilled and their dogs on
   file appear as quick-select chips (with a "+ כלב חדש" option).
2. **Health & behavior questionnaire** — checkbox-driven: "healthy, no
   medication" and "has a medical issue" are mutually exclusive and reveal a
   required details textarea; "sensitive to certain actions during
   treatment" behaves the same way. Two standalone required
   acknowledgement checkboxes close out the section.
3. **Coat-condition responsibility** — a required checkbox with the salon's
   exact waiver text; this maps to `consents.agreed_to_terms`.
4. **Final signature** — the confirmation text, a read-only name/date
   summary, and the `SignaturePad` canvas component, which exports a base64
   PNG (`consents.signature_data`) on submit.

The same component powers the admin's **Manual Entry** screen
(`variant="manual"`), which adds a "Staff exit" PIN gate
(`components/admin/PinGate.tsx`) so a customer holding the device can't
wander into the Live Queue or Search tabs.
