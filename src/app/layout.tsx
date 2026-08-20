import type { Metadata, Viewport } from "next";
import { Heebo } from "next/font/google";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Friezura",
  description: "מערכת דיגיטלית לתיאום ציפיות ואישור טיפול למספרת כלבים",
  // No `manifest` here on purpose — PWA installability is scoped to /admin
  // only (see src/app/admin/layout.tsx), so the public client form never
  // triggers an "Add to Home Screen" prompt.
  icons: {
    icon: "/icon-512x512.png",
    apple: "/icon-512x512.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c026d3",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={heebo.variable}>
      <body className="min-h-screen font-sans antialiased">{children}</body>
    </html>
  );
}
