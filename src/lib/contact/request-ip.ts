import { headers } from "next/headers";

export async function getContactClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for") ?? "";
  const first = forwarded.split(",")[0]?.trim();
  const ip = first || h.get("x-real-ip")?.trim() || "unknown";
  return ip.slice(0, 80);
}
