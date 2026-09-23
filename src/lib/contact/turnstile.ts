export function getTurnstileSiteKey(): string {
  return (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    ""
  );
}

export function getTurnstileSecret(): string {
  return process.env.TURNSTILE_SECRET_KEY?.trim() || "";
}

export async function verifyTurnstileToken(token: string, ip: string): Promise<boolean> {
  const secret = getTurnstileSecret();
  if (!secret || !token || token.length > 4096) return false;

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
