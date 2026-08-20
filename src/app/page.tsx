import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 text-center">
      <div>
        <h1 className="text-3xl font-bold text-brand-900">Friezura</h1>
        <p className="mt-2 text-slate-500">מערכת דיגיטלית לתיאום ציפיות ואישור טיפול למספרת כלבים.</p>
      </div>
      <div className="flex w-full flex-col gap-3">
        <Link
          href="/consent"
          className="rounded-xl bg-brand-600 px-4 py-3 font-semibold text-white shadow-sm active:bg-brand-700"
        >
          החתמת לקוח (סריקת QR)
        </Link>
        <Link
          href="/admin/queue"
          className="rounded-xl border border-brand-300 bg-white px-4 py-3 font-semibold text-brand-700 shadow-sm active:bg-brand-50"
        >
          לוח ניהול
        </Link>
      </div>
    </main>
  );
}
