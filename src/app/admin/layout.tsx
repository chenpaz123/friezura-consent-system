import type { Metadata } from "next";
import { AdminGate } from "@/components/admin/AdminGate";

/**
 * PWA installability (the manifest link) is scoped to /admin only, so
 * clients scanning the QR code for /consent never see an "Add to Home
 * Screen" prompt — only the admin dashboard is meant to be installed.
 * The root layout (src/app/layout.tsx) deliberately does not set this.
 */
export const metadata: Metadata = {
  manifest: "/manifest.json",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminGate>{children}</AdminGate>;
}
