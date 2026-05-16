import type { LoginLocale } from "@/lib/auth/login-copy";

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Signup: ASCII letters and digits only (no symbols), 8+ characters */
export function isSignupPasswordOk(password: string): boolean {
  return /^[A-Za-z0-9]{8,}$/.test(password);
}

export function mapAuthError(message: string): string {
  return mapAuthErrorForLocale(message, "en");
}

export function mapAuthErrorForLocale(message: string, locale: LoginLocale): string {
  return locale === "ja" ? mapAuthErrorJa(message) : mapAuthErrorEn(message);
}

function mapAuthErrorEn(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "That email or password does not match our records.";
  }
  if (m.includes("email not confirmed")) {
    return "Please confirm your email first. Open the link in the message we sent when you signed up, then try signing in again.";
  }
  if (m.includes("user already registered") || m.includes("already been registered")) {
    return "This email is already registered. Try signing in instead.";
  }
  if (
    m.includes("pwned") ||
    m.includes("data breach") ||
    m.includes("leaked password") ||
    (m.includes("password") && m.includes("compromised"))
  ) {
    return "This password has appeared in known data breaches. Please choose a different one.";
  }
  if (m.includes("password")) {
    return "Check your password format (letters and numbers only, at least 8 characters).";
  }
  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("email rate limit") ||
    m.includes("over_request_rate_limit") ||
    m.includes("request rate limit")
  ) {
    return "Too many attempts. Please wait a few minutes and try again.";
  }
  if (
    m.includes("redirect") &&
    (m.includes("not allowed") || m.includes("disallowed") || m.includes("invalid url") || m.includes("invalid redirect"))
  ) {
    return "The confirmation redirect URL is not on Supabase’s allow list. In the dashboard, go to Authentication → URL configuration and add this environment’s https://…/auth/callback (including the port for local dev).";
  }
  if (
    m.includes("error sending") ||
    m.includes("unable to send") ||
    m.includes("sending confirmation") ||
    m.includes("confirmation email") ||
    m.includes("email provider") ||
    m.includes("smtp")
  ) {
    return "We could not send the confirmation email. Check Supabase → Project Settings → Authentication → SMTP (default mail can be blocked as spam) and Logs → Auth for errors.";
  }
  return "Something went wrong with authentication. Please try again in a moment.";
}

function mapAuthErrorJa(message: string): string {
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
  if (
    m.includes("pwned") ||
    m.includes("data breach") ||
    m.includes("leaked password") ||
    (m.includes("password") && m.includes("compromised"))
  ) {
    return "このパスワードは既知の漏洩リストに含まれています。別のパスワードを設定してください。";
  }
  if (m.includes("password")) {
    return "パスワードの形式を確認してください（半角英数字・8文字以上）。";
  }
  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("email rate limit") ||
    m.includes("over_request_rate_limit") ||
    m.includes("request rate limit")
  ) {
    return "試行回数が多すぎます。数分待ってから再度お試しください。";
  }
  if (
    m.includes("redirect") &&
    (m.includes("not allowed") || m.includes("disallowed") || m.includes("invalid url") || m.includes("invalid redirect"))
  ) {
    return "確認メールの戻り先URLが Supabase の許可リストにありません。Dashboard → Authentication → URL configuration の Redirect URLs に、この環境の https://…/auth/callback（ポート込み）を追加してください。";
  }
  if (
    m.includes("error sending") ||
    m.includes("unable to send") ||
    m.includes("sending confirmation") ||
    m.includes("confirmation email") ||
    m.includes("email provider") ||
    m.includes("smtp")
  ) {
    return "確認メールの送信に失敗しました。Supabase の Project Settings → Authentication → SMTP と Logs → Auth を確認してください。";
  }
  return "認証に失敗しました。しばらくしてから再度お試しください。";
}
