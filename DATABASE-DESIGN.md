# Database Design — Smart Amazon Finder

Stage 00. Status: **IMPLEMENTED NOT VERIFIED** (schema proposal; to be proven by the Stage 03 migration spike).
Platform: Cloudflare D1 (SQLite). Date: 2026-11-08.

## 1. Design principles

1. **A product is not an offer.** Products are canonical, merchant-neutral entities. Everything price-, stock- and link-related lives in `offers`, tied to a merchant and an affiliate program. A product with zero offers is valid (editorial-only); an offer without a product is impossible (FK).
2. **Provenance is a column, not a convention.** Every externally-sourced row carries `source_id`, `licence_status`, `source_updated_at`, `fetched_at`, `validated_at`, `validation_status`. The application must be able to answer "where did this field come from, may we show it, and until when?" from the row itself.
3. **Editorial data is separate from licensed data.** Our own writing (summaries, verdicts, guide content) lives in its own tables/columns with `source_id = 'editorial'`, so licence expiry on a merchant feed can never delete or contaminate our content, and vice versa.
4. **Normalised first (3NF for core entities), deliberate denormalisation only for read models** (search index, analytics rollups), each documented where it occurs.
5. **Soft lifecycle, hard audit.** Catalog rows move through status states instead of being deleted; admin mutations are captured in `audit_logs`. True deletes happen only via retention jobs (privacy) and are themselves logged.
6. **Money and time discipline.** Prices are stored as integer minor units (cents) + ISO currency code — never floats. All timestamps are UTC ISO-8601 text (`datetime('now')`), indexed where ranged.

## 2. Entity relationship diagram

```
 categories ──< categories (parent_id, tree)
 categories ──< products >── brands
 products ──< product_variants
 products ──< product_specs >── attribute_definitions (per category)
 products ──< product_attributes (typed key/value, gift tags, flags)
 products ──< product_media
 products ──< offers >── merchants
 offers   >── affiliate_programs
 offers   ──< price_history
 products ──< product_guides >── buying_guides
 articles (standalone editorial, optional product links via article_products)
 users ──< favorites >── products
 users ──< comparison_lists ──< comparison_items >── products
 users ──< price_alerts >── products
 affiliate_clicks >── offers (nullable) , >── affiliate_programs
 admin_users ──< audit_logs (actor) ; audit_logs ~ any entity (entity_type, entity_id)
 source_records (staging) ~ products/offers (promoted_to)
 search index: products_fts (FTS5 shadow of searchable product fields)
```

## 3. Entity catalogue

| Table | Purpose | Key fields (summary) |
|---|---|---|
| `categories` | Tree of catalog categories; launch verticals are roots. | id, parent_id, slug (unique), name, description, sort_order, is_indexable |
| `brands` | Canonical brand names + aliases. | id, slug (unique), name, website_url |
| `products` | Canonical product entity. | id, category_id, brand_id, slug (unique), name, model_ref, editorial_summary, status, provenance columns |
| `product_variants` | Colour/size/capacity variants that share a product page. | id, product_id, variant_key, label, source_sku_ref |
| `attribute_definitions` | Per-category spec dictionary (name, unit, data type, is_filterable, is_comparison_criterion, sort weight). | id, category_id, key, label, unit, value_type, flags |
| `product_specs` | Typed spec values, one row per product per definition. | product_id, definition_id, value_number / value_text / value_bool, provenance columns |
| `product_attributes` | Non-spec attributes: gift tags, audience, editorial flags. | product_id, key, value |
| `product_media` | Media references. Stores URL + licence, **not** binaries, for licensed images; R2 keys for original media. | id, product_id, kind (licensed_url / r2_original), url_or_key, alt_text, licence_status, expires_at |
| `merchants` | Retailers (Amazon US at launch). | id, slug, name, base_domain |
| `affiliate_programs` | Program terms per merchant/network. | id, merchant_id, name, link_template, tracking_param, terms_url, status |
| `offers` | A product purchasable at a merchant under a program. | id, product_id, variant_id (null), merchant_id, program_id, merchant_item_ref (e.g. ASIN for Amazon — an identifier, not content), destination_url, currency, current_price_cents, price_observed_at, availability_state, licence_status, validation_status |
| `price_history` | Append-only snapshots of offers. | id, offer_id, price_cents, availability_state, observed_at, source_id |
| `buying_guides` | Guide entities tied to a category. | id, category_id, slug, title, status, published_at, author_admin_id |
| `articles` | Standalone editorial (news, explainers). | id, slug, title, body_blocks (JSON), status, published_at |
| `users` | Public accounts (optional feature). | id, email (unique, citext-normalised), auth fields per SECURITY-PLAN, email_verified_at, created_at |
| `favorites` | User ♥ product. | user_id, product_id, created_at — PK (user_id, product_id) |
| `comparison_lists` | Saved or anonymous shareable comparisons. | id, owner_user_id (nullable), share_token_hash (nullable), title, created_at |
| `comparison_items` | Items in a list, ordered. | list_id, product_id, position — PK (list_id, product_id) |
| `price_alerts` | User watch + threshold. | id, user_id, product_id, threshold_cents, is_active, last_triggered_at |
| `affiliate_clicks` | Outbound click events (privacy-minimised). | id, offer_id, program_id, page_path, referrer_path, ip_hash, ua_family, created_at |
| `admin_users` | Internal accounts + roles. | id, email, role (owner/admin/editor/publisher/viewer), access_identity_ref |
| `audit_logs` | Append-only admin mutation log. | id, actor_admin_id, action, entity_type, entity_id, before_json, after_json, created_at |
| `source_records` | Staging for adapter output pre-promotion. | id, source_id, external_ref, raw_hash, normalised_json, licence_json, validation_status, promoted_product_id, created_at |
| `analytics_daily` | Rollups (page views, searches, clicks per day/path). | day, path, metric, count |

## 4. SQL schema proposal (core excerpt, SQLite/D1 dialect)

```sql
CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  parent_id INTEGER REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_indexable INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE brands (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  website_url TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  brand_id INTEGER REFERENCES brands(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  model_ref TEXT,
  editorial_summary TEXT,               -- our words only; never source-copied
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','published','archived')),
  source_id TEXT NOT NULL DEFAULT 'manual-entry',
  licence_status TEXT NOT NULL DEFAULT 'owned'
    CHECK (licence_status IN ('owned','licensed','restricted','expired')),
  source_updated_at TEXT,
  fetched_at TEXT,
  validated_at TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','passed','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE attribute_definitions (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  unit TEXT,
  value_type TEXT NOT NULL CHECK (value_type IN ('number','text','bool')),
  is_filterable INTEGER NOT NULL DEFAULT 0,
  is_comparison_criterion INTEGER NOT NULL DEFAULT 0,
  sort_weight INTEGER NOT NULL DEFAULT 0,
  UNIQUE (category_id, key)
);

CREATE TABLE product_specs (
  product_id INTEGER NOT NULL REFERENCES products(id),
  definition_id INTEGER NOT NULL REFERENCES attribute_definitions(id),
  value_number REAL,
  value_text TEXT,
  value_bool INTEGER,
  source_id TEXT NOT NULL DEFAULT 'manual-entry',
  licence_status TEXT NOT NULL DEFAULT 'owned',
  source_updated_at TEXT,
  PRIMARY KEY (product_id, definition_id)
);

CREATE TABLE merchants (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  base_domain TEXT NOT NULL
);

CREATE TABLE affiliate_programs (
  id INTEGER PRIMARY KEY,
  merchant_id INTEGER NOT NULL REFERENCES merchants(id),
  name TEXT NOT NULL,
  link_template TEXT NOT NULL,          -- contains {destination} and tag placeholder
  tracking_param TEXT,
  terms_url TEXT,
  status TEXT NOT NULL DEFAULT 'inactive'
    CHECK (status IN ('inactive','active','suspended'))
);

CREATE TABLE offers (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_id INTEGER REFERENCES product_variants(id),
  merchant_id INTEGER NOT NULL REFERENCES merchants(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  merchant_item_ref TEXT,               -- e.g. ASIN: an identifier, stored as reference only
  destination_url TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_price_cents INTEGER,          -- NULL unless price display is licensed (see compliance doc)
  price_observed_at TEXT,
  availability_state TEXT CHECK (availability_state IN ('in_stock','low','out','unknown')),
  licence_status TEXT NOT NULL DEFAULT 'restricted',
  validation_status TEXT NOT NULL DEFAULT 'pending',
  last_refreshed_at TEXT,
  UNIQUE (product_id, variant_id, merchant_id)
);

CREATE TABLE price_history (
  id INTEGER PRIMARY KEY,
  offer_id INTEGER NOT NULL REFERENCES offers(id),
  price_cents INTEGER NOT NULL,
  availability_state TEXT,
  observed_at TEXT NOT NULL DEFAULT (datetime('now')),
  source_id TEXT NOT NULL
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  password_hash TEXT,                   -- null when magic-link-only
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at TEXT
);

CREATE TABLE favorites (
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);

CREATE TABLE comparison_lists (
  id INTEGER PRIMARY KEY,
  owner_user_id INTEGER REFERENCES users(id),
  share_token_hash TEXT UNIQUE,         -- hash only; raw token lives in the URL
  title TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE comparison_items (
  list_id INTEGER NOT NULL REFERENCES comparison_lists(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (list_id, product_id)
);

CREATE TABLE price_alerts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  threshold_cents INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  last_triggered_at TEXT
);

CREATE TABLE affiliate_clicks (
  id INTEGER PRIMARY KEY,
  offer_id INTEGER REFERENCES offers(id),
  program_id INTEGER REFERENCES affiliate_programs(id),
  page_path TEXT,
  ip_hash TEXT,                          -- salted hash, rotated salt; never raw IP
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','publisher','viewer')),
  access_identity_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
  id INTEGER PRIMARY KEY,
  actor_admin_id INTEGER NOT NULL REFERENCES admin_users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  before_json TEXT,
  after_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- audit_logs is append-only: application code exposes no UPDATE/DELETE path.

CREATE VIRTUAL TABLE products_fts USING fts5(
  name, brand_name, category_name, editorial_summary,
  content='products_search_view', content_rowid='id'
);
-- products_search_view is a maintained projection (see §5); FTS5 availability
-- in D1 is spike S-01 (SYSTEM-ARCHITECTURE.md §9).
```

(Tables `product_variants`, `product_attributes`, `product_media`, `buying_guides`, `articles`, `source_records`, `analytics_daily` follow the same patterns: integer PKs, FK references, status/provenance columns where the row can originate externally.)

## 5. Indexing strategy

- Every FK column used in joins gets an index (SQLite/D1 does not auto-index FKs): `products(category_id)`, `products(brand_id)`, `offers(product_id)`, `offers(merchant_id)`, `price_history(offer_id, observed_at DESC)`, `product_specs(definition_id, value_number)` for range filters.
- Slugs are UNIQUE (index implied) on products, categories, brands, articles, guides.
- Composite index `products(status, validation_status, category_id)` backs every public listing query — the public site only ever reads `status='published' AND validation_status='passed'`.
- `affiliate_clicks(created_at)` and daily rollup jobs keep the raw table small (30-day retention, §8).
- `audit_logs(entity_type, entity_id, created_at)` for per-record history views.
- FTS index is rebuilt from the projection on product publish/update via queue job; a nightly consistency check compares FTS row count vs. published product count.
- Rule (from Cloudflare's own D1 guidance): indexes reduce rows read, which is D1's billing/latency metric — every new query pattern must ship with its index in the same migration.

## 6. Data integrity rules

1. An offer's `current_price_cents` may be non-NULL **only** when `licence_status='licensed'` and `price_observed_at` is within the licence freshness window; a scheduled job nulls stale prices automatically (compliance enforcement in code *and* data).
2. Public queries are structurally incapable of returning `validation_status != 'passed'` or `status != 'published'` rows — enforced by a single data-access layer, tested by regression suite.
3. `merchant_item_ref` (e.g. ASIN) is an identifier, not content: it may be stored and used to build links, but titles/images/prices from a source may only exist where the licence descriptor allows.
4. Deleting a product with offers, history or favourites is forbidden at the application layer; archive instead (FKs use default RESTRICT behaviour — D1/SQLite FK enforcement is enabled per connection).
5. Price history is append-only; corrections are new rows, never edits.
6. Emails are stored normalised (lowercased, trimmed) with UNIQUE constraint; account deletion anonymises the user row and cascades favourites/alerts per the privacy policy.

## 7. Migration strategy

- Migrations are numbered SQL files (`migrations/0001_init.sql`, …), applied with `wrangler d1 migrations` per environment, in order, never edited after being applied to any shared environment.
- Every migration ships with: forward SQL, a rollback note (SQLite limits `ALTER TABLE`; the standard pattern is create-new-table/copy/drop/rename for structural changes), and a data-volume note (expected rows touched).
- Staging applies migrations before production, with a synthetic data load and the integrity test suite (§6) run against it.
- Schema and seed data are separate: seeds (categories tree, attribute definitions) are versioned data files applied after migrations, idempotent by natural key.

## 8. Retention and lifecycle

| Data | Retention | Mechanism |
|---|---|---|
| price_history | 13 months, then monthly rollups (min/max/avg per month kept indefinitely) | Queue-scheduled job; respects D1 per-database size caps (500 MB free / 10 GB paid). |
| affiliate_clicks (raw) | 30 days → analytics_daily rollups | Nightly queue job. |
| audit_logs | 24 months minimum | Archive export to R2 (JSON lines) before any purge. |
| source_records (staging) | 90 days after promotion/rejection | Queue job. |
| users (deleted accounts) | Anonymised immediately; hard delete after 30-day grace | Account job. |
| product_media (licensed) | Removed when licence expires (`expires_at` passes) | Nightly licence sweep — also blocks the product page image block until replaced. |

## 9. Backup and recovery

- **Layer 1 — D1 Time Travel:** point-in-time recovery built into D1 (7 days on Workers Free, 30 days on Workers Paid, per official D1 limits). Covers accidental writes/deletes inside the window. RPO ≈ minutes (continuous), RTO ≈ time to run a restore + verification suite.
- **Layer 2 — scheduled exports:** weekly `wrangler d1 export` to a private R2 bucket (versioned keys), retained 8 weeks; monthly export retained 12 months. Exports are the recovery path beyond the Time Travel window.
- **Layer 3 — code-held truth:** schema, seeds and editorial content exports (guides/articles as structured files in the repo at publish time) mean the catalog metadata and all original content can be rebuilt even from total database loss. Licensed merchant data is *not* backed up beyond its licence terms; it is re-fetched.
- **Restore drill:** a restore from export into a scratch database is a Stage 14 launch-gate exercise, then quarterly. A backup that has never been restored is treated as no backup (status language in ACCEPTANCE-CRITERIA.md).
- R2 media originals: R2 is the system of record; bucket versioning/lifecycle rules are set in Stage 03.
