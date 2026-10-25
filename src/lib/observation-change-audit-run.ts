import type { SupabaseClient } from "@supabase/supabase-js";
import { appendAuditEventAsService } from "@/lib/audit-log";
import type { Observation } from "@/lib/demo/observations";
import type { Locale } from "@/lib/i18n";
import {
  buildRecordPageAudit,
  mergeAiAuditNotes,
  observationAuditFacts,
  type AuditBehaviorContext,
  type ObservationAiAudit,
} from "@/lib/observation-ai-audit";
import { loadAuditScreenshot } from "@/lib/observation-ai-audit-image";
import { tryLlmPageAudit } from "@/lib/observation-ai-audit-llm";
import { saveObservationAiAudit } from "@/lib/observation-ai-audit-store";
import type { BehaviorMapDiffV1, BehaviorTransitionV1 } from "@/lib/observation-behavior-diff";
import type { ObservationCompareVerdict } from "@/lib/observation-compare";
import { utcMonthStartIso } from "@/lib/observation-quota";
import { ATTR, markSpanResult, setSpanAttrs, withSpan } from "@/lib/otel/trace";
import type { PlanDefinition } from "@/lib/plans";

/** 監査ログの action。月間上限の計数にも使う（ai_analyses は upsert なので回数が残らない）。 */
export const WATCH_CHANGE_AUDIT_ACTION = "observation.watch_change_audit";

/** cron の残り時間がこれ未満なら Change Audit を飛ばす（LLM 1 回 + 画像取得の目安）。 */
export const WATCH_CHANGE_AUDIT_MIN_BUDGET_MS = 40_000;

export type WatchChangeAuditTrigger = "behavior" | "screenshot";

export type WatchChangeAuditResult =
  | { ran: true; audit: ObservationAiAudit; trigger: WatchChangeAuditTrigger; used: number; limit: number }
  | { ran: false; reason: "plan" | "quota" | "no_trigger" | "no_snapshot" | "save_failed"; used?: number; limit?: number };

/**
 * Watch の Alert を Change Audit にかけるべきか。
 * Same → 走らせない。Behavior Diff の Alert、または Screenshot Changed のときだけ。
 */
export function watchChangeAuditTrigger(input: {
  behaviorAlerts: BehaviorTransitionV1[];
  behaviorMapAlerts: BehaviorMapDiffV1[];
  screenshotVerdict: ObservationCompareVerdict | null | undefined;
}): WatchChangeAuditTrigger | null {
  if (input.behaviorAlerts.length > 0 || input.behaviorMapAlerts.length > 0) return "behavior";
  if (input.screenshotVerdict === "changed") return "screenshot";
  return null;
}

/** 今月この利用者で自動 Change Audit を何回実行したか。数えられなければ null（安全側で上限扱い）。 */
export async function countWatchChangeAuditsThisUtcMonth(
  supabase: SupabaseClient,
  userId: string,
  now = new Date(),
): Promise<number | null> {
  const { count, error } = await supabase
    .from("audit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", WATCH_CHANGE_AUDIT_ACTION)
    .gte("created_at", utcMonthStartIso(now));
  if (error) return null;
  return count ?? 0;
}

/**
 * Watch の Alert が出た Observation に対して Change Audit を自動実行する。
 *
 * - 再計測はしない。保存済みの Observation / 直前 Compare / Behavior Diff を読むだけ。
 * - Pro の上（`plan.watchChangeAuditMonthly` が 0 の plan では走らない）。
 * - 月間上限は `audit_events` の `observation.watch_change_audit` 件数で数える。
 * - LLM が使えないときは record（機械的な指摘）だけで保存する。
 */
export async function runWatchChangeAudit(
  supabase: SupabaseClient,
  input: {
    userId: string;
    plan: PlanDefinition;
    observation: Observation;
    previous: Observation | null;
    behaviorAlerts: BehaviorTransitionV1[];
    behaviorMapAlerts: BehaviorMapDiffV1[];
    screenshotVerdict: ObservationCompareVerdict | null | undefined;
    locale?: Locale;
    now?: Date;
  },
): Promise<WatchChangeAuditResult> {
  return withSpan(
    "change_audit.run",
    {
      [ATTR.source]: "watch",
      [ATTR.observationId]: input.observation.id,
      [ATTR.userId]: input.userId,
      "viewtrace.plan": input.plan.id,
    },
    async (span) => {
      const trigger = watchChangeAuditTrigger(input);
      setSpanAttrs(span, { "viewtrace.change_audit.trigger": trigger ?? "none" });
      if (!trigger) {
        setSpanAttrs(span, { [ATTR.outcome]: "no_trigger" });
        return { ran: false, reason: "no_trigger" };
      }
      if (!input.observation.snapshotImageUrl) {
        setSpanAttrs(span, { [ATTR.outcome]: "no_snapshot" });
        return { ran: false, reason: "no_snapshot" };
      }
      const limit = input.plan.watchChangeAuditMonthly;
      if (limit <= 0) {
        setSpanAttrs(span, { [ATTR.outcome]: "plan" });
        return { ran: false, reason: "plan", used: 0, limit };
      }
      const now = input.now ?? new Date();
      const used = await countWatchChangeAuditsThisUtcMonth(supabase, input.userId, now);
      setSpanAttrs(span, { "viewtrace.change_audit.used": used, "viewtrace.change_audit.limit": limit });
      if (used == null || used >= limit) {
        setSpanAttrs(span, { [ATTR.outcome]: "quota" });
        return { ran: false, reason: "quota", used: used ?? limit, limit };
      }

      const locale: Locale = input.locale ?? "ja";
      const behavior: AuditBehaviorContext = {
        transitions: input.behaviorAlerts,
        mapDiffs: input.behaviorMapAlerts.filter((row) => row.section !== "unchanged"),
      };
      const record = buildRecordPageAudit(input.observation, locale, input.previous, behavior);
      // 画面は Screenshot が Changed のときだけ渡す（Behavior だけの差で画像を送っても読む材料にならない）。
      const image =
        trigger === "screenshot" && !(input.observation.snapshotContentType ?? "").toLowerCase().startsWith("video/")
          ? await loadAuditScreenshot(input.observation.snapshotImageUrl)
          : undefined;
      const llm = await tryLlmPageAudit({
        facts: observationAuditFacts(input.observation, input.previous, behavior),
        image,
        locale,
      });
      const audit = llm ? mergeAiAuditNotes(record, llm) : record;

      const saved = await saveObservationAiAudit(supabase, {
        userId: input.userId,
        observationId: input.observation.id,
        audit,
      });
      if (!saved) {
        markSpanResult(span, { ok: false, error: "save_failed" }, { [ATTR.outcome]: "save_failed" });
        return { ran: false, reason: "save_failed", used, limit };
      }

      await appendAuditEventAsService(supabase, input.userId, {
        scope: "observation",
        action: WATCH_CHANGE_AUDIT_ACTION,
        observationId: input.observation.id,
        meta: {
          trigger,
          source: audit.source,
          model: audit.model,
          notes: audit.notes.length,
          behavior_alerts: input.behaviorAlerts.length,
          behavior_map_alerts: behavior.mapDiffs.length,
          screenshot_verdict: input.screenshotVerdict ?? null,
          used_after: used + 1,
          limit,
        },
      });

      setSpanAttrs(span, {
        [ATTR.outcome]: "saved",
        [ATTR.ok]: true,
        "viewtrace.change_audit.source": audit.source,
        "viewtrace.change_audit.notes": audit.notes.length,
        "viewtrace.change_audit.model": audit.model,
      });
      return { ran: true, audit, trigger, used: used + 1, limit };
    },
  );
}
