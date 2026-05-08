import type { Metadata } from "next";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { supportEmail } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description:
    "Viewtraceにおける個人情報の取得項目、利用目的、第三者提供、保存期間、セキュリティについて。",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default async function PrivacyPage() {
  const locale = await getRequestLocale();
  return (
    <LegalDocShell
      locale={locale}
      title={locale === "en" ? "Privacy Policy" : "プライバシーポリシー"}
      updated="2026-05-04"
    >
      {locale === "en" ? (
        <>
          <div className="callout space-y-3">
            <p>
              <strong>Reference-only record.</strong> Screenshots and other outputs are stored to
              provide the service and do not guarantee completeness, accuracy, or legal evidentiary
              value.
            </p>
          </div>

          <p>We collect the following information.</p>

          <section className="space-y-3">
            <h2>Data we collect</h2>
            <ul>
              <li>account information (email)</li>
              <li>usage logs</li>
              <li>submitted URLs</li>
              <li>generated screenshots</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>Purposes</h2>
            <ul>
              <li>service delivery</li>
              <li>fraud prevention</li>
              <li>quality improvement</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>Sharing</h2>
            <p>We do not share your data except:</p>
            <ul>
              <li>when required by law</li>
              <li>payment processing (e.g., Stripe)</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>Retention</h2>
            <p>Screenshots are retained based on your plan and deleted after the retention period.</p>
          </section>

          <section className="space-y-3">
            <h2>Security</h2>
            <p>We take reasonable security measures but do not guarantee absolute security.</p>
          </section>

          <p>
            Contact: <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>
        </>
      ) : (
        <>
          <div className="callout space-y-3">
            <p>
              <strong>【参考情報であることの確認】</strong>
              当社が生成・保存するスクリーンショット等はサービス提供のための記録であり、確認記録としての完全性・正確性を保証するものではありません。
            </p>
          </div>

          <p>当社は、以下の情報を取得します。</p>

          <section className="space-y-3">
            <h2>取得情報</h2>
            <ul>
              <li>アカウント情報（メールアドレス）</li>
              <li>利用ログ</li>
              <li>指定URL</li>
              <li>生成されたスクリーンショット</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>利用目的</h2>
            <ul>
              <li>サービス提供</li>
              <li>不正防止</li>
              <li>品質改善</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>第三者提供</h2>
            <p>以下の場合を除き提供しません：</p>
            <ul>
              <li>法令に基づく場合</li>
              <li>決済処理（例：Stripe）</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>データ保存</h2>
            <p>スクリーンショットはプランに応じて保存し、期間経過後は自動削除します。</p>
          </section>

          <section className="space-y-3">
            <h2>セキュリティ</h2>
            <p>合理的な安全対策を実施しますが、完全な安全性は保証しません。</p>
          </section>

          <p>
            お問い合わせ：
            <a href={`mailto:${supportEmail}`}>{supportEmail}</a>
          </p>

          <div className="muted-box text-sm text-[var(--color-ink-muted)]">
            <p>
              本ポリシーは実務向けドラフトです。Cookie・アクセス解析・委託先・越境移転等は事業実態に合わせて追記してください。
            </p>
          </div>
        </>
      )}
    </LegalDocShell>
  );
}
