# Stage 03.6 — COMPLETION ADDENDUM (2026-11-09)

This addendum closes Stage 03.6. The original report (`REPORT-stage03.6-2026-11-08.md`)
recorded the attempt STOPPED at gate P1 (no authenticated wrangler on the VM).
Publication was later completed through the route the owner formally approved on
2026-11-09: a scoped Cloudflare API token for the pre-flight gates, and Workers
Builds running the real migrations before publishing the code. Every one of the
owner's seven preconditions was satisfied, in order. Nothing in this document
contains the Access AUD value or any credential.

## 1. Owner approval and route

- Owner approved Workers Builds running the real migrations before code publish,
  and explicitly did NOT approve skipping the D1 Export.
- Owner stop rule: if the Export cannot be created or any verification fails →
  STOP, no migrations, no deployment. Do not remove noindex. Do not add fixture
  products to Production. All respected (see §3).

## 2. Token route (pre-flight gates P0–P1)

- Owner created a scoped user API token in his own dashboard:
  name `Smart Amazon Finder D1`, single permission Account → D1 → Edit,
  30-day expiration (expires 2026-12-09). It was registered through the secure
  API-access flow (connector `custom.cloudflare`); the value was never pasted
  into chat, a file, or a log.
- Token verified 2026-11-09 ~09:27 UTC+1: `GET /user/tokens/verify` → 200,
  status active. D1 list returned exactly one database, UUID matching the
  project config, 0 tables.

## 3. Owner gate evidence (preconditions 1–4, executed BEFORE any migration)

1. **Migrations state verified** via the D1 API query endpoint (the same ground
   truth wrangler reads): remote `sqlite_master` contained only `_cf_KV`;
   no `d1_migrations` table existed → zero migrations applied, all four pending.
2. **Full D1 Export created even though the database was empty.**
   File: `pre-stage03-d1-export-2026-11-09.sql` (kept in the stage backup dir).
3. **Export verified**: exists, readable, **32 bytes**, content exactly
   `PRAGMA defer_foreign_keys=TRUE;` (the correct shape for an empty database),
   **SHA-256 `309d1516f5d4f4f792b17106f7b761312f848c634e3028d70e6eb8ed39df7398`**.
4. **Time Travel bookmark captured**: the export's `at_bookmark`
   `0000000a-00000000-0000511e-6246f8ad41b205c1a7bea2f7b69c64d4` is the restorable
   pre-migration point. (A direct GET on the `time_travel` API path returns
   404 in this API version; the export bookmark is the working route.)
- Export polling note for future runs: poll with
  `{"output_format":"polling","current_bookmark":"<at_bookmark>"}`; polling
  without `current_bookmark` starts a new export on every call.

## 4. Owner dashboard steps (phone, guided, screenshot-verified)

- Worker Secret `ACCESS_TEAM_DOMAIN` added (Production, Value encrypted).
- Worker Secret `ACCESS_AUD` added (Production, Value encrypted). First attempt
  landed as a plain Variable; it was deleted and re-added as a Secret, verified
  in the variables table. The AUD was copied by the owner directly from the
  Zero Trust Access application page; it was never sent through chat by Muse.
- Workers Builds **deploy command** changed from `npx wrangler deploy` to
  `npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`
  (screenshot-verified character by character before Save).
- Side verifications from the same screenshots: Worker bindings exactly 4
  (APP_KV, DB, JOBS, MEDIA — IDs match); Access policy «Owner only · Allow»
  attached to `/api/admin/*`; build token = the project's own build token.
- The dashboard's "keep wrangler.jsonc in sync" banner was deliberately NOT
  followed for the AUD: the repository is public, so both ACCESS_* values live
  only as dashboard Secrets, never in `wrangler.jsonc` (its `vars` still
  contains only `SITE_URL`; a repo-wide grep for the AUD prefix returns 0).

## 5. Publication (preconditions 5–7)

- Local `main` (merge of `stage-03`, fast-forward to `13572e6`) was uploaded via
  the Contents API helper: **53 files — 46 created (HTTP 201), 7 updated
  (HTTP 200), 0 failures**. Wiring files (`app/routes.ts`, `workers/app.ts`,
  `wrangler.jsonc`) were uploaded last.
- Workers Builds builds one commit at a time; migrations were observed applying
  progressively (0001–0003 at first check, 0004 moments later) and the final
  commit's build applied the remainder, then deployed. Final state:
  `d1_migrations` = 0001_foundation, 0002_catalog, 0003_platform, 0004_search,
  in order.
- The deploy command remains armed in Builds settings, so every future push
  re-runs `migrations apply` first (a no-op when nothing is pending) — verified
  behaviour, idempotent.

## 6. Schema integrity verification (precondition 6, via API)

- Tables: **26/26** application tables present (incl. `products_search`,
  `products_fts`), set-compared against the CREATE statements in
  migrations 0001–0004; plus `d1_migrations` and `_cf_KV`.
- Indexes: **19/19** named indexes present.
- FTS5: shadow tables `products_fts_config/_data/_docsize/_idx` present;
  `SELECT count(*) FROM products_fts WHERE products_fts MATCH 'test'`
  answered **0** with no error (external-content FTS over `products_search`
  works in production D1).

## 7. Structural seeds + first admin (runbook P6/P8, via API)

- `fixtures/catalog-seeds.sql` executed statement-by-statement (9 statements,
  all INSERT OR IGNORE): **categories = 2** (`home-office`,
  `electronics-accessories`), **attribute_definitions = 8**. The file contains
  no products (re-read before execution).
- First admin row: `mustaphatammouz59@gmail.com`, role `owner` (changes=1).
- `fixtures/dev-catalog.sql` was NOT executed anywhere near production.

## 8. Production verification (runbook P9, live)

- `GET /` → 200; **`X-Robots-Tag: noindex, nofollow` present** (owner condition);
  `robots.txt` still `Disallow: /`.
- `GET /api/health` → all bindings ok (d1/kv/r2/queues).
- `GET /api/v1/search?q=test` → 200, v1 envelope
  `{data:[], facets:{brands:[]}, totalEstimate:0, nextCursor:null, searchId}`.
- `GET /api/v1/categories/home-office/products` → 200, empty envelope
  (seeded category resolves; zero products).
- `GET /api/v1/products/999` → 404 with the §8 error envelope
  `{error:{code:"NOT_FOUND", message, requestId}}`.
- `GET /api/admin/overview` without authentication → **302 to the Cloudflare
  Access login** for this application (edge guard intercepts before the Worker).
- **products count in production D1 = 0** — no fixture data.
- FinanceBleu was not touched: no file, repo, or resource of that project was
  read or written during Stage 03.6.

## 9. Verdict

**Stage 03.6 COMPLETE.** Stage 03 (catalog & data foundation, security
hardening, owner setup) is fully published and verified live: migrations
0001–0004 applied in order after a verified export + Time Travel bookmark,
Stage 03 code deployed, structural seeds and the owner admin row in place,
noindex intact, zero products in production.

## 10. Open items (unchanged, owner decisions)

- Stage 04 has NOT started; it needs its own brief/approval.
- `.github/workflows/ci.yml` still not uploaded (token lacks Workflows
  permission) — CI has never run; Workers Builds is independent of it.
- Mail-provider decision for public user auth still open (not a Stage 03 item).
- Owner's phone visual pass of the Stage 02 design still pending.
- The `Smart Amazon Finder D1` token can be deleted by the owner now that
  publication is complete; it expires 2026-12-09 regardless.
