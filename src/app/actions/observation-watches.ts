"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { getPlan } from "@/lib/plans";
import {
  clampRepeatCount,
  parseWatchFrequency,
  parseWatchNotifyMode,
  type WatchFrequency,
  type WatchNotifyMode,
} from "@/lib/observation-watch-schedule";
import { isValidObservationRegionForPlan, normalizeObservationRegionInput } from "@/lib/regions";
import { normalizeUserUrlInput } from "@/lib/url-preview";

function redirectToLogin(): never {
  redirect("/login");
}

function redirectToObservations(): never {
  redirect("/dashboard/observations");
}

function redirectAfterSave(observationId: string, redirectAfter: string, saveOrigin: string): never {
  if (observationId) {
    redirect(`/dashboard/observations/${observationId}`);
  }
  if (redirectAfter === "auto-observations") {
    if (saveOrigin === "list_row") {
      redirect("/dashboard/auto-observations?saved=row");
    }
    redirect("/dashboard/auto-observations");
  }
  redirect("/dashboard/observations");
}

export async function saveObservationWatchAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirectToLogin();

  const plan = getPlan(session.plan);
  if (!plan.autoObservationWatch) redirectToObservations();

  const urlRaw = String(formData.get("url") ?? "").trim();
  const regionRaw = String(formData.get("region") ?? "").trim();
  const region = normalizeObservationRegionInput(regionRaw);
  const observationId = String(formData.get("observationId") ?? "").trim();
  const redirectAfter = String(formData.get("redirect_after") ?? "").trim();
  const saveOrigin = String(formData.get("save_origin") ?? "").trim();

  const normalizedUrl = normalizeUserUrlInput(urlRaw);
  if (!normalizedUrl) {
    if (redirectAfter === "auto-observations") {
      redirect("/dashboard/auto-observations?error=invalid_url");
    }
    redirectToObservations();
  }
  if (!region || !isValidObservationRegionForPlan(session.plan, region)) {
    if (redirectAfter === "auto-observations") {
      redirect("/dashboard/auto-observations?error=invalid_region");
    }
    redirectToObservations();
  }

  const enabled = String(formData.get("enabled") ?? "").trim() === "true";
  const freqRaw = String(formData.get("schedule_frequency") ?? "daily").trim();
  const notifyRaw = String(formData.get("notify_mode") ?? "always").trim();
  const repeatRaw = Number(String(formData.get("repeat_count") ?? "1").trim());

  const scheduleFrequency = parseWatchFrequency(freqRaw) ?? ("daily" as WatchFrequency);
  const notifyMode: WatchNotifyMode = parseWatchNotifyMode(notifyRaw) ?? "always";
  const repeatCount = clampRepeatCount(scheduleFrequency, repeatRaw);

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirectToLogin();

  const nowIso = new Date().toISOString();
  const snapshotFullPage = session.plan === "pro";

  // next_run_at は cron が初回実行で更新する。ここに含めると、未マイグレーション／古い
  // PostgREST スキーマキャッシュで PGRST204 になり得るため送らない（null の行は cron が拾う）。
  const payload = {
    user_id: user.id,
    url: normalizedUrl,
    region,
    enabled,
    schedule: scheduleFrequency,
    schedule_frequency: scheduleFrequency,
    repeat_count: repeatCount,
    notify_mode: notifyMode,
    snapshot_full_page: snapshotFullPage,
    plan_id: session.plan,
    updated_at: nowIso,
  };

  const { error } = await supabase.from("observation_watches").upsert(payload, {
    onConflict: "user_id,url,region",
  });
  if (error) {
    console.error("[observation-watches] upsert failed", error);
    if (redirectAfter === "auto-observations") {
      redirect("/dashboard/auto-observations?error=save");
    }
    if (observationId) {
      redirect(`/dashboard/observations/${observationId}?error=save`);
    }
    redirectToObservations();
  }

  redirectAfterSave(observationId, redirectAfter, saveOrigin);
}

export async function deleteObservationWatchAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirectToLogin();

  const plan = getPlan(session.plan);
  if (!plan.autoObservationWatch) redirectToObservations();

  const watchId = String(formData.get("watch_id") ?? "").trim();
  if (!watchId) redirect("/dashboard/auto-observations");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirectToLogin();

  const { error } = await supabase.from("observation_watches").delete().eq("id", watchId).eq("user_id", user.id);
  if (error) {
    console.error("[observation-watches] delete failed", error);
  }

  redirect("/dashboard/auto-observations");
}
