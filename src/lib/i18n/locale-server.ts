import { cookies, headers } from "next/headers";
import type { Locale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/locale-cookie";

export async function getRequestLocale(): Promise<Locale> {
  const c = await cookies();
  const v = c.get(LOCALE_COOKIE)?.value;
  if (v === "ja" || v === "en") return v;

  const al = (await headers()).get("accept-language") ?? "";
  return al.toLowerCase().startsWith("en") ? "en" : "ja";
}

