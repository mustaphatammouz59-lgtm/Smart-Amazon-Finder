# REPORT — Stage 00: Global Product Architecture & Master Technical Blueprint

Project: Smart Amazon Finder (working name) · Date: 2026-11-08 · Stage type: architecture and documentation only.
Overall stage status: **IMPLEMENTED NOT VERIFIED** — the complete blueprint exists and its provider facts are verified against official documentation; the architecture itself is proven only when Stages 01/03 run their spikes (S-01, S-02). Awaiting the owner's explicit approval before Stage 01.

## 1. What was delivered

14 files in the project workspace (`~/workspace/smart-amazon-finder/`), ~21,700 words total. **Documentation only — no application was created, nothing was installed, nothing was deployed, nothing was uploaded to GitHub.**

| # | File | Contents in one line |
|---|---|---|
| 1 | PRODUCT-REQUIREMENTS.md | Vision, market, verticals, users, module requirements, trust rules, brand decision gate, assumptions A-01…A-05, owner questions |
| 2 | SYSTEM-ARCHITECTURE.md | Modular-monolith on Workers, React Router 7 SSR, module specs A–S (responsibilities/API/DB/UI/security/tests), adapter pipeline, search design, spikes S-01…S-04, decision gates |
| 3 | DATABASE-DESIGN.md | ERD, full entity catalogue, SQL schema proposal (D1/SQLite), provenance model, indexing, integrity rules, migrations, retention, backup/Time Travel recovery |
| 4 | API-ARCHITECTURE.md | Public/account/admin API contracts, outbound redirector rules, queue job contracts, error format, versioning |
| 5 | UX-UI-SPECIFICATION.md | Design direction + system spec, text wireframes for all public pages, admin inventory, component build list, WCAG 2.2 AA requirements |
| 6 | DATA-SOURCING-AND-COMPLIANCE.md | Verified Amazon API findings, field-by-field restrictions table, data classes, compliance operating system, unresolved items U-01…U-04 |
| 7 | SEO-STRATEGY.md | SSR foundation, metadata/URL architecture, sitemaps/robots, truthful structured data, code-enforced indexation gates, CWV budgets |
| 8 | SECURITY-PLAN.md | Threat model, Cloudflare Access + RBAC, user auth, app controls, rate limits, secrets, audit, privacy, incident runbook, test list |
| 9 | MONETIZATION-STRATEGY.md | Independent modules with kill switches, Associates/AdSense design, disclosure system, attribution limits, $5,000 target model with full sensitivity table |
| 10 | MASTER-ROADMAP.md | Stages 00–14 with scope, dependencies, deliverables, subsystems, tests, acceptance, risks, complexity, rollback |
| 11 | RISK-REGISTER.md | 20 risks with likelihood/impact, designed mitigations, triggers, owners |
| 12 | COST-AND-SCALABILITY.md | Verified official Cloudflare pricing, Low/Medium/High scenarios ($0 → $5–15 → ~$5–50 per month), capacity notes, cost governance |
| 13 | ACCEPTANCE-CRITERIA.md | Stage 00 checklist, per-stage exit criteria, standing criteria, evidence rules |
| 14 | REPORT-stage00-2026-11-08.md | This report |

## 2. The three findings that shape everything

1. **The Amazon Product Advertising API (PA-API 5) is dead, and its replacement is gated.** Amazon's official Creators API documentation (read 2026-11-08) states PA-API 5 is deprecated and calls to it receive 403 errors; the successor **Creators API requires an Associates account with 10 qualified sales in the trailing 30 days** (official wording in Amazon's own error reference). Consequence, recorded as decision D-C1: the platform is designed to launch and operate **without any Amazon API data** — editorial/manual data first, standard Associates links for revenue, API treated strictly as a later enrichment if eligibility is ever earned. Any plan built on "we'll pull Amazon data via API from day one" would have failed; this blueprint cannot.
2. **Prices are a licensed privilege, not content.** Programme rules allow displaying Amazon prices only when Amazon serves them or they come through the API under its freshness rules. The schema therefore makes prices nullable, timestamped and auto-expiring, and the default UI pattern is "Check price" with no figure. This is enforced in data and components, not left to author discipline.
3. **The working name is a launch blocker, deliberately surfaced now.** "Smart Amazon Finder" contains Amazon's trademark. It stays an internal codename; an independent public brand is required before Stage 11 (public content/domain). Recommendation is in PRODUCT-REQUIREMENTS.md §10 (Direction A: coined independent brand + descriptive tagline).

## 3. Decisions summary

| Decision | Choice | Status |
|---|---|---|
| Architecture style | Modular monolith: one SSR Worker (React Router 7 framework mode) + separate queue-consumer Worker for ingestion | IMPLEMENTED NOT VERIFIED (spike S-02, Stage 01) |
| Frontend stack | React 19, TypeScript strict, Tailwind 4, Vite (Cloudflare template pins) | VERIFIED (official Cloudflare framework docs + owner's production experience) |
| Data stores | D1 (system of record), R2 (original media only), KV (config/flags only), Queues (async jobs, DLQ mandatory) | VERIFIED (official docs/pricing) |
| Search | D1 + SQLite FTS5 first; graduation triggers defined for dedicated search | **PENDING spike S-01** (Stage 03) |
| Recommendations | Transparent rule-based scoring with rendered explanations; scorer is architecturally blind to commissions (tested in Stage 09) | IMPLEMENTED NOT VERIFIED |
| Data acquisition | Adapter pipeline with staging + licence descriptors; adapters: manual → CSV → (Creators API only if eligible) → other networks per-review. No scraper adapter exists by design | VERIFIED (as a compliance design) |
| Catalog launch scope | 2 verticals (Home Office & Productivity; Electronics Accessories), US/amazon.com, quality-gated (≈40 products at Stage 05) | IMPLEMENTED NOT VERIFIED |
| Monetization order | Content (11) → Associates/AdSense (12); modules independent with kill switches; disclosure component-enforced | IMPLEMENTED NOT VERIFIED |
| Cost envelope | Free tiers at launch; first paid step = Workers Paid $5/mo; ~$5–15/mo at the revenue-target traffic band | VERIFIED (official pricing; scenario traffic is labelled assumption) |
| Revenue target model | $5,000/month needs ≈ 57,500–189,000 sessions/month depending on the assumption row (base ≈ 92,000). Target, not a forecast | VERIFIED (arithmetic on stated assumptions) |

## 4. Final review checklist (brief §16)

| Check | Result |
|---|---|
| All required documents exist | **VERIFIED** — file listing: 13 documents + this report present |
| Architecture internally consistent | **VERIFIED** — modules A–S cross-referenced across PRD/System/API/DB/UX/Roadmap; entities in the API contract match the schema; page inventory matches SEO indexation list |
| Database relationships coherent | **VERIFIED** — products/offers separated; FK graph has no cycles except the deliberate category self-reference; provenance columns on every externally-sourced table |
| Technology choices compatible | **VERIFIED** — React Router 7 framework mode + Cloudflare Vite plugin is Cloudflare's official first-class path (SSR required; SPA mode unsupported and not used); D1/KV/R2/Queues bindings are supported in that runtime |
| Security addressed | **VERIFIED** (as a plan) — SECURITY-PLAN.md covers admin auth/RBAC, user auth, validation, CSRF, redirector abuse, secrets, audit, privacy, incident response |
| Amazon compliance constraints documented | **VERIFIED** — DATA-SOURCING-AND-COMPLIANCE.md §3–§4 with official-source findings |
| Monetization assumptions transparent | **VERIFIED** — every revenue input labelled (A1)–(A6); no commission rate asserted as fact; no revenue guaranteed |
| Roadmap dependencies correct | **VERIFIED** — dependency map in MASTER-ROADMAP.md; monetization strictly after content; data integration after admin/staging; brand gate before public launch |
| No existing project modified | **VERIFIED** — FinanceBleu check: 0 files in `~/workspace/financebleu` modified during this stage (timestamp-marker check); GitHub repo still empty (no upload performed); nothing deployed |

## 5. Unresolved questions (explicit, carried forward)

| ID | Question | Needed by | Owner |
|---|---|---|---|
| D-01 | Public brand name (independent brand recommended) + domain | Stage 11 gate; earlier is better (affects Stage 01 naming only cosmetically) | Project owner |
| A-01 | Legal identity + country for Associates/AdSense accounts (affects tax/payment verification at Stage 12) | Stage 12 | Project owner |
| U-01 | Exact current Associates disclosure wording + new-account review thresholds — re-read in Associates Central at application | Stage 12 | Compliance |
| U-02 | Creators API licence specifics per field — fully readable only with an eligible account | If/when eligible | Compliance |
| U-03 | AdSense approval for the launched site | Stage 12 (Google's decision) | External |
| S-01 | Is FTS5 fully functional/performant in D1 at 10k rows? | Stage 03 spike | Backend |
| S-02 | React Router 7 + Cloudflare template SSR + D1 binding proof | Stage 01 spike | Frontend |
| Q-04 (PRD §12) | Public user accounts at launch, or deferred until Stage 13 evidence? Roadmap currently gates on evidence | Stage 05 decision point | Project owner |

## 6. Exact execution status

- Application created: **No** (by instruction).
- Dependencies installed: **None**.
- Deployments: **None**.
- GitHub: repository `mustaphatammouz59-lgtm/Smart-Amazon-Finder` verified still empty on 2026-11-08; **no files uploaded** (Stage 00 documents are local pending owner approval).
- FinanceBleu and all other projects: **untouched** (verified, §4).
- Next action: **none** until the owner approves this report. On approval, Stage 01 begins per MASTER-ROADMAP.md.
