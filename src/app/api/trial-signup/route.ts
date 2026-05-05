import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeSupabaseUrl } from "@/lib/supabase/url";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const raw = body as { email?: unknown; locale?: unknown };
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const locale =
    raw.locale === "ja" || raw.locale === "en" ? raw.locale : null;

  if (!email || !EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!rawUrl || !anonKey) {
    return NextResponse.json({ ok: false, error: "server_config" }, { status: 503 });
  }

  const url = normalizeSupabaseUrl(rawUrl);
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await supabase.from("trial_signups").insert({
    email,
    locale,
    source: "landing",
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    const msg = error.message ?? "";
    const isNetwork =
      /fetch failed|Failed to fetch|NetworkError|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|getaddrinfo/i.test(
        msg,
      );
    try {
      const host = new URL(url).host;
      console.error("trial_signups insert", { host, code: error.code, message: msg });
    } catch {
      console.error("trial_signups insert", error.code, msg);
    }
    if (isNetwork) {
      return NextResponse.json({ ok: false, error: "supabase_unreachable" }, { status: 503 });
    }
    if (
      error.code === "42P01" ||
      error.code === "PGRST205" ||
      /relation ["']?public\.trial_signups["']? does not exist/i.test(msg) ||
      /could not find the table ['"]public\.trial_signups['"]/i.test(msg)
    ) {
      return NextResponse.json({ ok: false, error: "trial_signups_not_found" }, { status: 503 });
    }
    if (error.code === "42501") {
      return NextResponse.json({ ok: false, error: "trial_signups_forbidden" }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
