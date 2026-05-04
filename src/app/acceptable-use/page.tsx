import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocShell } from "@/components/legal/LegalDocShell";

export const metadata: Metadata = {
  title: "許容される利用方針 | Viewtrace",
  description:
    "Viewtraceの許容される利用方針。禁止事項と適正利用の要点。利用規約第3条と併せてご確認ください。",
};

export default function AcceptableUsePage() {
  return (
    <LegalDocShell title="許容される利用方針" updated="2026年5月4日">
      <div className="callout space-y-3">
        <p>
          <strong>【参考記録】</strong>
          本サービスが提供するスナップショットは観測時点の参考情報であり、広告配信の正常性や法的証拠性を保証するものではありません。
        </p>
      </div>

      <p>
        本ポリシーは
        <Link href="/terms">利用規約</Link>
        （特に第3条
        <strong>禁止事項</strong>
        ）と一体として適用されます。抵触する利用は、アカウント停止・利用終了等の措置の対象となる場合があります。
      </p>

      <section className="space-y-3">
        <h2>禁止される利用（例）</h2>
        <ul>
          <li>違法サイトの監視を目的とした利用</li>
          <li>個人情報の収集を主目的とした利用</li>
          <li>当社または第三者のシステムに過剰な負荷を与える利用</li>
          <li>スクレイピングの悪用、その他当社が不適切と判断する自動取得の濫用</li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2>適正利用の目安</h2>
        <ul>
          <li>自社または正当な権限に基づくキャンペーン・LPの表示確認に限定する</li>
          <li>指定URLの権利・利用条件（robots、利用規約等）および適用法を遵守する</li>
          <li>取得した記録の取り扱いについて、社内ポリシーと顧客契約を順守する</li>
        </ul>
      </section>

      <p>
        詳細・最新の条件は
        <Link href="/terms">利用規約全文</Link>
        をご確認ください。
      </p>
    </LegalDocShell>
  );
}
