import type { CaptureConditionsV1 } from "@/lib/capture-conditions";
import type { Observation } from "@/lib/demo/observations";
import type { HtmlHeadSignalsV1 } from "@/lib/url-preview";

function withCapture(
  signals: HtmlHeadSignalsV1,
  extra: Partial<CaptureConditionsV1>,
): CaptureConditionsV1 {
  return { html_signals: signals, ...extra } as CaptureConditionsV1;
}

const TIME_URL = "https://example.com/campaign/summer-sale";
const REGION_URL = "https://example.com/lp/geo";

export const compareFixtureTimeLeft: Observation = {
  id: "00000000-0000-4000-8000-00000000aaa1",
  url: `${TIME_URL}/`,
  regionValue: "JP-13",
  regionLabel: "Japan · Tokyo",
  capturedAt: "2026-09-28T03:00:00.000Z",
  status: "success",
  pageTitle: "Summer Sale",
  snapshotImageUrl: "https://picsum.photos/seed/viewtrace-time-a/1200/900",
  snapshotSha256: "aaa111",
  captureConditions: withCapture(
    {
      document_title: "Summer Sale",
      meta_description: "Old description",
      canonical_url: "https://example.com/campaign/summer-sale",
      robots_meta: "index,follow",
      x_robots_tag: null,
      og_title: "Summer Sale",
      og_description: "Old description",
      og_image: "https://cdn.example.com/og-old.jpg",
      json_ld_types: [],
      final_url: "https://example.com/campaign/summer-sale",
    },
    {
      full_page_requested: false,
      viewport: { width: 1280, height: 720, device_scale_factor: 1, source: "browserless_implicit_default" },
      geo: {
        country: "jp",
        state: "13",
        proxy_mode: "browserless_residential",
        proxy_provider: "browserless",
        proxy_sticky: null,
      },
    },
  ),
};

export const compareFixtureTimeRight: Observation = {
  id: "00000000-0000-4000-8000-00000000aaa2",
  url: TIME_URL,
  regionValue: "JP-13",
  regionLabel: "Japan · Tokyo",
  capturedAt: "2026-10-02T03:00:00.000Z",
  status: "success",
  pageTitle: "Summer Sale — Extended",
  snapshotImageUrl: "https://picsum.photos/seed/viewtrace-time-b/1200/900",
  snapshotSha256: "bbb222",
  captureConditions: withCapture(
    {
      document_title: "Summer Sale — Extended",
      meta_description: "New description",
      canonical_url: "https://example.com/campaign/summer-sale",
      robots_meta: "index,follow",
      x_robots_tag: null,
      og_title: "Summer Sale — Extended",
      og_description: "New description",
      og_image: "https://cdn.example.com/og-new.jpg",
      json_ld_types: [],
      final_url: "https://example.com/campaign/summer-sale",
    },
    {
      full_page_requested: false,
      viewport: { width: 1280, height: 720, device_scale_factor: 1, source: "browserless_implicit_default" },
      geo: {
        country: "jp",
        state: "13",
        proxy_mode: "browserless_residential",
        proxy_provider: "browserless",
        proxy_sticky: null,
      },
    },
  ),
};

export const compareFixtureRegionLeft: Observation = {
  id: "00000000-0000-4000-8000-00000000bbb1",
  url: REGION_URL,
  regionValue: "JP-13",
  regionLabel: "Japan · Tokyo",
  capturedAt: "2026-10-01T04:00:00.000Z",
  status: "success",
  pageTitle: "Geo LP JP",
  snapshotImageUrl: "https://picsum.photos/seed/viewtrace-region-jp/1200/900",
  snapshotSha256: "jp111",
  captureConditions: withCapture(
    {
      document_title: "Geo LP JP",
      meta_description: "Tokyo copy",
      canonical_url: "https://example.com/lp/geo",
      robots_meta: "index,follow",
      x_robots_tag: null,
      og_title: "Geo LP JP",
      og_description: "Tokyo copy",
      og_image: "https://cdn.example.com/og-jp.jpg",
      json_ld_types: [],
      final_url: "https://example.com/lp/geo",
    },
    {
      full_page_requested: true,
      viewport: { width: 1280, height: 720, device_scale_factor: 1, source: "browserless_implicit_default" },
      geo: {
        country: "jp",
        state: "13",
        proxy_mode: "browserless_residential",
        proxy_provider: "browserless",
        proxy_sticky: null,
      },
    },
  ),
};

export const compareFixtureRegionRight: Observation = {
  id: "00000000-0000-4000-8000-00000000bbb2",
  url: REGION_URL,
  regionValue: "US-CA",
  regionLabel: "US · California",
  capturedAt: "2026-10-01T05:10:00.000Z",
  status: "success",
  pageTitle: "Geo LP US",
  snapshotImageUrl: "https://picsum.photos/seed/viewtrace-region-us/1200/900",
  snapshotSha256: "us222",
  captureConditions: withCapture(
    {
      document_title: "Geo LP US",
      meta_description: "California copy",
      canonical_url: "https://example.com/lp/geo",
      robots_meta: "index,follow",
      x_robots_tag: null,
      og_title: "Geo LP US",
      og_description: "California copy",
      og_image: "https://cdn.example.com/og-us.jpg",
      json_ld_types: [],
      final_url: "https://example.com/lp/geo",
    },
    {
      full_page_requested: false,
      viewport: { width: 1280, height: 720, device_scale_factor: 1, source: "browserless_implicit_default" },
      geo: {
        country: "us",
        state: null,
        proxy_mode: "browserless_residential",
        proxy_provider: "browserless",
        proxy_sticky: null,
      },
    },
  ),
};

export const compareFixtureOnce: Observation = {
  id: "00000000-0000-4000-8000-00000000ccc1",
  url: "https://example.com/first-only",
  regionValue: "JP-13",
  regionLabel: "Japan · Tokyo",
  capturedAt: "2026-10-01T08:00:00.000Z",
  status: "success",
  pageTitle: "First observation",
  snapshotImageUrl: "https://picsum.photos/seed/viewtrace-once/1200/900",
};
