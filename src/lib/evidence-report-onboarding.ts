import type { Locale } from "@/lib/i18n";

export const EVIDENCE_REPORT_ONBOARDING_STEPS = [
  "email",
  "destinations",
  "send",
  "advanced",
] as const;

export type EvidenceReportOnboardingStepId = (typeof EVIDENCE_REPORT_ONBOARDING_STEPS)[number];

const STORAGE_PREFIX = "viewtrace_evidence_report_onboarding_v1:";

export function readEvidenceReportOnboardingSeen(userId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function writeEvidenceReportOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, "1");
  } catch {
    /* private mode */
  }
}

type StepCopy = { title: string; body: string };

type EvidenceReportOnboardingCopy = {
  open: string;
  title: string;
  skip: string;
  next: string;
  back: string;
  done: string;
  stepOf: string;
  steps: Record<EvidenceReportOnboardingStepId, StepCopy>;
};

const ja: EvidenceReportOnboardingCopy = {
  open: "この画面の案内",
  title: "Evidence Report の送り方",
  skip: "あとで",
  next: "次へ",
  back: "戻る",
  done: "完了",
  stepOf: "{current} / {total}",
  steps: {
    email: {
      title: "Email で受け取る",
      body: "オンにすると、ログイン中のアドレスへ毎週月曜 9:00（JST）に先週の Evidence Report を送ります。Alert とは別です。",
    },
    destinations: {
      title: "追加の送信先",
      body: "欄ごとに1アドレス、最大10件です。空欄は使いません。Slack や Teams のチャンネル用メールアドレスもここに書けます。受け取った人は、メール内のリンクからログインなしでレポートを読めます。",
    },
    send: {
      title: "送信する",
      body: "押すと、先週の Evidence Report を指定したアドレスへ今すぐ送ります。送れたあと、この画面の内容を保存します。保存したアドレスは、毎週月曜の自動送信でも使います。",
    },
    advanced: {
      title: "その他の連携設定",
      body: "通常はメールアドレスだけで足ります。構造化された投稿が必要なときだけ、ここを開いて Slack、Teams、その他の HTTPS を設定します。",
    },
  },
};

const en: EvidenceReportOnboardingCopy = {
  open: "Guide to this screen",
  title: "How to send an Evidence Report",
  skip: "Later",
  next: "Next",
  back: "Back",
  done: "Done",
  stepOf: "{current} / {total}",
  steps: {
    email: {
      title: "Send by email",
      body: "When this is on, last week's Evidence Report goes to the signed-in address every Monday at 9:00 JST. This is separate from Alert.",
    },
    destinations: {
      title: "Additional destinations",
      body: "One address per field, up to 10. Empty fields are not used. A Slack or Teams channel email address can go here. Recipients open the report from the link in the email, without logging in.",
    },
    send: {
      title: "Send",
      body: "This sends last week's Evidence Report to the addresses now. After it is accepted, this screen is saved. Saved addresses are also used for the Monday send.",
    },
    advanced: {
      title: "Other integrations",
      body: "Email addresses are enough for the weekly report. Open this only when a structured post needs Slack, Teams, or another HTTPS webhook.",
    },
  },
};

export function evidenceReportOnboardingCopy(locale: Locale): EvidenceReportOnboardingCopy {
  return locale === "ja" ? ja : en;
}
