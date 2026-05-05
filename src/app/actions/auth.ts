"use server";

import { redirect } from "next/navigation";
import { getAuthEmailRedirectTo } from "@/lib/auth/callback-url";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSession } from "@/lib/auth/session";
import { parsePlanId, TRIAL_CONFIG } from "@/lib/plans";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (m.includes("email not confirmed")) {
    return "メールアドレスの確認が済んでいません。登録時に届いたメールのリンクを開いて確認を完了してから、もう一度ログインしてください。";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "このメールアドレスは既に登録されています。ログインをお試しください。";
  }
  if (m.includes("password")) {
    return "パスワードの形式を確認してください（半角英数字・8文字以上）。";
  }
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("email rate limit")) {
    return "確認メールの送信が一時的に制限されています。数分待ってから、下の「確認メールを再送」をお試しください。";
  }
  return "認証に失敗しました。しばらくしてから再度お試しください。";
}

export type AuthFormState = { error?: string; message?: string } | null;

export async function authFormAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const intent = String(formData.get("intent") ?? "signin").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !isValidEmail(email)) {
    return { error: "有効なメールアドレスを入力してください。" };
  }

  if (!password) {
    return { error: "パスワードを入力してください。" };
  }

  /** サインアップ: 半角英数字のみ（記号不可）、8文字以上 */
  const signupPasswordOk = /^[A-Za-z0-9]{8,}$/.test(password);
  if (intent === "signup" && !signupPasswordOk) {
    return {
      error: "パスワードは半角英字・数字のみで、8文字以上で入力してください。",
    };
  }

  if (intent === "signup") {
    const passwordConfirm = String(formData.get("passwordConfirm") ?? "");
    if (password !== passwordConfirm) {
      return { error: "パスワードが一致しません。もう一度入力してください。" };
    }
  }

  const supabase = await createSupabaseServerClient();

  if (intent === "signup") {
    const redirectUrl = await getAuthEmailRedirectTo();
    const trialStartedAt = new Date().toISOString();
    /**
     * options.data は Supabase の raw_user_meta_data（ダッシュボード: Authentication → Users → ユーザー → User Metadata）に保存される。
     * アプリは getSession() で trial_started_at / trial_active を読み無料枠を判定する。
     */
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          plan: "starter" as const,
          trial_active: true,
          trial_started_at: trialStartedAt,
          trial_free_observations: TRIAL_CONFIG.freeObservations,
          trial_days: TRIAL_CONFIG.trialDays,
        },
      },
    });

    if (error) {
      return { error: mapAuthError(error.message) };
    }

    if (!data.user) {
      return {
        error:
          "登録を完了できませんでした。メールアドレスを確認するか、しばらくしてから再度お試しください。",
      };
    }

    if (data.session) {
      const nextRaw = String(formData.get("next") ?? "").trim();
      if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
        redirect(nextRaw);
      }
      redirect("/dashboard");
    }

    const emailDomain = email.includes("@") ? email.split("@")[1] : "";
    console.info("[auth] signup confirmation email requested", {
      userId: data.user.id,
      emailDomain,
      redirectUrl,
    });

    return {
      message:
        "登録用の確認メールの送信をリクエストしました。メール内のリンクでアドレス確認が完了するまでログインできません。\n\n届かないとき: 迷惑メール・プロモーションを確認 → 画面下の「確認メールを再送」→ 繰り返し届かない場合は、Supabase の Project Settings → Auth → SMTP で Resend 等を設定してください（未設定だと既定の送信が受信拒否されやすいです）。",
    };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: mapAuthError(error.message) };
  }

  const nextRaw = String(formData.get("next") ?? "").trim();
  if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
    redirect(nextRaw);
  }
  redirect("/dashboard");
}

/** メール確認がオンなのに届かない場合の再送（Authentication の Rate limit に注意） */
export async function resendSignupConfirmationAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email || !isValidEmail(email)) {
    return { error: "有効なメールアドレスを入力してください。" };
  }

  const supabase = await createSupabaseServerClient();
  const emailRedirectTo = await getAuthEmailRedirectTo();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo },
  });

  if (error) {
    return { error: mapAuthError(error.message) };
  }

  return {
    message:
      "確認メールを再送しました。届かない場合は迷惑メールフォルダやドメイン受信設定をご確認ください。",
  };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
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

  const companyName = String(formData.get("companyName") ?? "").trim().slice(0, 200);
  const useCase = String(formData.get("useCase") ?? "").trim().slice(0, 500);

  const { error } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      company_name: companyName.length > 0 ? companyName : null,
      use_case: useCase.length > 0 ? useCase : null,
    },
  });

  if (error) {
    return { error: "保存に失敗しました。しばらくしてから再度お試しください。" };
  }

  return { message: "保存しました。" };
}
