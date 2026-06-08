import {
  BROWSER_LIKE_ACCEPT_LANGUAGE,
  BROWSER_LIKE_USER_AGENT,
} from "@/lib/browser-fingerprint";
import { resolveGeoProxyUrl } from "@/lib/geo/proxy";
import { resolveBrowserlessResidentialTarget } from "@/lib/regions";
export const CAPTURE_CONDITIONS_SCHEMA_VERSION = 1 as const;

/** Legacy rows with capture_conditions before evidence-only v3. */
export const CONTENT_HASH_VERSION_WITH_CAPTURE = 2 as const;

/** 新規行の content_hash（証跡フィールドのみ）。 */
export const CONTENT_HASH_VERSION_EVIDENCE = 3 as const;

export type CaptureProxyMode =
  | "none"
  | "browserless_residential"
  | "external_proxy"
  | "retry_without_proxy";

export type CaptureEngineName = "browserless" | "microlink" | "direct_fetch" | "form_upload";

export type CaptureViewportSource =
  | "browserless_implicit_default"
  | "microlink_default"
  | "not_applicable";

export type CaptureConditionsV1 = {
  schema_version: typeof CAPTURE_CONDITIONS_SCHEMA_VERSION;
  captured_at: string;
  region_input: string;
  region_label: string;
  full_page_requested: boolean;
  browser: {
    family: "chromium";
    channel: "headless";
    user_agent: string;
    accept_language: string;
  };
  viewport: {
    width: number | null;
    height: number | null;
    device_scale_factor: number;
    source: CaptureViewportSource;
  };
  geo: {
    country: string | null;
    state: string | null;
    proxy_mode: CaptureProxyMode;
    proxy_provider: "browserless" | "bright_data" | "custom" | null;
    proxy_sticky: boolean | null;
  };
  engine: {
    name: CaptureEngineName;
    browserless?: {
      endpoint_host: string;
      api_surface: "screenshot_v2";
      wait_until: "networkidle2";
      goto_timeout_ms: number;
      upstream_image_format: "png";
      storage_format: "webp" | "png";
      webp_quality: number | null;
    };
    microlink?: { full_page: boolean };
    direct_fetch?: { via_proxy: boolean; http_status: number | null };
  };
  result: {
    image_width_px: number | null;
    image_height_px: number | null;
    snapshot_bytes: number | null;
    snapshot_content_type: string | null;
    snapshot_sha256_present: boolean;
  };
  meta?: {
    viewtrace_git_sha?: string;
    capture_conditions_schema_version: number;
    content_hash_version: number;
  };
};

/** Subset hashed in content_hash v2 (excludes meta and result dimensions). */
export type ContentHashCaptureConditions = {
  schema_version: typeof CAPTURE_CONDITIONS_SCHEMA_VERSION;
  region_input: string;
  full_page_requested: boolean;
  browser: {
    user_agent: string;
    accept_language: string;
  };
  viewport: {
    width: number | null;
    height: number | null;
    device_scale_factor: number;
    source: CaptureViewportSource;
  };
  geo: {
    country: string | null;
    state: string | null;
    proxy_mode: CaptureProxyMode;
    proxy_provider: "browserless" | "bright_data" | "custom" | null;
    proxy_sticky: boolean | null;
  };
  engine: CaptureConditionsV1["engine"];
};

const BROWSERLESS_GOTO_TIMEOUT_MS = 30_000;
const BROWSERLESS_API_SURFACE = "screenshot_v2" as const;

function browserBase() {
  return {
    family: "chromium" as const,
    channel: "headless" as const,
    user_agent: BROWSER_LIKE_USER_AGENT,
    accept_language: BROWSER_LIKE_ACCEPT_LANGUAGE,
  };
}

/** Do not set viewport in Browserless payload — record implicit default to avoid screenshot drift. */
function browserlessImplicitViewport() {
  return {
    width: null as number | null,
    height: null as number | null,
    device_scale_factor: 1,
    source: "browserless_implicit_default" as const,
  };
}

function resolveGeoFromRegion(regionInput: string): { country: string | null; state: string | null } {
  const target = resolveBrowserlessResidentialTarget(regionInput);
  if (!target) return { country: null, state: null };
  return { country: target.country, state: target.state ?? null };
}

function inferProxyProviderFromUrl(proxyUrl: string | null): "bright_data" | "custom" | null {
  if (!proxyUrl) return null;
  try {
    const host = new URL(proxyUrl).hostname.toLowerCase();
    if (host.includes("brightdata") || host.includes("brd") || host.includes("luminati")) {
      return "bright_data";
    }
    return "custom";
  } catch {
    return "custom";
  }
}

export function resolveCaptureProxyMode(input: {
  viaResidential: boolean;
  viaExternalProxy: boolean;
  usedRetryWithoutProxy: boolean;
  regionInput: string;
}): {
  proxy_mode: CaptureProxyMode;
  proxy_provider: CaptureConditionsV1["geo"]["proxy_provider"];
  proxy_sticky: boolean | null;
  country: string | null;
  state: string | null;
} {
  const geo = resolveGeoFromRegion(input.regionInput);
  if (input.usedRetryWithoutProxy) {
    return {
      proxy_mode: "retry_without_proxy",
      proxy_provider: null,
      proxy_sticky: null,
      country: geo.country,
      state: geo.state,
    };
  }
  if (input.viaExternalProxy) {
    const proxyUrl = resolveGeoProxyUrl(input.regionInput);
    return {
      proxy_mode: "external_proxy",
      proxy_provider: inferProxyProviderFromUrl(proxyUrl),
      proxy_sticky: null,
      country: geo.country,
      state: geo.state,
    };
  }
  if (input.viaResidential) {
    return {
      proxy_mode: "browserless_residential",
      proxy_provider: "browserless",
      proxy_sticky: true,
      country: geo.country,
      state: geo.state,
    };
  }
  return {
    proxy_mode: "none",
    proxy_provider: null,
    proxy_sticky: null,
    country: geo.country,
    state: geo.state,
  };
}

export function getBrowserlessEndpointHost(): string {
  const raw =
    process.env.BROWSERLESS_SCREENSHOT_URL?.trim() ||
    "https://production-sfo.browserless.io/screenshot";
  try {
    return new URL(raw).hostname;
  } catch {
    return "production-sfo.browserless.io";
  }
}

function optionalMeta(): CaptureConditionsV1["meta"] {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  return {
    ...(sha ? { viewtrace_git_sha: sha.slice(0, 12) } : {}),
    capture_conditions_schema_version: CAPTURE_CONDITIONS_SCHEMA_VERSION,
    content_hash_version: CONTENT_HASH_VERSION_EVIDENCE,
  };
}

export type BuildBrowserlessCaptureConditionsInput = {
  capturedAt: string;
  regionInput: string;
  regionLabel: string;
  fullPageRequested: boolean;
  viaResidential: boolean;
  viaExternalProxy: boolean;
  usedRetryWithoutProxy: boolean;
  storageFormat: "webp" | "png";
  webpQuality: number | null;
  imageWidthPx: number | null;
  imageHeightPx: number | null;
  snapshotBytes: number | null;
  snapshotContentType: string | null;
  snapshotSha256Present: boolean;
};

export function buildCaptureConditionsFromBrowserless(
  input: BuildBrowserlessCaptureConditionsInput,
): CaptureConditionsV1 {
  const proxy = resolveCaptureProxyMode({
    viaResidential: input.viaResidential,
    viaExternalProxy: input.viaExternalProxy,
    usedRetryWithoutProxy: input.usedRetryWithoutProxy,
    regionInput: input.regionInput,
  });

  return {
    schema_version: CAPTURE_CONDITIONS_SCHEMA_VERSION,
    captured_at: input.capturedAt,
    region_input: input.regionInput,
    region_label: input.regionLabel,
    full_page_requested: input.fullPageRequested,
    browser: browserBase(),
    viewport: browserlessImplicitViewport(),
    geo: {
      country: proxy.country,
      state: proxy.state,
      proxy_mode: proxy.proxy_mode,
      proxy_provider: proxy.proxy_provider,
      proxy_sticky: proxy.proxy_sticky,
    },
    engine: {
      name: "browserless",
      browserless: {
        endpoint_host: getBrowserlessEndpointHost(),
        api_surface: BROWSERLESS_API_SURFACE,
        wait_until: "networkidle2",
        goto_timeout_ms: BROWSERLESS_GOTO_TIMEOUT_MS,
        upstream_image_format: "png",
        storage_format: input.storageFormat,
        webp_quality: input.webpQuality,
      },
    },
    result: {
      image_width_px: input.imageWidthPx,
      image_height_px: input.imageHeightPx,
      snapshot_bytes: input.snapshotBytes,
      snapshot_content_type: input.snapshotContentType,
      snapshot_sha256_present: input.snapshotSha256Present,
    },
    meta: optionalMeta(),
  };
}

export function buildCaptureConditionsFromMicrolink(input: {
  capturedAt: string;
  regionInput: string;
  regionLabel: string;
  fullPageRequested: boolean;
  snapshotBytes: number | null;
  snapshotContentType: string | null;
  snapshotSha256Present: boolean;
}): CaptureConditionsV1 {
  const geo = resolveGeoFromRegion(input.regionInput);
  return {
    schema_version: CAPTURE_CONDITIONS_SCHEMA_VERSION,
    captured_at: input.capturedAt,
    region_input: input.regionInput,
    region_label: input.regionLabel,
    full_page_requested: input.fullPageRequested,
    browser: browserBase(),
    viewport: {
      width: null,
      height: null,
      device_scale_factor: 1,
      source: "microlink_default",
    },
    geo: {
      country: geo.country,
      state: geo.state,
      proxy_mode: "none",
      proxy_provider: null,
      proxy_sticky: null,
    },
    engine: {
      name: "microlink",
      microlink: { full_page: input.fullPageRequested },
    },
    result: {
      image_width_px: null,
      image_height_px: null,
      snapshot_bytes: input.snapshotBytes,
      snapshot_content_type: input.snapshotContentType,
      snapshot_sha256_present: input.snapshotSha256Present,
    },
    meta: optionalMeta(),
  };
}

export function buildCaptureConditionsFromFormUpload(input: {
  capturedAt: string;
  regionInput: string;
  regionLabel: string;
}): CaptureConditionsV1 {
  const geo = resolveGeoFromRegion(input.regionInput);
  return {
    schema_version: CAPTURE_CONDITIONS_SCHEMA_VERSION,
    captured_at: input.capturedAt,
    region_input: input.regionInput,
    region_label: input.regionLabel,
    full_page_requested: false,
    browser: browserBase(),
    viewport: {
      width: null,
      height: null,
      device_scale_factor: 1,
      source: "not_applicable",
    },
    geo: {
      country: geo.country,
      state: geo.state,
      proxy_mode: "none",
      proxy_provider: null,
      proxy_sticky: null,
    },
    engine: { name: "form_upload" },
    result: {
      image_width_px: null,
      image_height_px: null,
      snapshot_bytes: null,
      snapshot_content_type: null,
      snapshot_sha256_present: false,
    },
    meta: optionalMeta(),
  };
}

export function buildCaptureConditionsFromDirectFetch(input: {
  capturedAt: string;
  regionInput: string;
  regionLabel: string;
  fullPageRequested: boolean;
  viaProxy: boolean;
  httpStatus: number | null;
}): CaptureConditionsV1 {
  const proxy = input.viaProxy
    ? resolveCaptureProxyMode({
        viaResidential: false,
        viaExternalProxy: true,
        usedRetryWithoutProxy: false,
        regionInput: input.regionInput,
      })
    : {
        proxy_mode: "none" as const,
        proxy_provider: null as CaptureConditionsV1["geo"]["proxy_provider"],
        proxy_sticky: null as boolean | null,
        country: resolveGeoFromRegion(input.regionInput).country,
        state: resolveGeoFromRegion(input.regionInput).state,
      };

  return {
    schema_version: CAPTURE_CONDITIONS_SCHEMA_VERSION,
    captured_at: input.capturedAt,
    region_input: input.regionInput,
    region_label: input.regionLabel,
    full_page_requested: input.fullPageRequested,
    browser: browserBase(),
    viewport: browserlessImplicitViewport(),
    geo: {
      country: proxy.country,
      state: proxy.state,
      proxy_mode: proxy.proxy_mode,
      proxy_provider: proxy.proxy_provider,
      proxy_sticky: proxy.proxy_sticky,
    },
    engine: {
      name: "direct_fetch",
      direct_fetch: {
        via_proxy: input.viaProxy,
        http_status: input.httpStatus,
      },
    },
    result: {
      image_width_px: null,
      image_height_px: null,
      snapshot_bytes: null,
      snapshot_content_type: null,
      snapshot_sha256_present: false,
    },
    meta: optionalMeta(),
  };
}

export function captureConditionsForContentHash(
  conditions: CaptureConditionsV1,
): ContentHashCaptureConditions {
  return {
    schema_version: conditions.schema_version,
    region_input: conditions.region_input,
    full_page_requested: conditions.full_page_requested,
    browser: {
      user_agent: conditions.browser.user_agent,
      accept_language: conditions.browser.accept_language,
    },
    viewport: { ...conditions.viewport },
    geo: { ...conditions.geo },
    engine: JSON.parse(JSON.stringify(conditions.engine)) as CaptureConditionsV1["engine"],
  };
}

export function parseCaptureConditionsFromDb(
  raw: unknown,
): CaptureConditionsV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.schema_version !== CAPTURE_CONDITIONS_SCHEMA_VERSION) return null;
  if (typeof o.captured_at !== "string") return null;
  if (typeof o.region_input !== "string") return null;
  return raw as CaptureConditionsV1;
}

export function formatViewportLabel(conditions: CaptureConditionsV1): string {
  const { width, height, source } = conditions.viewport;
  if (width != null && height != null) return `${width}×${height}`;
  if (source === "browserless_implicit_default") return "Browserless default";
  if (source === "microlink_default") return "Microlink default";
  return "—";
}
