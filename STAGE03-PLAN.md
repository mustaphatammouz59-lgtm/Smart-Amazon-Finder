# Stage 03 — Implementation Plan (working document)

Basis: MASTER-ROADMAP "Stage 03 — Backend and database" (authoritative scope),
DATABASE-DESIGN §§3–7, API-ARCHITECTURE §§2–8, SYSTEM-ARCHITECTURE §6/§9 (S-01),
DATA-SOURCING-AND-COMPLIANCE (24h price-freshness window), SECURITY-PLAN §4,
ACCEPTANCE-CRITERIA §§2–3, Stage 03 brief (2026-11-08).

## Roadmap scope (verbatim essence)
D1 schema migrations 0001+ · data-access layer with publication/validation gates ·
API v1 skeleton with validation + error format · auth foundations (admin session +
Access integration; user auth pending the mail-provider decision) · queues + DLQs ·
audit logging · spike S-01 (FTS5). Deliverables: migrated staging DB, API contract
tests, authz matrix test harness, queue consumers (noop jobs end-to-end).
Testing: §6 integrity-rule tests, S-01 recorded, migration up/down drill on staging.
Acceptance: §6 rules enforced + tested; S-01 verdict written into SYSTEM-ARCHITECTURE.md.

Explicitly NOT Stage 03 (later stages): admin dashboard UI (04), ingestion adapters (05),
public catalog UI/search pages (07), accounts UI. Public /api/v1 read endpoints ship as
the skeleton the roadmap requires; no public page changes beyond Stage 02 design.

## Decisions
- Migrations: 0002_catalog.sql (categories, brands, products, variants, attribute
  definitions, specs, attributes, media, merchants, programs, offers, price_history),
  0003_platform.sql (users, favorites, comparisons, alerts, clicks, admin_users,
  audit_logs, guides, articles, source_records, analytics_daily), 0004_search.sql
  (products_search projection table + products_fts external-content FTS5) — 0004 is
  gated on the S-01 result; fallback per SYSTEM §9 if FTS5 fails in D1.
- DAL (app/lib/db/): the ONLY path to catalog data. Public functions hard-code
  status='published' AND validation_status='passed' (integrity rule 2). Offer prices
  surface only when licence_status='licensed' AND observed within 24h (rule 1).
- Fixtures: fixtures/catalog-seeds.sql = structural seeds only (2 launch categories +
  attribute definitions; idempotent, safe anywhere). fixtures/dev-catalog.sql =
  clearly-labelled DEV FIXTURE products (source_id='dev-fixture', "[DEV FIXTURE]"
  names); the public DAL excludes them unless env var DEV_FIXTURES='enabled'
  (never set in production config). Seeds are data files, never migrations.
- API: app/lib/api.ts implements the §8 error format + requestId; zod validation on
  every input, malformed → 400 VALIDATION_FAILED (never coerced). Endpoints:
  GET /api/v1/search, GET /api/v1/products/:slug, GET /api/v1/categories/:slug/products,
  GET /api/v1/products/:slug/alternatives, POST /api/v1/recommendations,
  POST /api/v1/gift-finder; admin skeleton: GET /api/admin/overview,
  POST /api/admin/products, POST /api/admin/products/:id/publish (RBAC + audit).
- Auth: app/lib/auth.ts = RBAC matrix (API doc §6) as pure functions + Access/session
  guard (401 UNAUTHENTICATED / 403 FORBIDDEN in the standard format). Real Access
  configuration is an owner-side Cloudflare step at deploy time; user auth is NOT
  built — the mail-provider decision is open and recorded as such.
- Queues: workers/app.ts queue() becomes a job router (reindex-search implemented
  for real against the projection; ingest/validate/refresh-offers/sitemaps/alerts/
  rollups acknowledged as contract noops); wrangler.jsonc gains the consumer + DLQ
  configuration as code (takes effect only on a future approved deploy).
- S-01 spike: scripts/spike-s01.mjs — 10,000-row synthetic catalog in SQLite FTS5
  (node:sqlite) measuring insert/bm25/snippet timings + a D1-local FTS5 creation
  check via wrangler; verdict appended to SYSTEM-ARCHITECTURE.md per acceptance.
- Tests run DAL/API/authz against a node:sqlite-backed D1 adapter (tests/helpers),
  so integrity rules execute against real SQLite incl. FTS5; the same code paths are
  then proven in real workerd via the preview server + local D1 (Stage 01 lesson).

## Rules
Branch `stage-03` locally; no push; no deploy; production D1 untouched (local D1 only).
Public UI unchanged except where the skeleton needs nothing. Noindex preserved.
