# UX/UI Specification — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (specification and text wireframes; the visual design system is built in Stage 02).
Date: 2026-11-08.

## 1. Design direction

- **Premium, professional, independent.** A research-tool aesthetic: calm surfaces, strong typography, data presented like a well-edited buying desk — not a coupon blog and not a marketplace clone.
- **Never imitate Amazon:** no Amazon colour palette (no black/yellow "smile" language), no Amazon-style product tiles with star-rating mimicry, no Amazon logos except where a program's own link rules require a specific asset in a specific placement (decided per-program in Stage 12 with legal check).
- **Mobile-first.** The majority of organic product-research traffic is mobile; every template is designed at 360 px first and enhanced upward.
- Working design tokens (Stage 02 finalises): deep navy primary (trust, finance-adjacent seriousness), one restrained teal accent, warm off-white surfaces, near-black text. This direction is deliberately different from marketplace orange/yellow language.

## 2. Design system specification (Stage 02 deliverable shape)

| Layer | Contents |
|---|---|
| Tokens | Colour (navy scale, accent, semantic success/warn/error, neutrals), type scale (display/h1–h3/body/small/caption), spacing 4-pt scale, radii, shadows, breakpoints (360/640/768/1024/1280), motion (150–250 ms, respects `prefers-reduced-motion`). |
| Typography | One licensed/system display+text pairing, self-hosted (no third-party font CDN — performance and privacy). Fallback stack must be metrically safe (CLS rule). |
| Components | Header/nav, mega-category menu (later), search bar w/ suggestions shell, filter rail + mobile filter sheet, product card, comparison table, spec table, price/freshness label, disclosure banner, affiliate link button (visually consistent, always paired with disclosure component), guide typography set, forms (finder flows), pagination, breadcrumbs, footer, admin shell (sidebar, data tables, forms, status pills). |
| States | Every data component ships with loading (skeleton, fixed dimensions), empty, error and stale-data states. No layout shift between states: dimensions are reserved. |
| Iconography | One open-licence icon set, inline SVG, no emoji in UI chrome. |

## 3. Public page inventory and wireframes (text form)

Conventions: `[ ]` = block, stacked top→bottom at mobile width; desktop arrangement noted where it differs.

### 3.1 Homepage `/`
```
[Skip link] [Header: brand | search | nav: Finder, Compare, Guides, Categories | Account]
[Hero: one-sentence promise + primary CTA "Start the Product Finder" + secondary "Browse categories"]
[Category entry cards: Home Office & Productivity | Electronics Accessories]
[How it works: 3 steps — Tell us the job / Compare on criteria / Check alternatives]
[Editorial shelves: "Latest buying guides" (real guides only)]
[Trust strip: independence statement + affiliate disclosure summary + link]
[Footer: nav, legal (Privacy/Terms/Disclosure/About/Contact), independence notice]
```
Rules: no product prices in hero; no fake "trending" claims; shelves are empty-state-safe (section hides if it has no published content).

### 3.2 Search results `/search`
```
[Header] [Breadcrumb: Home / Search]
[Query summary bar: "Results for '…' (N)" + sort select]
[Desktop: filter rail left (categories, brands, price bands*, spec facets, clear-all)]
[Mobile: "Filters" button → full-screen sheet, sticky Apply bar w/ result count]
[Result list: product cards — image (if licensed), name, brand, 2–3 key specs,
  price block OR "Check price" (policy), freshness label, Compare checkbox]
[Pagination (numbered, crawlable URLs)]
[* Price facets render only when lawful current price data exists for the result set.]
```

### 3.3 Product detail `/product/:slug`
```
[Breadcrumb: Home / Category / Product]
[H1 name + brand + variant selector]
[Gallery (licensed media only) | Buy panel: current offers list — merchant, price +
  freshness timestamp OR "Check price on Amazon", affiliate disclosure line,
  outbound button via /api/out]
[Key specs table] [Editorial summary — clearly our words] [Comparison criteria scores]
[Price history chart — only if real snapshots exist, else omitted entirely]
[Alternatives block (cheaper / better fit / simpler)]
[Related products] [Guide links]
```

### 3.4 Category page `/category/:slug`
Editorial intro (original, ≥ genuine value), sub-category chips, finder CTA, product listing with the category's facets, top guides for the category, FAQ block (real questions, human-written). Thin-category rule: a category with < 5 published products and no guide is `noindex` (SEO-STRATEGY.md §6).

### 3.5 Comparison `/compare` and shared `/compare/:token`
Criteria table (rows = the category's published criteria, columns = products), differences highlighted, per-product outbound links with disclosure, "why these criteria" explainer, save/share actions. Print stylesheet required.

### 3.6 Alternatives `/product/:slug/alternatives`
Lead product summary, three labelled groups (Cheaper / Better fit / Simpler), each card states the trade-off in one sentence generated from spec deltas + an editor note field.

### 3.7 Gift Finder `/gift-finder`
Progress-stepped flow (1 Recipient → 2 Occasion → 3 Budget → 4 Interests → Results). One question per screen on mobile; back navigation preserves answers; results are a shortlist where **every card shows its reason** ("Chosen because: under $50, quiet, top-rated fit for home office" — without invented ratings; reasons cite budget/specs/tags only).

### 3.8 Product Finder `/product-finder`
Category pick → budget → priority ranking (drag or numbered) → must-have specs → results (module G) with reason lines and a "compare these" action. All steps skippable; partial answers still produce results with stated assumptions.

### 3.9 Buying guides `/buying-guides`, `/guide/:slug`
Index grouped by category. Guide page: TOC, structured sections (How to choose / Specs that matter / Budget tiers / Mistakes to avoid / FAQ), disclosure banner at top, product mentions only inside criteria context, "last reviewed" date, author = editorial team identity (no fabricated experts).

### 3.10 Editorial articles `/articles`, `/article/:slug`
Same typographic system as guides; category/tag browsing; no infinite scroll (pagination).

### 3.11 Utility pages
About (mission, independence, funding model summary), Contact (form that states honestly if delivery is not yet wired + published email channel once the domain exists), Privacy Policy, Terms of Use, Affiliate Disclosure (full text, plain language, linked from footer and from every affiliate component).

## 4. Admin interface inventory

Shell: left sidebar (Dashboard, Products, Categories, Offers, Sources/Staging, Content, Affiliate Programs, Users, Analytics, Audit Logs, Settings), top bar with environment badge (staging/production visually distinct), role shown.

| Screen | Key interactions |
|---|---|
| Dashboard | Freshness panel (sources by last refresh), validation failures queue, catalog counts by status, click/revenue **estimates labelled as estimates**. |
| Product list/editor | Faceted table; editor with provenance panel per field (source, licence, updated); publish checklist gate. |
| Category manager | Tree editor, attribute-definition editor per category. |
| Offer manager | Offer table, per-offer refresh, licence status, stale-price warnings. |
| Sources & staging | Adapter configuration, import runs, staging review (diff vs. catalog, approve/reject). |
| Content | Guide/article list, block editor, preview, publish workflow, pre-publish checklist results. |
| Affiliate | Program list, link template tester, click stats. |
| Users | Account list, suspend, data-request handling. |
| Analytics | Traffic, search terms (with zero-result report), finder funnels, clicks. |
| Audit logs | Filterable, read-only table. |
| Settings | Feature flags, program activation, maintenance notices. Owner role only. |

Admin UX rules: destructive actions require typed confirmation or two-step confirm; every save shows what changed (audit link); staging environment is colour-banded so it can never be mistaken for production.

## 5. Component inventory (build list for Stage 02)

Header, MobileNav, Footer, Breadcrumb, SearchBar, FilterRail, FilterSheet, SortSelect, Pagination, ProductCard, OfferList, PriceLabel (with freshness), DisclosureBanner, AffiliateButton, SpecTable, ComparisonTable, ScoreReasonList, FinderStepper, FormField set (input/select/checkbox/radio/slider), GuideBody typography, FaqAccordion (accessible, button-based), Skeleton set, EmptyState, ErrorState, StaleDataBadge, Toast, Modal/Confirm, AdminShell, DataTable, StatusPill, ProvenancePanel, PublishChecklist.

## 6. Interaction and content rules

- Filter/search interactions update URL state (shareable, back-button correct).
- Compare selection persists across pages in the session (compare tray, max 4).
- No auto-playing media, no pop-ups, no exit-intent overlays, no fake countdowns — ever (product trust rules, PRODUCT-REQUIREMENTS.md §7).
- Prices, when lawfully shown, always render with their observation timestamp adjacent (component-level rule, not author discipline).
- Affiliate buttons always render through the AffiliateButton component, which refuses to render without the disclosure context flag from the page.

## 7. Accessibility requirements (WCAG 2.2 AA target)

- Full keyboard operability; visible focus states from the token set; skip links on public and admin.
- Landmarks + one H1 per page; heading order never skips for styling.
- Colour contrast: body text ≥ 4.5:1, large text/UI ≥ 3:1 — verified in Stage 02 token sign-off with tooling, recorded in the stage report.
- Forms: labels always visible (no placeholder-only), errors linked via `aria-describedby`, error summary on submit.
- Touch targets ≥ 44×44 px; filter sheet and stepper tested with screen reader pass (NVDA/VoiceOver) at Stage 02 exit.
- Motion: `prefers-reduced-motion` disables non-essential animation.

## 8. Responsive behaviour

- Breakpoints: 360 (base), 640, 768, 1024, 1280. Content max-width ~1200 px; product grids 1→2→3→4 columns.
- Comparison tables on mobile become stacked per-product panels with sticky criterion labels (never horizontal-scroll-only).
- Admin is desktop-first but fully usable at 768 px for review/publish tasks.

## 9. Verification for this specification

- Page inventory cross-checked against SEO-STRATEGY.md indexation list and SYSTEM-ARCHITECTURE.md modules: VERIFIED (internal consistency, Stage 00).
- Visual designs, wireframe fidelity and accessibility measurements: **PENDING** — Stage 02 deliverables, tested as described in ACCEPTANCE-CRITERIA.md.
