import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminSqlEditor } from "@/components/dashboard/AdminSqlEditor";
import { getSession } from "@/lib/auth/session";
import { isAdminSession } from "@/lib/admin";

export const metadata: Metadata = {
  title: "SQL Editor（Admin） | Viewtrace",
  robots: { index: false, follow: false },
};

export default async function AdminSqlPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!isAdminSession(session)) redirect("/dashboard");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">SQL Editor（Admin）</h1>
        <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
          Supabase DB に直接 SQL を実行します。取り扱い注意。
        </p>
      </div>
      <AdminSqlEditor />
    </div>
  );
}

