import type { Locale } from "@/lib/i18n";

export type ContactTopic = "general" | "billing" | "technical";

export type ContactPageCopy = {
  intro: string;
  emailFallback: string;
  formTitle: string;
  name: string;
  namePlaceholder: string;
  email: string;
  emailPlaceholder: string;
  topic: string;
  topicGeneral: string;
  topicBilling: string;
  topicTechnical: string;
  message: string;
  messagePlaceholder: string;
  submit: string;
  submitting: string;
  success: string;
  mailtoHint: string;
  errName: string;
  errEmail: string;
  errMessage: string;
  errSend: string;
  errNotConfigured: string;
};

const ja: ContactPageCopy = {
  intro:
    "Viewtrace へのご質問・ご相談・不具合のご連絡は、下記フォームまたはメールでお送りください。通常 2〜3 営業日以内に返信いたします。",
  emailFallback: "フォームが利用できない場合は、直接メールでも受け付けています。",
  formTitle: "お問い合わせフォーム",
  name: "お名前",
  namePlaceholder: "例：山田 太郎",
  email: "メールアドレス",
  emailPlaceholder: "you@company.com",
  topic: "お問い合わせ種別",
  topicGeneral: "一般的なお問い合わせ",
  topicBilling: "料金・お支払い",
  topicTechnical: "技術的な不具合・自動観測",
  message: "お問い合わせ内容",
  messagePlaceholder: "できるだけ具体的にご記入ください。",
  submit: "送信する",
  submitting: "送信中…",
  success: "お問い合わせを受け付けました。内容を確認のうえ、メールでご連絡いたします。",
  mailtoHint: "返信先はご入力いただいたメールアドレスになります。",
  errName: "お名前を入力してください。",
  errEmail: "有効なメールアドレスを入力してください。",
  errMessage: "お問い合わせ内容を入力してください（10文字以上）。",
  errSend: "送信に失敗しました。しばらくしてから再度お試しください。",
  errNotConfigured:
    "現在フォームからの送信を受け付けられません。下記メールアドレスまで直接ご連絡ください。",
};

const en: ContactPageCopy = {
  intro:
    "Questions, feedback, or issue reports—use the form below or email us directly. We usually reply within 2–3 business days.",
  emailFallback: "If the form is unavailable, you can email us directly.",
  formTitle: "Contact form",
  name: "Name",
  namePlaceholder: "e.g. Jane Doe",
  email: "Email",
  emailPlaceholder: "you@company.com",
  topic: "Topic",
  topicGeneral: "General inquiry",
  topicBilling: "Billing & payments",
  topicTechnical: "Technical issue / auto-observations",
  message: "Message",
  messagePlaceholder: "Please include as much detail as you can.",
  submit: "Send message",
  submitting: "Sending…",
  success: "Thanks—we received your message and will reply by email.",
  mailtoHint: "We will reply to the email address you enter above.",
  errName: "Enter your name.",
  errEmail: "Enter a valid email address.",
  errMessage: "Enter a message (at least 10 characters).",
  errSend: "Could not send your message. Please try again in a moment.",
  errNotConfigured:
    "The contact form is not available right now. Please email us directly at the address below.",
};

export function getContactPageCopy(locale: Locale): ContactPageCopy {
  return locale === "ja" ? ja : en;
}

export function contactTopicLabel(locale: Locale, topic: ContactTopic): string {
  const t = getContactPageCopy(locale);
  if (topic === "billing") return t.topicBilling;
  if (topic === "technical") return t.topicTechnical;
  return t.topicGeneral;
}
