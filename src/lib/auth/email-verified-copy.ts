export type EmailVerifiedLocale = "en" | "ja";

export type EmailVerifiedStrings = {
  title: string;
  body: string;
  loginCta: string;
  dashboardCta: string;
  alreadySignedInHint: string;
  backToSite: string;
  langAria: string;
  english: string;
  japanese: string;
};

export const emailVerifiedCopy: Record<EmailVerifiedLocale, EmailVerifiedStrings> = {
  en: {
    title: "Authentication successful",
    body: "Your email is confirmed. Continue on the sign-in page with the email and password you registered.",
    loginCta: "Go to sign-in page",
    dashboardCta: "Go to dashboard",
    alreadySignedInHint: "Already signed in on this browser? You can open the dashboard directly.",
    backToSite: "Back to site",
    langAria: "Language",
    english: "English",
    japanese: "日本語",
  },
  ja: {
    title: "認証成功",
    body: "メールアドレスの確認が完了しました。下のボタンからログインページへ進み、登録したメールアドレスとパスワードでログインしてください。",
    loginCta: "ログインページへ",
    dashboardCta: "ダッシュボードへ",
    alreadySignedInHint: "このブラウザではすでにログイン済みの場合は、ダッシュボードへ進めます。",
    backToSite: "サイトへ戻る",
    langAria: "表示言語",
    english: "English",
    japanese: "日本語",
  },
};

/** メール確認後のリダイレクト先（auth/callback の next パラメータ） */
export const POST_EMAIL_VERIFY_PATH = "/auth/email-verified";
