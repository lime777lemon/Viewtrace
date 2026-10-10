"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { copy } from "@/lib/i18n";
import { OBSERVATION_DETAIL_VIDEO_TRACKS } from "@/lib/observation-detail-video-tracks";
import { OBSERVATION_LIST_VIDEO_TRACKS } from "@/lib/observation-list-video-tracks";
import { requestOnboardingReplay } from "@/lib/onboarding";
import { OnboardingLanguageSelect } from "@/components/dashboard/OnboardingLanguageSelect";
import { useOnboardingCopy } from "@/components/dashboard/useOnboardingCopy";
import { getProductTourCopy } from "@/lib/product-tour-copy";
import { PRODUCT_TOUR_STEP_IDS, requestProductTourReplay } from "@/lib/product-tour";

export function DashboardHelp({ locale }: { locale: Locale }) {
  const helpChrome = copy[locale].dashboard.help;
  const router = useRouter();
  const { lang, setLang } = useOnboardingCopy();
  const tour = getProductTourCopy(lang);

  return (
    <div className="mx-auto max-w-3xl space-y-8" dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
            {tour.ui.tourTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-ink-muted">{tour.ui.tourIntro}</p>
        </div>
        <OnboardingLanguageSelect lang={lang} label={tour.ui.languageLabel} onChange={setLang} />
      </div>

      <ol className="space-y-4">
        {PRODUCT_TOUR_STEP_IDS.map((id, index) => {
          const item = tour.steps[id];
          return (
            <li key={id} className="rounded-xl border border-border bg-surface-elevated p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {tour.ui.stepOf
                  .replace("{current}", String(index + 1))
                  .replace("{total}", String(PRODUCT_TOUR_STEP_IDS.length))}
              </p>
              <h2 className="mt-1 text-sm font-semibold text-ink">{item.title}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{item.body}</p>
              {id === "recordsScreen" ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
                  <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {helpChrome.recordsVideoTitle}
                  </p>
                  <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">
                    {helpChrome.recordsVideoCaptionHint}
                  </p>
                  <video
                    className="mt-2 aspect-video w-full bg-surface-elevated"
                    controls
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    poster="/marketing/screenshots/observations-list-ja.png"
                    aria-label={helpChrome.recordsVideoAria}
                  >
                    <source src="/marketing/videos/observations-list-en.mp4" type="video/mp4" />
                    {OBSERVATION_LIST_VIDEO_TRACKS.map((track) => (
                      <track
                        key={track.srclang}
                        kind="subtitles"
                        src={track.src}
                        srcLang={track.srclang}
                        label={track.label}
                        default={track.srclang === (lang === "ja" ? "ja" : "en")}
                      />
                    ))}
                  </video>
                </div>
              ) : null}
              {id === "recordScreen" ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-border bg-surface">
                  <p className="px-3 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    {helpChrome.recordVideoTitle}
                  </p>
                  <p className="px-3 pt-1 text-xs leading-relaxed text-ink-muted">
                    {helpChrome.recordsVideoCaptionHint}
                  </p>
                  <video
                    className="mt-2 aspect-video w-full bg-surface-elevated"
                    controls
                    playsInline
                    preload="metadata"
                    crossOrigin="anonymous"
                    poster="/marketing/screenshots/observation-detail-en.png"
                    aria-label={helpChrome.recordVideoAria}
                  >
                    <source src="/marketing/videos/observation-detail-en.mp4" type="video/mp4" />
                    {OBSERVATION_DETAIL_VIDEO_TRACKS.map((track) => (
                      <track
                        key={track.srclang}
                        kind="subtitles"
                        src={track.src}
                        srcLang={track.srclang}
                        label={track.label}
                        default={track.srclang === (lang === "ja" ? "ja" : "en")}
                      />
                    ))}
                  </video>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/contact" className="text-sm font-semibold text-accent hover:text-accent-hover">
          {helpChrome.contact}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              requestOnboardingReplay();
              router.push("/dashboard?onboarding=1");
            }}
            className="inline-flex rounded-full border border-border px-4 py-2 text-sm font-semibold text-ink hover:bg-surface-elevated"
          >
            {helpChrome.replayOnboarding}
          </button>
          <button
            type="button"
            onClick={() => {
              requestProductTourReplay();
              router.push("/dashboard?tour=1");
            }}
            className="inline-flex rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {tour.ui.startTour}
          </button>
        </div>
      </div>
      <p className="text-xs leading-relaxed text-ink-muted">{helpChrome.replayOnboardingHint}</p>
    </div>
  );
}
