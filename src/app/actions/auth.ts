"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteOrigin } from "@/lib/site";
import { getSession } from "@/lib/auth/session";
import { parsePlanId } from "@/lib/plans";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function mapAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }
  if (m.includes("email not confirmed")) {
    return "メールアドレスの確認が済んでいません。受信トレイの確認リンクを開いてください。";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "このメールアドレスは既に登録されています。ログインをお試しください。";
  }
  if (m.includes("password")) {
    return "パスワードの形式を確認してください（8文字以上が必要です）。";
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

  if (intent === "signup" && password.length < 8) {
    return { error: "パスワードは8文字以上で入力してください。" };
  }

  const supabase = await createSupabaseServerClient();

  if (intent === "signup") {
    const redirectUrl = `${siteOrigin}/auth/callback`;
    /** サインアップ時はプランを聞かず Starter を既定とする（設定で変更可） */
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          plan: "starter" as const,
          trial_active: true,
          trial_started_at: new Date().toISOString(),
        },
      },
    });

    if (error) {
      return { error: mapAuthError(error.message) };
    }

    if (data.session) {
      const nextRaw = String(formData.get("next") ?? "").trim();
      if (nextRaw.startsWith("/") && !nextRaw.startsWith("//")) {
        redirect(nextRaw);
      }
      redirect("/dashboard");
    }

    return {
      message:
        "登録用のメールを送信しました。メール内のリンクを開くとアカウントが有効化されます。確認後、こちらからログインしてください。",
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
