# Stage 02 — Implementation Plan (working document)

Basis: MASTER-ROADMAP Stage 02 (global design system), UX-UI-SPECIFICATION §§1,2,5,6,7,8,
PRODUCT-REQUIREMENTS §7 (trust rules), ACCEPTANCE-CRITERIA §2–§3, Stage 02 brief (2026-11-08).

## Inspection findings driving the plan (Stage 01 foundation design)
1. Homepage has no search entry at all (spec §3.1 header/hero expect search-first).
2. Hero is a plain text block; no visual anchor, no category entry cards in spec form.
3. Surface colour is cool grey-blue (#f7f9fb); spec §1 requires warm off-white surfaces.
4. No iconography system (spec §2: one inline-SVG icon set, no emoji in UI chrome).
5. Finder forms POST privately; spec §6 requires URL state (shareable, back-button correct).
6. Forms lack an error summary and aria-describedby wiring (spec §7).
7. No FilterRail/FilterSheet/SortSelect/FinderStepper/DisclosureBanner/FaqAccordion components
   (spec §5 build list) — pages use ad-hoc markup.
8. Gift Finder is a flat form; spec §3.7 requires a progress-stepped flow presentation.
9. Buying guides index is two plain cards; no grouped-by-category structure or guide metadata.
10. Footer lacks the trust/disclosure summary strip positioning of spec §3.1; header has no
    search affordance; touch targets on nav links are < 44px in places.

## Scope (frozen to spec §5 components that public templates need now)
Tokens v2 (warm surfaces, full navy/teal scales, semantic colours, type scale, radii,
shadows, motion) · Icon set (inline SVG, ~14 icons) · Header w/ search + MobileNav ·
Footer w/ trust strip · Breadcrumb · SearchBar · DisclosureBanner · CategoryCard ·
SectionHeading · FilterRail + FilterSheet (mobile <details>-based, no JS dependency) ·
SortSelect (as a criteria preference) · FinderStepper (gift flow) · FaqAccordion
(button-based, accessible) · Skeleton/Empty/Error states refresh · FormField error wiring
(error summary + aria-describedby) · Finder forms move to GET (URL state).
Pages: home (spec §3.1 order), product-finder, gift-finder, compare, alternatives,
buying-guides, about, contact, privacy, disclosure, terms, 404.
NOT in scope: /search, product detail, category, guide detail, articles, admin shell
(later stages per roadmap) · ProductCard/OfferList/PriceLabel/AffiliateButton render
no real data today → their *shell + states* ship inside finder/compare empty states only.

## Rules
Branch `stage-02` locally; no push; no deploy; production untouched.
Stage 00 docs read-only. Noindex protections unchanged. No fake data anywhere.
