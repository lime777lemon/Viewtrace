"use server";

import { redirect } from "next/navigation";
import { appendAuditEvent, AUDIT_ACTION } from "@/lib/audit-log";
import { isValidEmail, mapAuthErrorForLocale } from "@/lib/auth/form-helpers";
import type { LoginLocale } from "@/lib/auth/login-copy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { parsePlanId } from "@/lib/plans";

export type AuthFormState = { error?: string; message?: string } | null;

/**
 * ログインのみ（Server Action）。サインアップは PKCE の code verifier をブラウザ Cookie に確実に残すため、
 * Client Component から `createSupabaseBrowserClient().auth.signUp` で行う。
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
    return { error: mapAuthErrorForLocale(error.message, locale) };
  }

  await appendAuditEvent(supabase, {
    action: AUDIT_ACTION.AUTH_SIGN_IN,
    meta: { method: "password" },
  });

  const nextRaw = String(formData.get("next") ?? "").trim();
  if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    redirect(nextRaw);
  }
  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id) {
    await appendAuditEvent(supabase, {
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
