import type { SupabaseClient } from "@supabase/supabase-js";
import { isInternalActivationEmail } from "@/lib/admin";

export type ActivationUser = {
  id: string;
  emailConfirmed: boolean;
  internal: boolean;
};

export type ActivationCounts = {
  registered: number;
  confirmed: number;
  withFirst: number;
  withSecond: number;
};

export type ActivationRates = {
  confirmRate: number | null;
  firstObservationRate: number | null;
  secondObservationRate: number | null;
};

export type ActivationFunnel = {
  counts: ActivationCounts;
  rates: ActivationRates;
};

function ratio(num: number, den: number): number | null {
  if (den <= 0) return null;
  return num / den;
}

function observationCountsByUser(observationUserIds: string[]): Map<string, number> {
  const perUser = new Map<string, number>();
  for (const id of observationUserIds) {
    if (!id) continue;
    perUser.set(id, (perUser.get(id) ?? 0) + 1);
  }
  return perUser;
}

/** 確認済みユーザーだけを分母にして初回・2回目を数える。未確認はプロダクトに入れない。 */
export function computeActivationSlice(
  users: ActivationUser[],
  observationUserIds: string[],
): ActivationFunnel {
  const perUser = observationCountsByUser(observationUserIds);
  const registered = users.length;
  const confirmed = users.filter((u) => u.emailConfirmed);
  let withFirst = 0;
  let withSecond = 0;
  for (const u of confirmed) {
    const n = perUser.get(u.id) ?? 0;
    if (n >= 1) withFirst += 1;
    if (n >= 2) withSecond += 1;
  }
  return {
    counts: {
      registered,
      confirmed: confirmed.length,
      withFirst,
      withSecond,
    },
    rates: {
      confirmRate: ratio(confirmed.length, registered),
      firstObservationRate: ratio(withFirst, confirmed.length),
      secondObservationRate: ratio(withSecond, withFirst),
    },
  };
}

export function computeActivationFunnel(
  users: ActivationUser[],
  observationUserIds: string[],
): { all: ActivationFunnel; external: ActivationFunnel } {
  return {
    all: computeActivationSlice(users, observationUserIds),
    external: computeActivationSlice(
      users.filter((u) => !u.internal),
      observationUserIds,
    ),
  };
}

async function listAuthUsersForActivation(admin: SupabaseClient): Promise<ActivationUser[]> {
  const out: ActivationUser[] = [];
  const perPage = 200;
  for (let page = 1; page <= 25; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return [];
    const users = data?.users ?? [];
    if (users.length === 0) break;
    for (const u of users) {
      const email = typeof u.email === "string" ? u.email : "";
      out.push({
        id: u.id,
        emailConfirmed: Boolean(u.email_confirmed_at),
        internal: isInternalActivationEmail(email),
      });
    }
    if (users.length < perPage) break;
  }
  return out;
}

export async function loadActivationFunnel(
  admin: SupabaseClient,
): Promise<{ all: ActivationFunnel; external: ActivationFunnel }> {
  const users = await listAuthUsersForActivation(admin);
  const { data: observations, error: obsError } = await admin.from("observations").select("user_id");
  return computeActivationFunnel(
    users,
    obsError ? [] : (observations ?? []).map((row) => String(row.user_id ?? "")),
  );
}
