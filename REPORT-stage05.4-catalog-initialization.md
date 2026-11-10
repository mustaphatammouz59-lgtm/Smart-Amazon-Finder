# Stage 05.4 — Product Catalog Initialization & Verified Data Ingestion (local development only)

Branch: `stage-05` · Baseline: `b66ce2b80c17419865ca0892f9ceb4d6a2b5c121` (Stage 05.3, PASS) · Final commit: see the commit that adds this report.

## 1. Scope executed

Exactly the authorized scope: finalise the Revision 2 taxonomy (as carried by taxonomy Revision 3) as reproducible local seed SQL; apply the owner-approved D-06 root descriptions LOCALLY; research and ingest 47 genuine manufacturer-evidenced products into the LOCAL database as drafts; run the real Stage 05.3 validation engine on every product; automated catalogue QA against the public read layer. Nothing was pushed, merged, deployed, or written to any production store.

## 2. Preflight record

- Branch `stage-05`, HEAD exactly `b66ce2b…`; tree clean except the eight pre-existing untracked audit reports. PASS.
- Migrations 0001–0006 present locally; **0006 is LOCAL ONLY** — production remains Stage 04.9 state (Stage 04.6 code live; remote D1 migrations 0001–0005 per `REPORT-stage04.9-production-publication.md`).
- Baseline suite re-verified before seeding: **475/475** (36 files).
- **Isolation:** every database used is a local `node:sqlite` store — ephemeral test stores plus one persistent local file at `.wrangler/local-catalog.db` (git-ignored wrangler local state) built from migrations + seeds + product SQL. No `--remote` flag anywhere; no Cloudflare connector call of any kind; no production URL used for anything except nothing at all. Research used public manufacturer web pages (read-only fetches).

## 3. WP1 — Taxonomy seeds (verified)

**File:** `fixtures/taxonomy-seeds.sql` (50,582 bytes) — a NEW file, chosen because the pre-existing `fixtures/catalog-seeds.sql` belongs to the production era and must not be disturbed; the new file layers on top of it (it relies on the root categories and inherited base attributes that file provides, via `(category_id, key)`-scoped `INSERT OR IGNORE` copies for inherited rows).

- 15 subcategories inserted with the correct parents, Revision 2 `sort_order`, approved intro copy, `is_indexable = 0`.
- Attribute definitions: **118 taxonomy rows** (36 inherited copies + 82 new) → 126 total in the seeded database including the 8 root/base rows. Flags transcribed from the taxonomy tables: comparison eligibility, filterability, sort weights (inherited rows copy the seeded weights from their source definitions; new comparison rows weight 10, others 0), and **`is_required` exactly per §9.1: 60 required rows**, including `ethernet_port` required on Docking Stations only (hubs flag 0), `surge_rating_joules` flag 0 (its conditional is enforced by VR-4, not by presence), and Ergonomic Supports with zero required attributes.
- Idempotent root UPDATEs set both roots' descriptions to the **final approved D-06 texts verbatim** (verified character-exact by test) and `is_indexable = 0`. LOCAL ONLY — production roots are untouched.
- **Idempotency proven:** applying the seeds twice to a fresh local database yields identical counts (17 categories, 126 definitions, 0 indexable categories). The taxonomy counts were also verified row-by-row against the taxonomy document tables during generation (a scripted transcription, then count assertions in the test suite — not eyeballing).

## 4. WP2 — 47 genuine products (research method)

Six parallel research passes by category group, manufacturer-first: every accepted product is evidenced by the manufacturer's own product/spec/manual pages (retailer data never used as primary evidence and never for specifications). The merge step then validated **all 47 mechanically against the live seeded local database** before emitting SQL: required attributes present, value types matching the definitions, controlled vocabularies exact (`connector_type` 9 terms, `device_type` 4 terms, certification body/status), unique slugs, exact distribution, HTTPS policy-clean destinations with no affiliate/tracking parameters, original summaries ≥ 40 chars, evidence present for every product.

**Deliverable data files:**

- `fixtures/product-research.json` (113,737 bytes) — normalized source data: 47 products with specs + evidence URLs, 27 rejections.
- `fixtures/catalog-products.sql` (166,199 bytes) — idempotent ingestion SQL (guarded upserts; `WHERE NOT EXISTS` on offers because SQLite UNIQUE does not dedupe NULL `variant_id`).
- `fixtures/product-evidence-register.md` (90,277 bytes) — per-product source register: destination, evidence URLs, per-source notes, and the full rejected-candidate log with reasons.
- `fixtures/product-validation-results.json` (17,307 bytes) — machine-readable per-product validation outcomes.

**Distribution (exact, verified by count assertions):**

| Sector | Category | Count | Brands |
|---|---|---|---|
| A | Desks | 5 | IKEA ×5 |
| A | Standing Desks | 5 | IKEA ×5 |
| A | Office Chairs | 5 | Herman Miller, IKEA ×2, Steelcase, Haworth |
| A | Desk Lighting | 5 | Dyson, BenQ ×2, OttLite ×2 |
| A | Monitor Arms | 1 | Ergotron |
| A | Laptop Stands | 1 | Nulaxy |
| A | Desk Organization & Storage | 1 | IKEA |
| A | Ergonomic Supports | 1 | ComfiLife |
| B | USB-C Hubs | 5 | Anker ×2, Plugable, Belkin, UGREEN |
| B | Docking Stations | 5 | CalDigit ×2, Plugable, Kensington, Dell |
| B | Chargers & Power Adapters | 5 | Anker ×2, Belkin ×2, Apple |
| B | Cables & Adapters | 5 | Belkin ×3, Anker, UGREEN |
| B | Device Stands & Holders | 1 | Lamicall |
| B | Power Strips & Surge Protectors | 1 | Tripp Lite |
| B | Cases, Sleeves & Protection | 1 | tomtoc |
| | **Total** | **47** | 21 brands |

Ingestion conventions: products enter as **drafts** with `source_id = 'stage05-research'`, licence `owned`; per-spec `source_id` = product slug (traceable into the evidence register); one link-out offer per product with merchant derived from the destination host, **price NULL everywhere**, `licence_status = 'restricted'` (honest link-only state — a lawful offer per the Stage 05.1 rule = validation passed + URL-policy-clean destination); `validation_status = 'pending'` at insert until the engine ran.

**Research rejections: 27 candidates rejected** (full log in the evidence register). Top reasons:

1. Manufacturer does not publish warranty length in years (required attribute) — the single most common bar, across desks, chairs, lamps, and docks.
2. Manufacturer does not publish maximum load / weight capacity (required for desks, standing desks, monitor arms, laptop stands).
3. Lamp output published only as lux or not at all (lumens required) — several well-known lamps rejected on this alone.
4. Cable data-transfer rate never published by the maker (data rate required for cables) — e.g. popular braided charge cables rejected.
5. Contradictory or ambiguous manufacturer specifications (a standing desk whose own pages disagree on depth/load mid-revision).
6. No genuine manufacturer source findable (marketplace-only brands).

**Certification honesty (the data proves the bar held):** exactly **2 of 47** products derive as certified — Plugable UD-768PDZ (UL, `verified_manufacturer_documentation`: the maker's spec table states its included power supply is "UL 60950-1 Certified") and Tripp Lite TLP606 (UL, `verified_manufacturer_documentation`). All five chargers are recorded `none` / `not_certified`: researchers refused to upgrade UL94-V0 flammability ratings, MFi licensing, or retailer claims into safety certifications. The certification derivation module remains deliberately unwired into gates (Revision 2 design).

## 5. WP3 — Local ingestion + validation (real engine)

Applied to the local store only: migrations 0001–0006 → catalog seeds → taxonomy seeds → product SQL. Then `runProductValidation` + `revalidateOffer` (the actual Stage 05.3 engine and DAL) ran on every product:

- **Products passed: 47/47 · Failed: 0 · Incomplete: 0** (every required attribute satisfied from evidence — the merge-time mechanical check plus the engine agree).
- **Offers passed: 47/47.**
- Warning codes (all warnings, zero errors): `missing_media` ×47 (no licensed imagery exists — by design; pages render without images), offer `warning:no_price` ×47 (the link-out model), offer `warning:availability_unknown` ×47 (no availability is claimed anywhere).
- All 47 products `is_indexable = 0`; all 17 categories `is_indexable = 0`.
- No price renders anywhere: the persistent local catalogue file verifies 47 offers, **0 priced**; the detail-page QA asserts the display price is null and the link-out is the lawful sponsored/nofollow one.

## 6. WP4 — Functional QA (local, automated)

`tests/stage05-ingestion.test.ts` — **8/8 PASS**, covering:

- Seed idempotency + exact counts + D-06 texts verbatim.
- Ingestion counts and idempotency (re-applying the product file changes nothing).
- Full-engine validation outcomes as above.
- Indexability: drafts non-indexable; `categoryIndexability` on every populated category still reports the outstanding guide ("how to choose") reason — **no category becomes indexable on product counts alone** (FI-3 behaviour confirmed on real data).
- Local publish-flow QA (LOCAL DB ONLY, as authorized): 46 products published locally + 1 draft control (ComfiLife foot rest) — the control is invisible in listings, category trees, search, and direct detail access; category listings carry the right products; detail pages expose typed specs; FTS search finds ingested products; spec filters narrow correctly; comparison aligns shared keys across products from different subcategories; alternatives respond (cheaper set honestly empty — no prices exist); a deliberately failed-validation product is excluded from every public read; **surge-contradiction count across the final catalogue = 0**; the certified set is exactly the 2 expected slugs; required-attribute + surge enforcement re-verified against the ingested data by the flipped Stage 05.2 enforcement assertions (suite-wide).

## 7. Gates (exact totals)

| Gate | Result |
|---|---|
| Full vitest suite | **483/483 PASS** (475 Stage 05.3 baseline intact + 8 new ingestion/QA tests) |
| Typecheck | 0 errors |
| ESLint | clean |
| Production build | PASS |
| Workerd live-route sweep | **30/30** (baseline; the catalogue QA above runs against the same DAL/read layer in-process — no sweep extension was needed to prove the local catalogue behaviour, and none was faked) |
| Seed idempotency | proven (double application → identical counts) |
| Local catalogue file | `.wrangler/local-catalog.db`: 17 categories, 126 definitions, 47 products, 47 offers, 0 priced |

## 8. Warnings (why PASS WITH WARNINGS, not clean PASS)

1. **No product imagery (47× `missing_media`).** No licensed imagery pipeline exists; the link-out model renders text/spec pages. A licensing decision is required before any visual catalogue work.
2. **7 of 4
...[truncated 2085 chars]