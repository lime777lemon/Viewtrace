/**
 * Residential proxy targeting for the Observation Worker.
 * Same template tokens as src/lib/geo/proxy.ts, but separate env names so
 * production Browserless does not start using this pool.
 *
 * VIEWTRACE_RESIDENTIAL_PROXY_URL
 * VIEWTRACE_RESIDENTIAL_PROXY_URL_TEMPLATE
 *   {region} {country} {state} {countryTag} {stateTag}
 *   US-CA → country=US, state=CA, countryTag=-country-US, stateTag=-state-CA
 */

export function parseRegion(regionValue) {
  const v = String(regionValue ?? "").trim();
  if (!v) return { country: "", state: null };
  const m = v.match(/^([A-Z]{2})(?:-([A-Z]{2}|\d{2}))?$/i);
  if (!m) return { country: v.toUpperCase(), state: null };
  return {
    country: m[1].toUpperCase(),
    state: m[2] ? m[2].toUpperCase() : null,
  };
}

function fillTemplate(template, vars) {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_m, k) => vars[k] ?? "");
}

export function resolveResidentialProxyUrl(regionValue) {
  const template = process.env.VIEWTRACE_RESIDENTIAL_PROXY_URL_TEMPLATE?.trim();
  const fixed = process.env.VIEWTRACE_RESIDENTIAL_PROXY_URL?.trim();

  if (template) {
    const rv = String(regionValue ?? "").trim();
    if (!rv) return null;
    const { country, state } = parseRegion(rv);
    const proxyUrl = fillTemplate(template, {
      region: rv,
      country,
      state: state ?? "",
      countryTag: country ? `-country-${country}` : "",
      stateTag: state ? `-state-${state}` : "",
    }).trim();
    try {
      new URL(proxyUrl);
      return proxyUrl;
    } catch {
      return null;
    }
  }

  if (fixed) {
    try {
      new URL(fixed);
      return fixed;
    } catch {
      return null;
    }
  }

  return null;
}

/** Playwright launch options. Never log the returned password. */
export function playwrightProxyFromUrl(proxyUrl) {
  if (!proxyUrl) return null;
  let parsed;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    return null;
  }
  const server = `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ""}`;
  const username = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");
  const proxy = { server };
  if (username) proxy.username = username;
  if (password) proxy.password = password;
  return proxy;
}
