"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BottomNav } from "@/components/admin/BottomNav";
import { ADMIN_PIN, PinGate } from "@/components/admin/PinGate";

const SESSION_KEY = "friezura_admin_unlocked";

/**
 * Gates the entire /admin dashboard (Live Queue, Search, Manual Entry, and
 * any future sub-view) behind a fixed staff PIN. The unlock is remembered
 * for the browser tab's session so staff aren't re-prompted on every
 * navigation, but a fresh browser session (e.g. the salon tablet restarting)
 * requires the PIN again.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
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
        pin={ADMIN_PIN}
        variant="screen"
        title="הזינו קוד גישה ללוח הניהול"
        onSuccess={() => {
          sessionStorage.setItem(SESSION_KEY, "true");
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
