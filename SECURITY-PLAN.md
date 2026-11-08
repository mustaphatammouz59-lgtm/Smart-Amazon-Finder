# Security and Privacy Plan — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (specification; controls are proven per-stage by the tests in §11).
Date: 2026-11-08.

## 1. Scope and threat model

Assets to protect: admin write access to catalog/content/prices-adjacent data (integrity = revenue + legal exposure), user account data (emails, favourites, alerts), affiliate programme credentials and API secrets, analytics integrity, and availability of the public site.

Primary threats: credential stuffing and session theft against admin/user auth; injection (SQL, XSS via stored content); abuse of the outbound redirector (open-redirect phishing); scraping/DoS of search; supply-chain compromise of dependencies; insider/error risk (one-operator project — mistakes are a bigger threat than malice; hence audit + publish gates); secret leakage via repo/logs.

## 2. Platform controls (Cloudflare layer)

- HTTPS everywhere, HSTS, TLS 1.2+; www/host canonicalisation at the edge.
- WAF managed rules enabled; bot management defaults on; country policy: none at launch (US-targeted content, global access allowed).
- Rate-limiting rules at the edge for `/api/*` and auth paths, backed by in-Worker limits (§6) so behaviour is testable in code, not only in dashboard config.
- Cloudflare Access protects `/admin` and `/api/admin` at the edge (identity allowlist) — an attacker without an allowlisted identity cannot even reach the app login. Access is a *pre-filter*; the app still authenticates and authorises independently (§3).

## 3. Admin authentication and authorisation

- Identity: Cloudflare Access identity (SSO) mapped to `admin_users.access_identity_ref`; the app creates its own session from the verified Access assertion.
- Roles (RBAC): `owner` (everything incl. settings, programs, user admin), `admin` (catalog, sources, users), `editor` (create/edit drafts, offers), `publisher` (publish/archive content and products), `viewer` (read-only incl. analytics/audit view where granted).
- Authorisation is enforced in every admin handler via a single policy middleware (endpoint × role matrix is a tested artifact — ACCEPTANCE-CRITERIA.md).
- Step-up rule: changing affiliate program templates, link templates or settings requires `owner` and writes a high-severity audit entry.
- Sessions: server-side session records, 12 h idle / 24 h absolute for admin, rotation on role change, immediate revocation list checked per request (cheap via KV with DB fallback).
- No shared accounts; the owner operates a named account like everyone else.

## 4. Public user authentication (module M)

- Email + password **or** magic link (provider decision in Stage 03 — no provider assumed now; if a mail provider is chosen it is for transactional mail only).
- Passwords (if used): Argon2id hashing (via a vetted library compatible with Workers), min length 10, breached-password check at registration where feasible, never stored/logged in plaintext, never emailed.
- Verification: email ownership verified before alerts/favourites sync; password reset via single-use, 30-minute, hashed tokens.
- Sessions: cookie `HttpOnly; Secure; SameSite=Lax`, 30-day rolling for users, rotation on login and privilege change; logout invalidates server-side.
- Auth endpoints are the most rate-limited in the system (§6) and return identical responses for existing/non-existing accounts (no enumeration).

## 5. Application security controls

- **Input validation:** schema validation for every API input (types, ranges, lengths, whitelists for enums/facets). Reject-by-default.
- **SQL injection:** parameterised queries only (D1 prepared statements); string-built SQL is a lint/review failure; spec-facet parameters come from per-category whitelists (API-ARCHITECTURE.md §2).
- **XSS:** React escaping by default; stored content is **structured blocks**, rendered by our components — raw HTML is never stored from the CMS; any future rich-text path passes a strict allowlist sanitiser. CSP: `default-src 'self'` with explicit allowlists (ad/analytics domains added only in their stages), `frame-ancestors 'none'` for admin, `object-src 'none'`.
- **CSRF:** SameSite=Lax + Origin/Referer checks on all mutations + per-session CSRF token for admin mutations.
- **Open redirect:** the `/api/out` redirector builds destinations server-side from offer records, host-allowlisted to active programs (API-ARCHITECTURE.md §4). No user-supplied URLs anywhere in redirect flows.
- **SSRF:** adapters fetch only their configured provider base URLs; no fetch-by-user-URL features exist; image proxying (if added) requires a licence + host allowlist review.
- **File uploads (admin media):** type sniffing (not extension trust), size caps, image re-encode where feasible, stored in R2 with random keys, served from a separate path with `Content-Disposition` rules for non-image types (ideally none — images only at launch).
- **Headers:** CSP (above), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal.
- **Dependency security:** lockfile committed; Dependabot (or equivalent) on the repo; CI runs `npm audit` (fail on critical) + typecheck/tests; no runtime dependencies with install scripts from untrusted sources; pin GitHub Actions by SHA.

## 6. Rate limiting and abuse prevention

| Surface | Limit (initial) | Notes |
|---|---|---|
| `/api/v1/search` | 60 req/min/IP | plus edge cache for identical anonymous queries |
| `/api/out/*` | 120 req/min/IP | click-fraud heuristics: burst + UA anomaly flags in analytics, never user-visible errors |
| Auth (login/register/reset) | 5 req/min/IP + per-account backoff | identical error responses |
| Admin writes | 120 req/min/admin | Access pre-filter already applies |
| Finder POSTs | 30 req/min/IP | stateless compute; cheap to serve, capped against scripted abuse |
| Contact form (if enabled) | 3 req/hour/IP + Turnstile (or equivalent) challenge | challenge provider decided in its stage; honest "not connected" state until then |

Scraping posture: catalog data is largely public by design; the defences are rate limits, cache efficiency, and the fact that volatile licensed fields are freshness-bound anyway. No robots-exclusion theatre.

## 7. Secrets management

- All secrets (Creators API credential secret, mail provider keys, session secrets, salts) live in Cloudflare Workers secrets / environment variables per environment — **never** in the repo, never in D1/KV content tables, never in logs, never in client-side code.
- The GitHub fine-grained token used for repository uploads is scoped to this repo only, time-limited, and stored in the assistant's secure vault (existing arrangement); it is not an application secret and never enters the app.
- Secret rotation: on personnel change (n/a, solo), on suspected exposure (immediate), and API credentials on provider schedule. Token caching for the Creators API honours its 1-hour token lifetime (official docs) — the credential secret itself never leaves the server.
- CI secrets are GitHub-environment scoped; staging and production are separate environments with separate approvals for production deploys.

## 8. Audit logging

- `audit_logs` (DATABASE-DESIGN.md) records: actor, action, entity, before/after JSON for all admin mutations; publish/unpublish; program/link-template changes (high severity); login events for admin (success/failure, no credentials); settings changes; data exports (account/admin).
- Append-only by application design; the audit viewer is read-only; audit rows for a record are visible from that record's admin page ("who changed this price source and when" must be answerable in one click — a compliance feature, not just security).
- Retention: 24 months minimum, then R2 archival (DATABASE-DESIGN.md §8).

## 9. Privacy controls

- **Data minimisation:** the platform works fully anonymously; accounts collect email only (+ user-created favourites/alerts). No names, addresses or payment data ever.
- **Analytics:** first-party, aggregate-first; search queries stored as aggregates with a 30-day raw window; `affiliate_clicks.ip_hash` uses a salted hash with rotating salt (raw IPs never stored); no fingerprinting, no cross-site trackers, no sale/sharing of personal data.
- **Cookies:** strictly-necessary (session, CSRF, compare tray) by default; analytics is cookieless (Cloudflare Web Analytics) or consent-gated if that changes; a cookie notice appears only when a non-essential cookie is actually introduced (no theatre banners).
- **Rights:** self-service data export and account deletion (API-ARCHITECTURE.md §5); deletion anonymises per DATABASE-DESIGN.md §6.6; privacy policy is written in plain language and versioned.
- **Children:** the service is not directed at children under 13; no knowingly collected child data (gift finder collects no recipient personal data — relationship type and interests only).

## 10. Backups and incident response

- Backups: DATABASE-DESIGN.md §9 (D1 Time Travel 7 d free / 30 d paid, weekly exports to R2, quarterly restore drill).
- Incident runbook (one page, Stage 14): detect (alerts on error rates, DLQ depth, validation failures) → contain (program kill switch, KV flag; Access allowlist lockdown) → eradicate/rotate (secrets) → recover (Time Travel/export restore + verification suite) → disclose (users if personal data involved, per applicable law; programs if link integrity was affected) → post-mortem into RISK-REGISTER.md.
- Availability incidents degrade gracefully: stale-but-labelled data, or field omission — never fabricated freshness.

## 11. Security testing requirements

Per stage (owned by ACCEPTANCE-CRITERIA.md): authorisation matrix tests (every admin endpoint × role, incl. unauthenticated); validation fuzz set on public APIs; open-redirect abuse tests; CSRF token tests; session rotation/fixation tests; dependency audit in CI; pre-launch (Stage 14) external-style review: headers/CSP scan, TLS check, exposed-route inventory vs. this plan, restore drill, and a tabletop incident exercise. Findings are logged in RISK-REGISTER.md with owner and date.
