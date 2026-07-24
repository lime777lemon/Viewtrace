"use server";

import { createHash } from "node:crypto";
import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { getAuthEmailRedirectTo } from "@/lib/auth/callback-url";
import { isSignupPasswordOk, isValidEmail, mapAuthErrorForLocale } from "@/lib/auth/form-helpers";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { loginPageCopy } from "@/lib/auth/login-copy";
import { TRIAL_CONFIG } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { insertTrialSignupRow } from "@/lib/auth/trial-signup-server";
import { getSession } from "@/lib/auth/session";
import { parsePlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncPublicUserPlanMirror } from "@/lib/supabase/sync-public-user-plan";
import { insertOpsSignal } from "@/lib/ops/insert-signal";
import { sanitizeDashboardObservationHrefPath } from "@/lib/observation-route-id";
import { pwnedPasswordCount, pwnedPasswordErrorMessage } from "@/lib/auth/pwned-passwords";

export type AuthFormState = { error?: string; message?: string } | null;

/**
 * ログイン（Server Action）。
 */
export async function authFormAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const localeRaw = String(formData.get("_locale") ?? "en");
  const locale: LoginLocale = localeRaw === "ja" ? "ja" : "en";

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !isValidEmail(email)) {
    return {
      error: locale === "ja" ? "有効なメールアドレスを入力してください。" : "Enter a valid email address.",
    };
  }

  if (!password) {
    return { error: locale === "ja" ? "パスワードを入力してください。" : "Enter your password." };
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const emailFp = createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 16);
    void insertOpsSignal("auth_failure", {
      email_fp: emailFp,
      locale,
      code: typeof error.code === "string" ? error.code : "",
    });
    return { error: mapAuthErrorForLocale(error.message, locale) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.email) {
    await insertTrialSignupRow(
      supabase,
      user.email,
      locale,
      user.user_metadata as Record<string, unknown> | undefined,
    );
  }

  await appendAuditEvent(supabase, {
    scope: "system",
    action: AUDIT_ACTION.AUTH_SIGN_IN,
    meta: { method: "password" },
  });

  const nextRaw = String(formData.get("next") ?? "").trim();
  if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    redirect(sanitizeDashboardObservationHrefPath(nextRaw));
  }
  redirect("/dashboard");
}

/**
 * サインアップ（Server Action）。
 * ブラウザ `signUp` は PKCE 用の `pkce_…` TokenHash になり、メールの `verifyOtp` と相性が悪い。
 * サーバー経由で送ると別ブラウザでも確認リンクが通りやすい。
 */
export async function signupFormAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const localeRaw = String(formData.get("_locale") ?? "en");
  const locale: LoginLocale = localeRaw === "ja" ? "ja" : "en";
  const t = loginPageCopy[locale].form;

  const email = String(formData.get("email") ?? "").trim();
  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 200);
  const companyName = String(formData.get("companyName") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (!email || !isValidEmail(email)) {
    return { error: t.errInvalidEmail };
  }
  if (!fullName) {
    return { error: t.errNameRequired };
  }
  if (!isSignupPasswordOk(password)) {
    return { error: t.errPasswordRules };
  }
  if (password !== passwordConfirm) {
    return { error: t.errPasswordMismatch };
  }

  /**
   * HaveIBeenPwned k-anonymity チェック（Supabase Free でも漏洩済みパスワードを弾く）。
   * 失敗時は fail-open で従来通り進める（UX 維持）。
   */
  const pwnedCount = await pwnedPasswordCount(password);
  if (pwnedCount >= 1) {
    return { error: pwnedPasswordErrorMessage(locale, pwnedCount) };
  }

  const supabase = await createSupabaseServerClient();
  const emailRedirectTo = await getAuthEmailRedirectTo();
  const trialStartedAt = new Date().toISOString();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo,
      data: {
        plan: "freeplan" as const,
        trial_active: true,
        trial_started_at: trialStartedAt,
        trial_free_observations: TRIAL_CONFIG.freeObservations,
        trial_days: TRIAL_CONFIG.trialDays,
        full_name: fullName,
        company_name: companyName.length > 0 ? companyName : null,
        phone: phone.length > 0 ? phone : null,
      },
    },
  });

  if (error) {
    return { error: mapAuthErrorForLocale(error.message, locale) };
  }

  if (!data.user) {
    return { error: t.errSignupIncomplete };
  }

  if (data.session) {
    await insertTrialSignupRow(
      supabase,
      email,
      locale,
      data.user.user_metadata as Record<string, unknown> | undefined,
    );
    // メール確認前の自動ログインでダッシュボードへ飛ばさない（確認メール案内を表示）
    await supabase.auth.signOut();
  }

  return { message: t.signupSuccessMessage };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    await appendAuditEvent(supabase, {
      scope: "system",
      action: AUDIT_ACTION.AUTH_SIGN_OUT,
      meta: {},
    });
  }
  await supabase.auth.signOut();
  redirect("/login");
}

export async function switchPlanAction(formData: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");

  const plan = parsePlanId(String(formData.get("plan") ?? ""));
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({
    data: { ...user.user_metadata, plan },
  });
  if (error) {
    redirect("/dashboard/settings");
  }
  const admin = createSupabaseAdminClient();
  if (admin) {
    await syncPublicUserPlanMirror(admin, user.id, plan);
  }
  redirect("/dashboard/settings");
}

export type ProfileFormState = { error?: string; message?: string } | null;

/** Step 2: ログイン後に任意で Supabase user_metadata へ保存 */
export async function saveOptionalProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const fullName = String(formData.get("fullName") ?? "").trim().slice(0, 200);
  const companyName = String(formData.get("companyName") ?? "").trim().slice(0, 200);
  const phone = String(formData.get("phone") ?? "").trim().slice(0, 40);
  const useCase = String(formData.get("useCase") ?? "").trim().slice(0, 500);

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      full_name: fullName.length > 0 ? fullName : null,
      company_name: companyName.length > 0 ? companyName : null,
      phone: phone.length > 0 ? phone : null,
      use_case: useCase.length > 0 ? useCase : null,
    },
  });

  if (error) {
    return { error: "保存に失敗しました。しばらくしてから再度お試しください。" };
  }

  return { message: "保存しました。" };
}
