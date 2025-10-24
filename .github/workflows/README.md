## GitHub Workflows Overview

This document describes the automated workflows for the backend (Supabase) part of the project: backups, database schema deployment, and CI checks. It also defines the environment variables / secrets each workflow expects and where to obtain their values in the Supabase dashboard.

---
## Index
1. Backups & Pruning
	 - `_backup-engine.yaml` (reusable)
	 - `backup-staging.yaml`
	 - `backup-production.yaml`
	 - `_prune-engine.yaml` (reusable)
	 - `prune-staging.yaml`
	 - `prune-production.yaml`
2. Deployment (migrations)
	 - `deploy-staging.yaml`
	 - `deploy-production.yaml`
3. CI (lint & type consistency)
	 - `ci.yaml`
4. Environment / Secret Reference
5. Backup & Prune Storage Layout & Schedule
6. Troubleshooting

---
## 1. Backups & Pruning

### 1.1 Reusable Backup Engine: `_backup-engine.yaml`
Purpose: Encapsulates the logic to perform a Postgres logical backup (`pg_dump -Fc`) and upload the resulting dump to Supabase Object Storage.

Key characteristics:
- Executed inside a `postgres:17-alpine` container to ensure a deterministic `pg_dump` version (must remain compatible with Supabase server Postgres version).
- Accepts two inputs via `workflow_call`:
	- `environment` (required): logical env label (`staging`, `production`, etc.).
	- `bucket` (optional, default `db-backups`): Supabase Storage bucket name.
- Requires three secrets passed by the caller:
	- `SUPABASE_DB_URL`
	- `SUPABASE_SERVICE_ROLE_KEY`
	- `SUPABASE_STORAGE_URL`
- Sets environment variables consumed by the shell script `scripts/backup-db.sh`:
	- `BACKUP_ENV`, `SUPABASE_BUCKET`, `DATABASE_URL`, `SUPABASE_STORAGE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

The script (`scripts/backup-db.sh`) produces a filename pattern:
`<project>-<env>-pgdump-YYYY-MM-DDTHH-MM-SSZ.dump`

Uploads path structure inside the bucket:
`db-backups/<environment>/<filename>`

### 1.2 Staging Backup: `backup-staging.yaml`
Triggers:
- Scheduled daily at 02:00 UTC.
- Manual `workflow_dispatch` (on-demand run).

Calls the reusable engine with `environment: staging`.

### 1.3 Production Backup: `backup-production.yaml`
Triggers:
- Scheduled daily at 02:00 UTC.
- Manual `workflow_dispatch`.

Calls the reusable engine with `environment: production`.

### Backup Success Criteria
- `pg_dump --version` logs a 17.x client.
- Script logs an INFO line for upload success.
- Object appears in Supabase Storage: `db-backups/<env>/...dump`.

### 1.4 Reusable Prune Engine: `_prune-engine.yaml`
Purpose: Encapsulates logic to prune (delete) older backup objects from Supabase Storage according to two controls:

- `keep` – always retain the most recent N files (default 7)
- `days` – delete files older than this many days (default 7)

Invocation model mirrors the backup engine via `workflow_call` inputs:

Inputs (with defaults):
| Input | Type | Default | Description |
|-------|------|---------|-------------|
| `environment` | string | (required) | Logical environment; also used as path prefix. |
| `bucket` | string | `db-backups` | Target Storage bucket. |
| `keep` | number | 7 | How many newest objects to always keep. |
| `days` | number | 7 | Prune objects older than this age (UTC). |
| `dry_run` | boolean | false | If true, only log candidates; no deletion. |

Secrets (required):
| Secret | Purpose |
|--------|---------|
| `SUPABASE_URL` | Project base URL used by Python client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Auth to list & delete objects (Service Role legacy key). |

Environment variables set internally: `SUPABASE_BUCKET`, `PRUNE_KEEP`, `PRUNE_DAYS`, `PRUNE_PATH` (defaults to the environment name), `DRY_RUN`.

Execution flow:
1. Always performs a dry‑run listing step (even if `dry_run` is false) to log candidates for auditability.
2. If `dry_run` input is false, performs a second pass that actually calls the Python CLI prune command (deletions).

### 1.5 Staging Prune Workflow: `prune-staging.yaml`
Triggers:
- Weekly Saturday at 01:10 UTC (`10 1 * * 6`).
- Manual `workflow_dispatch`.

Calls `_prune-engine.yaml` with `environment: staging` and default retention parameters.

### 1.6 Production Prune Workflow: `prune-production.yaml`
Triggers:
- Weekly Saturday at 01:20 UTC (`20 1 * * 6`) — deliberately staggered 10 minutes after staging to reduce concurrent load.
- Manual `workflow_dispatch`.

Calls `_prune-engine.yaml` with `environment: production`.

### Prune Success Criteria
- Dry-run step lists candidate files (even if none qualify).
- Actual prune step reports deleted filenames (if any) and exits 0.
- Latest N (keep) objects remain untouched; no object newer than the `days` threshold is deleted.
- Run logs are retained in Actions for audit.

---
## 2. Deployment (Migrations)

### 2.1 Staging Deployment: `deploy-staging.yaml`
Triggers:
- `push` to `main` branch affecting files under `supabase/**`.
- Manual dispatch.

Actions:
- Install Supabase CLI.
- `supabase link --project-ref $SUPABASE_PROJECT_ID`
- `supabase db push` (applies local migrations to staging project).

### 2.2 Production Deployment: `deploy-production.yaml`
Triggers:
- `push` to `release` branch affecting `supabase/**`.
- Manual dispatch (can be used for emergency redeploy).


---
## 3. CI Workflow: `ci.yaml`

Triggers:
- `pull_request` events when paths under `supabase/**` change.
- Manual dispatch.

Steps:
1. Checkout code.
2. Install Supabase CLI.
3. Start local Supabase (`supabase db start`).
4. Run linter: `supabase db lint`.
5. Regenerate types and ensure no diff vs committed `types.gen.ts` (enforces consistency).

Failure conditions: Lint errors or uncommitted type changes.

---
## 4. Environment Variables & Secrets Reference

| Name | Used In | Description | How to Obtain |
|------|---------|-------------|---------------|
| `SUPABASE_PROJECT_ID` | Deploy workflows | Supabase project reference / ID | Dashboard → Project Settings → General Settings → Project ID |
| `SUPABASE_DB_PASSWORD` | Deploy workflows (CLI link / local) | Database password; only visible at creation; can be reset | Dashboard → Connect → Reset DB Password (creates a new one) |
| `SUPABASE_DB_URL` | Backup engine (as `DATABASE_URL`) | Postgres connection string (session pooler URL, IPv4-compatible) | Dashboard → Connect page → choose Session Pooler connection (host like `aws-1-<region>.pooler.supabase.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Backup engine (upload auth) | Service Role key (legacy key required for Storage write) | Project Settings → API Keys → Legacy API Keys → `service_role secret` |
| `SUPABASE_STORAGE_URL` | Backup engine | Storage endpoint base URL `https://<SUPABASE_PROJECT_ID>.storage.supabase.co` | Construct from Project ID or inspect network calls / docs |
| `SUPABASE_ACCESS_TOKEN` | Deploy & CI workflows | Personal/service Supabase access token for CLI auth | Project Settings → Access Tokens (create token) |
| `SUPABASE_BUCKET` (input / var) | Backup workflows | Target bucket for dumps (default `db-backups`) | Create bucket in Supabase Storage (private) |
| `BACKUP_ENV` | Backup script (computed) | Logical environment label used in path | Passed via reusable workflow input |

Notes:
- The **Session Pooler** URL ensures IPv4 compatibility; direct DB hostname may resolve to IPv6-only path.
- The legacy Service Role key is required because the newer API key format currently fails for direct Storage upload with Bearer auth in this script.
- Never commit secrets—store them as repository or environment-level secrets.

---
## 5. Backup & Prune Storage Layout & Schedule

Layout inside the bucket (example `db-backups`):
```
db-backups/
	staging/
		moneylens-staging-pgdump-2025-09-21T02-00-00Z.dump
	production/
		moneylens-production-pgdump-2025-09-21T02-00-05Z.dump
```

Schedules:
- Backups (staging, production): Daily 02:00 UTC (`0 2 * * *`).
- Prune (staging): Weekly Saturday 01:10 UTC (`10 1 * * 6`).
- Prune (production): Weekly Saturday 01:20 UTC (`20 1 * * 6`).

Filename pattern embeds UTC timestamp for uniqueness and easy sorting. All times are UTC.

---

## 6. Troubleshooting

| Symptom | Likely Cause | Resolution |
|---------|--------------|-----------|
| Workflow fails: missing secret | Secret not defined at the environment level | Add secret under Repository → Settings → Environments (Staging/Production) |
| `pg_dump` network unreachable | IPv6 route or host mismatch | Use session pooler URL; ensure `sslmode=require` included |
| Upload HTTP 400 | Malformed upload path or missing bucket | Verify bucket exists and form `file=@...` syntax |
| Empty backup file | Permission or early pg_dump failure | Examine earlier logs; enable debug flag in script |
| Prune deletes nothing (expected deletions) | Filename pattern or path prefix mismatch | Confirm objects are under `/<env>/` and time formats parse correctly; check updated_at timestamps |
| Prune deletes too many | Overlapping criteria (days + keep) | Validate `keep` still protects newest N; adjust days or increase keep value |
| Prune workflow shows candidates every run | Dry-run step is always executed | This is intentional; disable by editing engine if noise is excessive |
