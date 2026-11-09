# Stage 04 — Professional Admin Dashboard — Completion Report

**Date:** 2026-11-09 · **Mode:** LOCAL DEVELOPMENT ONLY · **Branch:** `stage-04` (from `main` @ `88ca4e5`)
**Production contact:** NONE. No merge, no push, no GitHub connector, no Cloudflare API, no
`wrangler deploy`, no remote D1 command was run at any point in this stage. The untracked
`REPORT-stage03.7-security-verification-2026-11-09.md` was left completely untouched.

---

## 1. Executive summary

Stage 04 turns the Stage-03 admin API skeleton into a complete, professional admin
dashboard: 13 modules (A–M plus the sources viewer) implemented as DAL modules + 44 admin
API routes + a guarded 16-page admin UI under `/admin/*`. The two hard invariants of the
project are enforced in depth and proven by tests and a live workerd sweep:

- **Publish gate:** a product can reach `published` only with `validation_status='passed'`,
  in the DAL, via API and via UI alike; a published product that fails re-validation
  disappears from public queries immediately.
- **Price policy:** a price is displayable only when licensed + validation-passed +
  observed ≤ 24 h ago; every admin surface shows the exact reason a price is hidden.

**Verification headline:** 120/120 tests pass (76 pre-existing + 44 new), typecheck
0 errors, ESLint clean, production build succeeds, and a 51-check workerd smoke sweep
(local D1 + local JWKS + minted test JWT) passes 51/51 — including the full
create → specs → validate → publish → publicly-visible lifecycle, the 409 gate refusal
for a bare product, cross-origin mutation refusals, and a media upload/serve round trip.

## 2. Audit (brief §2)

**Pre-existing state (verified by reading, not assumed).** Stage 03 provided: Access JWT
RS256 verification (`app/lib/access.ts`, fail-closed), `requireAdmin` + `ADMIN_RBAC`
(areas incl. `programs`, `sources`, `analytics`), the §8 error envelope, native rate
limits (SEARCH 60/min, ADMIN 120/min), a 16 KB body cap, three admin endpoints
(overview, product create/list, publish), the DAL in `app/lib/db/*` as the only data
path, 26 tables across migrations 0001–0004, and 76 passing tests. Baseline gates were
re-run on `stage-04` before any change: 76/76 tests, lint clean.

**Documentation gaps found in the Stage-00 docs audit and how Stage 04 resolved them:**

| Gap | Resolution |
|---|---|
| #24 — nobody was assigned to set `validation_status` for manual entry | New deterministic validation engine + explicit "run validation" action (§6) |
| #9 — API §7 validate job must record pass/fail "with reasons", no storage existed | Reasons are computed deterministically on demand from live data (always current, nothing to go stale); status + `validated_at` persist on run. No new table needed |
| #7 — `buying_guides` had no body column | Migration 0005 adds `body_blocks` (§5) |
| #15 — guides/articles had no SEO override columns | Migration 0005 adds `meta_title`/`meta_description` to both |
| #12 — `affiliate_programs` lacked the terms-check date + notes MON §4 requires | Migration 0005 adds `terms_checked_at`/`notes` |
| #20 — staging review decisions (approve/reject) have no storage | Sources module ships read-only; decisions deferred to the Stage-06 design (§11) |
| #11 — `users` has no status column, so "suspend" cannot be represented | User suspend NOT IMPLEMENTED, stated openly in UI and §12 |
| Programs role conflict (API §6 vs SEC §3) | Kept the implemented RBAC matrix (no silent change); program template/status edits are audit-marked high-severity |
| CMS path conflict (API §6 vs SYS §4-K) | API §6 paths implemented (`/api/admin/articles`, `/api/admin/guides`) |

**Bugs found by Stage-04 testing and fixed in this stage:**

1. `setPrimaryMedia` used `db.batch`, which the codebase's DAL pattern (and test adapter)
   does not support → sequential updates.
2. Offer `price_observed_at` writes accepted ISO strings, but the price policy parses
   `value + 'Z'`, which yields NaN for ISO input — every UI-entered observation would
   have read as permanently stale. Writes now normalize to SQLite datetime format in the
   DAL (`normalizeObservedAt`).
3. The two pre-existing mutation routes (product create, product publish) predated the
   new origin guard → `assertSameOrigin` added to both; a sweep over all 34 admin
   mutation route files confirms every one now carries it.
4. `setProductAttributes` accepted arbitrary keys at DAL level → slug-shape enforced in
   the DAL (route already zod-validated), with the new reason mapped to a 400.

## 3. Architecture and integration

- **DAL-only data access.** Every new query lives in `app/lib/db/admin-*.ts`
  (taxonomy, products, commerce, content, media, system, dashboard). Pages and routes
  contain no SQL. Public queries were not modified; their hard-coded
  `status='published' AND validation_status='passed'` gate is untouched.
- **Guard pipeline (every admin API mutation):** `requireAdmin` (verified JWT → admin
  row → RBAC) → ADMIN rate limit → `assertSameOrigin` → body parse (size-capped) → zod →
  DAL → audit. Loaders follow the same order minus mutation-only steps.
- **Admin UI guard:** pages call `adminContext()` (`app/lib/admin-page.ts`), which runs
  the same `requireAdmin` in the loader/action and returns a professional denied panel
  (401 sign-in-required / 403 not-authorized) instead of throwing into the public error
  boundary. `root.tsx` renders `/admin/*` without public header/footer; the admin layout
  supplies its own chrome plus an environment band (LOCAL vs PRODUCTION).
- **No auth backdoors.** Nothing in shipped code bypasses verification; tests use the
  existing JWT-helper/verifier-injection patterns and a locally minted test token only.
- **Envelope consistency:** list endpoints return `{ data: items, nextCursor }`; errors
  are the §8 envelope everywhere.

## 4. Migration 0005 (the single permitted additive migration)

`migrations/0005_editorial_and_programs.sql` — seven `ALTER TABLE … ADD COLUMN`
statements, all nullable, no defaults that rewrite rows, no destructive change:

- `buying_guides.body_blocks`, `buying_guides.meta_title`, `buying_guides.meta_description`
- `articles.meta_title`, `articles.meta_description`
- `affiliate_programs.terms_checked_at`, `affiliate_programs.notes`

Justification: doc gaps #7, #12, #15 (§2). Applied and verified locally only; the
deployment procedure is the armed Builds command already in place (§15).

## 5. Module A — Overview dashboard · COMPLETE

`GET /api/admin/overview` is unchanged (contract safety). The dashboard page consumes a
new DAL aggregate (`getAdminDashboard`): 16 live counts (products by status and by
validation state, categories, brands, merchants, offers, media, guides, articles, admin
users), offers-with-hidden-prices count computed through the real price policy, per-source
freshness, the 10 most recent validation failures, and the 10 latest audit entries. All
numbers are database counts — no estimates, no charts. Empty states are honest (a fresh
install shows the "No products yet" state with real zeros).

## 6. Modules B + C — Products and the validation center · COMPLETE

**Products.** Full lifecycle in API + UI: list with search/status/validation/category/
brand filters and cursor pagination; create-draft; edit (name, model, summary, category,
brand, licence); typed specification editor (values validated against each definition's
`value_type` before any write — a failed batch mutates nothing); editorial attributes
(replace-all, slug keys); variants (create/list/delete, duplicate conflict); archive
(never delete — no product deletion path exists anywhere); status transitions
(draft ⇄ in_review, → archived, unpublish to draft) with search reindex + audit on
visibility changes. The product detail page brings it together: publish checklist panel,
specs/attributes/variants editors, media manager, offers panel with price reasons, and
the product's audit history.

**Validation engine** (`app/lib/product-validation.ts`). Deterministic, computed from
live rows. ERRORS (block `passed`): name < 3 chars, invalid slug, missing category,
licence expired, empty editorial summary, no spec values. WARNINGS: no brand, licence
restricted, no media, no offers. Issue codes: `name_too_short`, `invalid_slug`,
`missing_category`, `licence_expired`, `missing_summary`, `missing_specs`,
`missing_brand`, `licence_restricted`, `missing_media`, `missing_offers`. "Run
validation" persists status + `validated_at` and audits `product.validate` with counts.
The `/admin/validation` page lists failed and pending products with their current error
lists and per-product run buttons. Indexability (SEO §6) is computed separately and
shown as information only — the publish gate is validation, exactly as designed.

## 7. Modules D + E — Categories, brands, attribute definitions · COMPLETE

Hierarchical categories (parent-cycle detection walks ancestors with a visited set),
brands, and per-category attribute definitions — full CRUD in API + UI with
**dependency protection**: deletes are refused with exact counts while products,
children, definitions, guides (categories), products (brands), or spec rows (definitions)
reference the row; the UI disables those delete buttons with the same counts explained.
Definition keys and value types are immutable after creation (changing them would
corrupt stored spec values); definitions are administered under the `categories` RBAC
area. All list endpoints paginate by cursor.

## 8. Module F — Merchants and affiliate programs · COMPLETE

Merchants and programs CRUD (merchants administered under the `programs` RBAC area — no
separate merchant area exists). Programs carry link templates with the `{destination}`
placeholder, tracking parameters, terms URL, status, and the new `terms_checked_at` /
`notes` fields. A test-link action renders a sample link from the stored template
without storing or activating anything. Link-template and status changes are written to
the audit log marked `severity: 'high'` inside the after-snapshot. Deletes are refused
while offers reference the merchant/program. **Honesty note:** recording a program's
status here never activates outbound linking — affiliate link production remains the
affiliate module's job, and the UI says so.

## 9. Module G — Offers and the price policy · COMPLETE

Offer CRUD with duplicate detection on (product, variant, merchant), an offer validation
engine (`invalid_url` for non-HTTPS destinations, `price_unlicensed` for prices stored
under a non-licensed status, `price_without_observed_at`, `negative_price`,
`invalid_currency`, missing merchant/product; warnings for no-price, unknown
availability, inactive program), and a refresh action that queues the `refresh-offers`
job and audits it (the consumer is a contract no-op until Stage 06, and the UI flash
says exactly that). `priceDisplayReason` implements the policy ladder with the same
precedence and 24 h parse as the public `applyPricePolicy`: `no_price` → `unlicensed` →
`unvalidated` → `stale` → `displayable`. Deleting an offer with price history is refused
(the history is the audit trail for prices). Fixture behavior proves the policy end to
end: the restricted licence hides one price as `unlicensed`, the 2-day-old observation
hides the other as `stale`.

## 10. Module H — Media library (R2) · COMPLETE

Upload pipeline: RBAC + origin guard → size cap (5 MiB) → **magic-byte sniffing**
(JPEG/PNG/WebP/GIF; extensions and user filenames are never trusted) → storage key
`products/<productId>/<uuid>.<ext>` (no user-controlled path parts) → R2 put via the
MEDIA binding → `product_media` row + audit. If the row insert fails, the stored object
is deleted again (no orphans). Alt text, licence status and expiry are editable; setting
a primary image renumbers `sort_order` 0..n−1; delete removes the R2 object and the row.
Admin previews stream through a guarded `GET /api/admin/media/:id/content` (401 without
a valid token — verified in the sweep).

## 11. Module I — Sources and staging · PARTIAL

Read-only staging viewer: filtered list (payload bodies deliberately excluded) and a
detail view showing the stored normalised/licence JSON exactly as stored. **Why
partial:** import adapters and promotion are Stage 06 by design, and approve/reject
decisions have no storage in the current schema (gap #20) — inventing buttons that
cannot persist anything would violate the no-placeholder rule, so the screen explains
its read-only nature instead.

## 12. Modules J–M — Content, audit, users, system · J COMPLETE · K COMPLETE · L COMPLETE (scoped) · M PARTIAL

**J — Editorial content (articles + buying guides).** Structured blocks only
(`heading | paragraph | list | disclosure | quote`), sanitized server-side by an
in-repo allowlist-style stripper (no new dependency): all markup is removed, entities
decode exactly once, blocks are capped (200 blocks / 20 000 chars). The DATA §7.3
publish checklist is enforced in the DAL: title non-empty, body non-empty, a disclosure
block present, and **no typed prices** anywhere in the text (regex-detected, e.g.
`$49.99`, `120 USD`). `published_at` is stamped on publish and cleared on return to
draft; audit snapshots store `{ blocks: n }`, never body text. The editor UI includes a
block editor and a live checklist panel.

**K — Audit logs.** Filterable (entity type, action, actor, cursor) read view over the
append-only log. There is deliberately **no** mutation path: the system DAL exports no
update/delete for audit records (asserted by test), and the UI states the append-only
rule.

**L — Admin users, RBAC, registered users.** Administrators list (from `admin_users`),
the full RBAC matrix rendered from `ADMIN_RBAC` itself, and a registered-users list
whose query never selects `password_hash` (asserted by test). Read-only by design:
provisioning happens through Cloudflare Access + owner seeding, so no self-elevation
path exists. **Suspend is NOT IMPLEMENTED** — the `users` table has no status column
(gap #11); the UI shows real account state (active/deleted via `deleted_at`) instead of
pretending.

**M — System status + analytics.** System page: live D1 probe (real `SELECT 1`),
binding presence for KV/R2/Queue/both rate limiters with the explicit caveat that
presence-only checks cannot prove runtime health, foundation metadata, and the honest
queue note (depth/DLQ contents are not exposed by the Workers runtime — no invented
numbers). **Analytics is PARTIAL:** affiliate-click totals and the `analytics_daily`
table are real, but rollups are produced by a job that lands in Stage 13, so the page
shows the prescribed empty state until then.

## 13. Security review

- **Identity** comes only from cryptographically verified Access JWT claims
  (`requireAdmin`); a plaintext email header is never trusted (a mismatched header is
  rejected by the Stage-03 guard, unchanged).
- **RBAC** on every admin operation, API and UI loaders/actions alike (area + action).
- **Origin guard** on every browser-triggered admin mutation (34/34 route files
  verified), unit-tested and sweep-tested (cross-origin create and publish → 403).
- **Publish gate + price policy** are DAL-level, so no client can bypass them
  (sweep: bare product publish → 409; typed-price article publish → 409).
- **Injection resistance:** all DAL access is parameterized; LIKE filters escape
  `% _ \` with an explicit `ESCAPE` clause; zod validates every payload; editorial
  content is sanitized on save; media types are sniffed, never named.
- **Audit:** every sensitive mutation writes an append-only audit row (actor, action,
  entity, before/after); audit records are immutable through the API.
- **No secrets** in any file: the sweep used an ephemeral local keypair and a test
  audience value; `.dev.vars` was restored byte-identical afterwards (verified with
  `cmp`), and the production Access configuration was never read or changed.

## 14. Testing and verification (all executed, nothing claimed unrun)

| Gate | Result |
|---|---|
| Unit/integration tests (`npm test`) | **120/120 pass** (16 files): 76 pre-existing + **44 new** in 6 Stage-04 suites — products/validation/gate incl. public-exclusion regression, taxonomy dependency protection + cycle, commerce price-policy ladder + sample links + sources payload hygiene, content sanitize/checklist/workflow, media sniffing/lifecycle, system audit filters/immutability/users/dashboard aggregates/origin guard |
| Typecheck (`npm run typecheck`) | **0 errors** (strict TS; generated worker types unchanged) |
| Lint (`npm run lint`) | **Clean** |
| Production build (`npm run build`) | **Succeeds** (164 modules) |
| Workerd smoke sweep | **51/51 checks pass** — `wrangler dev` + local D1 (migrations 0001–0005 + seeds + dev fixtures) + local JWKS server + minted owner JWT: public pages + health unregressed; `/admin/*` unauthenticated → denied panel; admin API unauthenticated → 401; all 13 admin pages render with token; create → specs → validate (passed) → publish → public API 200; bare product publish → 409 and public 404; cross-origin create/publish → 403; PNG upload → 201, content serve 200 `image/png`, unauthenticated content → 401, text-file upload → 400; audit shows `product.create`; typed-price article publish → 409 |

**Not run / not claimed:** browser-based visual QA (no browser in this environment) —
pages are server-rendered and were verified over HTTP; layout/visual polish on a real
phone remains an owner check after deployment, as in prior stages.

## 15. Deployment prerequisites (owner actions — nothing here was done)

1. **Extend the Cloudflare Access application to `/admin/*`** (it currently covers only
   `api/admin/*`) before or together with deploying this stage, so the dashboard pages
   get the same edge protection as the API. The in-app JWT guard already enforces
   authentication on every loader/action either way.
2. **Migration 0005** applies through the already-armed Builds deploy command
   (`npx wrangler d1 migrations apply DB --remote && npx wrangler deploy`) on the next
   push, exactly as in Stage 03.6; it is additive/nullable and backward compatible.
   A pre-deploy D1 export remains the standing recommendation.
3. Carried over, unchanged: `ADMIN_RATE_LIMITER` runtime 429 is still NOT VERIFIED
   (Stage 03.7 OBS-1, needs an authenticated 120-request burst in production);
   `.github/workflows/ci.yml` still cannot be uploaded (PAT lacks Workflows
   permission); the mail-provider decision for public accounts is still open.

## Acceptance criteria

| Requirement | Status | Verification | Evidence | Limitation |
|---|---|---|---|---|
| Audit first; findings documented | COMPLETE | Code/doc read-through; baseline gates re-run | §2 of this report | — |
| A — Overview dashboard with real counts | COMPLETE | Unit (dashboard aggregates vs fixtures) + sweep (page renders, counts) | `admin-dashboard.ts`, `overview.tsx` | Counts only; no charts (by design — no invented metrics) |
| B — Product management | COMPLETE | Unit (CRUD, specs typing, attributes, variants) + sweep lifecycle | `admin-products.ts`, product pages | — |
| C — Validation center + publish gate | COMPLETE | Unit (each rule; gate; published-but-failed public exclusion) + sweep (409 gate, public 404) | `product-validation.ts`, `validation.tsx` | Reasons computed on demand, not snapshotted (deliberate, §2 #9) |
| D — Categories & brands with dependency protection | COMPLETE | Unit (in-use refusals with counts, cycle) + sweep (pages 200) | `admin-taxonomy.ts` | — |
| E — Attribute definitions | COMPLETE | Unit (dup key, delete blocked by specs) | `admin-taxonomy.ts`, `attributes.tsx` | Keys/value types immutable (documented in UI) |
| F — Merchants & programs | COMPLETE | Unit (sample link, high-severity audit, in-use delete) | `admin-commerce.ts`, `merchants.tsx` | Program status is a record, never auto-activates links |
| G — Offers + price policy with admin-visible reasons | COMPLETE | Unit (full reason ladder) + sweep (fixture reasons verified at DAL level) | `offer-validation.ts`, `admin-commerce.ts` | Refresh consumer is a Stage-06 no-op (disclosed in UI) |
| H — Media via R2, sniffed, capped, audited | COMPLETE | Unit (magic bytes accept/reject, key shape, lifecycle) + sweep (upload/serve/401/400) | `media.ts`, `admin-media.ts` | Images only in this stage |
| I — Sources & staging | PARTIAL | Unit (list hides payloads, detail shows them) + sweep | `admin-commerce.ts` sources, `sources.tsx` | Read-only: decisions have no storage (gap #20); import/promote = Stage 06 |
| J — Editorial content with checklist + sanitizer | COMPLETE | Unit (XSS payloads stripped, typed price/disclosure block publish, `published_at`) + sweep (409) | `sanitize.ts`, `admin-content.ts` | 256 KB body cap on content PATCH (16 KB elsewhere) — documented |
| K — Audit log viewer, immutable records | COMPLETE | Unit (filters; no mutation exports) + sweep | `admin-system.ts`, `audit.tsx` | — |
| L — Admin users / RBAC / registered users | COMPLETE (scoped) | Unit (admins listed; `password_hash` never selected) | `admin-system.ts`, `users.tsx` | Suspend NOT IMPLEMENTED (no status column, gap #11); provisioning read-only by design |
| M — System status + analytics | PARTIAL | Unit (presence-only status, empty analytics) + sweep (d1 ok) | `admin-system.ts`, `system.tsx` | Queue depth not exposed by runtime; analytics rollups = Stage 13 |
| Identity only from verified JWT; RBAC everywhere | COMPLETE | Existing JWT suite (13 cases) + sweep 401s + denied panels | `access.ts`, `auth.ts`, `admin-page.ts` | Expired-genuine-JWT replay remains NOT VERIFIED (03.7 carry-over) |
| Origin check on admin mutations | COMPLETE | Unit + sweep (403 create + publish) + 34/34 route files grep-verified | `origin.ts` | Absent-Origin (non-browser) requests allowed by design |
| No fake data / no placeholder buttons | COMPLETE | Code review + honest empty states in every module | All admin pages | — |
| One additive migration max, local only | COMPLETE | 0005 = 7 nullable ADD COLUMNs; applied locally only | §4 | Deployment is an owner step (§15) |
| Local-only stage; production untouched | COMPLETE | No remote command of any kind was executed | Git log on `stage-04`; this report | — |

**Known limitations (summary):** sources are read-only until Stage 06; user suspend is
not implementable on the current schema; analytics awaits Stage-13 rollups; queue depth
is not observable from Workers; per-colo rate-limit counters remain a documented
platform limitation; ADMIN_RATE_LIMITER runtime behavior and expired-JWT replay remain
NOT VERIFIED from Stage 03.7.
