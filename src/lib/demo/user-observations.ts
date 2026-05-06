import { cookies } from "next/headers";
import type { Observation, ObservationHistoryEvent } from "@/lib/demo/observations";
import type { PlanId } from "@/lib/plans";
import { getPlan } from "@/lib/plans";

export const USER_OBSERVATIONS_COOKIE = "viewtrace_user_obs";

const MAX_ITEMS = 35;
const MAX_COOKIE_BYTES = 4200;

function sortByCapturedAtDesc(list: Observation[]): Observation[] {
  return list.slice().sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
}

function isHistoryEvent(x: unknown): x is ObservationHistoryEvent {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.at === "string" &&
    typeof o.label === "string" &&
    o.label.length < 200 &&
    (o.kind === "capture" || o.kind === "status" || o.kind === "processing") &&
    (o.detail === undefined || (typeof o.detail === "string" && o.detail.length < 300))
  );
}

function isObservation(x: unknown): x is Observation {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    o.id.length > 0 &&
    o.id.length < 120 &&
    typeof o.url === "string" &&
    o.url.length < 2000 &&
    typeof o.regionLabel === "string" &&
    o.regionLabel.length < 200 &&
    typeof o.capturedAt === "string" &&
    (o.status === "success" || o.status === "failure" || o.status === "pending") &&
    (o.note === undefined || (typeof o.note === "string" && o.note.length < 500)) &&
    (o.pageTitle === undefined || (typeof o.pageTitle === "string" && o.pageTitle.length < 400)) &&
    (o.snapshotImageUrl === undefined ||
      (typeof o.snapshotImageUrl === "string" && o.snapshotImageUrl.length < 2048)) &&
    (o.events === undefined ||
      (Array.isArray(o.events) && o.events.length <= 24 && o.events.every(isHistoryEvent)))
  );
}

function trimToFitCookie(list: Observation[]): Observation[] {
  let cur = list.slice(0, MAX_ITEMS);
  while (cur.length > 0) {
    const json = JSON.stringify(cur);
    if (Buffer.byteLength(json, "utf8") <= MAX_COOKIE_BYTES) return cur;
    cur = cur.slice(0, -1);
  }
  return [];
}

export async function readUserObservations(): Promise<Observation[]> {
  const raw = (await cookies()).get(USER_OBSERVATIONS_COOKIE)?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isObservation);
  } catch {
    return [];
  }
}

export async function writeUserObservations(list: Observation[]): Promise<void> {
  const trimmed = trimToFitCookie(sortByCapturedAtDesc(list));
  const json = JSON.stringify(trimmed);
  (await cookies()).set(USER_OBSERVATIONS_COOKIE, json, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 120,
  });
}

export async function appendUserObservation(
  obs: Observation,
  opts: { retentionDays: number; monthlyLimit: number },
): Promise<{ ok: true } | { ok: false; code: "monthly_limit" }> {
  const curRaw = await readUserObservations();
  const cur = filterObservationsByRetention(curRaw, opts.retentionDays);

  const usedThisMonth = countUserObservationsThisUtcMonth(cur);
  if (usedThisMonth >= opts.monthlyLimit) {
    // 保存前に古い記録を落としておく（自動削除）
    if (cur.length !== curRaw.length) await writeUserObservations(cur);
    return { ok: false, code: "monthly_limit" };
  }

  await writeUserObservations([obs, ...cur]);
  return { ok: true };
}

/** プランの保持日数より古い記録を除外（一覧・CSV・参照用） */
export function filterObservationsByRetention(
  rows: Observation[],
  retentionDays: number,
): Observation[] {
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  return rows.filter((o) => new Date(o.capturedAt).getTime() >= cutoff);
}

export async function getMergedObservationsSorted(): Promise<Observation[]> {
  const user = await readUserObservations();
  return sortByCapturedAtDesc(user);
}

/** ログイン中プランの保持期間でフィルタした一覧 */
export async function getMergedObservationsForPlan(planId: PlanId): Promise<Observation[]> {
  const retentionDays = getPlan(planId).retentionDays;
  const merged = await getMergedObservationsSorted();
  return filterObservationsByRetention(merged, retentionDays);
}

export async function getObservationMerged(id: string): Promise<Observation | undefined> {
  const user = await readUserObservations();
  return user.find((o) => o.id === id);
}

export async function getObservationMergedForPlan(
  id: string,
  planId: PlanId,
): Promise<Observation | undefined> {
  const obs = await getObservationMerged(id);
  if (!obs) return undefined;
  const retentionDays = getPlan(planId).retentionDays;
  if (!filterObservationsByRetention([obs], retentionDays).length) return undefined;
  return obs;
}

export function countUserObservationsThisUtcMonth(user: Observation[]): number {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  return user.filter((o) => {
    const d = new Date(o.capturedAt);
    return d.getUTCFullYear() === y && d.getUTCMonth() === m;
  }).length;
}
