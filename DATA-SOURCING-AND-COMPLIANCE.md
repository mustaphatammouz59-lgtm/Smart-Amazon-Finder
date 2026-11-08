# Data Sourcing and Legal Compliance — Smart Amazon Finder

Stage 00. Status: **VERIFIED** for the Amazon API findings in §3 (official Amazon documentation, checked 2026-11-08, citations inline); **IMPLEMENTED NOT VERIFIED** for programme-policy summaries in §4 that must be re-read in the live Associates Central documents at application time (Amazon updates them; the April 2026 update cycle proves they change).
This document is an engineering-compliance design, **not legal advice**. A qualified review is a pre-launch gate (MASTER-ROADMAP.md Stage 14).

## 1. Governing principle

The platform uses only data it has a documented right to use, for exactly the purposes and durations that right allows. Where a right is absent, the field is omitted — the UI is designed to be complete and useful **without** prices, ratings or images where they are not licensed (see UX-UI-SPECIFICATION.md).

## 2. Absolute prohibitions

1. **No scraping** of Amazon (or any merchant) pages, search results or APIs, in any form: no HTML scraping, no "unofficial" APIs, no headless-browser harvesting, no buying scraped datasets whose provenance is scraping.
2. **No assumption of API access.** No design element may depend on Amazon API data until the eligibility facts in §3 are met and credentials are issued.
3. **No fabricated data:** no invented prices, discounts, ratings, review counts, review text, stock states or "was $X" strikethroughs.
4. **No copied editorial content:** product descriptions, feature bullets and review text from merchant pages are the merchant's/manufacturer's copyright — they are never republished as our content. Our spec *values* (facts like weight or wattage) captured through authorised channels are data; marketing copy is not.
5. **No Amazon branding assets** (logos, badges, "Amazon's Choice" language, star-rating graphics) except a specific asset in a specific placement that the then-current programme terms expressly provide.

## 3. Amazon API reality — VERIFIED 2026-11-08 (official sources)

### 3.1 PA-API 5 is deprecated and dead for new builds
Amazon's official Creators API documentation states that the Product Advertising API 5.0 has been **deprecated and replaced by the Creators API**, and that applications still calling PA-API 5 receive `403 Forbidden / AccessDeniedException` with the message "Product Advertising API is deprecated. Please migrate to Creators API". Any older plan, tutorial or plugin built on PA-API 5 is obsolete.
Source: Amazon Associates Central — Creators API documentation (error codes and migration pages), read 2026-11-08.

### 3.2 The successor: Creators API, with a sales gate
Per the same official documentation:
- Access requires an Associates account that meets the current eligibility criterion: **"the account must have made 10 qualified sales in the trailing 30 days"** (official wording in the `AssociateNotEligible` error reference).
- Access is therefore **not available to a new site**: eligibility is earned from referred sales generated with ordinary Associates links, per marketplace.
- Authentication is OAuth-style via Login with Amazon: credentials are a Credential ID + Secret created in Associates Central (Tools → Creators API); PA-API AWS keys do **not** carry over. Access tokens are valid **1 hour** and must be cached and reused (the token endpoint rate-limits clients that fetch a token per call).
- Throttling exists (429 `ThrottleException` with `retryAfterSeconds`); new credentials start at a low request rate, so the adapter must queue, cache and back off by design.

### 3.3 Consequence for this platform (design decision D-C1)
The launch data strategy **cannot and does not depend on Amazon API data**. The adapter order (SYSTEM-ARCHITECTURE.md §5) is: manual editorial entry → CSV import → other authorised network feeds (each licence-reviewed) → Creators API **only if and when** the Associates account becomes eligible, treated at that point as an *enrichment* source (fresh prices/images under licence), never as the catalog's foundation. This sequencing also matches the programme's own logic: sales from content and standard links come first; API access follows.

### 3.4 Associates account lifecycle (to re-verify at application)
Programme participation itself has an activity requirement: new Associates accounts are reviewed after initial qualifying sales (widely documented as 3 qualifying purchases within the first 180 days; the account is closed if not met). **Status: IMPLEMENTED NOT VERIFIED** — the exact current threshold and review terms must be read from the live Operating Agreement inside Associates Central on the day the owner applies, and recorded in this document's change log. Design impact is nil (content-first launch), but it is a real deadline for the monetization stage (RISK-REGISTER.md R-04).

## 4. Field-by-field restrictions (Amazon programme rules — design summary)

The rules below summarise Amazon's Associates Operating Agreement / Program Policies as they are consistently published. Each carries an action rule implemented in our schema and components. Amazon updates these documents (an update took effect in April 2026); the compliance owner must re-confirm each row against the live documents before Stage 12 activation and record the date.

| Data / practice | Rule (summary) | Our implementation |
|---|---|---|
| **Prices** | Prices/availability may be displayed only when Amazon serves the displaying link itself, or the data comes via Creators API / (legacy) PA-API under its licence. Hand-typed prices are prohibited. | `offers.current_price_cents` nullable; UI renders a figure **only** for API-sourced, in-window data (DATABASE-DESIGN.md §6.1). Default state = "Check price" with no figure. |
| **Price freshness & timestamp** | API-derived pricing must be refreshed within the licence window (historically 24 h cache limit for product data) and, when refreshed less often than hourly, shown with a date/time stamp and the "accurate as of … subject to change" statement. | `price_observed_at` on every price; PriceLabel component always renders the timestamp; the refresh job nulls out-of-window prices automatically. |
| **Comparison displays** | If prices for the same/similar products from non-Amazon sources are shown in a comparison format, programme policies impose specific obligations (including showing Amazon's lowest new — and where provided used — price). | Multi-merchant price comparison tables are **deferred** until this clause is re-read and a specific design is approved (Stage 12 gate). Single-merchant offers lists are unaffected. |
| **Product images** | Images may be used only via authorised channels (API-provided URLs under licence, or Amazon-served link formats). Downloading product images from Amazon pages and re-hosting them is not authorised. | `product_media.kind = 'licensed_url'` renders from the licensed URL with `expires_at` licence sweep; R2 holds only original/licensed-by-us media. No image scraping, ever. |
| **Ratings / reviews** | Customer ratings and review content are Amazon data with their own display licence via the API; they may not be scraped, copied, or paraphrased as our own. | No ratings/reviews at launch. If Creators API access is ever granted, ratings render only in the licensed format with attribution, or not at all (product decision). We never display a star graphic we invented. |
| **Availability** | Same regime as prices: API/Amazon-served only, freshness-bound. | `availability_state` shares the price pipeline and freshness rules; default = omitted. |
| **Affiliate links** | Links must use the account's tag, must not be cloaked/misrepresented, must not be used in prohibited placements (offline material, emails — Associates links are not permitted in email newsletters), no incentivised clicks, no link generation for products other than as described (variant accuracy). | Module N is the only link builder; alert emails link to **our pages**, never tagged Amazon links (SYSTEM-ARCHITECTURE.md module O). Link text describes the actual destination product/variant. |
| **Disclosure** | Sites must clearly state participation ("As an Amazon Associate I earn from qualifying purchases" — the exact current required statement must be copied from the live agreement). FTC rules additionally require clear, conspicuous disclosure of material connections near endorsements. | Affiliate Disclosure page + site-wide footer line + per-page disclosure banner wherever affiliate links appear (component-enforced, UX-UI-SPECIFICATION.md §6). |
| **Trademarks** | Amazon marks may be used only as permitted (nominative use to identify products; no brand impersonation, no trademark in our own branding/domain in a way that implies endorsement). | Brand decision gate D-01: the working name contains "Amazon" — see PRODUCT-REQUIREMENTS.md §10 (independent public brand recommended). Product pages use the name textually to identify the merchant, nothing more. |
| **Content retention** | API data retention is licence-bounded (the 24-hour pricing cache rule above; other content per the API licence). | Licence descriptors stored per source record (`licence_json`); retention jobs enforce expiry per field class (DATABASE-DESIGN.md §8). |
| **Special links / promotions** | Time-limited promotion references must be removed when the promotion ends; no "lowest price ever" style claims without a verifiable basis. | No promotional claims at launch. Price-history claims may only cite our own snapshot data, with the period stated. |

## 5. Data classes in our system

| Class | Examples | Source of truth | Storage/display rule |
|---|---|---|---|
| Licensed merchant data | Price, availability, API images/ratings (future) | Merchant API under licence | Stored minimally, freshness-stamped, auto-expired. |
| Merchant reference data | ASIN / merchant item ref, destination URL | Merchant/programme | Identifier only; used to build links; not presented as content. |
| Independent editorial data | Summaries, verdicts, guide text, comparison criteria, gift tags | Our editors | Ours; retained indefinitely; never mixed into licensed fields. |
| Internal/derived data | Spec values measured/entered by editors from manufacturer documentation, scores, analytics | Us | Specs captured from **manufacturer** documentation (not merchant pages) are recorded with that source; scores are computed and explainable. |

Manufacturer spec sheets deserve one note: factual specifications (dimensions, wattage) are facts, but the *document* is copyrighted — we record values, we do not republish the document or its marketing text.

## 6. Other data sources (non-Amazon)

- **Other affiliate networks/merchants:** each requires its own licence review before an adapter is activated — feed terms, image rights, price display rules, retention. The review outcome is recorded in the program's `affiliate_programs` record and in this document's change log. No feed is "probably fine".
- **Manufacturer sites:** specs and manuals as above; no scraping at scale — manual capture at editorial time.
- **User data:** only what modules M/O need (email, favourites, alerts), under SECURITY-PLAN.md.

## 7. Compliance operating system

1. **Licence descriptors are data:** every adapter declares what may be stored/shown and for how long; the validation pipeline rejects records whose use would exceed it.
2. **Freshness is enforced by jobs,** not by editors remembering: stale prices null automatically; expired media unlinks automatically.
3. **Pre-publish checklist** (guides/content) includes: no typed prices, no copied text, disclosure present, links built via module N.
4. **Quarterly re-read** of Associates Operating Agreement/Policies and Creators API docs; changes logged here with date and design impact.
5. **Kill switch:** setting a program's status to `suspended` in admin removes its links/prices site-wide on the next cache cycle (feature flag in KV) — the response path if terms change or a notice is received.

## 8. Unresolved items (explicit)

- U-01: Exact current required disclosure wording and Associates review thresholds — re-read in Associates Central at application (Stage 12 gate). Status: PENDING.
- U-02: Creators API content licence specifics (which fields, retention per field, attribution format) — readable in full only with an eligible account's docs access; design assumes the strictest reading until then. Status: PENDING.
- U-03: Whether AdSense policies permit ads on pages whose primary outbound links are affiliate links — standard practice suggests yes with quality content, but approval is Google's decision (Stage 12 gate S-04). Status: PENDING.
- U-04: Trademark clearance for any final brand candidate (search + owner decision D-01). Status: PENDING.
