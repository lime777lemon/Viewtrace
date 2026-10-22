import type { Locale } from "@/lib/i18n";

export const REGION_SEARCH_ONBOARDING_STEPS = [
  "region",
  "url",
  "environment",
  "steps",
  "confirm",
] as const;

export type RegionSearchOnboardingStepId = (typeof REGION_SEARCH_ONBOARDING_STEPS)[number];

const STORAGE_PREFIX = "viewtrace_region_search_onboarding_v1:";

export function readRegionSearchOnboardingSeen(userId: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${userId}`) === "1";
  } catch {
    return false;
  }
}

export function writeRegionSearchOnboardingSeen(userId: string): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${userId}`, "1");
  } catch {
    /* private mode */
  }
}

type StepCopy = { title: string; body: string };

type RegionSearchOnboardingCopy = {
  open: string;
  title: string;
  skip: string;
  next: string;
  back: string;
  done: string;
  stepOf: string;
  steps: Record<RegionSearchOnboardingStepId, StepCopy>;
};

const ja: RegionSearchOnboardingCopy = {
  open: "この画面の案内",
  title: "確認の進め方",
  skip: "あとで",
  next: "次へ",
  back: "戻る",
  done: "完了",
  stepOf: "{current} / {total}",
  steps: {
    region: {
      title: "観測地域",
      body: "ページを開く地域です。1地域が1回の確認です。ほかの地域を足すと、その数だけ確認が増えます。",
    },
    url: {
      title: "URL",
      body: "確認するページのURLです。選んだ地域のブラウザで、このURLを開きます。",
    },
    environment: {
      title: "環境",
      body: "Desktop か Mobile を選びます。Desktop + Mobile は、同じ地域で2回分です。",
    },
    steps: {
      title: "手順",
      body: "任意です。手順を足しても確認の回数は増えません。ログイン、アカウント作成、カートへの追加、チェックアウトは、ここに追加したときだけ実行します。領域のスクリーンショットと動画の再生は、その手順で有効にしたときだけです。注文と支払いは、その手順で許可したときだけです。",
    },
    confirm: {
      title: "今回の確認",
      body: "確認する、を押す前に、使う回数と残量がここに出ます。押すと、選んだ地域のページと挙動を残します。",
    },
  },
};

const en: RegionSearchOnboardingCopy = {
  open: "Guide to this screen",
  title: "How to run a check",
  skip: "Later",
  next: "Next",
  back: "Back",
  done: "Done",
  stepOf: "{current} / {total}",
  steps: {
    region: {
      title: "Region",
      body: "The region that opens the page. One region is one check. Each region you add is another check.",
    },
    url: {
      title: "URL",
      body: "The page to open. A browser in the region you chose opens this URL.",
    },
    environment: {
      title: "Environment",
      body: "Choose Desktop or Mobile. Desktop + Mobile is two checks for the same region.",
    },
    steps: {
      title: "Steps",
      body: "Optional. Steps do not add a check. Login, account creation, add to cart, and checkout run only when you add them here. Screenshot region and video playback run only on the steps where you turn them on. Place order and payment run only when that step permits them.",
    },
    confirm: {
      title: "This check",
      body: "Before you press Run check, this summary shows how many checks the run uses and how many remain. The run keeps the page and behavior from the region you chose.",
    },
  },
};

export function regionSearchOnboardingCopy(locale: Locale): RegionSearchOnboardingCopy {
  return locale === "ja" ? ja : en;
}
