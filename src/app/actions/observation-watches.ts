"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";

export async function setObservationWatchEnabledAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.plan !== "pro") redirect("/dashboard/settings");

  const url = String(formData.get("url") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "").trim() === "true";

  if (!url || !region) redirect("/dashboard/observations");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) redirect("/login");

  const payload = {
    user_id: user.id,
    url,
    region,
    enabled,
    schedule: "daily",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("observation_watches")
    .upsert(payload, { onConflict: "user_id,url,region" });
  if (error) {
    console.error("[observation-watches] upsert failed", error);
  }
}

