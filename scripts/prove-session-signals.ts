import { readFileSync } from "node:fs";
import { browserlessPathEndpoint } from "../src/lib/browserless-geo-endpoint";
import { parseSessionSignals, buildSessionProbeFunctionCode } from "../src/lib/session-signals";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] == null) process.env[match[1]] = match[2].trim();
}

async function main() {
  const href = browserlessPathEndpoint("/function");
  if (!href) {
    console.error("browserless_not_configured");
    process.exit(1);
  }

  const target = process.argv[2] || "https://example.com/";
  const started = Date.now();
  const response = await fetch(href, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      code: buildSessionProbeFunctionCode(),
      context: { url: target },
    }),
  });
  const durationMs = Date.now() - started;
  if (!response.ok) {
    const detail = await response.text();
    console.error(JSON.stringify({ ok: false, status: response.status, durationMs, detail: detail.slice(0, 300) }));
    process.exit(1);
  }
  const raw = await response.json();
  const session = parseSessionSignals(raw);
  console.log(JSON.stringify({ ok: Boolean(session), durationMs, target, session }, null, 2));
}

main();
