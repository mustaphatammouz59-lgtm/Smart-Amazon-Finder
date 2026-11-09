# Stage 03.3 Report — Owner Setup & Publication Preparation

Project: Smart Amazon Finder (internal codename) · Date: 2026-11-08
Branch: `stage-03` · Starting point: `8f7bfbd` (Stage 03.2) + report `85aecb8`
Status: **PREPARATION COMPLETE. Nothing pushed, merged, deployed or created in production.**

## 1. What was inspected

- Repository state: branch `stage-03` at `85aecb8`, working tree clean before
  this stage; Stage 03.2 report re-read.
- Configuration requirements re-verified against the ACTUAL files (not from
  memory): `wrangler.jsonc` (worker name `smart-amazon-finder`; queue
  `smart-amazon-finder-jobs`; consumer DLQ `smart-amazon-finder-dlq`;
  ratelimits `SEARCH_RATE_LIMITER` ns 1001 = 60/60s, `ADMIN_RATE_LIMITER`
  ns 1002 = 120/60s; `vars` currently contains only `SITE_URL`),
  `app/lib/access.ts` (env names `ACCESS_TEAM_DOMAIN` / `ACCESS_AUD`; JWKS
  derived as `{issuer}/cdn-cgi/access/certs`), `app/routes.ts` (the three
  admin routes define the Access path scope `/api/admin/*`),
  `migrations/` (0001–0004 present, in order), `fixtures/` (catalog-seeds +
  dev-catalog).
- Migration order and the backup/restore instructions were re-checked
  against the repository: sequence 0001 → 0002 → 0003 → 0004; the pre-FTS
  export must precede 0004 (Stage 03.1 finding, now also written into
  DATABASE-DESIGN §9 in Stage 03.2); rollback = previous-commit redeploy
  and/or D1 Time Travel restore. Consistent — no changes needed.

## 2. Deliverables created

- **`STAGE-03.3-OWNER-SETUP-GUIDE.md`** — phone-friendly, exact dashboard
  steps for the three owner-only tasks (create DLQ → create Access
  application with owner-only policy → send Muse the two identifier
  values), an explicit "what you do NOT need to do" section, and the
  publication-day runbook (P0–P10) with an owner/terminal/Muse split.
- This report.

No code was changed in this stage.

## 3. Checklist

| Item | Status |
|---|---|
| Repository on `stage-03`, base commit `8f7bfbd` + 03.2 report, tree clean | VERIFIED |
| Local QA: tests 76/76 (10 files), typecheck 0 errors, ESLint clean, production build PASS | VERIFIED |
| Migration files 0001–0004 present, ordered, additive-only (audit 03.1) | VERIFIED |
| Backup/restore instructions consistent with repo + §9 as corrected in 03.2 | VERIFIED |
| JWT verification code complete and tested (Stage 03.2) | VERIFIED |
| Rate-limit bindings declared in config (provision at deploy; no owner resource) | VERIFIED |
| Body-size limits + RBAC + audit logging (Stages 03/03.2) | VERIFIED |
| Production untouched by this stage (no push/merge/deploy/migration/resource) | VERIFIED |
| Dead-letter queue `smart-amazon-finder-dlq` created | **OWNER ACTION REQUIRED** (Guide Step 1) |
| Cloudflare Access application for `/api/admin/*` | **OWNER ACTION REQUIRED** (Guide Step 2) |
| Owner-only Access policy (single email include) | **OWNER ACTION REQUIRED** (Guide Step 2c) |
| `ACCESS_TEAM_DOMAIN` value known | **OWNER ACTION REQUIRED** (Guide Steps 2a/3 — exists only after the Access team/app exists) |
| `ACCESS_AUD` value known | **OWNER ACTION REQUIRED** (Guide Steps 2d/3) |
| Remote D1 migration state (is 0001 applied? is `d1_migrations` present?) | NOT VERIFIED (no authenticated remote access here; runbook step P0) |
| Cloudflare account state (Zero Trust team existence, plan) | NOT VERIFIED (owner-side; resolved by doing Guide Step 2) |
| Workers Builds behaviour deploying the new bindings (ratelimits + DLQ consumer) | NOT VERIFIED (first test is the publication deploy itself; DLQ pre-created per Guide Step 1 removes the known failure mode) |
| Publication of Stage 03 | BLOCKED — on the owner actions above + separate publication approval (by design, not a defect) |
| Mail provider for future user accounts | BLOCKED (standing owner decision; NOT a Stage 03 publication blocker) |
| `.github/workflows/ci.yml` on GitHub | NOT VERIFIED as fixed — still missing (PAT lacks Workflows permission; Low risk per audit 03.1) |

## 4. Exact owner actions required (summary — full steps in the Guide)

1. **Create the queue** `smart-amazon-finder-dlq` (Dashboard → Queues →
   Create; exact name; defaults elsewhere). ~2 minutes.
2. **Create the Access application** in Zero Trust: self-hosted app
   `Smart Amazon Finder Admin` on
   `smart-amazon-finder.mustaphatammouz59.workers.dev` path `api/admin/*`,
   single policy "Owner only" (Allow, Include: Emails = your email only).
   Note the team domain during onboarding (Free plan; One-time PIN login
   is the default and is fine).
3. **Send Muse the two identifier values** (team domain + AUD tag).
   These are NOT secrets. Never send passwords or tokens — none is needed.
   Muse will place the values into `wrangler.jsonc` vars at publication
   time (the guide explains why the dashboard route is NOT recommended
   for these two variables: config-file deploys can overwrite
   dashboard-set variables).

## 5. Safe commands prepared (NOT executed against production)

Prepared in the Guide's runbook for the authenticated publication session:
`wrangler d1 migrations list DB --remote` (read-only check),
`wrangler d1 export DB --remote --output …` (pre-migration backup — valid
only before 0004 is applied), `wrangler d1 time-travel info DB`,
`wrangler d1 migrations apply DB --remote`,
`wrangler d1 execute DB --remote --file fixtures/catalog-seeds.sql`,
plus read-only D1 Console queries (`sqlite_master` / `d1_migrations`
checks). No remote command of any kind was run during this stage — this
environment has no authenticated Cloudflare session, and the brief
prohibits remote mutations in any case.

## 6. Deployment sequence & rollback review

The revised sequence from REPORT-stage03-2 §7 was re-checked step by step
against the repository and stands unchanged (it is reproduced as runbook
P0–P10 in the Guide, with per-step ownership). Key compatibilities
re-confirmed: migrations are additive-only, so applying them (P4) before
the code deploy (P7) cannot disturb the running Stage 02 site; the backup
(P3) must precede P4 because whole-database export stops working once
0004 creates the FTS table; the first admin row (P8) comes after both
Access (P2) and the verifying code (P7) exist. Rollback: redeploy the
previous `main` commit (code) and/or Time Travel restore to the P3
bookmark (data). No new blocker was found in this review.

## 7. Remaining blockers

- **Publication blockers (owner-side, all in §4):** DLQ creation; Access
  application + owner-only policy; the two identifier values. Plus the
  standing requirement of a separate publication approval.
- **Not blockers:** rate-limit bindings (config-provisioned); consumer
  configuration (fixed in 03.1, verified); JWT verification (done in
  03.2); ci.yml (Low); mail provider (future accounts stage only).

## 8. Confirmation

No production resource was changed, created or deleted. Nothing was
pushed, merged or deployed. No remote D1 command was executed. No
secrets were requested or handled. FinanceBleu untouched (0 files).
Stage 00 documentation untouched in this stage. Local QA: **76/76 tests,
typecheck 0 errors, ESLint clean, build PASS**.

**Stage 04 has not been started.** Next step is the owner's: Guide
Steps 1–3, then a publication decision.
