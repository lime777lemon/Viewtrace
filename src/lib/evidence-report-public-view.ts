export type PublicEvidenceCount = { label: string; value: string };

export type PublicEvidencePage = { name: string; facts: string[] };

export type PublicEvidenceRegion = {
  region: string;
  notes: string[];
  pages: PublicEvidencePage[];
};

export type PublicEvidenceSection = { heading: string; lines: string[] };

export type PublicEvidenceReportView = {
  period: string | null;
  notes: string[];
  counts: PublicEvidenceCount[];
  records: PublicEvidenceRegion[];
  sections: PublicEvidenceSection[];
};

const PAGE_LINE = /^[a-z0-9.-]+(?:\/[^\s]*)?$/i;

function isPageLine(line: string): boolean {
  if (!PAGE_LINE.test(line)) return false;
  if (!line.includes(".")) return false;
  if (line.startsWith("http://") || line.startsWith("https://")) return false;
  return true;
}

function parseRegionChunk(chunk: string[]): PublicEvidenceRegion | null {
  const lines = chunk.map((line) => line.trim()).filter(Boolean);
  const region = lines[0];
  if (!region) return null;
  const notes: string[] = [];
  const pages: PublicEvidencePage[] = [];
  let page: PublicEvidencePage | null = null;
  for (const line of lines.slice(1)) {
    if (isPageLine(line)) {
      page = { name: line, facts: [] };
      pages.push(page);
      continue;
    }
    if (page) page.facts.push(line);
    else notes.push(line);
  }
  return { region, notes, pages: collapseRepeatedPages(pages) };
}

function screenshotVerdict(facts: string[]): string {
  return (facts.find((fact) => fact.startsWith("Screenshot:")) ?? "").replace(/ × \d+$/, "");
}

function behaviorKey(facts: string[]): string {
  return facts.filter((fact) => !/^\d{4}-\d{2}-\d{2}/.test(fact) && !fact.startsWith("Screenshot:")).join("\n");
}

function statedCount(facts: string[]): number {
  const marked = facts.find((fact) => fact.startsWith("Screenshot:"))?.match(/ × (\d+)$/);
  if (marked) return Number(marked[1]);
  const times = facts.filter((fact) => /^\d{4}-\d{2}-\d{2}/.test(fact));
  return Math.max(times.length, 1);
}

function timeBounds(facts: string[]): string[] {
  const bounds: string[] = [];
  for (const fact of facts) {
    if (!/^\d{4}-\d{2}-\d{2}/.test(fact)) continue;
    if (!fact.includes("—")) {
      bounds.push(fact);
      continue;
    }
    for (const part of fact.split("—")) {
      const value = part.trim();
      if (!value) continue;
      bounds.push(value.includes("JST") ? value : `${value} JST`);
    }
  }
  return bounds;
}

function collapseRepeatedPages(pages: PublicEvidencePage[]): PublicEvidencePage[] {
  const groups: PublicEvidencePage[] = [];
  for (const page of pages) {
    const verdict = screenshotVerdict(page.facts);
    const behavior = behaviorKey(page.facts);
    const match = groups.find(
      (group) => group.name === page.name && screenshotVerdict(group.facts) === verdict && behaviorKey(group.facts) === behavior,
    );
    if (!match) {
      groups.push({ name: page.name, facts: [...page.facts] });
      continue;
    }
    const count = statedCount(match.facts) + statedCount(page.facts);
    const bounds = [...timeBounds(match.facts), ...timeBounds(page.facts)];
    const first = bounds[0];
    const last = bounds[bounds.length - 1];
    const span = bounds.length > 1 && first && last ? `${first.replace(/ JST$/, "")} — ${last}` : first ?? "";
    const others = behavior.split("\n").filter(Boolean);
    match.facts = [count > 1 ? `${verdict} × ${count}` : verdict, span, ...others].filter((line) => line.length > 0);
  }
  return groups;
}

function parseRecords(section: string): PublicEvidenceRegion[] {
  const chunks = section
    .split(/\n\s*\n/)
    .map((chunk) => chunk.split("\n"))
    .filter((chunk) => chunk.some((line) => line.trim()));
  return chunks.flatMap((chunk) => {
    const region = parseRegionChunk(chunk);
    return region ? [region] : [];
  });
}

function parsePreamble(section: string): Pick<PublicEvidenceReportView, "period" | "notes" | "counts"> {
  const notes: string[] = [];
  const counts: PublicEvidenceCount[] = [];
  let period: string | null = null;
  for (const raw of section.split("\n")) {
    const line = raw.trim();
    if (!line || line === "Viewtrace Evidence Report") continue;
    if (!period && /^\d{4}-\d{2}-\d{2}\s+—\s+\d{4}-\d{2}-\d{2}/.test(line)) {
      period = line;
      continue;
    }
    const count = line.match(/^([^:：]{1,80})[:：]\s+(\d+)$/);
    if (count) {
      counts.push({ label: count[1].trim(), value: count[2] });
      continue;
    }
    notes.push(line);
  }
  return { period, notes, counts };
}

/** Turn a sent Evidence Report into the summary shown from the email link. */
export function parseEvidenceReportBody(body: string): PublicEvidenceReportView {
  const parts = body.replace(/\r\n/g, "\n").split(/^## /m);
  const preamble = parsePreamble(parts[0] ?? "");
  const records: PublicEvidenceRegion[] = [];
  const sections: PublicEvidenceSection[] = [];
  for (const part of parts.slice(1)) {
    const breakAt = part.indexOf("\n");
    const heading = (breakAt === -1 ? part : part.slice(0, breakAt)).trim();
    const rest = breakAt === -1 ? "" : part.slice(breakAt + 1).trim();
    if (!heading || heading === "このレポート" || heading === "各記録") continue;
    if (heading === "主な記録") {
      records.push(...parseRecords(rest));
      continue;
    }
    const lines = rest.split("\n").map((line) => line.trim()).filter((line) => line && !/^https?:\/\//.test(line));
    if (lines.length > 0) sections.push({ heading, lines });
  }
  return { ...preamble, records, sections };
}
