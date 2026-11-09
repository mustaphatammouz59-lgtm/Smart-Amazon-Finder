-- 0002_catalog.sql — Stage 03 catalog schema (DATABASE-DESIGN.md §§3–5).
-- Forward-only. Rollback note: no data exists in these tables at apply time;
-- rollback = DROP the created tables in reverse dependency order.
-- Data-volume note: creates empty tables + indexes only; touches 0 rows.

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
  editorial_summary TEXT,
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

CREATE TABLE product_variants (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  variant_key TEXT NOT NULL,
  label TEXT NOT NULL,
  source_sku_ref TEXT,
  UNIQUE (product_id, variant_key)
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

CREATE TABLE product_attributes (
  product_id INTEGER NOT NULL REFERENCES products(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (product_id, key, value)
);

CREATE TABLE product_media (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  kind TEXT NOT NULL CHECK (kind IN ('licensed_url','r2_original')),
  url_or_key TEXT NOT NULL,
  alt_text TEXT,
  licence_status TEXT NOT NULL DEFAULT 'owned',
  expires_at TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
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
  link_template TEXT NOT NULL,
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
  merchant_item_ref TEXT,
  destination_url TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  current_price_cents INTEGER,
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

-- Indexing strategy (DATABASE-DESIGN.md §5): every FK used in joins + the
-- composite that backs every public listing query.
CREATE INDEX idx_products_category ON products (category_id);
CREATE INDEX idx_products_brand ON products (brand_id);
CREATE INDEX idx_products_public ON products (status, validation_status, category_id);
CREATE INDEX idx_variants_product ON product_variants (product_id);
CREATE INDEX idx_attrdefs_category ON attribute_definitions (category_id);
CREATE INDEX idx_specs_definition ON product_specs (definition_id, value_number);
CREATE INDEX idx_specs_product ON product_specs (product_id);
CREATE INDEX idx_pattr_product ON product_attributes (product_id, key);
CREATE INDEX idx_media_product ON product_media (product_id);
CREATE INDEX idx_offers_product ON offers (product_id);
CREATE INDEX idx_offers_merchant ON offers (merchant_id);
CREATE INDEX idx_pricehist_offer ON price_history (offer_id, observed_at DESC);
