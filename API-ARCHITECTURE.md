# API Architecture — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (contract design; no endpoints exist yet).
Date: 2026-11-08.

## 1. Principles

1. **SSR first.** Public pages are server-rendered by React Router loaders. JSON APIs exist for interactive islands (search-as-you-type, filters, finders, comparison building) and for admin — not as a duplicate of every page.
2. **One validation layer.** Every input (query, body, params) passes a schema validator on the server before any business logic, on every route, including "internal" ones. Client validation is UX only.
3. **Authorisation on the server, per request.** Especially for `/api/admin/*` and `/api/account/*`: role checks happen in the handler, never by hiding UI.
4. **No data the licence forbids.** API responses include price/availability fields only when the underlying offer row currently satisfies the display rules (DATABASE-DESIGN.md §6.1, DATA-SOURCING-AND-COMPLIANCE.md §4).
5. **Stable contracts.** Public API is versioned (`/api/v1/…`); admin API is unversioned but internal. Breaking changes require a new version; additive changes do not.
6. **Errors are typed and safe.** §6 format; never stack traces, SQL, binding names or provider payloads.

## 2. Transport and conventions

- HTTPS only; JSON bodies (`application/json`); UTF-8.
- IDs: integer database IDs are never exposed for public resources — public resources use slugs or opaque public IDs (prevents enumeration of catalog size and admin record IDs). Admin APIs use integer IDs inside the authenticated boundary.
- Pagination: cursor-based for lists (`?cursor=&limit=`, default 24, max 60), response includes `nextCursor`. Page-number pagination is used only for SEO-visible listing pages (server-rendered URLs, SEO-STRATEGY.md §7).
- Filtering: explicit, whitelisted parameters per endpoint; unknown parameters are ignored, malformed values return 400 (never silently coerce).
- Caching: anonymous GET responses may be edge-cached (60s search, 300s catalog fragments) except any response containing price fields, which follows the licence freshness window and is marked `private` when account-specific.
- Rate limits: per-IP token buckets (SECURITY-PLAN.md §6) — search 60/min, outbound redirect 120/min, auth 5/min, admin write 120/min per admin.

## 3. Public API (`/api/v1`)

| Endpoint | Method | Purpose | Key inputs | Response essentials |
|---|---|---|---|---|
| `/api/v1/search` | GET | Keyword + faceted search | `q`, `category`, `brand[]`, `priceMin`, `priceMax`, spec facets (whitelisted per category), `sort`, `cursor` | results (product cards), facets with counts, total estimate, `searchId` |
| `/api/v1/products/:slug` | GET | Product detail data for interactive blocks | slug | product, specs, offers (policy-filtered), media, related IDs |
| `/api/v1/products/:slug/alternatives` | GET | Alternatives with trade-off data | `mode` (cheaper/fit/simpler) | alternatives + cited delta fields |
| `/api/v1/products/:slug/price-history` | GET | Real snapshot series | `range` (90d/1y/all) | points[] (price, observed_at), source label — empty state, never synthetic data |
| `/api/v1/categories/:slug/products` | GET | Category listing w/ filters | filters as search | product cards + facets |
| `/api/v1/recommendations` | POST | Rule-scored finder results | needs profile {category, budget, priorities, mustHaves} | ranked products + reason codes per product |
| `/api/v1/gift-finder` | POST | Gift shortlist | {recipientType, occasion, budgetBand, interests[]} | shortlist + reason per item |
| `/api/v1/comparisons` | POST | Create anonymous comparison | product public IDs (2–4) | comparison with signed share token |
| `/api/v1/comparisons/:token` | GET | Read shared comparison | token | comparison view model |
| `/api/v1/guides/:slug/related` | GET | Guide → catalog cross-links | slug | product/category cards |

## 4. Outbound redirector

| Endpoint | Method | Purpose | Notes |
|---|---|---|---|
| `/api/out/:offerPublicId` | GET | Log click, then 302 to merchant | Allowlist: destination host must belong to an **active** affiliate program; anything else → 400. Sets no cookies. Response is never cached. The destination URL is built server-side from the offer record + program template (module N) — the client never supplies a URL. |

## 5. Account API (`/api/account`, session required)

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/account/favorites` | GET/POST | List / add favourite |
| `/api/account/favorites/:productId` | DELETE | Remove favourite |
| `/api/account/comparisons` | GET/POST | List / save comparisons |
| `/api/account/alerts` | GET/POST | List / create price alerts |
| `/api/account/alerts/:id` | PATCH/DELETE | Update / delete alert |
| `/api/account/export` | GET | Download own data (JSON) |
| `/api/account` | DELETE | Delete account (anonymise per DATABASE-DESIGN.md §8) |

Auth endpoints (register/verify/login/logout/password or magic-link flows) are specified in SECURITY-PLAN.md §4; their exact shape is finalised in Stage 03 with the mail provider decision.

## 6. Admin API (`/api/admin`, Access + session + RBAC required)

| Area | Endpoints (pattern) | Roles |
|---|---|---|
| Dashboard | `GET /api/admin/overview` (catalog health, freshness, validation failures) | viewer+ |
| Products | `GET/POST /api/admin/products`, `GET/PATCH /api/admin/products/:id`, `POST …/:id/publish`, `POST …/:id/archive` | editor (write), publisher (publish) |
| Categories/Brands | CRUD under `/api/admin/categories`, `/api/admin/brands` | admin |
| Specs/Attributes | `/api/admin/categories/:id/attributes`, product spec editor endpoints | editor |
| Offers | `/api/admin/offers`, refresh trigger `POST /api/admin/offers/:id/refresh` (queues a job) | editor |
| Sources | `/api/admin/sources`, `POST /api/admin/sources/:id/import` (to staging), staging review `GET/PATCH /api/admin/staging/:id` | admin |
| Content | `/api/admin/guides`, `/api/admin/articles` + publish workflow transitions | editor/publisher |
| Affiliate | `/api/admin/programs`, link-template test endpoint (renders sample link, validates format) | admin |
| Users | `/api/admin/users` (list, suspend) — no password material is ever exposed | admin |
| Analytics | `/api/admin/analytics/*` (rollups, search terms, clicks) | viewer+ |
| Audit | `GET /api/admin/audit` (read-only, filterable) | admin |
| Settings | `/api/admin/settings` (feature flags, program statuses) | owner |

Every admin mutation writes an `audit_logs` row in the same transaction as the change (where the platform allows) or compensates with a queued audit write that is monitored for loss.

## 7. Internal job contracts (Queues)

| Queue | Producer | Consumer job | Idempotency key |
|---|---|---|---|
| `ingest` | Admin import action, schedulers | Run adapter fetch → staging | source + external_ref + payload hash |
| `validate` | ingest | Validate staged records, mark pass/fail with reasons | staging record id |
| `refresh-offers` | Cron schedule | Re-fetch offer data via adapter, write price_history snapshot, null stale prices | offer id + observation window |
| `reindex-search` | Catalog publish events | Rebuild FTS rows for affected products | product id + updated_at |
| `sitemaps` | Publish events, nightly | Regenerate sitemap files, verify vs. routes | build date |
| `alerts` | refresh-offers completion | Evaluate active alerts, prepare notifications | alert id + price point |
| `rollups` | Nightly cron | affiliate_clicks/analytics rollups + retention enforcement | day |

Dead-letter queues on all of the above; consumers are written to be safely retryable (idempotency keys are mandatory, not aspirational).

## 8. Error format

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Human-readable, safe to display.",
    "fields": { "budget": "Must be a positive number." },
    "requestId": "req_…"
  }
}
```

Standard codes: `VALIDATION_FAILED` (400), `UNAUTHENTICATED` (401), `FORBIDDEN` (403), `NOT_FOUND` (404), `CONFLICT` (409, e.g. duplicate slug), `RATE_LIMITED` (429, with `Retry-After`), `UPSTREAM_UNAVAILABLE` (502, source adapter failures — public responses degrade instead where a page can render without the field), `INTERNAL` (500).

## 9. Versioning and deprecation

- `/api/v1` is the only public version at launch. Deprecation requires: new version live, old version supported for ≥ 6 months, usage measured in analytics before removal.
- The SSR loader data contracts are internal and evolve with the app; they are not a public API and are never documented as one.

## 10. Security requirements (summary — full spec in SECURITY-PLAN.md)

- Schema validation on all inputs; parameterised SQL exclusively (no string-built queries).
- CSRF: SameSite=Lax session cookies + origin checks on mutations; token-based CSRF for admin mutations.
- Output encoding: JSON via serializer only; any HTML rendered from stored content passes the sanitiser used by the CMS (structured blocks, no raw HTML storage).
- The redirector is the single most abused-prone endpoint: allowlist, rate limit, and no user-supplied destination — enforced by tests (ACCEPTANCE-CRITERIA.md).
