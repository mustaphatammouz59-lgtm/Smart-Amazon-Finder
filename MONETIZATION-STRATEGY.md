# Monetization Strategy — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (design; zero revenue exists and none is claimed).
Date: 2026-11-08. Target: USD 5,000/month gross — a planning target, not a forecast (see §6 for the arithmetic and its assumptions).

## 1. Module independence

Each revenue module is independently activatable and independently killable (KV feature flags + program status), so a policy change in one programme never takes down the others or the site:

| Module | Activation gate | Kill switch |
|---|---|---|
| Amazon Associates | Account approved + terms re-read + disclosure live + module N live | Program status → suspended removes links/prices |
| Google AdSense | Site launched with substantial original content + Google approval (external) | Ad config flag off; slots collapse without layout shift |
| Other affiliate networks | Per-network licence review (DATA-SOURCING-AND-COMPLIANCE.md §6) | Per-program status |
| Sponsored placements (future) | §7 rules + legal review | Per-slot flag |

## 2. Amazon Associates module

- Links are produced **only** by affiliate link management (module N): offer record → program link template → tagged destination. Nobody hand-builds tagged URLs in content; the CMS inserts product references, and rendering resolves them through module N.
- Tracking: outbound clicks are logged through `/api/out` (module Q) — this measures *our* click-out rate only.
- **Attribution limitations (must be understood by the owner):** Amazon attributes purchases inside its own system and time windows (programme-defined; clicks and the resulting orders are visible only in Associates Central reports, in aggregate, after the fact). Our click logs can never be reconciled 1:1 with Amazon orders; earnings reporting in admin imports Associates aggregate reports manually and labels everything else as estimates. Cookie/window rules and commission structures are set by Amazon per category and change at Amazon's discretion — **this plan assumes no specific commission rate anywhere**; §6 uses an explicitly-labelled *effective-rate assumption* purely for target modelling.
- Commission reporting: monthly manual import ritual (CSV from Associates Central → `analytics_daily`-adjacent earnings table), showing clicks (ours), ordered items, shipped revenue and fees (theirs), so effective rates are learned from reality, not brochures.

## 3. Disclosure placement (non-negotiable design)

1. **Affiliate Disclosure page** — full text, plain language, linked in the footer of every page.
2. **Site-wide footer line** using the exact statement required by the then-current Operating Agreement (copied verbatim at activation; see DATA-SOURCING-AND-COMPLIANCE.md §4).
3. **Per-page banner** on any page containing affiliate links (product, comparison, alternatives, guide with product links) — above the first affiliate link, not below the fold of legal text.
4. **Component-level enforcement:** the AffiliateButton component requires the page's disclosure context; a page that renders an affiliate link without a disclosure banner fails its render test (ACCEPTANCE-CRITERIA.md).

## 4. Merchant management

- Merchants and programs are data (`merchants`, `affiliate_programs`), each with: terms URL, link template, tracking parameter, status, last terms-check date, and a notes field for licence specifics.
- Adding a merchant = compliance review (DATA-SOURCING-AND-COMPLIANCE.md §6) + template fixture tests + disclosure review. There is no "just paste a link" path.
- Price comparison across merchants is restricted (see the comparison-display clause in DATA-SOURCING-AND-COMPLIANCE.md §4) and deferred until specifically designed and approved.

## 5. Google AdSense module

- Apply only after: final brand/domain live, the 2 launch verticals populated, guides published, legal pages live — i.e. a real site Google can approve. Approval is Google's decision (gate S-04); rejection changes nothing architecturally (slots are config).
- Placement strategy (performance-first): maximum 3 units per page; none above the H1 on mobile; none inside finder flows or comparison tables; in-article units only in guides after the second major section; all slots have reserved fixed dimensions (CLS budget, SEO-STRATEGY.md §8); ads never styled to resemble product cards, buttons or navigation (policy + trust).
- AdSense revenue is modelled only via Page RPM assumptions in §6 — RPM is an outcome, not a setting.

## 6. The $5,000/month target — explicit assumption model

All inputs are **assumptions for planning**, marked (A). None are provider-published figures for this site (it has no traffic). Commission rates are Amazon's to set and change; the model uses one blended *effective* rate purely as arithmetic.

**Assumption set (base case):**
- (A1) Page views per session: 2.2
- (A2) AdSense Page RPM: $18 → per-session ad revenue = 2.2 × 18/1000 = **$0.0396**
- (A3) Outbound affiliate CTR: 15% of sessions produce ≥ 1 merchant click
- (A4) Click → shipped-order conversion: 4%
- (A5) Average qualifying order value: $70
- (A6) Effective blended commission: 3.5% → per-order earnings = 70 × 0.035 = **$2.45**; per-session affiliate revenue = 0.15 × 0.04 × 2.45 = **$0.0147**
- Blended per-session revenue ≈ **$0.0543** → sessions needed for $5,000 ≈ **92,000 sessions/month** (~3,070/day), ≈ 203,000 page views/month.

**Sensitivity (sessions/month needed for $5,000):**

| Scenario | RPM | CTR | Conv. | AOV | Eff. rate | Rev/session | Sessions needed |
|---|---|---|---|---|---|---|---|
| Pessimistic | $10 | 10% | 3% | $50 | 3.0% | $0.0265 | ≈ 189,000 |
| Base | $18 | 15% | 4% | $70 | 3.5% | $0.0543 | ≈ 92,000 |
| Optimistic | $25 | 20% | 5% | $80 | 4.0% | $0.0870 | ≈ 57,500 |

Reading: the target is a **traffic-and-trust problem**, not a settings problem — it requires on the order of 60k–190k monthly sessions of genuinely useful content. Any single input moving (Amazon changing category rates, AdSense RPM seasonality) moves the requirement materially; the model is re-run monthly from real data once live (Stage 13 ritual).

**Gross vs. net:** at base case, infrastructure is $5–15/month (COST-AND-SCALABILITY.md), so net ≈ gross − ~$15 − domain/tools − taxes/fees the owner bears as the account holder. Payment thresholds, tax withholding on US programme earnings for a non-US account holder, and payment-method availability are owner-verification items at Stage 12 (PENDING — depends on the owner's country/tax status, deliberately not assumed in A-01).

## 7. Sponsored placements (future module, rules fixed now)

- Labelled "Sponsored" at the placement itself; sold as flat placements, never as ranking influence (module G's scorer has no sponsored input); no sponsored content in comparison criteria or guide recommendations; a public page explains the programme before the first placement is sold. No sponsored placement exists at launch.

## 8. What we will never do

Guarantee revenue (to anyone, in any copy); buy traffic for arbitrage; incentivise clicks; place affiliate links in email; use Amazon links in offline/PDF material; cloak links; present estimates as earnings; publish "earnings screenshots" marketing. Breaching programme terms to chase the target ends the business the target depends on.
