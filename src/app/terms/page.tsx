import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export const metadata: Metadata = {
  title: "利用規約",
  description:
    "Viewtrace（ビュートレース）の利用規約。サービスは観測時点の記録を提供し、特別な証明力や完全性を保証するものではありません。",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const locale = await getRequestLocale();
  return (
    <LegalDocShell
      locale={locale}
      title={locale === "en" ? "Terms of Service" : "利用規約"}
      updated="2026-05-04"
    >
      {locale === "en" ? (
        <>
          <div className="callout space-y-3">
            <p>
              <strong>Reference-only record.</strong> Captures are provided for reference and do not
              guarantee completeness, accuracy, or legal evidentiary value.
            </p>
            <p>
              <strong>Ad use.</strong> Viewtrace does not guarantee ad delivery health and records
              only what was observed at the capture time.
            </p>
          </div>

          <p>
            Viewtrace provides timestamped snapshots of how a user-specified URL appeared in a
            specific region at a specific time.
          </p>

          <section className="space-y-3">
            <h2>1. Service</h2>
            <p>We provide visual records of web page rendering under specified conditions.</p>
            <p>
              Records reflect a point in time and do not guarantee ongoing availability or
              correctness.
            </p>
          </section>

          <section className="space-y-3">
            <h2>2. Disclaimer</h2>
            <p>We do not guarantee:</p>
            <ul>
              <li>ad delivery health</li>
              <li>geo-targeting accuracy</li>
              <li>completeness of captured content</li>
              <li>behavior of third-party services</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>3. Prohibited use</h2>
            <p>You must not:</p>
            <ul>
              <li>monitor illegal websites</li>
              <li>use the service primarily to collect personal data</li>
              <li>cause excessive load</li>
              <li>abuse scraping/automation</li>
            </ul>
            <p>
              See{" "}
              <Link href="/acceptable-use" className="underline">
                Acceptable Use
              </Link>{" "}
              for details.
            </p>
          </section>

          <section className="space-y-3">
            <h2>4. Limitation of liability</h2>
            <p>We are not liable for:</p>
            <ul>
              <li>ad spend loss</li>
              <li>lost opportunities</li>
              <li>indirect damages</li>
            </ul>
            <p>Our liability is capped at the fees paid for the applicable month.</p>
          </section>

          <section className="space-y-3">
            <h2>5. Changes</h2>
            <p>We may change the service and pricing.</p>
          </section>
        </>
      ) : (
        <>
          <div className="callout space-y-3">
            <p>
              <strong>【法的リスク回避】</strong>
              本サービスの記録は参考情報であり、確認記録としての完全性・正確性を保証するものではありません。
            </p>
            <p>
              <strong>【広告用途向け】</strong>
              本サービスは広告配信の正常性を保証するものではなく、観測時点の状態のみを記録するものです。
            </p>
          </div>

          <p>
            本サービス「Viewtrace」（以下「当社サービス」）は、ユーザーが指定したURLについて、特定の地域および時刻における表示状態のスナップショット記録を提供するものです。
          </p>

          <section className="space-y-3">
            <h2>第1条（サービス内容）</h2>
            <p>当社は、指定条件に基づくウェブページの表示記録を提供します。</p>
            <p>当該記録は取得時点の情報であり、継続的な表示や正確性を保証するものではありません。</p>
          </section>

          <section className="space-y-3">
            <h2>第2条（保証の否認）</h2>
            <p>当社サービスは以下を保証しません：</p>
            <ul>
              <li>広告配信の正常性</li>
              <li>地域ターゲティングの正確性</li>
              <li>表示内容の完全性</li>
              <li>外部サービスの動作</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>第3条（禁止事項）</h2>
            <p>ユーザーは以下を行ってはなりません：</p>
            <ul>
              <li>違法サイトの監視</li>
              <li>個人情報の収集目的での利用</li>
              <li>過剰な負荷を与える利用</li>
              <li>スクレイピングの悪用</li>
            </ul>
            <p>
              詳細は
              <Link href="/acceptable-use">許容される利用方針</Link>
              および本規約全体をご確認ください。
            </p>
          </section>

          <section className="space-y-3">
            <h2>第4条（責任の制限）</h2>
            <p>当社は、以下の損害について責任を負いません：</p>
            <ul>
              <li>広告費損失</li>
              <li>機会損失</li>
              <li>間接的損害</li>
            </ul>
            <p>責任上限は、当該月の利用料金を上限とします。</p>
          </section>

          <section className="space-y-3">
            <h2>第5条（サービス変更）</h2>
            <p>当社は、サービス内容・料金を変更できるものとします。</p>
          </section>

          <div className="muted-box text-sm text-[var(--color-ink-muted)]">
            <p>
              本規約は簡易ドラフトです。公開前に管轄法・決済条件・法人情報と整合させ、弁護士等のレビューを推奨します。
            </p>
          </div>
        </>
      )}
    </LegalDocShell>
  );
}
