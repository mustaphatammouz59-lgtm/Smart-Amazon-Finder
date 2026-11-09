# Stage 03.1 — Production Readiness Audit

Project: Smart Amazon Finder (internal codename) · Date: 2026-11-08
Scope: audit and preparation only. **Nothing was merged, pushed, deployed, migrated
or reconfigured in production during this audit.** One local config defect found by
the audit was fixed on the `stage-03` branch (see §5.3).

## 1. Overall readiness verdict

## **READY WITH CONDITIONS**

The Stage 03 code, schema and pipeline are sound and merge-proven. Publication is
blocked on a small set of owner-side conditions — one of them critical (Cloudflare
Access must exist before the admin API is exposed). Exact conditions and the full
deployment sequence are in §§8–9.

| Area | Status |
|---|---|
| Database migrations | READY WITH CONDITIONS |
| Backup & recovery | READY WITH CONDITIONS (procedure revised — see §3.2) |
| Cloudflare Access / admin security | **BLOCKED** (owner action required before deploy) |
| Queues & DLQ | READY WITH CONDITIONS (DLQ creation pending; config defect fixed) |
| API security | READY WITH CONDITIONS |
| Deployment pipeline | READY |

## 2. Database migration audit — READY WITH CONDITIONS

Migrations inspected line by line: `0001_foundation`, `0002_catalog`,
`0003_platform`, `0004_search`.

- **Order & dependencies: correct.** 0002 creates catalog tables; 0003's platform
  tables reference catalog tables (favorites/alerts → products, audit → admin_users);
  0004's projection references products/brands/categories. Sequential application
  0001 → 0002 → 0003 → 0004 is the only valid order and matches the numbering.
- **Destructiveness: none.** A full-text scan finds no DROP, DELETE, ALTER, UPDATE
  or TRUNCATE in any migration. The only data statement is 0001's
  `INSERT OR IGNORE` into `foundation_meta`. All four files are pure
  CREATE TABLE / CREATE INDEX / CREATE VIRTUAL TABLE — they cannot overwrite or
  destroy existing data.
- **Idempotency:** 0001 is fully idempotent (`IF NOT EXISTS` + `INSERT OR IGNORE`).
  0002–0004 are NOT idempotent (plain `CREATE TABLE`) — safe under
  `wrangler d1 migrations apply`, which records applied migrations in the
  `d1_migrations` table and never re-runs them; UNSAFE to hand-apply twice via raw
  `d1 execute`. The production sequence (§8) therefore mandates the migrations
  command, never raw file execution.
- **Indexes:** 19 explicit indexes (12 in 0002, 7 in 0003), including every FK join
  column and the composite `products(status, validation_status, category_id)` that
  backs all public queries (DATABASE-DESIGN §5). ✔
- **FTS5 "triggers": none exist — by design.** The design maintains the search
  projection by writes (`reindex-search` job + publish endpoint), not triggers.
  Consequence: projection consistency depends on those two writers; the §5 nightly
  consistency check (FTS count vs published count) is not yet implemented
  (recommendation M-2). The projection is derived data and can be rebuilt at any
  time (`rebuildSearchIndex`), so drift is recoverable, never fatal.
- **Rollback:** documented per file (each migration carries a rollback note) and in
  DATABASE-DESIGN §§7/9: migrations are forward-only; rollback = D1 Time Travel
  restore or export restore + revert deploy. A local up/down drill (drop all 26
  tables, re-apply, restore fixture state exactly) passed during Stage 03.
- **Production migration 0001 status: NOT VERIFIED directly** — this environment
  has no authenticated remote D1 access. Project records (Stages 01.1/02.1) show no
  remote migration was ever executed (Workers Builds does not run D1 migrations;
  `/api/health` needs only `SELECT 1`). Ground truth must be established as step 0
  of the deployment sequence (`wrangler d1 migrations list --remote`).
- **Local/production compatibility:** local D1 runs the identical schema files the
  production sequence will apply; the code under audit ran against them end-to-end
  in workerd during Stage 03. ✔

## 3. Backup and recovery plan — READY WITH CONDITIONS

### 3.1 Procedures (to be executed at publication time, not now)

- **Pre-migration backup (mandatory):** `wrangler d1 export DB --remote --output
  backup-pre-stage03-<date>.sql`, then verify: file non-empty, contains
  `foundation_meta`, record its SHA-256 and size in the publication report.
  Also record the Time Travel bookmark: `wrangler d1 time-travel info DB`.
- **Post-migration integrity checks:** `d1_migrations` lists 0001–0004; table count
  = 31 (incl. FTS shadow tables); `foundation_meta` row intact; row counts of any
  pre-existing tables unchanged; `/api/health` ok; `/api/v1/search` returns the
  empty state (no catalog data exists yet).
- **Recovery (failed migration):** stop; do NOT attempt hand-written reverse SQL
  against production. Restore via Time Travel to the pre-migration bookmark
  (`wrangler d1 time-travel restore DB --timestamp=...`), or, beyond the Time
  Travel window, rebuild from migrations + the export (see §3.2). Redeploy the
  previous `main` commit through Workers Builds if code was also deployed.

### 3.2 AUDIT FINDING — `wrangler d1 export` fails on FTS5 databases

Verified locally during this audit: once migration 0004 has been applied,
`wrangler d1 export` fails with the platform error
**"cannot export databases with Virtual Tables (fts5)"**. DATABASE-DESIGN §9's
Layer-2 procedure (scheduled exports) therefore **breaks after Stage 03 lands** and
is revised as follows:

- The pre-migration export (§3.1) is unaffected — it runs while production still
  has no FTS table. It must happen BEFORE 0004 is applied.
- After 0004: Layer 1 (Time Travel, 7 days free / 30 days paid) is the primary
  recovery mechanism; Layer 2 becomes **per-table data dumps** (all real tables;
  `products_fts*` excluded as derived data) + the migrations in the repo as
  code-held schema truth (§9 Layer 3). The FTS index and projection are rebuilt
  from `products` after any restore via the existing reindex path.
- **Restore drill performed locally in this audit:** migrations applied to a
  scratch database → per-table data restored with bound parameters → counts exact
  (products 6, specs 11, offers 2) → FTS `rebuild` → keyword search functional
  (hub/desk matches correct). The revised procedure works; `wrangler d1 export`
  alone does not. Production export behaviour itself is NOT VERIFIED (not run —
  prohibited by this audit's scope).

## 4. Cloudflare Access & admin security audit — BLOCKED (owner action)

### 4.1 What the code does (verified in source + tests + workerd sweep)

- Every `/api/admin/*` handler calls `requireAdmin` before touching data.
  Missing Access headers → **401 UNAUTHENTICATED**; unknown identity → 401;
  known admin with insufficient role → **403 FORBIDDEN** (standard error envelope).
- Identity is resolved against `admin_users`; RBAC follows the SECURITY-PLAN role
  ladder with per-area minimums (API-ARCHITECTURE §6); 15 matrix cases + guard
  cases pass in the test suite; the publish gate and audit writes were proven
  end-to-end in workerd during Stage 03.
- Today, production exposes nothing: `/api/admin/overview` returns 404 live,
  including with deliberately spoofed Access headers (Stage 03 code is not deployed).

### 4.2 The blocking gap — code-level vs owner-side

- **The code checks that the Access headers EXIST; it does not verify the
  `Cf-Access-Jwt-Assertion` signature.** That is safe ONLY if Cloudflare Access
  sits in front of `/api/admin/*` at the edge (Access strips client-supplied
  headers and injects its own after authenticating the user). No Access
  application exists for this Worker today (none was ever configured; dashboard
  state is owner-side and NOT VERIFIED from here).
- **If the merged code were deployed without an Access application, anyone could
  set `Cf-Access-Authenticated-User-Email` to a known admin email and be treated
  as that admin.** Today `admin_users` would also be empty in production (401 for
  everyone), but the moment the first admin row is seeded, the surface is live.
- **BLOCKER B-1:** before (or atomically with) any deployment of Stage 03 code,
  ONE of these must hold: (a) an Access application protects
  `smart-amazon-finder.mustaphatammouz59.workers.dev/api/admin/*` with an allow
  policy limited to the owner (owner-side Cloudflare step), verified post-deploy
  by an unauthenticated request hitting Access (not the app); or (b) a code change
  adds JWT signature verification against the Access team's JWKS inside
  `requireAdmin` (defense in depth — recommended even with (a), as a follow-up).
- Deployment-configuration exposure check: the Worker is a single application —
  there is no config path that exposes `/api/admin/*` "more" than any other route;
  the routes are registered in `app/routes.ts` and ship with the same bundle.
  The exposure control is exactly B-1, plus the noindex layer (headers +
  robots) which remains intact (§7).

## 5. Queue & DLQ audit — READY WITH CONDITIONS

### 5.1 Configuration (as it will deploy)

- Producer binding `JOBS` → `smart-amazon-finder-jobs` (exists in production,
  auto-provisioned during the owner's original deployment). ✔
- Consumer: same queue, `max_batch_size 10`, `max_retries 3`,
  `dead_letter_queue: smart-amazon-finder-dlq`. Retry semantics: the consumer
  retries individual failed messages (`message.retry()`), acks successes and
  contract no-ops; after 3 retries failures land in the DLQ instead of looping.
- **Idempotency:** the only real job, `reindex-search`, is naturally idempotent —
  it deletes and re-derives a product's projection row from the source tables and
  rebuilds the FTS index; running it twice, or for a stale product id, converges
  to the same state. The remaining job types are acknowledged no-ops (their
  stages own their idempotency keys per API-ARCHITECTURE §7).
- **Reindex safety:** the job writes ONLY the derived projection/FTS; it can never
  modify catalog source data, publish anything, or surface a price.

### 5.2 Condition

- **C-2:** `smart-amazon-finder-dlq` does NOT exist yet. A Workers Builds deploy
  with the consumer referencing a missing DLQ will fail or leave the consumer
  unattached. The queue must be created first (owner: dashboard or
  `wrangler queues create smart-amazon-finder-dlq`) — step 1 of §8.

### 5.3 Defect found and fixed during this audit

The Stage 03 edit had produced **two** `"consumers"` keys in `wrangler.jsonc`
(the pre-existing auto-provisioned entry plus the new DLQ entry) — duplicate-key
behaviour is parser-dependent and unacceptable in a production config. Fixed on
the branch (commit `99b012d`): exactly one consumers array, now carrying the DLQ;
`wrangler` parses the file cleanly and the full stage diff for `wrangler.jsonc`
is reduced to that single change. Local runs had tolerated the duplication,
which is why Stage 03's report did not catch it; the audit did.

## 6. API security audit — READY WITH CONDITIONS

- **Validation: strong.** All inputs pass through zod schemas; malformed values
  return 400 VALIDATION_FAILED with per-field messages — never coerced (tested).
  Spec facets are whitelisted against the category dictionary. FTS terms are
  quoted tokens (injection-safe; punctuation-only terms dropped). SQL is
  parameterised throughout the DAL.
- **Pagination limits: enforced twice** — schema (`limit` ≤ 60) and DAL clamp
  (1–60). Search query length ≤ 120 chars, ≤ 8 FTS terms.
- **Error leakage: none found.** The error envelope exposes only code, a safe
  message, optional field messages, and `requestId`; internal errors collapse to
  a generic 500 INTERNAL while details go to server logs keyed by requestId.
- **Request IDs:** `crypto.randomUUID()`-derived, present on every error.
- **Logging:** server logs contain requestIds, queue names, job types and error
  strings only — no request bodies, no headers, no emails, no PII paths in the
  new code (grep-verified).
- **Headers/CORS:** no CORS headers are emitted (same-origin only — correct for
  this API). The worker wrapper applies nosniff, `X-Frame-Options: DENY`,
  Referrer-Policy, Permissions-Policy and `X-Robots-Tag` to every response,
  including API responses (verified live in production for the current build and
  unchanged in the Stage 03 diff). API responses set `Cache-Control: no-store`.
- **Gaps (recommendations, §10):** no rate limiting yet (API-ARCHITECTURE §2
  budgets exist on paper only — R-H1); no explicit request-body size guard on the
  two POST endpoints beyond platform limits (R-M1); search is unauthenticated
  and uncached by design at this stage — acceptable while the site is noindex
  and the catalog is empty, not acceptable at public launch.

## 7. Deployment pipeline audit — READY

- **Deploy candidate:** branch `stage-03` @ `99b012d` (code `e1e8ce5`, Stage 03
  report `9f28ad4`, audit fix `99b012d`) + this report's commit. Delta vs `main`:
  38 files.
- **Merge safety: proven.** A trial merge into `main` was executed locally during
  this audit: zero conflicts, merged tree passes the full suite (50/50); the
  trial branch was deleted and `main` left untouched at `1c1c078`.
- **Pipeline: operational.** Workers Builds auto-deploys pushes to `main` and has
  done so green for Stages 01–02.1; GitHub remote is unchanged since
  (`pushed_at` 2026-11-08T21:37:19Z). Publication uses the established Contents
  API route (literal git push is impossible with this PAT — Stage 01.1 finding).
- **`ci.yml` absence: LOW risk.** Workers Builds runs the build independently of
  GitHub Actions, so the missing workflow does not endanger deployment; it only
  means no pre-merge test gate runs on GitHub itself. The gate is the local suite
  (50/50, run on the exact merge candidate). Closing the PAT Workflows-permission
  gap remains a standing owner option.
- **Environment variables & bindings: documented and stable.** `wrangler.jsonc`
  carries the real D1/KV/R2/queue identifiers — the Stage 03 diff changes NONE
  of them (only the queue consumer, §5.3). `vars` contains only `SITE_URL`.
  **`DEV_FIXTURES` is absent from the production configuration** (verified) and
  exists solely in the local git-ignored `.dev.vars`; fixtures therefore cannot
  appear in production. A `.dev.vars.example` documents the flag as disabled.
- **Noindex cannot be lost by this deployment:** the `X-Robots-Tag` header comes
  from `workers/app.ts` code — the Stage 03 diff to that file touches only the
  queue handler (zero header lines changed, diff-verified); `robots.txt` route
  and legal-page meta are untouched; production headers re-verified live today.

## 8. Exact deployment sequence (for the future publication stage — NOT executed)

0. **Ground truth:** authenticated `wrangler d1 migrations list DB --remote`;
   record which of 0001–0004 (if any) are already applied. Stop if unexpected
   entries appear.
1. **Owner creates the DLQ:** `wrangler queues create smart-amazon-finder-dlq`
   (or dashboard). [C-2]
2. **Owner configures Cloudflare Access** for `/api/admin/*` on the worker
   domain with an allow policy for the owner only — OR approves the in-code JWT
   verification change first. [B-1]
3. **Backup:** `wrangler d1 export DB --remote --output backup-pre-stage03-<date>.sql`;
   verify contents + record SHA-256; record `wrangler d1 time-travel info DB`
   bookmark. (Valid because no FTS table exists in production yet.)
4. **Merge & publish code:** merge `stage-03` into `main`; upload the 38-file
   delta via the Contents API route; Workers Builds auto-deploys. Watch the
   build to green (consumer attaches now that the DLQ exists).
5. **Verify the deployment BEFORE migrations:** pages + health 200; security
   headers incl. `X-Robots-Tag` present; `/api/v1/search` → 500-free empty/error
   state is NOT expected yet (tables missing → the endpoint will 500 until step
   6 — proceed immediately; the window is minutes and the site is noindex).
   Actually minimise the window: perform step 6 immediately after step 4 in the
   same session.
6. **Apply migrations remotely, in order, via the migrations command only:**
   `wrangler d1 migrations apply DB --remote`. After it completes run the §3.1
   integrity checks (d1_migrations = 4 rows, 31 tables, foundation_meta intact).
7. **Seed structural data only:** apply `fixtures/catalog-seeds.sql` via
   `wrangler d1 execute DB --remote --file` (idempotent). **Never** apply
   `fixtures/dev-catalog.sql` in production.
8. **Seed the first admin** (owner email, role `owner`) via the D1 console —
   only now, with Access already in front (§4.2).
9. **Post-deploy verification:** `/api/health` ok; all Stage 02 pages 200 with
   one H1; `/api/v1/search?q=test` → 200 empty result set; `/api/admin/overview`
   without Access login → stopped at Access; with owner login → 200 counts;
   spoofed-header request from outside → rejected at the edge; fixtures absent
   from every public response; FinanceBleu untouched (as throughout).
10. **Rollback if needed:** code — redeploy the previous `main` commit via
    Workers Builds; data — Time Travel restore to the step-3 bookmark (the
    pre-migration production data is only `foundation_meta`, if that).

## 9. Blockers requiring owner action

- **B-1 (CRITICAL):** Cloudflare Access application for `/api/admin/*`, or
  approval of the in-code JWT-verification change (§4.2). Publication of the
  Stage 03 code must not precede one of these.
- **B-2 (HIGH):** Create the `smart-amazon-finder-dlq` queue before deploying
  the consumer configuration (§5.2).
- **B-3 (HIGH):** Perform the authenticated remote checks in §8 steps 0 and 3
  (migrations list + pre-migration export) — they require the owner's
  authenticated Cloudflare session; this environment cannot run them.
- Standing owner decisions carried over (not publication blockers): mail
  provider for user accounts; PAT Workflows permission for `ci.yml`; phone
  visual pass of the Stage 02 design; remote D1 state generally.

## 10. Recommendations

**Critical**
- R-C1: Satisfy B-1 before any Stage 03 deployment; prefer doing BOTH halves
  (Access app now, in-code JWT verification as the immediate follow-up stage)
  so admin security does not depend on a single layer.

**High**
- R-H1: Implement the API-ARCHITECTURE §2 rate limits (search 60/min/IP,
  admin write 120/min/admin, outbound 120/min) before the endpoints receive
  public traffic (Stage 07/11 at the latest).
- R-H2: Adopt the revised backup procedure (§3.2) into DATABASE-DESIGN §9 at
  the next documentation pass — the written procedure currently promises an
  export that FTS5 makes impossible. (Not edited in this audit: documentation
  changes beyond the already-delivered S-01 verdict are the owner's call.)

**Medium**
- R-M1: Add an explicit request-body size limit (e.g. 16 KB) to the POST API
  endpoints.
- R-M2: Implement the nightly FTS consistency check (DB design §5) with the
  first scheduled-job stage.
- R-M3: Add the missing `ci.yml` once the PAT gains Workflows permission, so
  the 50-test suite gates merges on GitHub as well as locally.

**Low**
- R-L1: Batch the N+1 peer-detail loads in alternatives/recommendations
  before Stage 07 renders them publicly.
- R-L2: When the DLQ exists, send a synthetic failing job once in staging to
  observe the retry → DLQ path end-to-end.

## 11. Verified / not verified

**Verified in this audit:** migration contents, order, non-destructiveness and
index set (source inspection); duplicate `consumers` key found + fixed +
config re-parsed by wrangler; trial merge clean with 50/50 tests on the merged
tree; backup/restore revised procedure executed locally end-to-end (export
failure reproduced; per-table restore + FTS rebuild proven); admin guard,
RBAC and error-envelope behaviour (Stage 03 test suite + workerd sweep, code
re-inspected here); production live surface (headers, robots, health,
/api/admin/* 404 incl. spoofed headers); GitHub remote state; `DEV_FIXTURES`
absent from production config; bindings/IDs unchanged by the stage diff;
noindex sources untouched by the diff; FinanceBleu untouched (0 files).

**NOT VERIFIED:** production D1 schema/migration state (no authenticated
remote access — B-3); Cloudflare Access dashboard state (owner-side);
`wrangler d1 export` behaviour against the REMOTE database (prohibited here;
the FTS5 failure was reproduced against local D1, whose export path shares the
platform restriction); Workers Builds behaviour with the new consumer config
against a missing DLQ (inferred from the config contract — B-2 removes the
question); real-device behaviour (no UI changed in Stage 03).

**Stage 04 has not been started.** This audit changes nothing in production;
publication of Stage 03 follows §8 only under separate owner approval.
