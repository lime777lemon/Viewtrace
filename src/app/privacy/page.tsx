import type { Metadata } from "next";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { supportEmail } from "@/lib/site";

export const metadata: Metadata = {
  title: "プライバシーポリシー | Viewtrace",
  description:
    "Viewtraceにおける個人情報の取得項目、利用目的、第三者提供、保存期間、セキュリティについて。",
};

export default function PrivacyPage() {
  return (
    <LegalDocShell title="プライバシーポリシー" updated="2026年5月4日">
      <div className="callout space-y-3">
        <p>
          <strong>【参考情報であることの確認】</strong>
          当社が生成・保存するスクリーンショット等はサービス提供のための記録であり、法的証拠としての完全性・正確性を保証するものではありません。
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
    </LegalDocShell>
  );
}
