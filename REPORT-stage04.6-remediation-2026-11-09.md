# Stage 04.6 — Product Publication Atomicity & Security Regression Closure

**Project:** Smart Amazon Finder (internal codename)
**Date:** 2026-11-09
**Scope:** exactly the two findings of the independent Stage 04.5 audit — **04.5-F1** (product publication atomicity gap, LOW confirmed) and **04.5-F2** (NF-2 guard test coverage 5/22 + missing NF-3 route-level test, LOW confirmed). No redesign, no unrelated features or refactoring, no Stage 05 work. **Local development only; no deployment is authorized or claimed by this report.**

---

## 1. Executive summary

Both Stage 04.5 findings are closed, with durable committed evidence:

- **F1 — FIXED.** Every product mutation path the audit found multi-statement now applies its data write and its validation-verdict reset in **one atomic unit**: the same `UPDATE` statement for product fields (the construction `updateOffer` has used since Stage 04.2), and **one D1 batch — a single transaction** — for specifications, attributes, and all three media row operations. A statement-boundary monitor proves no observable state pairs changed data with the stale `passed` verdict, and batch-failure injection proves a failed mutation applies neither the change nor the reset. The R2↔D1 ordering at both call sites (API routes and the admin page) now follows the brief's §5.4 contract: upload first with best-effort cleanup on D1 failure; object deletion only **after** the D1 row delete commits (reversed from Stage 04).
- **F2 — FIXED.** All **17** previously uncovered NF-2 commit-guard conditions now have a durable interleaving test each, derived from the 04.5 §4.4 removal matrix — and every one of the 17 was **mutation-verified**: removing exactly that condition (plus its bind) on a disposable copy fails exactly that test and no other. The missing NF-3 route-level test is added for **both** routes (`invalid_observed_at` → HTTP 400, no row, no audit).

**Totals:** 384 tests passing across 30 files (the 347-test Stage 04.5 baseline preserved exactly — zero pre-existing test files modified — plus 37 new), typecheck 0 errors, ESLint clean, production build PASS, workerd sweep 23/23 against real D1. **No migration was created, modified, or needed.** No push, merge, deploy, remote command, or production access of any kind occurred.

## 2. Initial repository state and base SHA

| Item | Expected | Observed |
|---|---|---|
| Repository | `~/workspace/smart-amazon-finder` | ✔ |
| Starting branch / HEAD | `stage-04.4` @ `49a4163b65d0b7a4322fb3449fe52f041de8323e` | ✔ exact |
| `main` | `88ca4e5` | ✔ `88ca4e56d5edc626de1149b493ad4280ea3728e7` |
| `stage-04` | `3058183` | ✔ `30581836fbfdcbe2de01fe716bfe43c65eeb740b` |
| `stage-04.2` | `ac46b77` | ✔ `ac46b7793b7b8e0d320f8c0be8e697335cb48137` |
| Working tree at start | clean except 4 untracked reports | ✔ exactly the 03.7 / 04.1 / 04.3 / 04.5 reports |
| Baseline gates (re-run before changes) | 347 tests / sweep 23/23 / typecheck 0 / lint clean / build PASS | ✔ 347/347 on the new branch before any edit |

**Protected reports — SHA-256 identical at stage start and stage end:**

| Report | SHA-256 |
|---|---|
| 03.7 | `68730897524f315ec153d7333fada72636ad399c7242a3e3fc80c6294b8a2b6f` |
| 04.1 | `381be36ac17e44221e607bb1d0c357400b983b24ccefde63f6617f5edfa52210` |
| 04.3 | `3fc8a4a9736c4934b67a050b305c1351d2b2bee55e80064fc19762b3d6ef4256` |
| 04.5 | `bf51fba21656a761e08050ec234bd8edf9383d2a8dbb7652638d1c38d2ee5c7f` |

**New branch:** `stage-04.6`, created from the verified `stage-04.4` commit. No protected branch was switched to, reset, or rewritten; all four prior branches still point at their baseline SHAs (re-verified at stage end).

## 3. F1 root cause (exact)

The Stage 04.2 F-01 fix made every product write path *call* `invalidateProductValidation` in the same logical step as its data write — but as a **separate sequential SQL statement** (`app/lib/db/admin.ts`: one `UPDATE … SET validation_status='pending'` issued *after* the data statement). Stage 04.5 probe W1 separated the two statements of a real edit and proved the intermediate state — edited data under the still-stored `passed` verdict — is returned by the public read path (`getProductBySlug`). The defect was therefore not *whether* invalidation happened, but that data change and invalidation were **two observable states instead of one atomic transition**. Affected paths (04.5 §4.5/§10): `updateProduct`, `setProductSpecs`, `setProductAttributes`, and the media add/update/delete DAL functions. Offers never had the window (their reset is a column of the edit's own `UPDATE`, Stage 04.2) and are unchanged.

## 4. Product mutation-path inventory (§5.5)

Mechanical inventory — every writer of `products`, `product_specs`, `product_attributes`, `product_media` in the tree (grep-verified), plus the adjacent paths the audit's read-set matrix touches:

| # | Path | Data written | Post-04.6 D1 statements | Verdict-invalidation mechanism | Atomic? | Covering tests |
|---|---|---|---|---|---|---|
| 1 | `createProduct` (admin.ts) | new product row | 1 INSERT, born `validation_status='pending'` | n/a — no verdict exists yet | ✔ single statement | products/commerce suites |
| 2 | `updateProduct` (admin-products.ts) | name, model_ref, summary, category, brand, licence | **1 UPDATE** incl. `validation_status='pending', validated_at=NULL` | folded into the UPDATE itself | ✔ single statement | atomicity monitor; invalidation suite; concurrency suite |
| 3 | `setProductSpecs` (admin-products.ts) | product_specs rows | **1 batch**: per-spec DELETE/INSERT…ON CONFLICT + reset statement | reset inside the batch (`prepareProductValidationReset`) | ✔ one transaction | atomicity monitor + batch-failure; invalidation suite |
| 4 | `setProductAttributes` (admin-products.ts) | product_attributes rows | **1 batch**: DELETE all + INSERTs + reset | reset inside the batch | ✔ one transaction | atomicity monitor + batch-failure; invalidation suite |
| 5 | `addProductMedia` (admin-media.ts) | product_media row | **1 batch**: INSERT…RETURNING + reset | reset inside the batch | ✔ D1 side (R2 ordering §6) | atomicity monitor + batch-failure; route suite |
| 6 | `updateMedia` (admin-media.ts) | media metadata (alt/licence/expiry/sort) | **1 batch**: UPDATE + reset | reset inside the batch | ✔ D1 side | atomicity monitor (row watched explicitly) + batch paths |
| 7 | `deleteMediaRow` (admin-media.ts) | product_media row removal | **1 batch**: DELETE + reset | reset inside the batch | ✔ D1 side (R2 ordering §6) | atomicity monitor + batch-failure; route suite |
| 8 | `setPrimaryMedia` (admin-media.ts) | `sort_order` only | sequential UPDATEs (unchanged) | **None — deliberate exclusion**: display ordering is not a verdict input (the engine reads the media *count*, which this cannot change); pinned by the Stage 04.2 invalidation suite ("reordering (setPrimary) does not invalidate") | n/a — no verdict-relevant data changes | invalidation suite pin; media suites |
| 9 | `createVariant` / `deleteVariant` (admin-products.ts) | product_variants rows | 1 INSERT / 1 DELETE (unchanged) | **None — deliberate exclusion**: variants are not read by the validation engine (04.5 §4.2 read-set matrix) | n/a | products suites |
| 10 | `transitionProductStatus` (admin.ts) | product `status` | 1 UPDATE; the publish arm is conditional on `validation_status='passed'` | status is not a verdict input; the publish gate re-checks the verdict in the same statement (F-13 construction, unchanged) | ✔ single statement | invalidation + route suites |
| 11 | `commitProductValidation` (product-validation.ts) | the verdict itself | 1 conditional UPDATE re-stating the input snapshot | NF-2 guard (Stage 04.4, unchanged) | ✔ single statement | concurrency suite; guard-coverage suite (§7) |
| 12 | `invalidateProductValidation` (admin.ts) | verdict reset + FTS reindex | 1 UPDATE + reindex | the Stage 04.2 mechanism, **retained as exported DAL surface**; after 04.6 it has no remaining write-path callers (paths 2–7 fold/batch the reset via `prepareProductValidationReset`) | ✔ single statement | historical invalidation evidence |
| 13 | Offers (context, preserved) | offers rows | `createOffer`: 1 INSERT born 'pending'; `updateOffer`: reset folded into its UPDATE (Stage 04.2); `deleteOffer`: 1 DELETE | in-statement (unchanged this stage) | ✔ | commerce + concurrency suites |
| 14 | Taxonomy / commerce admin (categories, brands, definitions, merchants, programs) | non-product tables | their own statements (unchanged) | no product verdict input is written outside paths 1–13; referenced-entity deletes are in-use-refused; program status is guarded for offers by the NF-2 snapshot (§7, program-status test) | n/a | taxonomy/commerce suites; guard-coverage suite |

The queue consumer writes no verdict inputs (contract no-op, unchanged). No alternate write path bypassing the new protection was found.

## 5. Atomicity implementation details

- **Product fields (§5.1):** `updateProduct` appends `validation_status = 'pending'` and `validated_at = NULL` to the SET list of its single `UPDATE products` — the exact construction `updateOffer` has used since Stage 04.2. The FTS projection refresh (`reindexProduct`) still runs after the write, as it did after the old invalidation call; it is not part of the invariant-critical transition because the public gate (published + passed) is already closed by the reset inside the UPDATE, and public search re-checks the gate by join.
- **Specs / attributes (§5.2/§5.3):** all row writes plus the shared reset statement (`prepareProductValidationReset`, admin.ts — the same SQL the old helper ran) are executed via **`db.batch([...])`**, which D1 runs as one transaction: statements apply in order, any failure rolls back all of them, and no intermediate state is observable to any reader. Input pre-validation (definition existence/type, attribute key shape) still runs *before* the batch, so rejected writes change nothing and invalidate nothing — the Stage 04.2/04.3 semantics are preserved exactly.
- **Media (§5.4):** the same batch construction inside `addProductMedia` (INSERT…RETURNING + reset; the inserted id is read from the batch result), `updateMedia` (UPDATE + reset), and `deleteMediaRow` (DELETE + reset). The audit-log write and FTS reindex follow the committed batch, as before.
- **Mechanism verification (the Stage 04 `db.batch` lesson, addressed head-on):** the Stage 04 sweep failure taught this project that a batch *usage pattern* can be unsupported by the local test adapter (the adapter implemented no `batch` at all, and `setPrimaryMedia`'s history reflects that). Stage 04.6 therefore (a) implements `batch()` in the test adapter **faithfully** — one real SQLite transaction, rollback on any statement error, `results` exposed for RETURNING statements — and proves those semantics with a genuine mid-batch UNIQUE failure (§8); and (b) exercises the same DAL paths against **real D1** via the workerd sweep (media upload + product specs flows run over HTTP in workerd), where `batch()` is the native API the production Worker will use. No batch pattern is relied on that is not exercised by both layers.
- **No schema change.** The fix is purely statement composition; no migration was created or needed (the §2 migration gate never triggered).

## 6. D1/R2 failure handling and orphan-cleanup strategy (§5.4)

No distributed atomicity between R2 and D1 is claimed or exists. The ordering guarantees the *publication invariant* in every failure mode:

| Operation | Order | Failure modes and outcomes |
|---|---|---|
| **Create** (API route + admin page, both updated identically) | 1) upload object under a fresh server-generated UUID key → 2) `addProductMedia` commits row + verdict reset in one batch → 3) on `notFound`, object deleted | D1 batch fails → route catches, deletes the object best-effort, rethrows (500). If the cleanup delete also fails → **orphan**: an unreferenced object under `products/<id>/`; nothing points at it, it is never served (media content is served by row lookup), and it is enumerable by prefix listing if the owner ever commissions a janitor. Invariant holds in all branches: no row ⇒ no exposure. |
| **Replace** | No in-place overwrite exists anywhere: keys are UUIDs and `storeMedia` is only ever called with a fresh key. "Replacement" is the composition create-new → delete-old, each arm following its own ordering | Each arm's failure modes are the create/delete rows of this table; the old object is never deleted before the new row commits |
| **Metadata update** | D1-only: row UPDATE + verdict reset in one batch | Batch failure → nothing applied (row and verdict unchanged); no R2 involvement |
| **Delete** (API route + admin page; **order reversed from Stage 04**) | 1) `deleteMediaRow` commits row DELETE + verdict reset in one batch → 2) object deleted best-effort (`.catch(() => {})`) | D1 batch fails → row and object both remain, consistently (request errors). Object delete fails after commit → **orphan** object only: row gone, product already unpublished, nothing references the key. The Stage 04 order (object first) could instead strand a live row pointing at a deleted object and aborted the whole request when R2 failed — the route suite's failing-delete test distinguishes the two orders |
| Primary (setPrimary) | D1-only, ordering metadata | unchanged; see inventory #8 |

Orphan bound: at most one object per failed create/delete operation, each under a server-generated key with no user-controlled parts. There is no background reconciliation job in the codebase today; the strategy above (prevent by ordering, clean up inline best-effort, tolerate a bounded unreferenced remainder) is the documented behavior, not an aspiration.

## 7. F2 — the exact 17 previously uncovered guard conditions (§7 of the brief)

Derived from the Stage 04.5 §4.4 single-condition removal matrix (detected there: product `editorial_summary`, spec count, media count; offer `current_price_cents`, `licence_status` — those five keep their Stage 04.4 tests, untouched). The 17, each now with one durable interleaving test in `tests/security/validation-guard-coverage.test.ts`:

**Product commit guard** (`app/lib/product-validation.ts`): 1) `name IS ?` · 2) `slug IS ?` · 3) `category_id IS ?` · 4) `brand_id IS ?` · 5) `licence_status IS ?` · 6) category `EXISTS(...) = ?` · 7) offer-count subquery `= ?`

**Offer commit guard** (`app/lib/offer-validation.ts`): 8) `destination_url IS ?` · 9) `merchant_id IS ?` · 10) `product_id IS ?` · 11) `program_id IS ?` · 12) `currency IS ?` · 13) `price_observed_at IS ?` · 14) `availability_state IS ?` · 15) merchant `EXISTS(...) = ?` · 16) product `EXISTS(...) = ?` · 17) program-status subquery `IS ?`

Each test isolates exactly its condition: the mid-run mutation changes that one snapshot input and no other guarded one (two *active* programs for `program_id` vs a status flip at constant `program_id` for program-status; a merchant switch vs a merchant deletion for the two merchant arms). Arms with no DAL writer — product `slug` (the patch type has no slug field) and the three existence arms (in-use deletes are refused by the DAL) — mutate state with raw SQL on the test connection, as the 04.5 auditor's own probes did; the guard, the begin/commit split, and persistence are fully real. Two arms assert the discard marker without a stored-`pending` expectation, by design: offer-count (offer creation does not invalidate the product — the count is warning-only, so the stored verdict stays *correctly* `passed`) and program-status (same reasoning) — both then prove coherence with a fresh run that passes and persists.

## 8. New regression tests and coverage mapping

**37 new tests in 4 new files; zero pre-existing test files modified.**

| File | Tests | Covers |
|---|---|---|
| `tests/security/publication-atomicity.test.ts` | 12 | Adapter batch fidelity (2): commit-all + RETURNING rows; genuine mid-batch UNIQUE failure rolls back *every* statement. Statement-boundary monitor (6): `updateProduct`, `setProductSpecs`, `setProductAttributes`, `addProductMedia`, `updateMedia`, `deleteMediaRow` — after every statement the edit executes, NOT (verdict inputs changed ∧ `validation_status='passed'`); post-state `pending` + `validated_at` NULL + publicly invisible for each. Batch-failure injection (4): specs/attributes/media-add/media-delete with a throwing `batch` — error propagates, data and verdict and audit all unchanged |
| `tests/routes/media-atomicity.test.ts` | 4 | Route-level R2 ordering: upload to a published product (201, object stored, product unpublished); D1 commit failure after upload (500, object cleaned up, no row, verdict/visibility intact); DELETE happy path (row + object gone, product unpublished); R2 delete failure after D1 commit (200, row gone, object orphaned) |
| `tests/security/validation-guard-coverage.test.ts` | 17 | §7 — one interleaving test per previously uncovered NF-2 guard condition |
| `tests/routes/offer-observed-at.test.ts` | 4 | §9 (Part C) — NF-3 route mapping on both routes, invalid + valid arms |

**Monitor construction (why it is evidence, not ceremony):** the monitor wraps the real adapter; after each `run`/`all`/`first`/`batch` the wrapped DAL call performs, it re-reads the product's verdict inputs (the engine's exact read set, via raw SQL) and fails the test on the spot if any input differs from the pre-edit snapshot while `validation_status` is still `'passed'`. The watched projection is extended beyond verdict inputs where the brief's invariant covers more than the engine reads: the media row's own fields for `updateMedia`, and the attribute rows for `setProductAttributes`. §10 shows every monitor test fails against the pre-fix code.

## 9. NF-3 route-level test results (Part C)

The two routes are `POST /api/admin/offers` (`app/routes/api.admin.offers.ts`) and `PATCH /api/admin/offers/:id` (`app/routes/api.admin.offer.ts`) — confirmed from source; both map the DAL's `invalid_observed_at` conflict to `VALIDATION_FAILED` (400) with a `fields.priceObservedAt` message. New suite `tests/routes/offer-observed-at.test.ts` (real route modules, real JWKS auth, sqlite D1):

- **Create + Julian-day `priceObservedAt` (`2461000.5`)** → **400**, envelope `VALIDATION_FAILED` with the `priceObservedAt` field message; **zero offers created** for the product; **zero `offer.create` audit rows**. (The value passes the zod schema — a plain short string — so the 400 provably comes from the DAL mapping under test, not the schema layer.)
- **Create + valid ISO-Z** → 201; stored as canonical `2026-11-09 08:30:00`; one audit row.
- **Update + Julian-day** → **400**, same envelope; the stored row's `price_observed_at` is byte-unchanged; **no `offer.update` audit row** added.
- **Update + valid offset (`+02:00`)** → 200; stored canonicalized to UTC `2026-11-09 08:00:00`; one audit row.

The strict timestamp policy itself was **not** changed — no defect in it was demonstrated; the gap was purely route-level evidence.

## 10. Mutation-testing results

All mutation work ran on a disposable copy under `/tmp` (source copy, `node_modules` symlinked, destroyed after use); the real tree was never mutated.

**F2 — single-condition removals (17/17 detected, exactly):** for each condition in §7, the condition line *and its bind line* were removed from the copy's commit UPDATE, and the guard-coverage suite was re-run. In **every** case, **exactly the corresponding new test failed and the other 16 passed**:

| Condition | Failing test under mutation | Condition | Failing test under mutation |
|---|---|---|---|
| product `name` | product name | offer `destination_url` | offer destination_url |
| product `slug` | product slug | offer `merchant_id` | offer merchant_id |
| product `category_id` | product category_id | offer `product_id` | offer product_id |
| product `brand_id` | product brand_id | offer `program_id` | offer program_id |
| product `licence_status` | product licence_status | offer `currency` | offer currency |
| product category-EXISTS | category existence | offer `price_observed_at` | offer price_observed_at |
| product offer-count | product offer count | offer `availability_state` | offer availability_state |
| | | offer merchant-EXISTS | offer merchant existence |
| | | offer product-EXISTS | offer product existence |
| | | offer program-status | offer program status |

(Two conditions terminate their SQL template literal; their removal preserved the closing backtick — a first pass that deleted the whole line produced a syntax error and a suite that could not load, which was caught, corrected, and re-run. The final results above are from the corrected mutations.) Combined with the five Stage 04.4 tests the auditor mutation-verified in 04.5, the committed suite now detects removal of **22/22** guard conditions.

**F1 — pre-fix detection:** the Stage 04.4 versions of `admin-products.ts`, `admin-media.ts`, `api.admin.media.ts`, `api.admin.product-media.ts` were restored into the copy and the two F1 suites re-run: **10 of 12** atomicity tests fail (all 6 monitor tests; all 4 batch-failure tests — the pre-fix code never calls `batch`, so the injected failure cannot occur and the writes succeed) and **2 of 4** route tests fail (D1-failure cleanup; R2-delete ordering). The 4 that pass on both versions are the two adapter-fidelity tests (they test the new adapter, present in both runs) and the two behavior-identical happy paths — the fix changes no happy-path behavior, which is the point.

**Full-guard removal** was not repeated this stage (04.4/04.5 already established it fails the five original interleaving tests; the guard code itself is untouched by 04.6).

## 11. Full test and quality-gate results

Executed on branch `stage-04.6` after all changes (actual outputs, exit codes):

| Gate | Command | Result | Exit |
|---|---|---|---|
| Full test suite | `npm test` | **384 passed / 30 files, 0 failures** (347 baseline + 37 new) | 0 |
| Typecheck | `npm run typecheck` | **0 errors** | 0 |
| Lint | `npm run lint` | **clean** | 0 |
| Production build | `npm run build` | **PASS** | 0 |
| Workerd sweep | `npm run test:sweep` | **23/23 checks passed** (real workerd; local D1/R2/JWKS; ephemeral keys) | 0 |

Sweep side-effects verified: `.dev.vars` SHA-256 identical before/after (`444e092a0415835f44426744417d6a599722fd68fef684decdef8f30baf1c2eb`); the regenerated `tests/workerd/sweep-results.json` differs from the previously committed file in `generated_at` only, contains no secrets, and is committed (see §15). The sweep's media-upload and specs flows exercise the new `db.batch()` DAL paths against **real D1** — the strongest available evidence that the batch construction is production-sound, complementing the adapter's proven transactional semantics. No test relies on production resources; no fixtures or test configuration leaked into production configuration (`wrangler.jsonc` untouched).

## 12. Security regression review (brief §10)

Stage 04.6 touched only the six F1 paths, their two route call sites (+ the admin page), the test adapter, and tests. Spot-verified on the final tree, beyond the all-green suite + sweep:

- **JWT / fail-closed admin auth, RBAC** — modules untouched (`access.ts`, `auth.ts`); route suites (incl. the 10-case matrix) and sweep admin checks pass unchanged.
- **Origin checks** — untouched; 68 references across admin/v1 route files; matrix cases pass.
- **Body-size limits** — untouched (`MAX_JSON_BODY_BYTES = 16 * 1024`, `app/lib/api.ts:93`); body-limit suite passes.
- **URL policy (F-04/NF-1)** — untouched; both URL suites pass; IPv6/private-range rejections intact.
- **Price timestamps / 24 h policy (NF-3/F-02)** — policy untouched; fail-closed + price-policy suites pass; the new route tests (§9) strengthen the evidence.
- **Public gate + snapshot-guarded persistence (F-01/NF-2)** — gate untouched; guards untouched and now 22/22 mutation-covered (§10); invalidation semantics strengthened (F1) without weakening any arm.
- **Search + alternatives limits** — untouched (`ALTERNATIVES_PEER_SCAN_LIMIT = 48`, limiter wired before DB work); bounds suite passes.
- **Media magic-byte validation** — untouched (`sniffImageType` in the upload route and page); media suites + sweep pass.
- **Audit integrity** — write-audit-after-commit ordering preserved on every changed path; failure tests assert no audit row is fabricated by a failed mutation.

No security control was weakened to make the new implementation easier; the only behavioral changes are the atomicity of the six paths and the DELETE route's R2 ordering (an F1 correctness fix, §6).

## 13. Remaining limitations and known risks (honest)

- **Monitor granularity:** the statement-boundary monitor proves the invariant at every statement boundary of the DAL's own execution. Inside a batch there are no observable intermediate states *by construction* (single transaction) — that is the mechanism's guarantee, evidenced by the adapter rollback test and the real-D1 sweep, not by a concurrent-reader experiment (none is possible inside a transaction; that impossibility is the fix).
- **Admin page call sites:** the product-detail page's media upload/delete implement the identical ordering and share the DAL; they are covered by the DAL suites + code symmetry, not by page-level route tests (the route harness suites invoke API route modules; the Stage 04.2 flows precedent is the same).
- **Orphan janitor:** orphan cleanup is inline best-effort (§6). No background reconciliation of unreferenced R2 keys exists; the residual is bounded, unreferenced, and never publicly reachable.
- **`invalidateProductValidation` retention:** the Stage 04.2 helper remains exported with no write-path callers (kept as DAL surface; the write paths use the atomic constructions). A future stage may remove it; leaving it is deliberate — removing exported DAL surface was outside this stage's narrow scope.
- **Carried items (unchanged, not worsened):** CSP `'unsafe-inline'` post-launch hardening; production ADMIN rate-limiter runtime 429 and genuine expired-JWT replay remain NOT VERIFIED (require an authenticated production session); **LOW-08 condition stands verbatim** — a CHECK-constraint migration for `offers` must land no later than the first non-DAL offers writer, including Stage 06 staging/import/feed functionality, and until then all offer writers must route through the validated DAL functions (verified again this stage: they do).
- **Owner operational actions still outstanding (unchanged):** extend the existing Cloudflare Access application to `/admin/*` before any publication, and create a fresh D1 Time Travel bookmark immediately before publication. Neither was performed; both block publication, not this stage.

## 14. Files changed (branch diff `stage-04.4..stage-04.6`, 13 files incl. this report)

**Application source (6):** `app/lib/db/admin.ts` (shared reset statement builder + docs) · `app/lib/db/admin-products.ts` (fields fold; specs/attributes batches) · `app/lib/db/admin-media.ts` (media batches + ordering contract docs) · `app/routes/api.admin.product-media.ts` (create cleanup on D1 failure) · `app/routes/api.admin.media.ts` (DELETE order reversed + rationale) · `app/routes/admin/product-detail.tsx` (same two orderings for the page's media intents)

**Test infrastructure (1):** `tests/helpers/sqlite-d1.ts` (faithful transactional `batch()`)

**Tests (4 new):** `tests/security/publication-atomicity.test.ts` · `tests/routes/media-atomicity.test.ts` · `tests/security/validation-guard-coverage.test.ts` · `tests/routes/offer-observed-at.test.ts`

**Evidence (1):** `tests/workerd/sweep-results.json` (regenerated; `generated_at` only)

**Report (1):** this file. **Migrations: none** — no file created, modified, or applied, locally or remotely.

## 15. Exact commit SHAs (branch `stage-04.6`, base `49a4163b65d0b7a4322fb3449fe52f041de8323e`)

| Commit | Content |
|---|---|
| `3a6d370` | F1 — atomic product validation invalidation (source fix + adapter `batch()`) |
| `515c573` | F1 regression tests (publication-atomicity + media-atomicity) |
| `57c0830` | F2 guard-coverage tests (17) + NF-3 route-level tests (4) |
| `f7b46de` | Strengthen the attributes monitor (watch the attribute rows explicitly) |
| `7ccfbb4` | Regenerated workerd sweep results (23/23; `generated_at` only) |
| *(this report's commit — the branch tip; see `git log`)* | Stage 04.6 remediation report |

## 16. Final Git status

`git diff --check`: clean. Working tree: clean except the four pre-existing untracked audit reports (03.7, 04.1, 04.3, 04.5 — byte-identical to §2 hashes). `main` @ `88ca4e5`, `stage-04` @ `3058183`, `stage-04.2` @ `ac46b77`, `stage-04.4` @ `49a4163` — all unchanged. Branch diff vs `stage-04.4`: 13 files (12 before this report), narrowly scoped to F1/F2/NF-3 evidence.

## 17. Production safety statement

**Production was not touched.** No push, no merge, no `wrangler deploy`, no remote D1 command or migration, no Cloudflare API / dashboard / connector operation, no Access change, no production secret or data access occurred at any point in this stage. All work is local commits on `stage-04.6`. FinanceBleu and CalcBlue were not touched. This report does **not** declare the project deployment-ready: publication remains gated on the owner's explicit approval and the outstanding owner actions in §13.

**Recommended next step: an independent read-only Stage 04.7 audit** of branch `stage-04.6` — re-verify the F1 atomicity construction (including the batch semantics against real D1 and the R2 ordering at both call sites), the 22/22 guard-coverage claim (including re-running the single-condition removals), and the NF-3 route evidence — before any publication decision.
