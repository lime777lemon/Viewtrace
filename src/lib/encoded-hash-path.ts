/** Homepage section ids linked with href="#…". */
const HOME_SECTION_IDS = new Set([
  "top",
  "verify",
  "compare",
  "regional-behavior",
  "page-metadata",
  "optional-measures",
  "auto-observations",
  "results-delivery",
  "signup",
  "pricing",
  "login",
  "region-search",
  "search-topics",
  "use-cases",
]);

/**
 * A path like `/%23top` is the fragment `#top` sent as a path.
 * Return the homepage URL to use instead, or null when it is not one of those sections.
 */
export function encodedHashRedirectPath(pathname: string): string | null {
  let decoded = pathname;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return null;
  }
  const id = decoded.startsWith("/#") ? decoded.slice(2).split("/")[0] : null;
  if (!id || !HOME_SECTION_IDS.has(id)) return null;
  return id === "top" ? "/" : `/#${id}`;
}
