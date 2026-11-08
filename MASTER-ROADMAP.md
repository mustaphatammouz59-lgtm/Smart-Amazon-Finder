# Master Implementation Roadmap — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (plan; each stage is verified only by its own exit report).
Date: 2026-11-08. Complexity scale: S (days), M (~1–2 weeks part-time), L (~3–5 weeks), XL (> 5 weeks). Estimates are planning aids for a one-operator team, not commitments.

## Dependency map (summary)

```
00 Architecture ──▶ 01 Foundation ──▶ 02 Design system ──┐
                     │                                    ▼
                     └──▶ 03 Backend & DB ──▶ 04 Admin ──▶ 05 Catalog ──┐
                                                    │                   ▼
                                                    └──▶ 06 Data ──▶ 07 Search ──▶ 08 Compare
                                                                        │
                                          09 Recommendations ◀──────────┤
                                          10 Alternatives & Gifts ◀─────┘
                                          11 Content & SEO (needs D-01 brand decision)
                                          12 Monetization (needs Associates/AdSense gates)
                                          13 Analytics & growth
                                          14 Security, performance & launch
```
Rules: no stage starts without its dependencies' exit criteria met (ACCEPTANCE-CRITERIA.md); monetization (12) never precedes content (11) and legal pages; data integration (06) never precedes the admin/staging pipeline (04–05).

---

## Stage 00 — Architecture and planning
- **Scope:** this document set. No application code.
- **Dependencies:** none.
- **Deliverables:** the 13 Stage 00 documents + REPORT-stage00-2026-11-08.md.
- **Files/subsystems:** documentation only, in the project workspace.
- **Testing:** internal consistency review (§16 checklist of the brief).
- **Acceptance:** owner approval of the blueprint, including explicit handling of the brand decision (D-01) and the Creators API finding.
- **Risks:** planning drift from provider reality → mitigated by official-source verification + quarterly doc re-reads.
- **Complexity:** S. **Rollback:** n/a (documents; superseded versions are kept with dates).

## Stage 01 — Engineering foundation
- **Scope:** repository, React Router 7 framework-mode app on the Cloudflare template, SSR skeleton, TypeScript strict, Tailwind 4, lint/format, test runners (unit + e2e smoke), CI (GitHub Actions: typecheck, lint, test, build), environments (dev/staging/production Wrangler config), security headers baseline.
- **Dependencies:** 00 approval; spike S-02 lives here.
- **Deliverables:** running SSR skeleton with placeholder routes for all public pages (no product data, no fake content), CI green, staging deploy.
- **Files:** app scaffold, `wrangler.jsonc`, `.github/workflows/*`, base layout.
- **Testing:** S-02 (SSR + D1 binding read in a loader on staging); smoke e2e per route; build-size report.
- **Acceptance:** skeleton deployed to staging; all routes 200 + SSR HTML contains real content shell; no console errors.
- **Risks:** template/version friction (Vite majors) → accept the Cloudflare template's tested pins.
- **Complexity:** M. **Rollback:** git revert; staging is disposable.

## Stage 02 — Global design system
- **Scope:** tokens, typography, component library (UX-UI-SPECIFICATION.md §5), page shells for all public templates with state variants (loading/empty/error/stale), admin shell.
- **Dependencies:** 01.
- **Deliverables:** component catalogue (Storybook-style internal page or equivalent), all templates as static-content pages, accessibility sign-off measurements.
- **Testing:** contrast checks on tokens, keyboard/screen-reader pass on core flows, CLS checks on templates, responsive matrix (360→1280).
- **Acceptance:** UX spec §7–§8 verified with evidence; no template ships without its empty/error states.
- **Risks:** design scope creep → component list is frozen from UX-UI-SPECIFICATION.md §5; additions need a change note.
- **Complexity:** L. **Rollback:** components are additive; shells revert cleanly.

## Stage 03 — Backend and database
- **Scope:** D1 schema migrations 0001+ (DATABASE-DESIGN.md), data-access layer with publication/validation gates, API v1 skeleton with validation + error format, auth foundations (admin session + Access integration; user auth per SECURITY-PLAN.md §4 with the mail-provider decision), queues + DLQs, audit logging, spike S-01 (FTS5).
- **Dependencies:** 01 (parallel with 02 after API contracts freeze).
- **Deliverables:** migrated staging DB, API contract tests, authz matrix test harness, queue consumers (noop jobs end-to-end).
- **Testing:** integrity-rule tests (§6 of DB design), S-01 results recorded (go/no-go for FTS5 design), migration up/down drill on staging.
- **Acceptance:** all §6 integrity rules enforced and tested; S-01 verdict written into SYSTEM-ARCHITECTURE.md.
- **Risks:** FTS5 unavailable → fallback path in SYSTEM §6. **Complexity:** L.
- **Rollback:** migrations are forward-only on shared envs; rollback = restore from Time Travel/export + revert deploy.

## Stage 04 — Admin dashboard
- **Scope:** admin shell + dashboard, product/category/brand/spec editors with provenance panels, content CMS (blocks, workflow, publish checklist), staging review screens, audit viewer, settings/flags.
- **Dependencies:** 03; 02 admin shell.
- **Deliverables:** a working admin where an editor can create a draft product + guide end-to-end (staging data).
- **Testing:** endpoint × role authorisation matrix (100% pass), publish-gate tests (invalid records cannot publish), audit completeness test.
- **Acceptance:** non-technical flow test: create → review → publish → unpublish a product and a guide, all audit-logged.
- **Risks:** admin scope ballooning → screens frozen to UX spec §4. **Complexity:** L.
- **Rollback:** feature-flag the admin routes; public site unaffected.

## Stage 05 — Product catalog
- **Scope:** catalog goes real for the 2 launch verticals: category trees, attribute definitions per category, manual-entry adapter (admin forms + validation), product pages live with offers **without prices** (link-out model), favourites/comparison data model enabled; public accounts launch decision (accounts ship here if owner approves; otherwise favourites stay session-based until Stage 13 evidence).
- **Dependencies:** 04.
- **Deliverables:** ≥ 40 fully-validated products across the 2 verticals (quality bar over quantity), category pages meeting SEO indexation rules or explicitly noindexed.
- **Testing:** data-quality report (completeness per record), public-gate regression suite.
- **Acceptance:** catalog health dashboard shows 0 published records with failed validation; every product page passes the UX + disclosure checks.
- **Risks:** editorial throughput (one operator) → vertical scope is deliberately narrow; do not widen categories to hit counts.
- **Complexity:** L (mostly editorial). **Rollback:** products archive individually; no destructive deletes.

## Stage 06 — Authorized data integration
- **Scope:** CSV import adapter through staging; licence-descriptor enforcement; refresh jobs (offers/price snapshots where licensed); **Creators API adapter only if eligibility is proven at this time** (spike S-03) — otherwise this stage completes without it and re-opens when eligibility exists.
- **Dependencies:** 05; DATA-SOURCING-AND-COMPLIANCE.md gates.
- **Deliverables:** import pipeline with staging diffs, freshness dashboard, stale-price auto-null job running on schedule.
- **Testing:** licence-rule tests (expired licence → fields disappear), idempotent re-import tests, DLQ drill.
- **Acceptance:** a full import cycle completes with zero unvalidated promotions; freshness SLAs visible in admin.
- **Risks:** licence terms differ per source → per-source review is a stage task, not an assumption. **Complexity:** M–L.
- **Rollback:** per-source disable (program status) purges its display fields via the licence sweep.

## Stage 07 — Advanced search
- **Scope:** search UI + API completion: FTS ranking (or fallback per S-01), facets per category, sorting, shareable filter URLs, zero-result capture for editorial.
- **Dependencies:** 05 (+06 for price facets where licensed).
- **Deliverables:** `/search` production, facet system, search analytics events.
- **Testing:** golden-query relevance suite; filter property tests; p95 latency measurement at staging scale (10k synthetic products).
- **Acceptance:** relevance suite passes; zero-result rate measurable in admin.
- **Risks:** relevance tuning rabbit hole → golden set is small and fixed; tuning is time-boxed.
- **Complexity:** M. **Rollback:** search degrades to category browsing (feature flag).

## Stage 08 — Comparison engine
- **Scope:** comparison builder, criteria tables per category, shareable token lists, saved lists for accounts, print view.
- **Dependencies:** 05, 07 (shared filter/criteria model).
- **Deliverables:** `/compare` flows complete; criteria definitions for launch categories.
- **Testing:** criteria-completeness rules; token security tests; print rendering check.
- **Acceptance:** any 2–4 products in a category produce a complete, criteria-consistent comparison with disclosure.
- **Complexity:** M. **Rollback:** flag off; product pages remain complete without it.

## Stage 09 — Smart recommendations
- **Scope:** rule-based scorer per category with versioned config, reason codes + rendered explanations, Product Finder flow (UX §3.8) wired to it.
- **Dependencies:** 07, 08.
- **Deliverables:** `/product-finder` production; scoring fixtures per category.
- **Testing:** deterministic scoring fixtures; "no score without reasons" render test; bias check — scorer output must be invariant to merchant/commission fields (test proves the scorer cannot see them).
- **Acceptance:** finder produces explained shortlists for the top 10 test need-profiles per category.
- **Complexity:** M. **Rollback:** finder falls back to filtered browsing.

## Stage 10 — Alternatives and gift finder
- **Scope:** alternatives engine (cheaper/fit/simpler with delta-cited trade-offs), alternatives pages, Gift Finder flow + gift-tag attribute set.
- **Dependencies:** 09.
- **Deliverables:** `/product/:slug/alternatives`, `/gift-finder` production.
- **Testing:** trade-off citation tests; gift flow e2e; indexation rules for alternatives pages verified.
- **Acceptance:** every published alternatives block cites ≥ 1 concrete delta; gift results always carry reasons.
- **Complexity:** M. **Rollback:** per-feature flags.

## Stage 11 — Content and SEO
- **Scope:** buying-guide programme for launch categories (initial set sized to editorial capacity, e.g. 8–12 substantial guides), articles, full SEO infrastructure activation (metadata system, sitemaps, structured data where eligible, internal linking, redirects table), legal pages final text, **public brand decision D-01 executed** (name, domain, identity) — domain purchase happens in this stage, with owner approval, not before.
- **Dependencies:** 05–10 (content links to real tools), D-01.
- **Deliverables:** guides live, sitemap submitted (Search Console), legal pages reviewed.
- **Testing:** pre-publish checklist enforced in CMS; structured-data validation on templates; sitemap-vs-routes CI test green.
- **Acceptance:** every indexable page passes SEO-STRATEGY.md §6 gates; Search Console shows sitemaps accepted.
- **Risks:** thin-content pressure → indexation gates are code, not intentions. **Complexity:** L (editorial).
- **Rollback:** guides unpublish individually; sitemaps regenerate.

## Stage 12 — Monetization
- **Scope:** Associates activation (account application, terms re-read dated in the compliance doc, disclosure system live, module N production), AdSense application + slots (after approval), other networks only with individual reviews, earnings import ritual.
- **Dependencies:** 11 (real content + traffic path), owner legal/tax verification (A-01), gates S-04.
- **Deliverables:** affiliate links live through module N only; ads live if approved; monthly monetization report template.
- **Testing:** disclosure-presence render tests across templates; link-template fixtures per program; kill-switch drill.
- **Acceptance:** zero affiliate links exist outside module N; zero ad units render without approval flag; kill switch proven.
- **Risks:** programme rejection/account issues → site must remain fully useful unmonetised (it is, by design). **Complexity:** M.
- **Rollback:** program suspension procedure (kill switch) is the rollback.

## Stage 13 — Analytics and growth
- **Scope:** analytics dashboards (traffic, search, funnels, clicks, earnings imports), zero-result and content-gap reporting, CWV field monitoring, accounts-launch evidence review (did users need accounts?), growth experiments framework (title/meta tests with guardrails, internal-link improvements).
- **Dependencies:** 12 (for earnings), 11 (for content data).
- **Deliverables:** weekly growth report ritual; experiment backlog with the revenue-model re-run (MONETIZATION-STRATEGY.md §6) from real data.
- **Testing:** rollup correctness; PII scan on events.
- **Acceptance:** owner can answer "what earned what, and why" from the dashboard alone.
- **Complexity:** M. **Rollback:** analytics is read-only by design.

## Stage 14 — Security, performance and launch
- **Scope:** SECURITY-PLAN.md §11 launch list (authz re-run, dependency audit, headers/CSP scan, restore drill, incident tabletop), CWV budget enforcement, backup verification, legal final review (privacy/terms/disclosure by a qualified reviewer), launch checklist, public launch.
- **Dependencies:** all prior stages.
- **Deliverables:** launch report with evidence for every ACCEPTANCE-CRITERIA.md launch item; runbooks in repo.
- **Testing:** full regression + e2e suite green on production build; restore from backup proven.
- **Acceptance:** no open FAILED items in ACCEPTANCE-CRITERIA.md; owner signs the launch checklist.
- **Risks:** late legal findings → legal review starts at Stage 11 in parallel, not here. **Complexity:** M.
- **Rollback:** launch is a DNS/flag event; rollback = return traffic to staging state / maintenance page with data intact.

---

## Stage-gate discipline

Each stage ends with `REPORT-stageNN-YYYY-MM-DD.md` in this repository using the status labels (VERIFIED / IMPLEMENTED NOT VERIFIED / PENDING / FAILED), listing files changed, tests run with results, and unresolved items carried forward. The next stage starts only after the owner approves the previous report — the same discipline that produced this Stage 00 set.
