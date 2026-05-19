import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LegalDocShell } from "@/components/legal/LegalDocShell";
import { legalPageMetadata } from "@/lib/i18n/legal-page-metadata";
import { getRequestLocale } from "@/lib/i18n/locale-server";

const COMPANY_WEBSITE = "https://theestablish.jp";

type AboutRow = {
  label: string;
  value: ReactNode;
};

function AboutWebsiteLink() {
  return (
    <a
      href={COMPANY_WEBSITE}
      rel="noopener noreferrer"
      target="_blank"
      className="group inline-flex items-baseline gap-2 font-display text-xl font-light tracking-tight text-[#276248] no-underline transition hover:text-accent"
    >
      <span className="border-b border-[#276248]/25 pb-0.5 transition group-hover:border-[#276248]/60">
        theestablish.jp
      </span>
      <span aria-hidden className="text-sm opacity-40 transition group-hover:opacity-70">
        ↗
      </span>
    </a>
  );
}

function AboutDetailPanel({ rows }: { rows: AboutRow[] }) {
  return (
    <div className="relative mt-2">
      {/* 一本の縦ライン — 上下で自然にフェード */}
      <div
        aria-hidden
        className="absolute top-3 bottom-3 left-[5px] w-px bg-linear-to-b from-transparent via-[#276248] to-transparent"
      />

      <div className="space-y-0">
        {rows.map((row, index) => (
          <section
            key={row.label}
            className={`relative pl-8 sm:pl-10 ${index > 0 ? "mt-10 border-t border-border/50 pt-10" : ""}`}
          >
            {/* ライン上のマーカー */}
            <span
              aria-hidden
              className="absolute top-1.5 left-0 flex size-[11px] items-center justify-center rounded-full border border-[#276248]/30 bg-surface-elevated"
            >
              <span className="size-[5px] rounded-full bg-[#276248]" />
            </span>

            <p className="text-[11px] font-medium tracking-[0.2em] text-ink-muted uppercase">
              {row.label}
            </p>
            <div className="mt-3 font-display text-[1.125rem] leading-snug font-light tracking-tight text-ink sm:text-xl">
              {row.value}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return legalPageMetadata("/about", "about", locale);
}

export default async function AboutPage() {
  const locale = await getRequestLocale();
  const isEn = locale === "en";

  const rows: AboutRow[] = isEn
    ? [
        {
          label: "Company",
          value: "The Establish LLC (The Establish 合同会社)",
        },
        {
          label: "Address",
          value: "8b, 1-16-6 Dogenzaka, Shibuya-ku, Tokyo, Japan",
        },
        {
          label: "Website",
          value: <AboutWebsiteLink />,
        },
      ]
    : [
        {
          label: "会社名",
          value: "The Establish合同会社",
        },
        {
          label: "所在地",
          value: "東京都渋谷区道玄坂1-16-6 8b",
        },
        {
          label: "ウェブサイト",
          value: <AboutWebsiteLink />,
        },
      ];

  return (
    <LegalDocShell locale={locale} title={isEn ? "About us" : "私たちについて"}>
      <div className="space-y-12">
        <div className="max-w-xl">
          <p className="font-display text-lg leading-relaxed font-light tracking-tight text-ink sm:text-xl">
            {isEn ? (
              <>
                Viewtrace is operated by{" "}
                <span className="font-normal text-[#276248]">The Establish LLC</span> (The
                Establish 合同会社), a company based in Tokyo, Japan.
              </>
            ) : (
              <>
                Viewtrace は、
                <span className="font-normal text-[#276248]">The Establish合同会社</span>
                が提供するサービスです。
              </>
            )}
          </p>
        </div>

        <AboutDetailPanel rows={rows} />
      </div>
    </LegalDocShell>
  );
}
