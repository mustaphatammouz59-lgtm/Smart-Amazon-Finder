# Stage 04.2 — Security Remediation & Route-Level Testing

**Project:** Smart Amazon Finder (internal codename)
**Date:** 2026-11-09
**Branch:** `stage-04.2` (from `stage-04` @ `3058183`; `main` @ `88ca4e5` untouched)
**Scope:** LOCAL ONLY. No push, no merge, no deploy, no remote D1, no connector use, no production contact of any kind.
**Input:** `REPORT-stage04.1-independent-audit-2026-11-09.md` — verdict C (NOT READY), 1 HIGH, 3 MEDIUM, 8 LOW, 5 INFO, 1 evidence limitation (E-1).

## Verdict: COMPLETE

Every §16 completion criterion is met: all HIGH and MEDIUM findings are fixed with regression tests; every LOW and INFO finding carries an explicit, evidence-backed disposition; the route-level suite and the workerd sweep now live in the repo and pass; all gates are green against the preserved 120-test baseline. Publication remains a separate, owner-approved step (the Access `/admin/*` extension and a fresh Time Travel bookmark are still owner prerequisites, unchanged from Stage 04.1).

---

## 1. Baseline confirmation (brief §3)

| Check | Expected | Actual |
|---|---|---|
| Starting branch / HEAD | `stage-04` @ `3058183` | ✔ confirmed before branching |
| `main` | `88ca4e5`, unchanged | ✔ still `88ca4e5` at the end of the stage |
| Working tree | clean except two untracked reports | ✔ confirmed |
| `REPORT-stage03.7-…md` SHA-256 | `68730897524f315ec153d7333fada72636ad399c7242a3e3fc80c6294b8a2b6f` | ✔ byte-identical at start and end |
| `REPORT-stage04.1-…md` SHA-256 | (from Stage 04.1 handoff) `381be36ac17e44221e607bb1d0c357400b983b24ccefde63f6617f5edfa52210` | ✔ byte-identical at start and end |
| Baseline gates | 120/120 tests, typecheck 0, lint clean, build PASS | ✔ independently re-run before any change: 120/120 |

## 2. Reproduction before remediation

Every confirmed defect was reproduced locally first (probe suite against the unmodified code), not fixed on faith:

- **F-01 (product):** fixture desk-riser publicly visible → `updateProduct(editorialSummary: '')` → live validation `failed`, stored flags still `published`/`passed`, product **still visible**; same after a specs wipe.
- **F-01 (offer):** validated licensed offer → `updateOffer(licenceStatus: 'expired')` → stored `validation_status` remained `passed`.
- **F-04/F-07:** DAL stored `destination_url = 'javascript:alert(1)'` with currency `U$D`; the public offers view served the `javascript:` URL for a never-validated offer.
- **F-09/F-10:** `stripHtml('supports < 10 kg loads')` → `'supports'`; `'&lt;img src=x onerror=alert(1)&gt;'` → stored literal `'<img src=x onerror=alert(1)>'`.
- **F-05:** origin matrix on the old guard — http scheme-downgrade **allowed**, port mismatch rejected, foreign rejected, absent allowed.
- **F-02/F-03/F-06/F-08:** reproduced by the Stage 04.1 auditor's probes (kept in `/tmp/probe041/`) and re-verified by code reading; the new regression suites re-prove each one against the fixed code and pin the boundaries.

## 3. Findings table

| Finding | Original Severity | Status | Fix | Regression Test |
|---|---|---|---|---|
| F-01 — validation_status never invalidated on edit | HIGH | **Fixed** | `invalidateProductValidation()` (`app/lib/db/admin.ts`): every successful gate-relevant write resets the product verdict to `pending` + `validated_at` NULL in the same step — `updateProduct`, `setProductSpecs`, `setProductAttributes`, media add/update/delete. Offers: `updateOffer` appends `validation_status='pending'` to the same UPDATE statement. FTS projection refreshed in the same step. | `tests/security/validation-invalidation.test.ts` (11 tests: full §4 lifecycle incl. FTS/detail/list invisibility, specs wipe, licence expiry, category change, attributes, media, rejected-mutation stability, offer lifecycle); HTTP lifecycle in `tests/routes/admin-api-flows.test.ts`; sweep checks `f01-invisible`, `f01-gate` |
| F-02 — future price_observed_at counts as fresh forever | MEDIUM | **Fixed** | One shared policy, `app/lib/price-policy.ts`: freshness is `0 ≤ now − observed ≤ 24 h`; future is never fresh. Consumed by public display, admin explanations, offer validation, and mirrored by the SQL search filter. Injectable clock in tests. | `tests/security/price-policy.test.ts` (47 tests: full §5 boundary matrix — exactly 24 h, +1 s, 1 s/1 h/30 d future, invalid, missing, UTC/ISO-Z/ISO-offset/SQLite forms) |
| F-03 — alternatives endpoint unbounded, no rate limit | MEDIUM | **Fixed** | DAL: peer scan capped (`ALTERNATIVES_PEER_SCAN_LIMIT = 48`, deterministic `ORDER BY id`) and each bucket capped (`ALTERNATIVES_PER_BUCKET = 12`) with early exit. Route: shares the existing public search rate-limit budget (same binding, same 60/min/IP — no new configuration), slug shape/length validated → malformed shapes get the same 404 as unknown products. | `tests/security/alternatives-bounds.test.ts` (3); route cases in `tests/routes/admin-api.test.ts` (200 bounded / 404 unknown / 404 malformed / 429 limiter) |
| F-04 — destination_url accepts any scheme, exposed regardless of validation | MEDIUM | **Fixed** | Centralized policy `app/lib/url-policy.ts`: HTTPS only; rejects javascript:/data:/file:/ftp:, embedded credentials, malformed values, localhost + private/reserved/link-local IP literals, non-443 ports; punycode + affiliate tracking parameters stay allowed. Enforced at: both offer zod schemas (400), the DAL create/update choke point (`invalid_destination`), offer validation, and public exposure (`destination_url` is non-null only for validation-`passed` offers whose URL passes the policy). `OfferView.destination_url` is now `string \| null`. | `tests/security/url-policy.test.ts` (38: accept/reject matrix incl. userinfo smuggling + cloud-metadata address, DAL enforcement, exposure gating, validation flagging) |
| LOW-01 (audit F-05) — origin guard scheme-blind, Host-trusting | LOW | **Fixed** | Guard compares the FULL origin (scheme+host+port) against `new URL(request.url).origin`; the Host header is never consulted. Absent-Origin allowance retained deliberately (non-browser clients authenticate by JWT, the primary control) and documented in code. | `tests/security/sanitize-origin.test.ts` (origin matrix incl. downgrade + spoofed Host); route matrix cross-origin cases |
| LOW-02 (audit F-06) — zero price displays / no sign check in policy | LOW | **Fixed** | Shared policy: price must be a positive integer — `0` → reason `no_price`, negative → `invalid_price`. Offer schemas `.min(0)` → `.positive()`; DAL rejects ≤ 0 and non-integers (`invalid_price`); offer validation errors on zero (`zero_price`). Null remains allowed (link-only model). | price-policy suite (sign matrix across all three JS surfaces); route test: zero price → 400 |
| LOW-03 (audit F-07) — currency validity only at schema layer | LOW | **Fixed** | DAL choke point normalizes (trim + uppercase) and rejects non-`[A-Z]{3}` (`invalid_currency`); the shared policy independently refuses to display invalid currencies (`invalid_currency` reason); the SQL price filter requires `currency GLOB '[A-Z][A-Z][A-Z]'`. | price-policy + url-policy suites (currency matrix, normalization storage proof, search-filter exclusion) |
| LOW-04 (audit F-08) — JS vs SQL freshness parsing disagreement | LOW | **Fixed** | The shared parser deliberately mirrors SQLite `julianday()` semantics — verified empirically against the same SQLite build the adapter and D1 run (shapes, range checks, arithmetic day/hour roll, colon-less-offset rejection, whitespace rejection). `normalizeObservedAt` routes through it, so stored values are canonical. Two parallel JS implementations eliminated (single `evaluatePriceDisplay`). | price-policy suite: 19-sample JS/SQL agreement matrix pinned via bound `julianday()` comparisons |
| LOW-05 (audit F-09) — sanitizer eats text after a lone `<` | LOW | **Fixed** | Only well-formed tags are stripped (tag name + closing `>` required; comments handled). `supports < 10 kg loads`, `made with <3 care` etc. survive verbatim. | sanitize-origin suite (5 preservation cases + 8 stripping cases) |
| LOW-06 (audit F-10) — sanitizer decodes entities after stripping | LOW | **Fixed** | Decode-then-strip, single decode (`&amp;` last): entity-encoded markup is decoded and then stripped as markup; double-encoded input still decodes exactly once into inert text (pre-existing test expectation preserved byte-for-byte). | sanitize-origin suite (encoded-markup cases, `&amp;lt;` single-decode case) |
| LOW-07 (audit F-11) — no CSP/HSTS | LOW | **Fixed** (compatibility posture, documented) | `workers/app.ts` now sends HSTS (`max-age=31536000; includeSubDomains`) and a CSP: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, same-origin connect/font, https images. Script/style keep `'unsafe-inline'` because React Router's SSR bootstrap inlines both and no nonce pipeline exists yet — stated honestly in the code comment; tightening to nonces is future work. | Sweep checks `headers-csp`, `headers-hsts` against the real workerd response |
| LOW-08 (audit F-12) — offers table lacks CHECK constraints | LOW | **Disposition: compensating enforcement — no migration** | A CHECK-constraint migration requires an offers table rebuild (SQLite cannot add CHECKs in place); the audit itself marked it "not required for this deploy". Instead, the invariants a CHECK would express are now enforced at EVERY write path — API schemas (400), DAL create/update (typed rejections for URL/currency/price), admin page via the same DAL — and re-checked at READ time by the shared policy (invalid stored values can never display or be exposed, proven with raw-SQL-seeded rows). Residual risk is limited to direct database writes outside the application, which no application-layer control can prevent anyway. | url-policy + price-policy suites (DAL rejection of every invalid field; seeded-invalid rows never display/expose) |
| INFO-01 (audit F-13) — publish-gate check non-atomic | INFO | **Fixed** | Publish is a conditional UPDATE (`… WHERE id = ? AND validation_status = 'passed'`); zero changed rows → `validation_gate`. A verdict invalidated between any read and the write can no longer be published. | validation-invalidation suite (post-read invalidation → publish refused, product stays draft) |
| INFO-02 (audit F-14) — revalidation didn't refresh the FTS projection | INFO | **Fixed** | `runProductValidation`, `invalidateProductValidation` and `transitionProductStatus` all call `reindexProduct` in the same step, so the projection follows verdicts and status immediately (visibility was already safe via the join re-check; this removes the staleness, not just the risk). | validation-invalidation suite asserts FTS search invisibility immediately after the invalidating edit, with no job run |
| INFO-03 (audit F-15) — `settings` RBAC area unused; merchants under `programs` | INFO | **Accepted — documented** | Naming/structure observation, no security effect: the `settings` area is fail-closed (owner-only if ever wired), and the merchants-under-`programs` grouping is consistent across routes, DAL and UI. No change made; renaming would be churn without a defect. | n/a (existing `tests/authz.test.ts` matrix continues to pin the RBAC table) |
| INFO-04 (audit F-16) — denied admin pages return HTTP 200 with a panel | INFO | **Accepted limitation** | Verified there is no data leak: the panel is a static sign-in notice; in production Cloudflare Access intercepts before the page loads at all, so the 200+panel shape is only reachable in local development or if Access were misconfigured (in which case the API layer still enforces JWT + RBAC on every data path). Changing RR document-status semantics for the layout loader was judged riskier than the cosmetic issue. | Sweep check `admin-page-denied` (200 + panel, and `admin-anon` proves the API returns 401 for data) |
| INFO-05 (audit F-17) — minors bundle | INFO | **Partially fixed; remainder accepted with reasons** | Fixed: (a) role name no longer echoed in the FORBIDDEN message; (b) content creation maps only UNIQUE/constraint errors to the 409 slug conflict — other insert errors propagate instead of being disguised; (c) an empty media PATCH writes no audit row; (d) Access issuer loopback allowance is an exact-host check (`127.0.0.1.evil.com` no longer matches). Accepted: (e) media size cap checked after buffering — bounded by the declared-size pre-check (`file.size` is rejected before the body is read) plus the platform's multipart limits; true streaming caps are a platform feature, not app code; (f) program `link_template` protocols unrestricted — templates are never fetched server-side and render as text; the outbound policy governs actual destinations; (g) lone-surrogate pass-through — inert in JSON/React rendering; bidi controls (the exploitable half of this item) ARE now stripped by the sanitizer. | flows suite (empty-PATCH audit case); sanitize suite (bidi cases); access suite (existing JWT suite re-run green) |

## 4. F-01 invalidation strategy (detail)

**Rule:** a stored validation verdict is a statement about specific data; any successful write to that data voids the statement in the same step.

- **Products** — one shared helper, `invalidateProductValidation` (`app/lib/db/admin.ts`), called by: `updateProduct` (name, model ref, summary, category, brand, licence), `setProductSpecs` (full replace semantics — validation reads spec presence), `setProductAttributes` (uniform rule for product-owned collections), `addProductMedia` / `updateMedia` (non-empty patches) / `deleteMediaRow` (media rows are licence-bearing). It sets `validation_status='pending'`, clears `validated_at`, and refreshes the FTS projection.
- **Deliberately not invalidated:** `setPrimaryMedia` (pure ordering — no validation input changes; pinned by a regression test); product variants create/delete (the validation engine never reads variants — inspected, not relevant); taxonomy edits (category/brand/definition names and labels are not validation inputs, definitions' key/value_type are immutable after creation, and deletes of in-use taxonomy rows are dependency-blocked, so no taxonomy write can change a live verdict); status transitions themselves (they are the gate's own control).
- **Offers** — `updateOffer` appends `validation_status='pending'` to the same UPDATE, so the reset is atomic with the edit by construction. `createOffer` starts at the schema default `pending`.
- **Failure semantics:** rejected writes (type mismatch, unknown category/brand/program, invalid URL/currency/price, duplicate) return before any mutation and invalidate nothing — pinned by tests on both the product and offer sides.
- **Background jobs:** the queue consumers that could touch this data are contract no-ops at this stage (`validate`, `refresh-offers` in `workers/app.ts`); the only implemented job, `reindex-search`, only rewrites the FTS projection from current rows. No background path can resurrect a verdict.

## 5. Shared price policy (detail)

`app/lib/price-policy.ts` is the single implementation: `parsePriceTimestamp` (SQLite-mirroring strict parser), `isPriceFresh` (`0 ≤ age ≤ 24 h`), `isValidCurrencyCode` / `normalizeCurrencyCode`, and `evaluatePriceDisplay` returning a reason from a now-richer set (`displayable`, `no_price`, `invalid_price`, `unlicensed`, `unvalidated`, `invalid_currency`, `invalid_timestamp`, `future_timestamp`, `stale`). Consumers: `applyPricePolicy` (public), `priceDisplayReason` (admin), `validateOffer` (validation errors for future/unparseable observations), and `freshnessSqlCondition` + currency/positivity predicates in the SQL search filter. Agreement between the JS and SQL engines is pinned by a 19-sample matrix; exact-boundary assertions run on the JS side with an injected clock (SQL `julianday()` float arithmetic against a live clock cannot promise millisecond boundary equality — a pre-existing property of the platform, documented in the test file).

## 6. Route-level testing (brief §8)

New harness (all local, no new dependencies):

- `tests/helpers/cloudflare-workers.ts` — stub for the `cloudflare:workers` module, aliased in `vitest.config.ts`; per-suite mutable env with the sqlite D1 adapter, controllable rate-limiter stubs, in-memory R2, queue stub.
- `tests/helpers/jwks-server.ts` — a real local HTTP JWKS server on 127.0.0.1 with an ephemeral RS256 keypair; route tests therefore exercise the production verifier end-to-end (real signatures, real JWKS fetch) with zero production credentials.
- `tests/helpers/route-harness.ts` — admin-user seeding (owner fixture + admin/editor/publisher/viewer), request/invoke helpers, error-envelope assertions.

Suites:

- `tests/routes/admin-api.test.ts` (32 tests) — the full 10-case matrix (no auth 401, garbage JWT 401, unknown-email JWT 401, insufficient role 403, foreign origin 403, http-downgrade origin 403, missing Origin allowed-with-JWT, malformed body 400, oversized body 413, schema violation 400, valid 201 + DB effect + audit row) on product create and offer create; reduced matrix + behavior checks on overview, product list/PATCH/publish/validate, category PATCH, brand PATCH, offer PATCH, offers list, audit log; alternatives endpoint (200 bounded / 404 / 404 malformed / 429).
- `tests/routes/admin-api-flows.test.ts` (8 tests) — the F-01 lifecycle driven entirely through route modules (create → specs → validate → publish → public 200 → edit → public 404 → republish 409); media upload/content round-trip incl. magic-byte rejection and anonymous 401s; editorial status RBAC (editor transitions, editor cannot publish, viewer cannot transition).

Expected-vs-actual: every case above matched its expected status on the first full run; the matrix is documented in the suite header.

## 7. Workerd sweep (preserved in-repo)

- **Script:** `scripts/workerd-sweep.mjs`, run with **`npm run test:sweep`**.
- **Method:** builds the Worker (`npm run build` — sweeping an unbuilt tree would test stale code; this was proven in practice during this stage, see §9), applies migrations 0001–0005 + catalog seeds + sweep-only admins/merchant to a throwaway LOCAL D1 in a temp persist dir, boots `wrangler dev` with the Access team domain pointed at a local JWKS server and an ephemeral keypair, then runs 23 real-HTTP checks. Local state only; zero production credentials or services; non-zero exit on any failure; results written to `tests/workerd/sweep-results.json` (committed).
- **Safety rails in the script:** it refuses to start if the sweep port is already serving (a crashed predecessor) or if a `.dev.vars.sweep-backup` exists; it kills the whole wrangler process GROUP on exit (killing only the npx wrapper orphans workerd); the repo's `.dev.vars` is renamed aside for the run and restored byte-identical afterwards (verified by SHA-256 in this stage's runs).
- **Result this stage: 23/23 PASS** — including CSP/HSTS actually served, the F-01 lifecycle over real HTTP (publish → public 200 → invalidating edit → public 404 → republish 409), the F-04 `javascript:` offer refused with 400, the full RBAC/auth/origin matrix spot checks, and the media round-trip.

## 8. Final gates vs baseline

| Gate | Baseline (Stage 04) | Stage 04.2 |
|---|---|---|
| Tests | 120 passed / 16 files | **281 passed / 23 files** (120 baseline preserved + 161 new) |
| Typecheck | 0 errors | **0 errors** |
| Lint | clean | **clean** |
| Build | PASS | **PASS** |
| Workerd sweep | script not in repo (E-1) | **23/23 PASS**, script + results committed |

New tests by file: `tests/security/price-policy.test.ts` 47, `tests/security/url-policy.test.ts` 38, `tests/routes/admin-api.test.ts` 32, `tests/security/sanitize-origin.test.ts` 22, `tests/security/validation-invalidation.test.ts` 11, `tests/routes/admin-api-flows.test.ts` 8, `tests/security/alternatives-bounds.test.ts` 3. Total new: **161**.

**Existing-test changes:** exactly one pre-existing test was adapted — `tests/admin-commerce.test.ts` "flags non-https destinations in validation and rejects duplicates". Its setup created the insecure offer through the DAL, which is precisely the write F-04 now forbids; the insecure row is now seeded directly (the only way such a row can exist post-fix), the original validation assertion is unchanged, and a new assertion pins the DAL rejection. No test was deleted or weakened; `vitest.config.ts` gained only the additive `cloudflare:workers` test alias.

## 9. Process findings worth recording

- The sweep's first run appeared to show the OLD code (no CSP, F-04 absent): `wrangler dev` serves the built Worker, and the tree's `build/` output predated the fixes. The sweep now builds first — future sweeps cannot silently test stale code.
- A crashed sweep run left an orphaned workerd holding the port, which then answered the next run's checks with a different JWKS configuration (401s). The script now pre-flights the port and kills its process group; both failure modes are guarded in the committed script.

## 10. Migrations

**None.** No finding required a schema change: LOW-08 is dispositioned as compensating enforcement (see the findings table), and every other fix is application-layer. Nothing was applied anywhere; the armed Builds migration command and production D1 were not touched.

## 11. Final security self-review (brief §13)

- ☑ No stale validation: every gate-relevant write path invalidates in-step (§4); rejected writes provably change nothing.
- ☑ No future price: shared policy + SQL mirror + validation errors; boundary matrix pinned.
- ☑ Bounded alternatives: scan cap, bucket caps, rate limit, input validation.
- ☑ No unsafe public links: URL policy at schema, DAL, validation and read-exposure layers.
- ☑ No weakened controls: origin guard strengthened; sanitizer strengthened; CSP/HSTS added; RBAC/JWT/rate-limit code paths re-verified by the route matrix (401/403/429 all live). The two deliberate allowances (absent Origin, missing rate-limit binding) are pre-existing documented design, unchanged.
- ☑ No secrets added: all test/sweep credentials are ephemeral or `*.example.invalid`; a diff scan for account identifiers, team domains and credential material found nothing.
- ☑ Production untouched: no push/merge/deploy/remote command was run; connectors were not used; `.dev.vars` verified byte-identical after sweep runs (rename aside/restore).

## 12. Known limitations

- The ADMIN rate limiter's runtime 429 behavior under real Cloudflare bindings remains unverified against production (unchanged from Stage 03.7 — it requires an authenticated production session; the limiter logic and stub-level behavior are covered).
- CSP ships in the documented compatibility posture (`'unsafe-inline'` for script/style) until a nonce pipeline exists.
- Route tests invoke loaders/actions directly with runtime-shaped args rather than through a network socket; the workerd sweep covers the true HTTP path for the critical flows, and the two layers agree on every shared case.
- An expired-but-genuine Access JWT replay remains untestable locally (cannot be minted for the production Access application) — unchanged from Stage 03.7.

## 13. Production-safety confirmations

- `main` still at `88ca4e5`; `stage-04` still at `3058183`; all work is on `stage-04.2` (4 commits: fixes, suites + sweep, this report, and the suite-proven parser/IPv6 corrections).
- Both untracked audit reports are byte-identical to their Stage 04.1 state (SHA-256 in §1).
- No connector calls (no gh.py / cf.py), no `--remote`, no Access/secret/queue/R2 changes, no production data read or written.
- FinanceBleu, CalcBlue and everything outside this repo: untouched.

## 14. Files changed

**New:** `app/lib/price-policy.ts`, `app/lib/url-policy.ts`, `tests/security/{price-policy,validation-invalidation,url-policy,sanitize-origin,alternatives-bounds}.test.ts`, `tests/routes/{admin-api,admin-api-flows}.test.ts`, `tests/helpers/{cloudflare-workers,jwks-server,route-harness}.ts`, `scripts/workerd-sweep.mjs`, `tests/workerd/sweep-results.json`, this report.
**Modified:** `app/lib/db/{offers,search,admin,admin-products,admin-media,admin-commerce,admin-content,catalog,types}.ts`, `app/lib/{offer-validation,product-validation,origin,sanitize,access,auth}.ts`, `app/routes/{api.admin.offers,api.admin.offer,api.v1.product-alternatives}.ts`, `app/routes/admin/offers.tsx`, `workers/app.ts`, `tests/admin-commerce.test.ts` (documented adaptation, §8), `vitest.config.ts` (test alias), `package.json` (`test:sweep` script).
