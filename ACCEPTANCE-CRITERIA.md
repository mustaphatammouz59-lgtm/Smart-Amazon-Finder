# Acceptance Criteria — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (criteria defined; results are recorded per stage in that stage's report).
Date: 2026-11-08. Status labels used exactly as defined by the project: VERIFIED / IMPLEMENTED NOT VERIFIED / PENDING / FAILED. A criterion is VERIFIED only with the evidence named in its row, produced in the stage that owns it.

## 1. Stage 00 acceptance (this stage)

| # | Criterion | Evidence required | Status now |
|---|---|---|---|
| 00-1 | All 13 required documents + Stage 00 report exist. | File listing of the workspace. | VERIFIED at delivery (checked by file listing in the report). |
| 00-2 | Architecture is internally consistent (modules A–S map across PRD, System Architecture, API, DB, UX, Roadmap without orphans). | Cross-reference pass recorded in the Stage 00 report §Final review. | VERIFIED (internal review) |
| 00-3 | Database relationships are coherent (products ≠ offers; provenance on external rows). | DB design §2 ERD + §4 schema review. | VERIFIED (design review) |
| 00-4 | Technology choices checked against current official documentation. | Source list in SYSTEM-ARCHITECTURE.md §10 + DATA-SOURCING §3 + COST §2, all read 2026-11-08. | VERIFIED |
| 00-5 | Security addressed for admin, users, APIs, secrets, audit. | SECURITY-PLAN.md complete. | VERIFIED (as a plan) |
| 00-6 | Amazon compliance constraints documented, including the PA-API deprecation and Creators API sales gate. | DATA-SOURCING-AND-COMPLIANCE.md §3 (official citations). | VERIFIED |
| 00-7 | Monetization assumptions transparent; no guaranteed revenue; no assumed commission rates presented as fact. | MONETIZATION-STRATEGY.md §6 assumption set. | VERIFIED |
| 00-8 | Roadmap dependencies correct (monetization after content; data after admin/staging; brand gate before public content). | MASTER-ROADMAP.md dependency map. | VERIFIED (plan review) |
| 00-9 | No existing project modified (incl. FinanceBleu); no app created; nothing deployed; no fake data created. | Workspace listing + FinanceBleu untouched check in the Stage 00 report. | VERIFIED at delivery |
| 00-10 | Unresolved questions are listed, not hidden. | Report §Unresolved + compliance doc §8 + PRD §12. | VERIFIED |

## 2. Per-stage exit criteria (summary — each stage report carries the full checklist)

| Stage | Exit criteria (all must be VERIFIED to close the stage) |
|---|---|
| 01 Foundation | CI green (typecheck/lint/test/build); SSR skeleton live on staging; S-02 passed (SSR + D1 binding in loader); every public route returns SSR HTML with no console errors. |
| 02 Design system | Token contrast measurements recorded; component catalogue complete per UX §5 (incl. all state variants); keyboard + screen-reader pass on core flows; CLS ≤ 0.1 on templates in lab tests. |
| 03 Backend & DB | Migrations apply cleanly up (and restore drill down) on staging; DB §6 integrity rules enforced by tests; S-01 verdict recorded; authz matrix harness running; queues + DLQ proven with a forced-failure job. |
| 04 Admin | Authorisation matrix 100% pass (endpoint × role incl. unauthenticated); publish gates block invalid records in tests; audit rows exist for 100% of mutations in the audit-completeness test; end-to-end create→publish flow done by a non-developer path. |
| 05 Catalog | ≥ 40 products across the 2 verticals pass validation (target quality bar, recorded as count + completeness report); 0 published records with failed validation; every product page passes disclosure + UX checks; category pages meet indexation gates or are noindexed by rule. |
| 06 Data integration | Full import cycle with zero unvalidated promotions; licence-expiry test proves fields disappear; stale-price job proven on a fixture set; freshness dashboard live. (Creators API portion only if eligible; otherwise marked PENDING with the eligibility fact, and the stage still closes.) |
| 07 Search | Golden-query relevance suite passes; filter property tests pass; p95 search latency ≤ 300 ms at 10 k-product staging load; zero-result queries visible in admin. |
| 08 Comparison | Any in-category 2–4 product set yields a criteria-complete comparison; share tokens pass security tests; print view verified. |
| 09 Recommendations | Scorer fixtures pass per category; scorer-invariance test (merchant/commission blindness) passes; 100% of recommendations render ≥ 1 reason. |
| 10 Alternatives & Gifts | Every alternatives block cites ≥ 1 concrete delta (fixture tests); gift flow e2e passes; every gift result carries a reason. |
| 11 Content & SEO | Guides pass CMS pre-publish checklist (enforced); sitemap-vs-routes CI test green; structured data validates on all templates that emit it; Search Console accepts sitemaps; D-01 brand decision executed (name/domain) or the stage does not close. |
| 12 Monetization | Zero affiliate links outside module N (code search + render audit); disclosure present on 100% of sampled affiliate pages; kill-switch drill removes links/prices within one cache cycle; earnings import ritual completed for the first month (or marked PENDING with the programme fact). AdSense items close only on Google's decision — approval or rejection both recorded factually. |
| 13 Analytics | Rollups reconcile with raw events on fixtures; PII scan passes; monthly revenue model re-run from real data delivered to the owner. |
| 14 Launch | No FAILED items anywhere in this document; restore-from-backup drill VERIFIED (not assumed); legal pages have qualified review recorded; CWV budgets pass in lab on top templates; incident runbook exists and tabletop done; owner signs launch checklist. |

## 3. Standing criteria (every stage, every release)

1. **No fabricated data** anywhere in any environment that a user can see: no fake products, prices, ratings, reviews, or testimonials. (Test data lives only in staging and is visibly synthetic.)
2. **No undisclosed affiliate link** can render (component + test enforcement).
3. **No regression** in the public-gate rule: unpublished/unvalidated records never appear in public queries, sitemaps or the search index.
4. **No new paid service** without a COST-AND-SCALABILITY.md entry sourced from the provider's official pricing.
5. **No stage is reported VERIFIED without its evidence**; partial completion is reported as IMPLEMENTED NOT VERIFIED or PENDING, with the missing evidence named.

## 4. How evidence is recorded

Each stage report (`REPORT-stageNN-YYYY-MM-DD.md`) contains: criteria table copied from §2 for that stage with a status per row; the commands/tests run and their results; links or file paths to artifacts (test output, screenshots, dashboard states); unresolved items carried forward by ID (from RISK-REGISTER.md, DATA-SOURCING §8, PRD §12). The owner approves or rejects the report; approval is the gate to the next stage.
