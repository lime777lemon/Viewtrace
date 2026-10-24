import { notFound } from "next/navigation";
import { AttentionHourBoard } from "@/components/dashboard/AttentionHourBoard";
import { buildAttentionHour, type AttentionAlertFact, type AttentionObservationFact } from "@/lib/attention-hour";
import { formatJaDateTime } from "@/lib/format";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/locale-server";

const NOW = new Date("2026-10-24T09:00:00.000Z");

function fact(partial: AttentionObservationFact): AttentionObservationFact {
  return partial;
}

export default async function AttentionPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  const locale = await getRequestLocale();
  const empty = (await searchParams).empty === "1";
  const observations: AttentionObservationFact[] = [
    fact({
      id: "slow-ca",
      url: "https://example.com/campaign",
      regionValue: "US-CA",
      regionLabel: "US · California",
      capturedAt: "2026-10-24T08:50:00.000Z",
      captureStatus: "success",
      httpStatus: 200,
      timedOut: false,
      ttfbMs: 2400,
      loadMs: 4100,
      dnsMs: 18,
      tlsMs: 42,
      resource5xx: 0,
      requestFailed: 0,
      requestCount: 41,
      executionErrors: [],
    }),
    fact({
      id: "fast-ca",
      url: "https://example.com/home",
      regionValue: "US-CA",
      regionLabel: "US · California",
      capturedAt: "2026-10-24T08:30:00.000Z",
      captureStatus: "success",
      httpStatus: 200,
      timedOut: false,
      ttfbMs: 180,
      loadMs: 2000,
      dnsMs: 9,
      tlsMs: 12,
      resource5xx: 0,
      requestFailed: 0,
      requestCount: 20,
      executionErrors: [],
    }),
    fact({
      id: "fail-jp",
      url: "https://example.com/pricing",
      regionValue: "JP-13",
      regionLabel: "Japan · Tokyo",
      capturedAt: "2026-10-24T08:40:00.000Z",
      captureStatus: "success",
      httpStatus: 503,
      timedOut: false,
      ttfbMs: null,
      loadMs: null,
      dnsMs: null,
      tlsMs: null,
      resource5xx: 2,
      requestFailed: 1,
      requestCount: null,
      executionErrors: ["hover"],
    }),
    fact({
      id: "old",
      url: "https://example.com/old",
      regionValue: "US-NY",
      regionLabel: "US · New York",
      capturedAt: "2026-10-24T06:00:00.000Z",
      captureStatus: "failure",
      httpStatus: 500,
      timedOut: true,
      ttfbMs: 9000,
      loadMs: null,
      dnsMs: null,
      tlsMs: null,
      resource5xx: null,
      requestFailed: null,
      requestCount: null,
      executionErrors: [],
    }),
  ];
  const alerts: AttentionAlertFact[] = [
    {
      id: "alert-carousel",
      at: "2026-10-24T08:55:00.000Z",
      url: "https://example.com/campaign",
      regionLabel: "US · California",
      href: "/dashboard/monitoring-runs/preview",
      reason: "behavior_regression",
      detail: "Carousel Working → No rendered state change observed",
    },
  ];
  const board = buildAttentionHour({
    now: NOW,
    observations: empty ? [] : observations,
    alerts: empty ? [] : alerts,
    history: empty ? [] : [
      { capturedAt: "2026-10-24T08:50:00.000Z", httpStatus: 200 },
      { capturedAt: "2026-10-24T08:40:00.000Z", httpStatus: 503 },
      { capturedAt: "2026-10-24T08:30:00.000Z", httpStatus: 200 },
      { capturedAt: "2026-10-20T08:00:00.000Z", httpStatus: 200 },
      { capturedAt: "2026-10-01T08:00:00.000Z", httpStatus: 200 },
      { capturedAt: "2026-08-01T08:00:00.000Z", httpStatus: 500 },
    ],
  });
  const text = copy[locale].dashboardAttention;
  return (
    <main className="min-h-screen bg-surface px-4 py-10 text-ink">
      <AttentionHourBoard
        board={board}
        copy={text}
        locale={locale}
        windowLabel={`${formatJaDateTime(board.windowStart, locale)} – ${formatJaDateTime(board.windowEnd, locale)}`}
        capturedLabel={(iso) => formatJaDateTime(iso, locale)}
      />
    </main>
  );
}
