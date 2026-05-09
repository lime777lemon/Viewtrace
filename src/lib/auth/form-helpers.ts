export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** サインアップ: 半角英数字のみ（記号不可）、8文字以上 */
export function isSignupPasswordOk(password: string): boolean {
  return /^[A-Za-z0-9]{8,}$/.test(password);
}

export function mapAuthError(message: string): string {
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
    return "確認メールの送信に失敗しました。Supabase の Project Settings → Authentication → SMTP（カスタムSMTP未設定ならデフォルト送信の制限・迷惑扱い）と、Logs → Auth のエラーを確認してください。";
  }
  return "認証に失敗しました。しばらくしてから再度お試しください。";
}
