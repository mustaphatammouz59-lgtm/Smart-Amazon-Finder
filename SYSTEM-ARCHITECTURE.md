# System Architecture — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (design decisions documented; compatibility evidence in §3; runtime proof is deferred to the Stage 01/03 spikes listed in §9).
Date: 2026-11-08.

## 1. Architecture style

A single Cloudflare-hosted, server-rendered web application with a modular API layer, backed by Cloudflare-native storage. One deployable unit (one Worker) with clear internal module boundaries — a "modular monolith" — because:

- The team is effectively one operator; microservices would multiply deploy, auth and observability cost for no benefit at this scale.
- Cloudflare Workers make a single SSR Worker cheap to run and globally distributed by default.
- Module boundaries (not network boundaries) are what the roadmap needs: stages add modules behind feature flags without re-platforming.

Split-out rule: a module becomes a separate Worker only when it has a different scaling, security or release profile (first candidate: the ingestion/refresh consumer, which runs as a Queue consumer Worker so a runaway ingestion job can never degrade public page serving).

## 2. Logical architecture

```
                        ┌────────────────────────────────────────────┐
  Visitor / Admin ─────▶│  Cloudflare edge (CDN, WAF, rate rules)    │
                        └───────────────┬────────────────────────────┘
                                        │
                        ┌───────────────▼────────────────────────────┐
                        │  App Worker (React Router 7 framework     │
                        │  mode, SSR)                                │
                        │  ┌─────────────┐  ┌─────────────────────┐  │
                        │  │ Public site │  │ Admin app (/admin)  │  │
                        │  │ routes      │  │ role-gated routes   │  │
                        │  └─────────────┘  └─────────────────────┘  │
                        │  ┌─────────────────────────────────────┐   │
                        │  │ API layer (/api/*) — modular route  │   │
                        │  │ handlers, validation, authz         │   │
                        │  └─────────────────────────────────────┘   │
                        └──┬────────┬────────┬────────┬─────────┬────┘
                           │        │        │        │         │
                        ┌──▼──┐  ┌──▼──┐  ┌──▼──┐  ┌──▼───┐  ┌──▼────┐
                        │ D1  │  │ KV  │  │ R2  │  │Queues│  │ Cache │
                        │ SQL │  │ cfg │  │media│  │ jobs │  │ API   │
                        └─────┘  └─────┘  └─────┘  └──┬───┘  └───────┘
                                                    │
                                        ┌───────────▼────────────┐
                                        │ Ingestion Worker       │
                                        │ (queue consumer: data  │
                                        │ refresh, price snaps,  │
                                        │ sitemap rebuilds)      │
                                        └───────────┬────────────┘
                                                    │ authorised HTTPS APIs only
                                        ┌───────────▼────────────┐
                                        │ Data source adapters   │
                                        │ (Creators API*, other  │
                                        │ networks, manual/CSV)  │
                                        └────────────────────────┘
                        * Only if/when eligibility is proven — see
                          DATA-SOURCING-AND-COMPLIANCE.md. The system
                          must run fully without it.
```

Environments: `dev` (local workerd via the Cloudflare Vite plugin), `staging` (separate Worker + separate D1/KV/R2 bindings, synthetic data only), `production`. No production data in staging. Environment separation is by Wrangler environments and separate Cloudflare resources, never by flags in one database.

## 3. Technology choices and compatibility evidence

| Choice | Decision | Evidence / status |
|---|---|---|
| React 19 + TypeScript (strict) | ADOPT | Owner's existing stack (FinanceBleu: React 19 + Vite + Tailwind 4 in production). Status: VERIFIED as a team capability; version pins are a Stage 01 task. |
| React Router 7, framework mode, SSR | ADOPT, with spike gate | Cloudflare's official framework guide scaffolds React Router v7 with the Cloudflare Vite plugin and SSR enabled by default (`ssr: true`), deployed on Workers with bindings (D1/KV/R2) accessible in loaders. Cloudflare's Vite plugin 1.0 announcement confirms first-class React Router v7 support. Caveat from migration guidance: SPA mode (`ssr:false`) is **not** supported with the Cloudflare Vite plugin — this design uses SSR, so the caveat does not apply, but Stage 01 must not flip it. Status: VERIFIED (official docs, 2026-11-08); runtime proof = Stage 01 spike. |
| Vite | ADOPT | Required by both React Router 7 framework mode and the Cloudflare plugin. Note the Cloudflare template pins its own Vite major; Stage 01 must accept the template's tested combination rather than forcing the newest Vite. Status: VERIFIED (official docs). |
| Tailwind CSS 4 | ADOPT | Via the official `@tailwindcss/vite` plugin; proven in the owner's FinanceBleu production build. Status: VERIFIED. |
| Backend: Cloudflare Workers | ADOPT | Single runtime for SSR, API and queue consumers; official pricing/limits in COST-AND-SCALABILITY.md. Status: VERIFIED (official docs). |
| Database: Cloudflare D1 (SQLite) | ADOPT | Relational fit for catalog/offers (DATABASE-DESIGN.md); free tier is generous (COST-AND-SCALABILITY.md §2). Per-database size cap (500 MB free / 10 GB paid, official D1 limits) drives the price_history retention policy in DATABASE-DESIGN.md §8. Status: VERIFIED (official docs). |
| Object storage: R2 | ADOPT (media only) | For **original/licensed** media the project is allowed to store (editorial images, generated graphics). Amazon product images are **not** copied to R2 — they are served under licence terms (DATA-SOURCING-AND-COMPLIANCE.md §4.1). 10 GB-month free tier, zero egress fees (official pricing). Status: VERIFIED (official docs). |
| KV | ADOPT (narrow role) | Config, feature flags, cached non-authoritative fragments only. KV is eventually consistent and write-limited on free tier (1,000 writes/day) — it is **never** the store for catalog, prices or sessions. Status: VERIFIED (official pricing page). |
| Queues | ADOPT (async jobs) | Ingestion, refresh, price snapshots, sitemap rebuilds, email-free alert preparation. Free tier: 10,000 operations/day; a delivered message costs 3 operations (official pricing page). Dead-letter queue mandatory. Status: VERIFIED (official docs). |
| Search: D1 + SQLite FTS5 | ADOPT, with spike gate | §6. Status: **S-01 PASSED — GO (2026-11-08, Stage 03)**; verdict in §6 below. |
| Auth (admin) | Cloudflare Access in front of /admin **plus** in-app RBAC (§8) | Defence in depth: Access authenticates identity at the edge; the app authorises roles. Public user accounts (module M) use in-app auth (hashed credentials or magic link via a transactional mail provider — provider choice is a Stage 03 decision, no provider assumed in Stage 00). Status: design decision; provider PENDING. |
| Testing / CI | Vitest + Playwright; GitHub Actions | Stage 01 sets up unit/integration; e2e for critical flows lands per-module (ACCEPTANCE-CRITERIA.md). Status: design decision. |
| Analytics | Cloudflare Web Analytics + first-party event table (module Q) | No third-party cross-site trackers at launch. Status: design decision. |

Explicitly rejected for now: a separate Node/VM server (cost + ops), a hosted SQL database outside Cloudflare (latency + cost + second vendor), Elasticsearch/OpenSearch or any paid search service (§6), a headless CMS SaaS (the admin module covers the need; a CMS adds cost and a second content model), Next.js on Workers via adapters (React Router 7 is Cloudflare's first-class React framework path; a second framework would split team knowledge from the owner's existing React/Vite stack for no product gain).

## 4. Module specifications

Every module: responsibilities, dependencies, API, database, UI, security, tests. API endpoints are specified in API-ARCHITECTURE.md; schema in DATABASE-DESIGN.md; page inventory in UX-UI-SPECIFICATION.md.

### A. Customer-facing website
- Responsibilities: SSR public pages, responsive layout, accessibility, SEO metadata emission, graceful degradation.
- Dependencies: B–K read models, R (SEO), design system (Stage 02).
- API: consumes internal loader data, no public API of its own.
- Database: read-only via service layer.
- UI: UX-UI-SPECIFICATION.md §3–§5.
- Security: output encoding by framework escaping; CSP headers (SECURITY-PLAN.md §5).
- Tests: e2e smoke on every public template; CWV budgets in CI (Stage 14 hardens).

### B. Product discovery
- Responsibilities: homepage shelves, category browsing, curated collections, finder entry points. All shelves are either editorially curated or rule-generated from catalog data — never paid-influenced without a label.
- Dependencies: C, G (later), J.
- API: `GET /api/discovery/*` internal loaders.
- Database: products, categories, product_media.
- UI: Home, Category pages.
- Security: public read only.
- Tests: snapshot tests that shelves never include unpublished/invalid records.

### C. Product catalog
- Responsibilities: canonical product records, variants, brands, categories, attribute/spec model, media references, provenance and validation state. The catalog is the single source of truth every other module reads.
- Dependencies: data adapters (§5), D1.
- API: admin CRUD under `/api/admin/products*`; public reads are server-side only.
- Database: products, product_variants, categories, brands, product_attributes, product_specs, product_media.
- UI: Admin product management; public product detail.
- Security: writes are admin-only, RBAC + audit log.
- Tests: integrity-rule tests (DATABASE-DESIGN.md §7), validation-state machine tests.

### D. Product search
- Responsibilities: keyword search over names, brands, categories, editorial fields; relevance ranking (field-weighted, see SYSTEM §6); typo tolerance policy (limited, rule-based at first).
- Dependencies: C, FTS index (§6).
- API: `GET /api/search?q=&category=&page=` (also SSR search route).
- Database: FTS5 virtual table fed from C.
- UI: Search results page with filter rail.
- Security: query length limits, rate limiting on the public endpoint.
- Tests: golden-query relevance suite (fixed query set with expected top results).

### E. Advanced filtering
- Responsibilities: faceted filters (category, brand, price band on **current offer data when lawfully displayable**, spec facets per category), sortable results, shareable URLs (all filter state in the query string).
- Dependencies: C, D, O (offer data).
- API: search endpoint parameters; facet counts endpoint.
- Database: product_specs (typed values), offers.
- UI: filter components (UX-UI-SPECIFICATION.md §5).
- Security: strict parameter whitelists per category (no arbitrary SQL construction).
- Tests: filter-combination property tests; URL round-trip tests.

### F. Product comparison
- Responsibilities: compare 2–4 products on the category's published comparison criteria; persist shareable comparison lists; printable view.
- Dependencies: C, E criteria definitions.
- API: `/api/comparisons` (create/read; anonymous lists via signed token URL, account lists for users).
- Database: comparison_lists, comparison_items.
- UI: Comparison pages.
- Security: anonymous list tokens are unguessable (≥128-bit) and read-only.
- Tests: criteria completeness rule — a comparison cannot publish with a criterion missing for all items.

### G. Recommendation engine
- Responsibilities: rule-based scoring (Stage 09): score = weighted match of need-fit, spec adequacy, value (price-to-spec within category), and data confidence. Every recommendation renders its top reasons ("Recommended because…"). Paid influence is architecturally impossible: the scorer has no merchant/commission inputs.
- Dependencies: C, E, user input from finders.
- API: `/api/recommendations` (POST needs profile → ranked product IDs + reason codes).
- Database: scoring config per category in code/config (versioned), not in user-editable tables.
- UI: finder result views, product page "best for" blocks.
- Security: inputs validated; no user data persisted unless account feature is used.
- Tests: deterministic scoring fixtures per category; explanation-presence test (no score without reasons).

### H. Cheaper alternatives
- Responsibilities: for a given product, candidate alternatives that are cheaper (by current lawful price data), better fit, or simpler — each with a stated trade-off generated from spec deltas, never from marketing copy.
- Dependencies: C, E, G scoring.
- API: `/api/products/:id/alternatives`.
- Database: products, product_specs, offers.
- UI: Alternatives page + product page block.
- Security: public read.
- Tests: trade-off statement must cite at least one concrete spec/price delta (fixture tests).

### I. Gift finder
- Responsibilities: 3–5 question flow (recipient type, occasion, budget band, interests) → explained shortlist from the catalog; no account required.
- Dependencies: C, G.
- API: `/api/gift-finder` (POST answers → shortlist + reasons).
- Database: reads catalog + an editorial gift-tags attribute set.
- UI: Gift Finder flow (UX-UI-SPECIFICATION.md §3).
- Security: no personal data about the recipient is stored; answers are session-scoped.
- Tests: flow completion e2e; every result has a reason string.

### J. Buying guides
- Responsibilities: original editorial guides per category: how to choose, spec literacy, budget tiers, mistakes to avoid; each guide links its category's finder/comparison.
- Dependencies: K (CMS), C.
- API: SSR routes; admin via K.
- Database: buying_guides, articles.
- UI: Buying guides index + guide pages.
- Security: published content is sanitised HTML from a constrained editor model (structured blocks, not raw HTML).
- Tests: pre-publish checklist enforced in code (disclosure present, no price figures outside policy, internal links valid).

### K. Content management
- Responsibilities: draft → review → publish workflow, structured content blocks, media picker (R2 originals only), scheduling, version history.
- Dependencies: L, R2, D1.
- API: `/api/admin/content*`.
- Database: buying_guides, articles (+ revision columns).
- UI: Admin content screens.
- Security: RBAC (editor vs publisher roles), audit log on publish.
- Tests: state-machine tests; unpublished content never appears in public queries (regression suite).

### L. Admin dashboard
- Responsibilities: single role-gated entry for C, K, N, O, Q, S administration; overview metrics (catalog health, data freshness, validation failures).
- Dependencies: all admin APIs.
- API: `/api/admin/*`.
- Database: admin_users, audit_logs + module tables.
- UI: Admin interface (UX-UI-SPECIFICATION.md §4).
- Security: SECURITY-PLAN.md §3–§4 (Access + RBAC + audit). Public visitors can never reach admin functions: routes require session + role on the server for every request, not by hiding links.
- Tests: authorisation matrix test (every admin endpoint × every role).

### M. User accounts and favourites
- Responsibilities: optional accounts (email-based), favourites, saved comparisons, price-alert opt-ins (module O consumer). Accounts are an enhancement, never a wall: all discovery works anonymously.
- Dependencies: D1, mail provider (Stage 03 decision), SECURITY-PLAN.md.
- API: `/api/account/*`.
- Database: users, favorites, comparison_lists (owned), price_alerts.
- UI: Account pages.
- Security: password hashing with a memory-hard KDF if passwords are used; session cookies HttpOnly/Secure/SameSite; rate-limited auth endpoints.
- Tests: auth flow e2e, session fixation/rotation tests, data-export/delete self-service test.

### N. Affiliate link management
- Responsibilities: the **only** code path that produces outbound merchant links: builds links from offer records + program templates, applies the correct tracking tag per program, records click events, and guarantees disclosure-adjacent rendering data (the UI always knows a link is an affiliate link).
- Dependencies: affiliate_programs, offers, Q.
- API: `/api/out/:offerId` click redirector (logs click, 302 to merchant), admin program screens.
- Database: affiliate_programs, affiliate_clicks, offers.
- UI: Admin affiliate screens; user-facing link components.
- Security: redirect allowlist = domains of active programs only (no open redirector); click logging stores no full IP (hashed/truncated, SECURITY-PLAN.md §9).
- Tests: link-format fixtures per program; open-redirect abuse tests; disclosure-presence render tests.

### O. Price history and alerts
- Responsibilities: append-only offer price snapshots from authorised refreshes; history charts (only from real snapshots); opt-in alerts for account holders when a watched product's current offer crosses their threshold.
- Dependencies: ingestion Worker, C, M, N.
- API: `/api/products/:id/price-history`; alert CRUD under `/api/account/alerts`.
- Database: price_history, price_alerts.
- UI: product page history block; account alerts page.
- Security: alerts require verified email; alert emails (if any) contain no affiliate links unless program rules expressly allow — Associates rules restrict affiliate links in email, so alert messages link to **our product page**, never directly to Amazon with a tag (DATA-SOURCING-AND-COMPLIANCE.md §4.5).
- Tests: snapshot idempotency; alert trigger fixtures; retention job tests (§8 in DATABASE-DESIGN.md).

### P. Monetization
- Responsibilities: activation and placement of Associates links (via N), AdSense units (after approval, Stage 12), other networks, future labelled sponsored slots. Detailed rules: MONETIZATION-STRATEGY.md.
- Dependencies: N, Q, legal pages live.
- API: config only (KV flags per program/slot).
- Database: affiliate_programs; ad configuration is code/config, not DB content.
- UI: disclosure components, ad slots with reserved dimensions (CLS rule).
- Security: ad scripts loaded only from programme domains via CSP allowlist.
- Tests: stage-gate checklist in ACCEPTANCE-CRITERIA.md (no ad code ships before the gate).

### Q. Analytics
- Responsibilities: first-party metrics: page views (via Cloudflare Web Analytics), search queries (aggregated, no user identifiers), finder completions, outbound clicks (module N), conversion **estimates** clearly labelled as estimates (Amazon reports are the source of truth for earnings, imported manually as aggregates).
- Dependencies: N events, D1 aggregate tables.
- API: `/api/admin/analytics*`; event ingestion is internal.
- Database: analytics_daily rollups (raw events retained 30 days, then rolled up).
- UI: Admin analytics screens.
- Security: no fingerprinting; IP addresses not stored raw.
- Tests: rollup correctness fixtures; PII-scan test on event payloads.

### R. SEO infrastructure
- Responsibilities: SSR, metadata/canonical system, sitemap generation (index + per-type), robots rules, indexation flags per record (only validated, value-complete pages are indexable), internal linking components, structured data only where eligible and truthful. Full spec: SEO-STRATEGY.md.
- Dependencies: all public modules.
- API: `/sitemap.xml`, `/robots.txt` routes + queue-rebuilt static sitemap files in R2 if size requires.
- Database: reads publication + validation state.
- UI: breadcrumbs, related-links blocks.
- Security: sitemap endpoints are read-only and cacheable.
- Tests: sitemap-vs-routes diff test in CI (no orphan indexable page, no non-indexable page in sitemap).

### S. Security and audit logging
- Responsibilities: cross-cutting: authentication, RBAC enforcement, validation schemas, rate limiting, audit log writes for every admin mutation, secret management, backup/restore procedures. Full spec: SECURITY-PLAN.md.
- Dependencies: platform (Workers, Access, WAF rules).
- API: middleware applied to all `/api/*`.
- Database: audit_logs (append-only; no update/delete grants in app code paths).
- UI: Admin audit log viewer (read-only).
- Security: this module **is** the security spec.
- Tests: SECURITY-PLAN.md §11 test list (authz matrix, rate-limit behaviour, audit completeness).

## 5. Data acquisition architecture (adapters)

All external data enters through **adapters** behind one interface, so sources can change without touching the catalog:

```
interface SourceAdapter {
  id: string                    // 'creators-api' | 'network-x' | 'manual-entry' | 'csv-import'
  fetchCandidates(query): RawRecord[]        // never writes to catalog directly
  normalise(raw): NormalisedProduct          // maps to schema proposal shape
  licence: LicenceDescriptor                 // what may be stored, shown, for how long
}
```

Pipeline: adapter → **staging tables** (raw payload hash + normalised proposal + licence descriptor) → automated validation (schema, completeness, licence checks) → human or rule-based approval → catalog write → FTS reindex → price snapshot (if offer data is licensed for display/storage). Every catalog row keeps `source_id`, `licence_status`, `source_updated_at`, `validated_at`, `validation_status` (DATABASE-DESIGN.md §6).

Designed adapters (build order): (1) **manual-entry** (admin forms — the launch adapter; zero licensing risk, editorially created data), (2) **csv-import** (same pipeline, bulk), (3) **creators-api** (only after eligibility is proven — DATA-SOURCING-AND-COMPLIANCE.md §3), (4) future affiliate-network feeds (each needs its own licence review before activation).

There is deliberately **no scraper adapter** and no extension point shaped like one.

## 6. Search design

- **Phase 1 (launch):** D1 (SQLite) with an FTS5 virtual table over product name, brand, category, and editorial summary fields; field weights (name > brand > category > summary); filters applied as indexed SQL predicates **before** ranking; sorting by relevance, price (when lawful/current), or editorial rating-free "fit score" from module G.
- **Why FTS5 first:** zero extra cost, zero extra vendor, transactional consistency with the catalog (same database), and more than enough capacity at launch catalog sizes (hundreds to low tens of thousands of products).
- **Spike S-01 (Stage 03, blocking):** prove FTS5 exists and performs in D1 (create virtual table, `bm25()` ranking, snippet generation) with a 10,000-row synthetic catalog.
- **S-01 VERDICT (2026-11-08, Stage 03): GO.** FTS5 was proven inside D1 itself (local workerd database: virtual table creation, content rebuild, `bm25()` MATCH query returning the correct row) and benchmarked on a 10,000-row synthetic catalog (SQLite engine): full insert 51 ms, `bm25()` top-10 query 1.64 ms, match count 0.67 ms, `snippet()` generation working. The external-content design (projection table `products_search` + `products_fts`, migration 0004) is adopted as designed; no fallback is required. Reproducible via `scripts/spike-s01.mjs` and REPORT-stage03-2026-11-08.md. If FTS5 is unavailable or materially limited in D1, fallback order: (a) FTS5 in a **local build-time index** is rejected (stale); (b) trigram/LIKE hybrid with strict query limits as a bridge; (c) graduate to dedicated search (§6.1) earlier than planned.
- **6.1 Graduation triggers to dedicated search** (any one): catalog > 50,000 products; search p95 latency > 300 ms at production traffic; typo tolerance / synonym requirements exceed rule-based handling; faceting load threatens D1 read budgets (COST-AND-SCALABILITY.md). The search service sits behind the same `/api/search` contract, so graduation is an internal change.

## 7. Recommendations design (and the AI question)

Launch engine = transparent rules (module G). Inputs: category fit, spec adequacy vs. the stated need, price position within category, data confidence, editorial flags (e.g. "budget pick" set by an editor with a written reason). Output: ranked list + reason codes rendered as plain-language explanations.

AI/ML evaluation (future, separate decision): personalisation models need behavioural data the project will not have at launch, and paid AI APIs would violate the no-mandatory-paid-AI rule. If ever adopted, AI output must pass the same explanation and no-fabrication rules, and must never generate prices, ratings or review text.

## 8. Cross-cutting platform decisions

- **Caching:** static assets immutable + long cache; SSR pages: edge cache with short TTL for catalog pages (data freshness labels come from the data, not the cache); API search: 60-second edge cache for identical anonymous queries. Price-bearing fragments are never cached beyond the licence window (DATA-SOURCING-AND-COMPLIANCE.md §4.3).
- **Rate limiting:** Cloudflare rate-limiting rules + in-Worker token buckets for `/api/search`, `/api/out/*`, auth endpoints (SECURITY-PLAN.md §6).
- **Error handling:** typed API errors (API-ARCHITECTURE.md §6); public error pages never leak stack traces or binding names.
- **Observability:** Workers Logs + structured log lines with request IDs; queue DLQ alerting; weekly data-freshness report (module L dashboard).
- **Backups:** D1 Time Travel (point-in-time recovery: 7 days free plan / 30 days paid plan, per official D1 limits) plus scheduled `wrangler d1 export` snapshots to R2 (DATABASE-DESIGN.md §9).

## 9. Decision gates and spikes

| ID | Question | Stage | Blocking for |
|---|---|---|---|
| S-01 | FTS5 functional + performant in D1 at 10k rows? | 03 | Stage 07 design finalisation — **RESOLVED: GO (2026-11-08)** |
| S-02 | React Router 7 framework + Cloudflare template builds, SSRs, and reads a D1 binding in a loader. | 01 | All frontend work |
| S-03 | Creators API credential flow works **if** eligibility is ever met (do not build before eligibility). | 06 | Adapter (3) only |
| S-04 | AdSense approval for the launched site (external decision by Google). | 12 | Ad units only |
| D-01 | Public brand name (PRODUCT-REQUIREMENTS.md §10). | before 11 | Domain, public content |

## 10. Source evidence for this document (checked 2026-11-08)

- Cloudflare official framework guide: React Router v7 on Workers via the Cloudflare Vite plugin, SSR on by default, bindings available in loaders.
- Cloudflare Blog (official): Cloudflare Vite plugin 1.0 with first-class React Router v7 support.
- Cloudflare Workers pricing page (official): Workers/KV/Queues/D1/R2 figures quoted in COST-AND-SCALABILITY.md.
- Cloudflare D1 limits page (official): database size caps and Time Travel durations.
- Amazon Associates Central, Creators API documentation (official): PA-API 5 deprecation and Creators API eligibility — analysed in DATA-SOURCING-AND-COMPLIANCE.md.
