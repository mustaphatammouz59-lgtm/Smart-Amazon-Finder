# Stage 05.1 — Product Catalog Implementation

- **Project:** Smart Amazon Finder
- **Date:** 2026-11-09
- **Branch:** `stage-05` (from production `main` @ `f719196e85bbc4f29cc98924dd9679db2b67ac68`)
- **Mode:** LOCAL ONLY — nothing pushed, merged, deployed, or written to production.
- **Verdict: PASS WITH WARNINGS** (warnings are scope-external: no browser/visual verification was available to the builders, and product imagery awaits a future public media pipeline — both documented in §8. The taxonomy gate in §9 remains CLOSED: no category records or products were inserted anywhere.)

## 1. Inspection findings (evidence-based, verified against source)

**Product write & validation workflows (pre-existing, unchanged).** Products are written only through the Stage 04 admin DAL (`app/lib/db/admin-*.ts`) behind Cloudflare Access + RS256/JWKS JWT verification + RBAC; every gate-relevant edit invalidates `validation_status` in the same statement/batch (Stage 04.6), and validation verdicts persist via the Stage 04.4 snapshot-token conditional update. Offers reset their own validation inside the edit UPDATE.

**Publication rules (pre-existing, unchanged).** The public gate is hard-coded in the DAL (`app/lib/db/types.ts` `publicGate`): `status='published' AND validation_status='passed'`. Publish itself is refused (409) unless validation has passed, and is publisher-role only. Prices display only when the shared policy (`app/lib/price-policy.ts`) passes: positive price + licence `licensed` + offer validation `passed` + valid ISO currency + observation timestamp parses, not future, ≤ 24 h old. Otherwise the DAL returns `price_cents === null` and surfaces render no price.

**`productIndexability()` and callers (pre-fix state).** Defined in `app/lib/product-validation.ts` (~line 331), a read-only reporting computation. Exactly two callers, both display-only (verified in source): `app/routes/admin/product-detail.tsx` (renders the indexable/not-indexable readout; its publish action does not consume it) and `app/routes/api.admin.product.ts` GET loader (includes it in the JSON detail; the PATCH action does not use it). The defect: it pushed the reason *"No price-displayable offer is available."* whenever a product had offers but none had a displayable price — under Stage 05's link-out model (offers store no price) every offered product would report non-indexable forever, contradicting SEO-STRATEGY §6 (see §5).

**Public routes (before this stage).** SSR pages: `/`, `/product-finder`, `/compare` (static methodology page with a permanent empty state), `/alternatives`, `/gift-finder`, `/buying-guides`, `/about`, `/contact`, `/privacy-policy`, `/affiliate-disclosure`, `/terms`. API v1: search, product detail, product alternatives, category products, recommendations, gift-finder. **No `/product/:slug` or `/category/:slug` SSR pages existed** (planning gaps G-1/G-2 confirmed), although the gated DAL reads (`getProductBySlug`, `listProducts`, `getAlternatives`) and the public API already existed.

**Favorites / comparison (before this stage).** No client or server feature existed. The Stage 03 schema has account-bound `favorites` / `comparison_lists` tables (mandatory `user_id` FK) that remain **dormant and unused** — the owner deferred public accounts, so Stage 05.1 implements engagement purely client-side (§4) and adds no tables.

**SEO metadata / canonical / robots / sitemap (unchanged by this stage).** Per-page meta comes from `app/lib/seo.ts` `buildMeta` (canonical = `siteConfig.siteUrl` + path, OG/Twitter, opt-in `noindex, follow` robots meta). `workers/app.ts` sets `X-Robots-Tag: noindex, nofollow` globally. `robots.txt` is disallow-all with the foundation-stage comment. `sitemap.xml` lists only the 11 static `publicPaths`; per the Stage 05.0 plan (C-04), catalog records are **not** added to the sitemap in this stage (record sitemaps are a launch-stage item, SEO-STRATEGY §4), and the global noindex posture is byte-identical in behavior.

**Existing taxonomy seeds.** `fixtures/catalog-seeds.sql` (structural only) already contains the 2 root categories (`home-office`, `electronics-accessories`) and 8 attribute definitions (4 per root). Production carries exactly those 2 categories and 0 products.

## 2. Package A — Taxonomy proposal (OWNER-APPROVAL GATE — document only)

**File:** `TAXONOMY-stage05-proposal.md` (repo root, 976 lines). **Nothing was inserted** — no SQL, no fixture edits, no DB writes; the proposal describes what a future approved ingestion step would insert.

- 2 root categories as already seeded (unchanged) + **12 subcategories** (6 per sector, one level, `parent_id` → root), each with slug, name, original 1–2 sentence intro copy, covered product types, and a full attribute table.
  - Home Office & Productivity: `desks-standing-desks`, `office-chairs`, `desk-lighting`, `monitor-arms-laptop-stands`, `desk-organization-storage`, `ergonomic-supports`.
  - Electronics Accessories: `usb-c-hubs-docks`, `chargers-power-adapters`, `cables-adapters`, `device-stands-holders`, `power-strips-surge-protectors`, `cases-sleeves-protection`.
- **68 attribute definition rows** mapped for a future insert: 32 inherited copies of the 8 seeded root definitions (the schema has no inheritance — "inherited" means the row copied onto the subcategory, stated explicitly in the doc) + 36 rows using 32 distinct new keys (4 keys deliberately reused across two subcategories). Comparison criteria are aligned with the 5+5 criterion areas published on `/compare`; "Assembly & maintenance" is deliberately not modelled as a spec (unverifiable).
- Filters/sorting: only `is_filterable` attributes + brand; no price filter. Sorts limited to what the DAL honestly supports today (`name`, `newest`); spec/price/popularity sorts are marked future, not promised.
- Exclusions (per sector + cross-sector boundary rules): e.g. freight-scale and built-to-order furniture, medical-claim products, the devices themselves (phones/laptops/monitors), power banks (safety claims least verifiable), headphones/speakers, internal components, counterfeit-prone and marketplace-only-spec products, anything requiring an invented compatibility list.
- Coverage: a ~20/20 sector split reaches the ≥40 target with 3 carrier subcategories per sector at ≥5 published; 6 subcategories would clear the §6 count term, 6 open thin and stay non-indexable by rule.
- **11 owner decisions (D-01…D-11)** are listed in the doc §7 (tree shape, boundary rules, power-bank exclusion, root roll-up counting, root description replacement, controlled vocabularies, metric units for a US audience, ingestion mechanism, distribution, `is_indexable` starting state). The taxonomy gate stays closed until the owner approves.

## 3. Package B — Public catalog infrastructure

Commit `bcef6e8`. Files: `app/lib/db/catalog.ts` (DAL additions), `app/routes/product.tsx` (new), `app/routes/category.tsx` (new), `app/routes.ts` (registrations), `tests/routes/public-catalog.test.ts` (26 tests).

**DAL (`catalog.ts`).** `getCategoryBySlug(db, slug)` → `{ category, parent, children } | null` (the category row itself is structure, not gated content; everything *listed* on the page is gated). `listProducts` gained optional `categorySlugs?: string[]` (IN-list filter for a root + its subcategories); absent/empty ⇒ behavior byte-identical to before, pinned by a regression test.

**Product page (`/product/:slug`).** Loader: `getProductBySlug` (gated) — null throws a 404 `Response` rendered by the existing root ErrorBoundary, so draft/pending/failed/archived products 404 and never render. Content: breadcrumb (Home / category / name), brand eyebrow, name, model ref, Save/Compare buttons, `DisclosureBanner`, Overview (the `editorial_summary` verbatim, or an honest "summary being prepared" line — no invented copy), specifications table (null-valued specs skipped; number+unit, bool → Yes/No, text as-is), free-form attributes as a definition list, offers with merchant name and `<a href target="_blank" rel="sponsored nofollow noopener">View at {merchant}</a>`; a price renders **only** when the DAL policy value `offer.price_cents !== null` (formatted from those filtered cents, with observation time shown) — when the policy nulls a destination URL, no link is rendered at all, only an honest "Merchant link unavailable" note. Related sections (Cheaper / Better fit / Simpler, from `getAlternatives`) render only when their bucket is non-empty. Meta via `buildMeta` with canonical `/product/:slug`.

**Category page (`/category/:slug`).** Loader: `getCategoryBySlug` (unknown → 404) + `listProducts` over the category and its children, `?sort=name|newest` and cursor pagination via GET (URL state, sort change resets the cursor). Subcategory chips, product cards (name links to `/product/:slug`, brand, summary, price line only when policy non-null, Save/Compare per card), honest `EmptyState` ("No published products yet in this category"), Next-page link when a cursor exists. Meta via `buildMeta` with canonical `/category/:slug`.

**Route inventory (documentation deliverable).** The repo has no standalone route-inventory doc (README describes structure only), so the inventory lives here: Stage 05.1 adds `GET /product/:slug`, `GET /category/:slug`, `GET /favorites` (client-data page, §4). None of the three is added to `publicPaths`/sitemap; `app/routes.ts` carries comments recording that choice. All pre-existing routes are unchanged.

**No product imagery is rendered anywhere** — there is deliberately no public media pipeline (media is admin/R2-internal); no stock or placeholder images were invented. See §8.

## 4. Package C — Anonymous favorites + comparison

Commit `093365f`. Files: `app/lib/client-lists.ts`, `app/components/engagement/list-buttons.tsx`, `app/routes/favorites.tsx`, `app/routes/compare.tsx` (rework), `app/root.tsx` (tray), `app/data/navigation.ts` (Favorites link in `primaryNav`; `publicPaths` untouched), `tests/client-lists.test.ts` (19 tests). The `/favorites` route registration itself is in the integration commit `24f600c`.

**Persistence.** `localStorage` only, slugs only, keys `saf:favorites:v1` / `saf:compare:v1`; caps `MAX_FAVORITES = 100`, `MAX_COMPARE = 4`. The header comment in `client-lists.ts` documents the limitations honestly: per-browser/per-device, no sync or recovery, lost when site data is cleared, storage failures (private mode/quota) fail silently to in-memory behavior. No personal data is collected; no server calls are made to store lists; no DB tables were added. Pure logic (`parseList`, `serializeList`, `toggleInList`, slug validation) is DOM-free and unit-tested; buttons hydrate from storage after mount (SSR renders the not-a-member state, avoiding hydration mismatch) and stay in sync via `storage` + a `saf:lists-changed` window event.

**Favorites view (`/favorites`).** Meta `noIndex: true`. On mount it fetches each saved slug from the existing gated API (`/api/v1/products/:slug`); products that 404 (no longer published/valid) are excluded, counted, pruned from storage, and reported in one honest notice ("*N* saved products are no longer available and were removed from this list."); non-404 errors keep the slug for a later retry. Cards link to the product page and carry a Save/Saved toggle; prices are deliberately not rendered on cards (price display happens on the product page under the price policy — code comment says so).

**Comparison (`/compare`).** The Stage 02 methodology content (criteria cards + criterion areas) is preserved below the new working section; the stale "selection opens at launch" empty state was removed, and `noIndex: true` was added to the page meta per SEO §6 (comparison pages are `noindex, follow`; the global header already noindexes everything). The section fetches the compare list from the same gated API with the same 404-notice + pruning behavior, and renders an aligned specification table: rows = union of spec labels (first product's order, then new labels appended), missing values rendered **"Not specified"** — never invented. Below the `md` breakpoint it renders stacked per-product panels with label/value rows (the page's own published promise — no sideways-scroll table). Fewer than 2 products → an honest empty state prompting additions from category/product pages. A site-wide `CompareTray` (count, link to `/compare`, Clear) renders in the public layout only, self-gates off `/admin*` and `/compare`, and appears only when the list is non-empty.

## 5. Package D — SEO indexability defect remediation

Commit `7a7af60`. File: `app/lib/product-validation.ts` (+ `tests/seo-indexability.test.ts`, 15 tests).

**Before:** offers were mapped through `applyPricePolicy()` and the reason *"No price-displayable offer is available."* was pushed whenever ≥1 offer existed but none had a displayable price.

**After:** the offer term is lawfulness, per SEO-STRATEGY §6 ("≥ 1 lawful offer or a deliberate editorial-only flag"). An offer is lawful iff `validation_status === 'passed'` **and** `validateDestinationUrl(destination_url).ok` (the centralized URL policy). Price amount, price licence and freshness are irrelevant — a stale-priced but otherwise lawful offer still satisfies the term (tested). If ≥1 offer exists but none is lawful → new reason **"No lawful offer is available."** If the product has **zero** offers, no offer reason is pushed: there is no editorial-only flag column and no migration was authorized, so zero-offer + passed validation is treated as the de-facto editorial-only state (explained in a code comment). All other checks (published, validation passed, editorial summary present, ≥1 spec with value) are unchanged, and the coordinator's diff review confirms the change is confined to this reporting computation — `validateProduct` / `runProductValidation` / all write paths are byte-unchanged, and both callers were verified display-only.

**Category analogue:** `categoryIndexability(db, categoryId)` (same module, read-only) implements the §6 category terms — ≥5 direct products with `status='published' AND validation_status='passed'` (exact count reported in the reason), intro copy = `categories.description` non-empty after trim, and the guide/"how to choose" term **always reported as unmet for this stage** (it arrives with the content stage), never silently passed; returns `null` for a nonexistent category. Follow-up noted: `app/routes/admin/categories.tsx` already has an "Indexable" column showing the stored flag — surfacing these computed reasons there is a natural small follow-up, not done here.

**Regression evidence (`tests/seo-indexability.test.ts`, 15/15):** (1) published+passed+summary+specs with a link-only offer (passed, valid HTTPS, `current_price_cents` NULL) → `indexable: true, reasons: []`; (2) draft → not eligible; (3) validation failed → not eligible; (4) missing summary → not eligible, zero specs → not eligible (separately); (5) only-offer-failed / http destination → lawful-offer reason, and a 48 h-stale licensed price → still eligible; (6) zero-offer product → eligible (editorial-only path); (7) category at 4 vs 5 qualifying products flips the count reason (draft/failed rows proven not to count), empty description → intro reason, nonexistent category/product → `null`; (8) noindex preservation — the robots loader body still contains `Disallow: /` (existing `tests/seo.test.ts` + `tests/routes.test.ts` cover the meta opt-in and route registration).

**Internal eligibility is not indexing permission:** `X-Robots-Tag: noindex, nofollow` (workers/app.ts), the disallow-all `robots.txt`, and the sitemap are all untouched.

## 6. Package E — Ingestion workflow preparation (NO ingestion performed)

The taxonomy gate blocks all data entry until the owner approves `TAXONOMY-stage05-proposal.md` (including decisions D-01…D-11). Once approved, the workflow for the ≥40 verified products is:

1. **Structure first (one-time):** insert the 12 subcategory rows (`parent_id` → the seeded roots) and the 68 attribute-definition rows exactly as mapped in the proposal (via the admin taxonomy screens, or an idempotent extension of `fixtures/catalog-seeds.sql` — proposal decision D-09; the seeds route keeps structure reproducible and out of the product tables).
2. **Per product, through the existing admin only (no direct SQL, no importers):** create the merchant and (if used) program records; create the product as a draft in its subcategory with brand, model ref and an **original** editorial summary written for this site; enter specifications against the subcategory's attribute definitions (required attributes per the proposal must all carry values from a legitimate source — manufacturer documentation or the merchant's own listing as *evidence*, never copied marketing text); add the offer as **link-only** (destination URL = the merchant product page, `current_price_cents` left NULL — no price is stored in this stage, so nothing unlicensed can display); record the source in the existing source/licence fields.
3. **Evidence per product (kept with the record):** the legitimate source the specs were verified against, the destination URL checked live at entry time, and the entry date. Products whose specs cannot be verified from a legitimate source are not entered — the ≥40 target never justifies an unverified record (owner brief §7).
4. **Validation + publication:** run product validation and offer validation in admin; both must pass (a price-less offer passes with only the `no_price` "link-only" warning — expected in this stage). Publish with a publisher-role account. After publication, confirm the product renders at `/product/:slug`, appears on its `/category/:slug` page, and that `productIndexability` reports it eligible (it will, via the lawful link-only offer).
5. **Distribution + exit evidence:** follow the proposal §6 distribution (≈20/20 across sectors, carriers at ≥5). The stage-exit evidence pack is: per-category published counts, per-product completeness (summary present, required specs present, lawful offer present, validation passed), and the internal indexability report per product/category — with the global noindex still on.

## 7. Package F — Tests and gates (coordinator-run, final tree)

| Gate | Result |
|---|---|
| `npm run typecheck` (wrangler types + typegen + `tsc -b`, strict) | **PASS — 0 errors** |
| `npm run lint` (`eslint .`) | **PASS — clean** |
| `npm test` (vitest) | **444/444 passed, 33 files** — baseline 384 all still passing; +60 new (D: 15 `seo-indexability`, C: 19 `client-lists`, B: 26 `public-catalog`) |
| `npm run build` | **PASS** |
| `npm run test:sweep` (workerd, real HTTP) | **30/30** — 23 pre-existing + 7 new Stage 05.1 checks; `tests/workerd/sweep-results.json` regenerated and committed |

New sweep checks (run while the sweep's own product is genuinely published through the real admin lifecycle): `ssr-product` (page renders the published product), `ssr-product-noindex` (product page carries `X-Robots-Tag: noindex, nofollow`), `ssr-category` (category page lists the published product), `ssr-product-404`, `ssr-category-404`, `ssr-favorites`, `ssr-compare`. Unauthenticated admin protection is covered by the unchanged sweep checks (`admin-anon` 401, `admin-page-denied`) and the unchanged vitest suites. No gate was weakened: the F-01 invalidation checks, publish-gate 409 check, cross-origin and `javascript:`-URL refusals all still pass in the sweep.

Security review of the diff: no new server surface except two read-only SSR loaders that consume only the gated DAL; no new data collection (engagement state never leaves the browser); external links use `sponsored nofollow noopener` with `target="_blank"`; destination URLs render only when the DAL policy leaves them intact; no `/api/out`, no affiliate tags or tracking parameters anywhere; TypeScript strict throughout.

## 8. Incomplete items and risks

1. **Taxonomy gate CLOSED (by design):** 0 subcategories and 0 products inserted. Stage 05's ≥40-product acceptance cannot be evaluated until the owner approves the taxonomy and ingestion runs as a separate authorized step.
2. **No product imagery anywhere.** There is no public media-serving pipeline (product media is admin/R2-internal). Pages are text-only until a future stage deliberately designs public media serving; no placeholder imagery was substituted.
3. **No browser/visual verification.** Builders and coordinator verified via unit/route tests, typecheck, lint, build and the workerd sweep (real HTTP + SSR HTML assertions). Hydration behavior of the engagement buttons, tray overlap on small screens, and the favorites/compare client fetches against a live Worker were not click-tested in a real browser.
4. **Category pages list a root's own + descendants' products** (via `categorySlugs`); whether root *counts*/indexability should roll up the same way is owner decision D-05 — `categoryIndexability` currently counts direct products only and says so.
5. **Admin surfacing of `categoryIndexability()` reasons** is not wired (the admin categories table shows the stored `is_indexable` flag only) — small follow-up.
6. **Favorites/compare are per-browser by design** (owner-approved deferral of accounts); the dormant account-bound engagement tables remain for the future accounts stage.
7. Pre-existing Prettier deviation in untouched `getAlternatives` code inside `app/lib/db/catalog.ts` was deliberately left alone to keep the diff minimal.

## 9. Branch and commits

Branch **`stage-05`** (local only; base `main` @ `f719196`):

| Commit | Content |
|---|---|
| `7a7af60cf6962e8a04d4bade44e822b8810f5465` | (D) lawful-offer indexability fix + category indexability + tests |
| `1f29a9018cf773abde9211dd6a25163a72c97c27` | (A) taxonomy proposal for owner approval |
| `093365f2e2a083ebffde4ed35d69fa33ecf67651` | (C) anonymous favorites + comparison (localStorage) |
| `bcef6e86304350367947b075133dd65be1fd0405` | (B) public product/category SSR pages + gated DAL reads |
| `24f600cae1bc188154ff8ecb1381cea4621d792f` | (integration) register /favorites route + sweep coverage (30/30) |
| this report's commit | (report) Stage 05.1 implementation report |

This report is **committed** on `stage-05` (implementation-report pattern; audit reports remain untracked). The working tree is clean except the pre-existing untracked audit/publication reports (03.7, 04.1, 04.3, 04.5, 04.7, 04.8, 04.9, 05.0).

**Confirmation:** nothing was pushed to GitHub, `main` was not merged or modified, nothing was deployed, no migration was created or applied, no production data was read or written, the global noindex is unchanged, and no other project was touched.

## 10. Verdict

**PASS WITH WARNINGS** — catalog infrastructure, public product/category pages, anonymous favorites/comparison, and the §6 indexability correction are implemented and tested locally at the established quality bar (444/444 tests, sweep 30/30, typecheck/lint/build green). Warnings: §8 items 2–3 (no imagery pipeline yet; no real-browser verification). **Product/category data ingestion remains blocked pending the owner's taxonomy approval** — that approval, and any production publication, each require separate explicit owner authorization.
