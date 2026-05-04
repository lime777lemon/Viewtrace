import { Pool } from "pg";

let pool: Pool | null = null;

export type SqlRunResult =
  | { ok: true; rowCount: number; rows: Record<string, unknown>[]; fields: string[] }
  | { ok: false; error: string };

function getPool(): Pool | null {
  const url = process.env.SUPABASE_DB_URL?.trim() || process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 1,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
  }
  return pool;
}

export async function runSql(query: string): Promise<SqlRunResult> {
  const q = query.trim();
  if (!q) return { ok: false, error: "query is empty" };
  const p = getPool();
  if (!p) return { ok: false, error: "SUPABASE_DB_URL (or DATABASE_URL) is not set" };

  try {
    const res = await p.query(q);
    const rows = (res.rows ?? []) as Record<string, unknown>[];
    const fields = (res.fields ?? []).map((f) => f.name);
    return { ok: true, rowCount: res.rowCount ?? rows.length, rows, fields };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { ok: false, error: message };
  }
}

