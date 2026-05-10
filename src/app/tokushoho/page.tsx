import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { siteEmail } from "@/lib/site";
import { getRequestLocale } from "@/lib/i18n/locale-server";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/tokushoho", "tokushoho", locale);
}

export default async function TokushohoPage() {
  const locale = await getRequestLocale();
  return (
    <LegalDocShell
      locale={locale}
      title={locale === "en" ? "Commercial Disclosure (Japan)" : "特定商取引法に基づく表記"}
      updated="2026-05-04"
    >
      {locale === "en" ? (
        <>
          <div className="callout">
            <p>
              <strong>Nature of records.</strong> Captures are reference-only and do not guarantee
              completeness, accuracy, or legal evidentiary value. We do not guarantee ad delivery
              health.
            </p>
          </div>

          <section className="space-y-3">
            <h2>Seller</h2>
            <p>
              The Establish LLC (Japan)
              <br />
              <span className="text-ink-muted">Service: Viewtrace</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2>Responsible person</h2>
            <p>Yukiko Ikeda</p>
          </section>

          <section className="space-y-3">
            <h2>Address</h2>
            <p>1-16-6 Dogenzaka, Shibuya-ku, Tokyo (Japan)</p>
          </section>

          <section className="space-y-3">
            <h2>Contact</h2>
            <p>
              Email: <a href={`mailto:${siteEmail}`}>{siteEmail}</a>
            </p>
            <p className="text-sm text-ink-muted">
              Phone number is disclosed upon request in accordance with applicable laws.
            </p>
          </section>

          <section className="space-y-3">
            <h2>Price</h2>
            <p>
              Listed on the pricing section (
              <Link href="/#pricing" className="underline">
                Pricing
              </Link>
              ).
            </p>
          </section>

          <section className="space-y-3">
            <h2>Additional fees</h2>
            <ul>
              <li>Consumption tax (if applicable)</li>
              <li>Internet connection fees</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>Payment methods</h2>
            <p>Credit card (e.g., Stripe)</p>
          </section>

          <section className="space-y-3">
            <h2>Payment timing</h2>
            <p>Monthly subscription: at signup and renews monthly.</p>
          </section>

          <section className="space-y-3">
            <h2>Delivery</h2>
            <p>Available immediately after payment is completed.</p>
          </section>

          <section className="space-y-3">
            <h2>Refunds / cancellations</h2>
            <p>Digital service: non-refundable, except where we decide otherwise.</p>
          </section>
        </>
      ) : (
        <>
          <div className="callout">
            <p>
              <strong>【記録の性質】</strong>
              本サービスの記録は参考情報であり、確認記録としての完全性・正確性を保証するものではありません。広告配信の正常性を保証するものでもありません。
            </p>
          </div>

          <section className="space-y-3">
            <h2>事業者名</h2>
            <p>
              The Establish合同会社
              <br />
              <span className="text-ink-muted">サービス名：Viewtrace</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2>代表責任者</h2>
            <p>池田　優希子</p>
          </section>

          <section className="space-y-3">
            <h2>所在地</h2>
            <p>東京都渋谷区道玄坂1-16-6 二葉ビル8b</p>
          </section>

          <section className="space-y-3">
            <h2>連絡先</h2>
            <p>
              メール：
              <a href={`mailto:${siteEmail}`}>{siteEmail}</a>
            </p>
            <p className="text-sm text-ink-muted">
              お問い合わせは上記メールにて受け付けます。電話番号の開示をご希望の場合は、法令に基づき遅滞なく対応いたします。
            </p>
          </section>

          <section className="space-y-3">
            <h2>販売価格</h2>
            <p>
              各プランページに記載（
              <Link href="/#pricing">料金</Link>
              ）。
            </p>
          </section>

          <section className="space-y-3">
            <h2>商品代金以外の必要料金</h2>
            <ul>
              <li>消費税</li>
              <li>インターネット接続費</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2>支払方法</h2>
            <p>クレジットカード（例：Stripe）</p>
          </section>

          <section className="space-y-3">
            <h2>支払時期</h2>
            <p>月額：申込時および毎月自動更新</p>
          </section>

          <section className="space-y-3">
            <h2>提供時期</h2>
            <p>決済完了後すぐ利用可能</p>
          </section>

          <section className="space-y-3">
            <h2>返品・キャンセル</h2>
            <p>デジタルサービスのため返金不可とします。ただし当社判断で返金対応する場合があります。</p>
          </section>
        </>
      )}
    </LegalDocShell>
  );
}
