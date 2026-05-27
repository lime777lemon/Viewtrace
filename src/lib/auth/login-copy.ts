export type LoginLocale = "en" | "ja";

export type LoginFormStrings = {
  getStartedTab: string;
  signInTab: string;
  email: string;
  emailPlaceholder: string;
  fullName: string;
  fullNamePlaceholder: string;
  company: string;
  companyPlaceholder: string;
  phone: string;
  phonePlaceholder: string;
  password: string;
  passwordPlaceholderSignup: string;
  passwordPlaceholderSignin: string;
  showPassword: string;
  hidePassword: string;
  confirmPassword: string;
  confirmPasswordPlaceholder: string;
  signingIn: string;
  signInSubmit: string;
  creatingAccount: string;
  getStartedSubmit: string;
  errInvalidEmail: string;
  errNameRequired: string;
  errPasswordRules: string;
  errPasswordMismatch: string;
  errSignupIncomplete: string;
  signupSuccessMessage: string;
};

export type LoginPageStrings = {
  contact: string;
  backToSite: string;
  langAria: string;
  english: string;
  japanese: string;
  productPill: string;
  heroTitle: string;
  bullet1: string;
  bullet2: string;
  cardSubtitle: string;
  emailSignInTitle: string;
  signInHelpPart1: string;
  getStarted: string;
  signInHelpPart2: string;
  signIn: string;
  signInHelpPart3: string;
  signInHelpStrong: string;
  signInHelpPart4: string;
  verifiedNote: string;
  needHelpPrefix: string;
  contactLinkLabel: string;
  needHelpSuffix: string;
  terms: string;
  privacy: string;
  acceptableUse: string;
  form: LoginFormStrings;
};

const formEn: LoginFormStrings = {
  getStartedTab: "Get started",
  signInTab: "Sign in",
  email: "Email",
  emailPlaceholder: "you@company.com",
  fullName: "Full name",
  fullNamePlaceholder: "e.g. Jane Doe",
  company: "Company (optional)",
  companyPlaceholder: "e.g. Acme Inc.",
  phone: "Phone (optional)",
  phonePlaceholder: "e.g. +1 555 0100",
  password: "Password",
  passwordPlaceholderSignup: "8+ letters and numbers",
  passwordPlaceholderSignin: "Password",
  showPassword: "Show",
  hidePassword: "Hide",
  confirmPassword: "Confirm password",
  confirmPasswordPlaceholder: "Re-enter password",
  signingIn: "Signing in…",
  signInSubmit: "Sign in",
  creatingAccount: "Creating account…",
  getStartedSubmit: "Get started",
  errInvalidEmail: "Enter a valid email address.",
  errNameRequired: "Enter your name.",
  errPasswordRules: "Password must be at least 8 characters, letters and numbers only.",
  errPasswordMismatch: "Passwords do not match. Try again.",
  errSignupIncomplete: "We could not finish sign-up. Check your email or wait a moment and try again.",
  signupSuccessMessage:
    "We have sent a confirmation email request. You cannot sign in until you confirm your address using the link in that message. If nothing arrives within a few minutes, check your spam folder.",
};

const formJa: LoginFormStrings = {
  getStartedTab: "無料で始める",
  signInTab: "ログイン",
  email: "メールアドレス",
  emailPlaceholder: "you@company.com",
  fullName: "お名前",
  fullNamePlaceholder: "例：山田 太郎",
  company: "会社名（任意）",
  companyPlaceholder: "例：株式会社〇〇",
  phone: "電話番号（任意）",
  phonePlaceholder: "例：03-1234-5678",
  password: "パスワード",
  passwordPlaceholderSignup: "半角英数字8文字以上",
  passwordPlaceholderSignin: "パスワード",
  showPassword: "表示",
  hidePassword: "隠す",
  confirmPassword: "パスワード（確認）",
  confirmPasswordPlaceholder: "もう一度入力",
  signingIn: "ログイン中…",
  signInSubmit: "ログイン",
  creatingAccount: "登録中…",
  getStartedSubmit: "無料で始める",
  errInvalidEmail: "有効なメールアドレスを入力してください。",
  errNameRequired: "お名前を入力してください。",
  errPasswordRules: "パスワードは半角英字・数字のみで、8文字以上で入力してください。",
  errPasswordMismatch: "パスワードが一致しません。もう一度入力してください。",
  errSignupIncomplete:
    "登録を完了できませんでした。メールアドレスを確認するか、しばらくしてから再度お試しください。",
  signupSuccessMessage:
    "登録用の確認メールの送信をリクエストしました。メール内のリンクでアドレス確認が完了するまでログインできません。数分経っても届かない場合は迷惑メールフォルダもご確認ください。",
};

export const loginPageCopy: Record<LoginLocale, LoginPageStrings> = {
  en: {
    contact: "Contact",
    backToSite: "Back to site",
    langAria: "Language",
    english: "English",
    japanese: "日本語",
    productPill: "Product",
    heroTitle: "Sign in to the dashboard",
    bullet1: "Manage timestamped visual records",
    bullet2: "Review observation history with regional targeting",
    cardSubtitle: "Sign up or sign in with email and password",
    emailSignInTitle: "Email sign-in",
    signInHelpPart1: "Use ",
    getStarted: "Get started",
    signInHelpPart2: " to create an account or ",
    signIn: "Sign in",
    signInHelpPart3: " for an existing one.",
    signInHelpStrong:
      " After sign-up, you cannot sign in until you confirm your email via the link we send. ",
    signInHelpPart4: "Open the link in the message, then sign in with your password.",
    verifiedNote: "Your email is confirmed. Enter your password on this page to sign in.",
    needHelpPrefix: "Need help? ",
    contactLinkLabel: "Contact us",
    needHelpSuffix: ".",
    terms: "Terms",
    privacy: "Privacy",
    acceptableUse: "Acceptable use",
    form: formEn,
  },
  ja: {
    contact: "お問い合わせ",
    backToSite: "サイトへ戻る",
    langAria: "表示言語",
    english: "English",
    japanese: "日本語",
    productPill: "プロダクト",
    heroTitle: "ダッシュボードにログイン",
    bullet1: "タイムスタンプ付きのビジュアル記録を管理",
    bullet2: "地域条件に基づく観測の履歴を確認",
    cardSubtitle: "メールとパスワードで登録またはログイン",
    emailSignInTitle: "メールアドレスでサインイン",
    signInHelpPart1: "「",
    getStarted: "無料で始める",
    signInHelpPart2: "」でアカウントを作成するか、「",
    signIn: "ログイン",
    signInHelpPart3: "」で既存のアカウントに入れます。",
    signInHelpStrong:
      "新規登録後は確認メールのリンクでアドレス確認を済ませるまでログインできません。",
    signInHelpPart4: "メールが届いたらリンクを開き、確認後にパスワードでログインしてください。",
    verifiedNote: "メールアドレスの確認が完了しました。続けてこのページでパスワードを入力してログインしてください。",
    needHelpPrefix: "うまくいかない場合は",
    contactLinkLabel: "お問い合わせ",
    needHelpSuffix: "ください。",
    terms: "利用規約",
    privacy: "プライバシー",
    acceptableUse: "利用方針",
    form: formJa,
  },
};
