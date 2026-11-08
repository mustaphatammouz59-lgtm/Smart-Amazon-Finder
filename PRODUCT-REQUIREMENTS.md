# Product Requirements Document — Smart Amazon Finder (working name)

Stage 00 — Architecture and planning. Status of this document: **IMPLEMENTED NOT VERIFIED** (documentation; no application exists yet).
Date: 2026-11-08. Owner: Product Manager function. Companion documents: SYSTEM-ARCHITECTURE.md, DATABASE-DESIGN.md, API-ARCHITECTURE.md, UX-UI-SPECIFICATION.md, DATA-SOURCING-AND-COMPLIANCE.md, SEO-STRATEGY.md, SECURITY-PLAN.md, MONETIZATION-STRATEGY.md, MASTER-ROADMAP.md, RISK-REGISTER.md, COST-AND-SCALABILITY.md, ACCEPTANCE-CRITERIA.md.

## 1. Product statement

Smart Amazon Finder (working name only — see §10) is an independent product discovery and comparison platform. It helps shoppers in the United States:

1. Discover products in a deliberately narrow, well-structured catalog.
2. Search products intelligently (keywords, categories, specifications).
3. Filter by budget and specifications.
4. Compare products side by side on published criteria.
5. Find cheaper alternatives with honest trade-offs.
6. Discover suitable gifts by recipient, occasion and budget.
7. Read original buying guides that teach how to choose.
8. Make informed purchasing decisions, then buy on the merchant's own site.

It is **not** a store, not a checkout, not a price tracker at launch, and not an official Amazon property. It must never imply official Amazon partnership, sponsorship or endorsement.

## 2. Business objective

- Revenue target: **USD 5,000 per month** (gross, before expenses). This is a planning target, **not a forecast and not a guarantee**. The assumptions required to reach it are modelled explicitly in COST-AND-SCALABILITY.md §5 and MONETIZATION-STRATEGY.md §6.
- Revenue sources (in activation order): Amazon Associates commissions; Google AdSense; other authorised affiliate networks; future clearly-labelled sponsored placements.
- Strategic constraint: revenue features activate only after the platform has real content, real traffic and the legal prerequisites in DATA-SOURCING-AND-COMPLIANCE.md. No monetization feature may require fabricating product data.

## 3. Market and scope

### 3.1 Initial market
- Country: United States (amazon.com marketplace). Currency USD. Language en-US.
- International expansion is an explicit non-goal until the US model is proven; the data model is marketplace-aware (see DATABASE-DESIGN.md) so expansion does not require a redesign.

### 3.2 Initial verticals (launch scope)
1. **Home Office & Productivity** (e.g. desk, chair, lighting, organisation, work-from-home accessories).
2. **Electronics Accessories** (e.g. chargers, cables, hubs, stands, cases — accessories, not flagship devices).

### 3.3 Future verticals (not launch scope)
Laptops, monitors, computer accessories beyond accessories tier, home products, gaming accessories, educational products, gifts as a cross-catalog layer.

### 3.4 Catalog discipline
The catalog grows only as fast as **authorised data sources and editorial capacity** allow. A small catalog with complete, current, licensed data beats a large stale one. No unlimited catalog import before Stage 06 gates are passed (MASTER-ROADMAP.md).

## 4. Users and jobs

| Persona | Job to be done | Success signal |
|---|---|---|
| Focused buyer | "I know the category; help me pick the right model within my budget." | Completes a comparison and clicks through to a merchant with confidence. |
| Researcher | "Teach me how this category works before I spend." | Reads a buying guide, then uses finder filters unaided. |
| Deal seeker | "Show me where I can spend less without regretting it." | Uses Alternatives; understands the trade-off stated. |
| Gift buyer | "I know the person and the budget, not the product." | Finishes the Gift Finder flow with a short, explainable shortlist. |
| Returning visitor | "Keep my shortlist and favourites." | Creates an account, saves favourites/comparison lists (Stage-gated, see §6). |
| Admin / editor (internal) | "Curate catalog, offers and content safely." | All changes validated, attributed and audit-logged. |

## 5. Functional requirements (by module)

Module detail (responsibilities, APIs, data, UI, security, tests) lives in SYSTEM-ARCHITECTURE.md §4. Summary with stage ownership:

| # | Module | Core requirement | First stage |
|---|---|---|---|
| A | Customer website | SSR public site, fast, accessible, mobile-first | 01–02 |
| B | Product discovery | Curated shelves, category browsing, finder entry points | 05 |
| C | Product catalog | Products, variants, brands, categories, specs, media with provenance | 05 |
| D | Product search | Keyword + faceted search with relevance ranking | 07 |
| E | Advanced filtering | Budget, brand, spec filters; shareable filter URLs | 07 |
| F | Comparison | Side-by-side on published criteria; shareable comparison lists | 08 |
| G | Recommendations | Transparent rule-based scoring with written explanations | 09 |
| H | Alternatives | Cheaper / better-fit / simpler alternatives with stated trade-offs | 10 |
| I | Gift finder | Recipient → occasion → budget flow producing an explained shortlist | 10 |
| J | Buying guides | Original editorial guides tied to catalog categories | 11 |
| K | Content management | Draft/review/publish workflow for guides and articles | 04 |
| L | Admin dashboard | Authenticated, role-gated management of C, K, N, O, Q, S data | 04 |
| M | User accounts & favourites | Optional accounts; favourites and saved comparisons | 03+ (design), build stage set in roadmap |
| N | Affiliate link management | One canonical place that builds, tags and audits outbound merchant links | 12 (design 03) |
| O | Price history & alerts | Offer price snapshots; alerts only for account holders who opt in | Later (post-12) |
| P | Monetization | Associates, AdSense, other networks, future sponsored slots — all disclosed | 12 |
| Q | Analytics | Privacy-respecting traffic, search and click analytics | 13 |
| R | SEO infrastructure | SSR, canonicals, sitemaps, indexation controls | 11 (foundation 01) |
| S | Security & audit | RBAC, validation, rate limiting, audit log (SECURITY-PLAN.md) | 03–04, hardened 14 |

## 6. Non-functional requirements

- **Performance:** Core Web Vitals targets in SEO-STRATEGY.md §8 (LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1 at p75, mobile). SSR for all indexable pages.
- **Accessibility:** WCAG 2.2 AA target for public pages and admin (UX-UI-SPECIFICATION.md §7).
- **Availability:** Stateless Workers scale automatically; no single-server dependency. Degraded-mode rule: if a data source fails, pages must show the last validated data with its timestamp, or omit the volatile field — never fabricate.
- **Data quality:** every external record carries source, licence status, fetched/updated time and validation status (DATABASE-DESIGN.md §6). Records failing validation are not publishable.
- **Privacy:** data minimisation; no sale of personal data; analytics without cross-site tracking profiles (SECURITY-PLAN.md §9).
- **Cost discipline:** launch on Cloudflare free tiers; paid step is a single documented decision (COST-AND-SCALABILITY.md).

## 7. Trust and editorial rules (product-level, non-negotiable)

1. Never invent prices, availability, reviews, ratings, discounts or test results.
2. Prices/availability for Amazon products may be displayed **only** under the conditions in DATA-SOURCING-AND-COMPLIANCE.md §4 (API-served or Amazon-served link, with timestamp). Otherwise link out with "Check price" and no figure.
3. Every recommendation must be explainable from published criteria (recommendation explanations are a feature, not copy garnish).
4. Affiliate disclosure is site-wide and per-page where links appear (MONETIZATION-STRATEGY.md §3).
5. No fake scarcity, fake countdowns, fake "expert" personas or fabricated credentials.
6. Sponsored placements, when they exist, are labelled and never affect organic ranking scores (they are rendered separately).

## 8. Success metrics (measured in Stage 13, defined now)

- Organic sessions and indexed-page ratio (indexed / published).
- Search success rate: searches followed by a product/comparison view.
- Comparison completion rate and outbound click-through rate (CTR) — always reported with the caveat in MONETIZATION-STRATEGY.md §4 (click ≠ sale; Amazon attribution window limits apply).
- Returning visitor rate; favourites created per 1,000 sessions.
- CWV pass rate on the top 20 templates.
- Zero tolerance metrics: published records with failed validation = 0; undisclosed affiliate links = 0.

## 9. Explicit non-goals (Stage 00–launch)

- No checkout, cart or payments. No drop-shipping. No marketplace for third-party sellers.
- No scraping of Amazon or any merchant (DATA-SOURCING-AND-COMPLIANCE.md §2).
- No mobile apps. No browser extension. No email marketing before there is a compliant opt-in system.
- No paid AI dependency. Any future AI feature is a separate evaluation (SYSTEM-ARCHITECTURE.md §7).
- No user-generated reviews at launch (moderation, fraud and legal cost not justified).

## 10. Brand decision (required before public launch) — UNRESOLVED

"Smart Amazon Finder" is a **working name**. It contains the Amazon trademark, which creates trademark and Associates-programme risk if used as a public brand/domain (see RISK-REGISTER.md R-02 and DATA-SOURCING-AND-COMPLIANCE.md §5). **Decision required from the project owner before Stage 11 (public content) and before any domain purchase:**

- Direction A (recommended): adopt an independent brand name that contains no merchant trademark (pattern used by the owner's other properties, e.g. a coined name + descriptive tagline "Product Finder — independent product research"), keep "Smart Amazon Finder" as internal codename.
- Direction B: keep the working name publicly — **not recommended**; would require legal review the project has not budgeted.

The GitHub repository name (`Smart-Amazon-Finder`) is an internal identifier and is unaffected by this decision.

## 11. Assumptions register (Stage 00)

| ID | Assumption | Basis | Verified in |
|---|---|---|---|
| A-01 | The owner will operate the Associates account and the site under the same legal identity, from a jurisdiction eligible for Amazon Associates US. | Owner to confirm. | **PENDING** — owner confirmation required. |
| A-02 | Cloudflare account is on Workers Free at project start. | Owner's existing projects use Cloudflare Workers. | IMPLEMENTED NOT VERIFIED |
| A-03 | Editorial capacity is one person (the owner) plus AI-assisted drafting with human review. | Owner's other projects' model. | IMPLEMENTED NOT VERIFIED |
| A-04 | No Associates account exists yet for this project; no API access is assumed at any stage gate. | Brief §6. | VERIFIED as a planning rule (design assumes zero Amazon API access until proven). |
| A-05 | D1 supports the SQLite FTS5 extension for search indexing. | D1 is SQLite-based; FTS5 availability must be proven by spike. | **PENDING** — Stage 03 spike S-01 (SYSTEM-ARCHITECTURE.md §6). |

## 12. Open questions for the owner (blocking later stages, not Stage 00)

1. Brand direction (§10) — decision needed before Stage 11.
2. Legal identity and country of operation for Associates/AdSense accounts (A-01) — needed before Stage 12.
3. Is a contact email/domain strategy wanted at launch (affects Stage 01 environment design, not Stage 00)?
4. User accounts in v1 of the public site, or deferred until favourites demand is proven? (Roadmap currently builds accounts capability in the backend stages but gates the public launch of accounts behind Stage 13 analytics evidence — see MASTER-ROADMAP.md Stage 05 note.)
