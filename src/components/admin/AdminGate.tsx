"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { BottomNav } from "@/components/admin/BottomNav";
import { PinGate } from "@/components/admin/PinGate";
import { clearAdminSession, isAdminUnlocked, markAdminUnlocked, markSuperAdmin } from "@/lib/adminSession";
import { logoutAdmin } from "@/app/actions/logoutAdmin";

/** A customer holding the device on this route must not be able to reach the rest of the dashboard. */
const KIOSK_ROUTE = "/admin/manual";

/**
 * Gates the entire /admin dashboard (Live Queue, Search, Manual Entry, and
 * any future sub-view) behind a staff PIN. ADMIN_PIN unlocks the dashboard
 * normally; the undisclosed SUPER_ADMIN_PIN also unlocks it but additionally
 * marks the session as super-admin, surfacing destructive
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
  const pathname = usePathname();
  const [unlocked, setUnlocked] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setUnlocked(isAdminUnlocked());
    setChecked(true);
  }, []);

  const handleLogout = async () => {
    await logoutAdmin();
    clearAdminSession();
    setUnlocked(false);
    router.push("/admin");
  };

  if (!checked) {
    return <div className="min-h-screen bg-pink-50" />;
  }

  if (!unlocked) {
    return (
      <PinGate
        variant="screen"
        title="הזינו קוד גישה ללוח הניהול"
        onSuccess={({ isSuperAdmin }) => {
          markAdminUnlocked();
          if (isSuperAdmin) markSuperAdmin();
          setUnlocked(true);
        }}
        onCancel={() => router.push("/")}
      />
    );
  }

  // Kiosk mode: a customer may be holding the device here to sign, so the
  // bottom nav (Queue / Search / Manual Entry) must not be reachable — it's
  // the only thing standing between them and every other client's data.
  const isKiosk = pathname === KIOSK_ROUTE;

  return (
    <div className={`min-h-screen bg-pink-50 ${isKiosk ? "" : "pb-20"}`}>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-pink-200 bg-white/95 px-4 py-2.5 backdrop-blur">
        <div className="w-14" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.jpg" alt="Friezura" className="h-9 w-auto" />
        <button
          type="button"
          onClick={handleLogout}
          className="w-14 text-xs font-medium text-slate-400 active:text-slate-600"
        >
          יציאה
        </button>
      </header>
      {children}
      {!isKiosk && <BottomNav />}
    </div>
  );
}
