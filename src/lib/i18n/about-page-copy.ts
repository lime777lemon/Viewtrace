export type AboutFocusItem = {
  label: string;
  iconSrc: string;
};

export type AboutPageCopy = {
  pageTitle: string;
  leadBeforeOperator: string;
  operatorName: string;
  leadAfterOperator: string;
  paragraphs: readonly string[];
  missionTitle: string;
  missionBody: string;
  focusTitle: string;
  focusItems: readonly AboutFocusItem[];
  operatorNote: string;
  legalLinkPrefix: string;
  legalLinkLabel: string;
  legalLinkSuffix: string;
  contactCtaPrefix: string;
  contactCtaLinkLabel: string;
  contactCtaSuffix: string;
};

export const aboutPageCopyJa: AboutPageCopy = {
  pageTitle: "私たちについて",
  leadBeforeOperator: "Viewtrace は、",
  operatorName: "The Establish合同会社",
  leadAfterOperator: "が運営する、地域ルーティング型のビジュアル証跡インフラです。",
  paragraphs: [
    "ユーザーが指定した URL について、特定の地域・時刻において何が表示されていたかを、タイムスタンプ付きの記録として残します。広告・LP・越境キャンペーンの説明責任、社内照合、クライアント共有のたたき台として設計しています。",
    "記録は参考情報であり、確認記録としての完全性や広告配信の正常性を保証するものではありません。それでも、口頭説明や手作業のスクショだけでは揃いにくい「いつ・どこで・何が見えていたか」という shared truth を、再現可能な形で積み上げることを目指しています。",
  ],
  missionTitle: "ミッション",
  missionBody:
    "説明責任と監査性のために、ジオルーティングで取得した証跡を、チームが同じ前提で参照できるインフラとして提供する。",
  focusTitle: "主な利用シーン",
  focusItems: [
    {
      label: "地域別 LP・広告クリエイティブの表示確認",
      iconSrc: "/marketing/icons/geo-screenshot.png",
    },
    {
      label: "代理店・メディアチーム向けの根拠出し・報告",
      iconSrc: "/marketing/icons/proof-for-ad-agencies.png",
    },
    {
      label: "定期自動観測とメール通知による運用の省力化",
      iconSrc: "/marketing/icons/history.png",
    },
    {
      label: "米国各州・主要国を想定したジオ QA",
      iconSrc: "/marketing/icons/geo-testing.png",
    },
  ],
  operatorNote: "The Establish合同会社（東京）が運営しています。",
  legalLinkPrefix: "会社情報・連絡先は",
  legalLinkLabel: "特定商取引法に基づく表記",
  legalLinkSuffix: "をご覧ください。",
  contactCtaPrefix: "",
  contactCtaLinkLabel: "お問い合わせ",
  contactCtaSuffix: "",
};

export const aboutPageCopyEn: AboutPageCopy = {
  pageTitle: "About us",
  leadBeforeOperator: "Viewtrace is ",
  operatorName: "geo-routed visual evidence infrastructure",
  leadAfterOperator: " operated by The Establish LLC from Tokyo.",
  paragraphs: [
    "We help teams capture what a user-specified URL looked like in a chosen region at a point in time—timestamped records for accountability, reconciliation, and sharing.",
    "Our primary users include advertisers, agencies, and operators working across U.S. states and international markets. Records are reference information: we do not warrant legal completeness or ad delivery health, but we aim to replace ad-hoc screenshots with reproducible geo-routed evidence.",
  ],
  missionTitle: "Mission",
  missionBody:
    "Build accountability infrastructure: geo-routed captures your team can reference as shared truth when explaining what was live.",
  focusTitle: "What teams use Viewtrace for",
  focusItems: [
    {
      label: "Regional LP and ad creative verification",
      iconSrc: "/marketing/icons/geo-screenshot.png",
    },
    {
      label: "Evidence trails for agency and media reporting",
      iconSrc: "/marketing/icons/proof-for-ad-agencies.png",
    },
    {
      label: "Scheduled observations with email notifications",
      iconSrc: "/marketing/icons/history.png",
    },
    {
      label: "Geo QA across U.S. states and major countries",
      iconSrc: "/marketing/icons/geo-testing.png",
    },
  ],
  operatorNote: "Operated by The Establish LLC (The Establish 合同会社), Tokyo, Japan.",
  legalLinkPrefix: "For company details and contact, see our ",
  legalLinkLabel: "Commercial Disclosure (Japan)",
  legalLinkSuffix: ".",
  contactCtaPrefix: "",
  contactCtaLinkLabel: "Contact",
  contactCtaSuffix: "",
};
