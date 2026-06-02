# Supabase migrations & CLI

Production project: `lywcdvevizwopochcpic`

Migration history was **repaired** (remote history now matches `supabase/migrations/`). The live app is unaffected.

## One-time CLI setup

### 1. Log in

**Browser (easiest):**

```bash
supabase login
```

**Access token** (for scripts / CI — [Dashboard → Account → Access Tokens](https://supabase.com/dashboard/account/tokens)):

```bash
# .env.local (gitignored) — also used by npm run sync:supabase-confirmation-email
SUPABASE_ACCESS_TOKEN=sbp_...

supabase login --token "$SUPABASE_ACCESS_TOKEN"
```

### 2. Link this repo (already done if `supabase/.temp/project-ref` exists)

```bash
supabase link --project-ref lywcdvevizwopochcpic
# Database password: Dashboard → Project Settings → Database
```

### 3. Verify

```bash
npm run db:check
# or
npm run db:migrations:list
```

`LOCAL` and `REMOTE` columns should show the same 20 versions. If a new migration exists only locally, only `LOCAL` will show it until `db push`.

## Day-to-day workflow

```bash
# 1. Create migration file
npm run db:migration:new -- add_some_column

# 2. Edit supabase/migrations/<timestamp>_add_some_column.sql

# 3. Apply to production
npm run db:push

# 4. Confirm
npm run db:migrations:list
```

## npm scripts

| Script | Command |
|--------|---------|
| `npm run db:check` | Auth + link + migration list |
| `npm run db:migrations:list` | `supabase migration list --linked` |
| `npm run db:push` | Apply pending migrations to remote |
| `npm run db:migration:new -- name` | Create empty migration file |

## If history drifts again

```bash
./scripts/supabase-sync-migrations.sh repair   # history only, no schema rollback
./scripts/supabase-sync-migrations.sh list
```

Full baseline reset (Docker required): `./scripts/supabase-sync-migrations.sh pull`

## Manual SQL Editor

Small DDL can still be run in Supabase SQL Editor. Add a matching file under `supabase/migrations/` and run `repair` if CLI history gets out of sync.

## Notes

- `supabase/config.toml` uses `major_version = 17` (matches production Postgres 17).
- `db pull` / local `supabase start` need **Docker Desktop**.
- `db push` does **not** need Docker.
