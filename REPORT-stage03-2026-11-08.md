# Stage 03 Report — Product Catalog & Data Foundation

Project: Smart Amazon Finder (internal codename) · Date: 2026-11-08
Status: **COMPLETE LOCALLY on branch `stage-03`. NOT pushed, NOT deployed.**
Production is unchanged (verified: the live `/api/v1/search` returns 404 — Stage 03 exists only locally).

## 1. Roadmap requirements and implementation scope

MASTER-ROADMAP defines Stage 03 as **"Backend and database"** — this report follows the
roadmap where it differs from a literal reading of the brief:

- D1 schema migrations per DATABASE-DESIGN.md ✔
- Data-access layer with publication/validation gates ✔
- API v1 skeleton with validation + standard error format ✔
- Auth foundations: admin Access/session guard + RBAC; public user auth NOT built —
  SECURITY-PLAN §4 leaves the mail-provider choice to this stage and no provider has
  been chosen (owner decision, recorded in §10) ✔ (as far as it can go)
- Queues + DLQs: consumer router implemented; DLQ configured as code ✔
- Audit logging ✔ · Spike S-01 (FTS5) ✔ — **verdict GO**, written into
  SYSTEM-ARCHITECTURE.md as the roadmap's acceptance criteria require.
- Deliverables: migrated staging DB (local D1) ✔, API contract tests ✔, authz matrix
  test harness ✔, queue consumers (reindex real; other contracts safe no-ops) ✔.

Out of scope per roadmap (later stages, NOT started): admin dashboard UI (04),
ingestion adapters (05), public catalog/search pages (07). No public page changed.

## 2. Architecture decisions

- **DAL is the only data path** (`app/lib/db/`): public queries structurally include
  `status='published' AND validation_status='passed'` (integrity rule 2); no raw
  catalog SQL exists in route code.
- **Search projection**: a real maintained table `products_search` mirrors published+
  passed products; `products_fts` is an external-content FTS5 index over it, written
  only by the reindex path (publish endpoint + `reindex-search` queue job).
- **Price policy in one function** (`applyPricePolicy`): a price is exposed only when
  the offer is validation-passed, `licence_status='licensed'`, and observed within
  24h (compliance freshness window). Otherwise the API returns `price_cents: null` —
  the value never leaves the server.
- **Fixtures triple-gated**: separate `fixtures/` files (never migrations), marker
  `source_id='dev-fixture'` + `[DEV FIXTURE]` names, and the DAL excludes them unless
  Worker var `DEV_FIXTURES='enabled'` — a variable that exists only in a local,
  git-ignored `.dev.vars` (a committed `.dev.vars.example` documents it as disabled).
- **Admin trust boundary**: handlers trust `Cf-Access-*` headers only because
  Cloudflare Access strips/sets them at the edge. Access itself is an owner-side
  Cloudflare configuration at deploy time; until then `/api/admin/*` must be treated
  as unreachable in production (it is — this code is not deployed).

## 3. Database changes and migrations (local D1 only; production D1 untouched)

- `migrations/0002_catalog.sql` — categories, brands, products, product_variants,
  attribute_definitions, product_specs, product_attributes, product_media, merchants,
  affiliate_programs, offers, price_history + the §5 index set (incl. the composite
  `products(status, validation_status, category_id)`).
- `migrations/0003_platform.sql` — users, favorites, comparison_lists/items,
  price_alerts, affiliate_clicks, admin_users, audit_logs (append-only by design),
  buying_guides, articles, source_records, analytics_daily + indexes.
- `migrations/0004_search.sql` — `products_search` projection + `products_fts` (FTS5).
- Migration up/down drill performed on local D1: all 26 Stage-03 tables dropped and
  re-applied cleanly; fixture state restored exactly (6 products, 4 indexed).
- Structural seeds (not migrations): `fixtures/catalog-seeds.sql` — the two launch
  categories + 8 attribute definitions, idempotent by natural key, no commercial data.

## 4. API endpoints created

Public (all behind the DAL gates; standard §8 error envelope with `requestId`):
`GET /api/v1/search` (FTS5 keyword + category/brand/spec facets + price filters +
sorting + cursor pagination), `GET /api/v1/products/:slug`,
`GET /api/v1/products/:slug/alternatives` (cheaper/better-fit/simpler from spec deltas;
"cheaper" is empty until licensed prices exist — never estimated),
`GET /api/v1/categories/:slug/products`, `POST /api/v1/recommendations` (transparent
rule scoring over the Stage 02 finder profile; budget applies only to displayable
prices, otherwise the response states that), `POST /api/v1/gift-finder` (editorial
attribute matching — occasion/audience tags — with the matched attribute as the reason).

Admin skeleton (Access header guard + RBAC + audit): `GET /api/admin/overview`,
`POST /api/admin/products` (creates a draft; duplicate slug → 409 CONFLICT),
`POST /api/admin/products/:id/publish` (publisher+; validation gate → 409 until
`validation_status='passed'`; success maintains the search projection immediately).

## 5. Catalog and search functionality

FTS5 keyword search with bm25 ranking over name/brand/category/summary; quoted-term
sanitisation (injection-safe: punctuation-only terms dropped); filters for category,
brand, whitelisted spec facets (per-category `is_filterable` definitions; unknown
facets → 400), price range over policy-displayable prices only; sorts: relevance,
price asc/desc (priced items first), name; cursor pagination (default 24, max 60);
brand facets with counts; `searchId` on every search response. All genuinely
database-backed — proven end-to-end in §8 against the fixture catalog.

## 6. Data sources and compliance

No external data was fetched, scraped or invented. The catalog contains zero real
products. Development fixtures are synthetic stand-ins (a desk riser, a lamp, a USB-C
hub, a cable — generic objects with plausible-but-made-up spec values, explicitly
labelled fixtures, brand "Devbrand (fixture)", merchant domain `example.invalid`).
The two fixture offers are deliberate policy traps: one unlicensed with a price, one
licensed but 48h stale — both correctly surface `price_cents: null` everywhere.
No price, rating, review or availability figure appears anywhere in the API output.

## 7. Files created and modified

Created: `STAGE03-PLAN.md`; migrations 0002–0004; `fixtures/catalog-seeds.sql`,
`fixtures/dev-catalog.sql`; `app/lib/api.ts`, `app/lib/api-schemas.ts`,
`app/lib/auth.ts`, `app/lib/db/{types,catalog,search,offers,admin,reindex}.ts`;
routes `api.v1.search`, `api.v1.product`, `api.v1.product-alternatives`,
`api.v1.category-products`, `api.v1.recommendations`, `api.v1.gift`,
`api.admin.overview`, `api.admin.products`, `api.admin.product-publish`;
`tests/helpers/sqlite-d1.ts`, `tests/catalog-integrity.test.ts`, `tests/search.test.ts`,
`tests/api-contract.test.ts`, `tests/authz.test.ts`; `scripts/spike-s01.mjs`;
`.dev.vars.example`.
Modified: `app/routes.ts` (9 API routes), `workers/app.ts` (queue job router),
`wrangler.jsonc` (queue consumer + DLQ configuration — takes effect only on a future
approved deploy; the DLQ queue itself is created owner-side at that time),
`eslint.config.js` (node globals for scripts/), `SYSTEM-ARCHITECTURE.md` (S-01 verdict
only — see §11), `tests/routes.test.ts` (prettier formatting only).

## 8. Tests and build results

- **Vitest: 50/50 PASS (7 files)** — 38 new tests: §6 integrity rules executed against
  real SQLite (gate hides draft/unvalidated in all modes; fixtures excluded unless
  enabled; price policy matrix incl. both fixture traps; publish gate refusal →
  success after validation + audit rows `product.create`/`product.publish`; duplicate
  slug conflict; no delete path exists), FTS search (ranking, filters, bool/numeric
  facets, pagination cursors, totals, price-filter emptiness), API contract (envelope
  shape, field errors, no silent coercion, spec whitelist), RBAC matrix (15 cases) +
  guard (401 no headers / 401 unknown identity / 403 insufficient role).
- **Spike S-01**: FTS5 proven inside D1 (local workerd: create + rebuild + bm25 MATCH
  returns the correct row); 10k-row benchmark: insert 51 ms, bm25 top-10 1.64 ms,
  match count 0.67 ms, snippets OK → **GO**.
- **Workerd end-to-end sweep** (real Worker + real local D1, fixtures enabled via
  `wrangler dev` + `.dev.vars`): search q=hub → hub; q=desk → riser, lamp (bm25 order);
  facet usb_c_ports≥2 → hub only; unknown spec → 400; malformed priceMin → 400 with
  field detail; pagination cursor works; product detail returns specs with
  `price_cents: null`; draft/missing → 404 NOT_FOUND envelope; alternatives →
  simpler=[lamp], cheaper=[] (honest); recommendations → hub 40 > cable 30 with
  budget-not-applied notes; gift-finder → hub with its editorial reason; admin:
  no-auth → 401, owner overview OK, create → 201, publish unvalidated → 409,
  audit count incremented for the create only; homepage 200; health all bindings ok.
  The same sweep with fixtures DISABLED returned empty search + 404 detail with
  correct admin counts (6/5/1) — the production-mode behaviour.
- TypeScript **0 errors** · ESLint **clean** · production build **PASS**.
- Finding: `vite preview` does NOT load `.dev.vars` (local D1 state was shared and
  correct; only the env var was missing) — local API verification therefore uses
  `wrangler dev`, which applies `.dev.vars`. No code impact; recorded here so the
  next stage doesn't rediscover it.

## 9. Security findings

- RBAC enforced server-side per request (never UI-hidden); roles follow the
  SECURITY-PLAN ladder (viewer < editor < publisher < admin < owner) with per-area
  minimums from API-ARCHITECTURE §6.
- Search input is parameterised everywhere; FTS terms are quoted tokens; spec facets
  are whitelisted against the category dictionary; malformed input → 400, never coerced.
- No secrets in code or fixtures; the dev admin is `owner@example.invalid` with no
  credential material; `.dev.vars` is git-ignored (verified in .gitignore).
- audit_logs is append-only at the DAL layer (no update/delete function exists);
  product deletion does not exist at all (archive-only, rule 4).
- Residual (documented, deploy-stage): Access JWT signature verification relies on
  the Access edge configuration; rate limits (API doc §2) are not yet implemented —
  they belong with the first public exposure of these endpoints.

## 10. Known issues and limitations

- Public user authentication is not built: the mail-provider decision required by
  SECURITY-PLAN §4 is still open (owner decision). `users`/`favorites`/`price_alerts`
  tables exist; account endpoints arrive once that decision is made.
- Remote (production) D1 migrations 0002–0004 are NOT applied — production D1 still
  holds only the Stage 01 foundation table (plus the still-pending remote 0001 note
  from Stage 02.1's report). Applying them is part of a future approved deployment.
- `ci.yml` remains unuploaded (PAT lacks Workflows permission) — unchanged carry-over.
- Alternatives/recommendations load peer details row-by-row (N+1) — acceptable at
  skeleton scale; batch before Stage 07's public pages.
- Real-browser checks do not apply (no UI changed); CLS/responsive unchanged from
  Stage 02, whose phone visual pass by the owner is still the open human check.

## 11. Git branch and commit information

- Branch: **`stage-03`** (local only), from `main` @ `1c1c078`.
- Code commit: **`e1e8ce5`** "stage-03: catalog & data foundation — D1 schema, DAL
  gates, API v1 skeleton, FTS5 search, RBAC + audit, S-01 verdict GO".
- This report is committed after it on the same branch.
- GitHub remote unchanged — `pushed_at` still 2026-11-08T21:37:19Z (Stage 02.1).
- Stage 00 documentation: 13/14 files byte-identical to the Stage 01 snapshot; the
  single exception is SYSTEM-ARCHITECTURE.md, changed ONLY by the S-01 verdict the
  roadmap's Stage 03 acceptance criteria explicitly require (4 insertions, 3 line
  edits: status flag, verdict paragraph, gate-table marker).

## 12. Confirmation that production was not deployed

No push, no `wrangler deploy`, no Cloudflare setting changed, no production D1
statement executed. Live site re-verified after the work: health 200 with all
bindings ok; `/api/v1/search` returns the Stage 02 app's 404 — the new API does
not exist in production. Local servers (preview/wrangler dev) were stopped.

## 13. Confirmation that FinanceBleu was untouched

0 files under `~/workspace/financebleu` changed during the Stage 03 window
(timestamp-marker check). No FinanceBleu operation of any kind was performed.

**Stage 04 has not been started.** Publication of Stage 03 (merge, upload, remote
migrations, deploy) requires the owner's separate approval, as with Stage 02.1.
