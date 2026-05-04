import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase 接続確認（匿名キー・URL が正しければ 200）。
 * テーブルは不要。Auth セッションの有無だけ返します。
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json(
        { ok: false, configured: true, error: error.message },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      configured: true,
      hasSession: Boolean(data.session),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { ok: false, configured: false, error: message },
      { status: 503 },
    );
  }
}
