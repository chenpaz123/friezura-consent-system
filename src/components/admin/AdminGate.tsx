"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/admin/BottomNav";
import { PinGate } from "@/components/admin/PinGate";
import { ADMIN_PIN, SUPER_ADMIN_PIN } from "@/lib/pins";
import { markSuperAdmin } from "@/lib/useIsSuperAdmin";

const SESSION_KEY = "friezura_admin_unlocked";

/**
 * Gates the entire /admin dashboard (Live Queue, Search, Manual Entry, and
 * any future sub-view) behind a staff PIN. The regular PIN (1717) unlocks
 * the dashboard normally; a second, undisclosed PIN (1301) also unlocks it
 * but additionally marks the session as super-admin, surfacing destructive
 * actions (e.g. deleting a consent) that are otherwise hidden. The unlock is
 * remembered for the browser tab's session so staff aren't re-prompted on
 * every navigation, but a fresh browser session (e.g. the salon tablet
 * restarting) requires the PIN again.
 *
 * This is a client component (needs sessionStorage + hooks), split out from
 * src/app/admin/layout.tsx so that file can stay a Server Component and
 * export `metadata` — Next.js doesn't allow exporting `metadata` from a
 * "use client" file.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUnlocked(sessionStorage.getItem(SESSION_KEY) === "true");
    setChecked(true);
  }, []);

  if (!checked) {
    return <div className="min-h-screen bg-pink-50" />;
  }

  if (!unlocked) {
    return (
      <PinGate
        pins={[ADMIN_PIN, SUPER_ADMIN_PIN]}
        variant="screen"
        title="הזינו קוד גישה ללוח הניהול"
        onSuccess={(matchedPin) => {
          sessionStorage.setItem(SESSION_KEY, "true");
          if (matchedPin === SUPER_ADMIN_PIN) markSuperAdmin();
          setUnlocked(true);
        }}
        onCancel={() => router.push("/")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-pink-50 pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-center border-b border-pink-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Friezura" className="h-9 w-auto" />
      </header>
      {children}
      <BottomNav />
    </div>
  );
}
