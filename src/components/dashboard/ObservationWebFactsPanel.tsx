import type {
  ObservationWebFactError,
  ObservationWebFactsV1,
  ObservationWebResourceFactV1,
} from "@/lib/observation-web-facts";
import { formatJaDateTime, formatUtcLabel } from "@/lib/format";

type Props = {
  facts: ObservationWebFactsV1 | undefined;
  locale: string;
};

const FILE_LABELS: Record<ObservationWebResourceFactV1["key"], { ja: string; en: string }> = {
  robots_txt: { ja: "robots.txt", en: "robots.txt" },
  security_txt: { ja: "security.txt", en: "security.txt" },
  assetlinks_json: { ja: "Android アプリリンク", en: "Android app link" },
  apple_app_site_association: { ja: "Apple アプリリンク", en: "Apple app link" },
  openid_configuration: { ja: "OpenID", en: "OpenID" },
  mta_sts_txt: { ja: "メール方針", en: "Mail policy" },
};

function errorText(error: ObservationWebFactError, ja: boolean): string {
  const labels: Record<ObservationWebFactError, { ja: string; en: string }> = {
    dns_no_public_address: { ja: "公開アドレスがない", en: "No public address" },
    forbidden_host: { ja: "取得しないホスト", en: "Host not fetched" },
    invalid_url: { ja: "無効な URL", en: "Invalid URL" },
    network_error: { ja: "通信できず", en: "Network error" },
    redirect_limit: { ja: "リダイレクトが続いた", en: "Redirect limit" },
    timeout: { ja: "時間切れ", en: "Timed out" },
  };
  return ja ? labels[error].ja : labels[error].en;
}

function presence(fact: ObservationWebResourceFactV1, ja: boolean): { word: string; detail: string | null } {
  if (fact.error) {
    return { word: ja ? "取得できず" : "Not fetched", detail: errorText(fact.error, ja) };
  }
  if (fact.present === true) return { word: ja ? "あり" : "Present", detail: null };
  if (fact.present === false) return { word: ja ? "なし" : "Not found", detail: null };
  return {
    word: ja ? "未記録" : "Not recorded",
    detail: fact.status != null ? `HTTP ${fact.status}` : null,
  };
}

function joinValues(values: string[]): string {
  return values.filter(Boolean).join(" · ");
}

function mailHost(value: string): string {
  return value.replace(/^\d+\s+/, "");
}

function txtLead(values: string[], ja: boolean): string {
  if (values.length === 0) return "";
  const short = values.filter((value) => value.length <= 48 && !value.includes("verification="));
  if (short.length === values.length) return joinValues(short);
  if (short.length === 0) return ja ? `${values.length} 件` : String(values.length);
  const extra = values.length - short.length;
  return ja ? `${joinValues(short)} · ほか ${extra} 件` : `${joinValues(short)} · ${extra} more`;
}

function directiveLead(
  directives: ObservationWebFactsV1["robots"]["directives"],
): string {
  const parts: string[] = [];
  if (directives.disallow.length > 0) parts.push(`Disallow ${directives.disallow.length}`);
  if (directives.sitemaps.length > 0) parts.push(`Sitemap ${directives.sitemaps.length}`);
  return parts.join(" · ");
}

function FactRow({ label, value, detail }: { label: string; value: string; detail?: string | null }) {
  return (
    <div className="grid gap-0.5 border-b border-border/70 py-2.5 last:border-b-0 sm:grid-cols-[11rem_1fr] sm:gap-4">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="min-w-0 text-sm text-ink">
        <p className="wrap-break-word">{value}</p>
        {detail ? <p className="mt-0.5 text-xs text-ink-muted">{detail}</p> : null}
      </dd>
    </div>
  );
}

export function ObservationWebFactsPanel({ facts, locale }: Props) {
  if (!facts) return null;
  const ja = locale.startsWith("ja");
  const timeLocale = ja ? "ja" : "en";
  const labels = ja
    ? {
        title: "Web facts",
        hint: "スクリーンショットとは別です。指定地域からの画面ではありません。",
        http: "HTTP",
        url: "URL",
        files: "ファイル",
        dns: "DNS",
        address: "アドレス",
        mail: "メール",
        nameserver: "ネームサーバ",
        txt: "TXT",
        cname: "CNAME",
        caa: "CAA",
        record: "取得の記録",
      }
    : {
        title: "Web facts",
        hint: "Separate from the screenshot. Not observed from the requested region.",
        http: "HTTP",
        url: "URL",
        files: "Files",
        dns: "DNS",
        address: "Address",
        mail: "Mail",
        nameserver: "Nameserver",
        txt: "TXT",
        cname: "CNAME",
        caa: "CAA",
        record: "Fetch record",
      };

  const addresses = joinValues([...facts.dns.records.a, ...facts.dns.records.aaaa]);
  const mail = joinValues(facts.dns.records.mx.map(mailHost));
  const nameservers = joinValues(facts.dns.records.ns);
  const txt = txtLead(facts.dns.records.txt, ja);
  const cname = joinValues(facts.dns.records.cname);
  const caa = joinValues(facts.dns.records.caa);
  const robotsExtra = directiveLead(facts.robots.directives);
  const dnsRows = [
    addresses ? { label: labels.address, value: addresses } : null,
    mail ? { label: labels.mail, value: mail } : null,
    nameservers ? { label: labels.nameserver, value: nameservers } : null,
    txt ? { label: labels.txt, value: txt } : null,
    cname ? { label: labels.cname, value: cname } : null,
    caa ? { label: labels.caa, value: caa } : null,
  ].filter((row): row is { label: string; value: string } => row != null);

  const files: { key: string; label: string; fact: ObservationWebResourceFactV1; extra: string }[] = [
    {
      key: "robots_txt",
      label: FILE_LABELS.robots_txt[timeLocale],
      fact: facts.robots,
      extra: robotsExtra,
    },
    ...facts.well_known.map((fact) => ({
      key: fact.key,
      label: FILE_LABELS[fact.key][timeLocale],
      fact,
      extra: "",
    })),
  ];

  const headerEntries = Object.entries(facts.http.headers);
  const dnsEntries = Object.entries(facts.dns.records).filter(([, values]) => values.length > 0);
  const observed = Number.isNaN(Date.parse(facts.observed_at))
    ? facts.observed_at
    : `${formatJaDateTime(facts.observed_at, timeLocale)} · ${formatUtcLabel(facts.observed_at)}`;

  return (
    <section className="rounded-xl border border-border bg-surface-elevated p-4 sm:col-span-2 sm:p-5">
      <h2 className="text-sm font-semibold text-ink">{labels.title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-muted">{labels.hint}</p>

      <dl className="mt-3">
        <FactRow
          label={labels.http}
          value={facts.http.status != null ? `HTTP ${facts.http.status}` : "—"}
        />
        <FactRow label={labels.url} value={facts.http.final_url ?? "—"} />
      </dl>

      <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{labels.files}</h3>
      <dl>
        {files.map((file) => {
          const state = presence(file.fact, ja);
          return (
            <FactRow
              key={file.key}
              label={file.label}
              value={state.word}
              detail={[state.detail, file.extra].filter(Boolean).join(" · ") || null}
            />
          );
        })}
      </dl>

      {dnsRows.length > 0 ? (
        <>
          <h3 className="mt-4 text-xs font-semibold uppercase tracking-wider text-ink-muted">{labels.dns}</h3>
          <dl>
            {dnsRows.map((row) => (
              <FactRow key={row.label} label={row.label} value={row.value} />
            ))}
          </dl>
        </>
      ) : null}

      <details className="mt-4">
        <summary className="cursor-pointer text-xs text-ink-muted">{labels.record}</summary>
        <div className="mt-3 space-y-3 text-[11px] leading-relaxed text-ink-muted">
          <p>{observed}</p>
          <p className="font-mono">{facts.network_path}</p>
          <p className="break-all font-mono">
            SHA-256 ({facts.html.hash_scope}) {facts.html.sample_sha256 ?? "—"} · {facts.html.sample_bytes.toLocaleString()} bytes
            {facts.html.sample_truncated ? " · truncated" : ""}
          </p>
          {headerEntries.length > 0 ? (
            <dl className="space-y-1">
              {headerEntries.map(([key, value]) => (
                <div key={key}>
                  <dt className="font-mono uppercase">{key}</dt>
                  <dd className="break-all font-mono text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {dnsEntries.map(([type, values]) => (
            <div key={type}>
              <p className="font-mono uppercase">{type}</p>
              <p className="whitespace-pre-line break-all font-mono text-ink">{values.join("\n")}</p>
            </div>
          ))}
          {facts.dns.errors.length > 0 ? (
            <p className="break-all font-mono">{facts.dns.errors.join(" · ")}</p>
          ) : null}
          <div>
            <p>
              robots.txt · {presence(facts.robots, ja).word}
              {facts.robots.status != null ? ` · HTTP ${facts.robots.status}` : ""}
            </p>
            <p className="break-all font-mono">{facts.robots.url}</p>
            {Object.entries(facts.robots.directives).map(([key, values]) =>
              Array.isArray(values) && values.length > 0 && values.every((value) => typeof value === "string") ? (
                <div key={key} className="mt-1">
                  <p className="font-mono uppercase">{key}</p>
                  <p className="whitespace-pre-line break-all font-mono text-ink">{values.join("\n")}</p>
                </div>
              ) : null,
            )}
          </div>
          {facts.well_known.map((fact) => (
            <div key={fact.key}>
              <p>
                {fact.key} · {presence(fact, ja).word}
                {fact.status != null ? ` · HTTP ${fact.status}` : ""}
                {fact.error ? ` · ${fact.error}` : ""}
              </p>
              <p className="break-all font-mono">{fact.url}</p>
              {fact.sha256 ? <p className="break-all font-mono">SHA-256 {fact.sha256}</p> : null}
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
