import { BottomNav } from "@/components/admin/BottomNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {children}
      <BottomNav />
    </div>
  );
}
