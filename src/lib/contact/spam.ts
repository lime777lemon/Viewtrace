const URL_RE = /https?:\/\/[^\s<>"'）)】]+/gi;
const WWW_RE = /\bwww\.[a-z0-9][-a-z0-9.]*\.[a-z]{2,}\b/gi;
const SPAM_HOST_RE =
  /freeb2bdata|bit\.ly|tinyurl\.com|t\.ly|ow\.ly|cutt\.ly|rb\.gy|is\.gd/i;
const SPAM_PHRASE_RE =
  /shutting down|last chance|download (your )?(data|leads|database)|within 24 hours|24時間以内|閉鎖するので|seo (service|backlinks?)|guest post|cheap (leads|b2b data)|limited[- ]time offer/i;

function hostFromUrl(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export function extractContactUrls(text: string): string[] {
  const http = text.match(URL_RE) ?? [];
  const leftover = text.replace(URL_RE, " ");
  const www = leftover.match(WWW_RE) ?? [];
  return [...http, ...www.map((s) => `https://${s}`)];
}

/** True when the submission looks like form spam (links + pitch), not a normal support note. */
export function contactSubmissionLooksLikeSpam(input: {
  name: string;
  email: string;
  message: string;
}): boolean {
  const blob = `${input.name}\n${input.email}\n${input.message}`;
  const urls = extractContactUrls(blob);
  const hosts = urls.map(hostFromUrl).filter(Boolean);

  if (SPAM_HOST_RE.test(input.email) || hosts.some((h) => SPAM_HOST_RE.test(h))) {
    return true;
  }
  if (urls.length >= 2) return true;
  if (urls.length >= 1 && SPAM_PHRASE_RE.test(blob)) return true;
  return false;
}
