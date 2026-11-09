-- 0003_platform.sql — Stage 03 platform tables (DATABASE-DESIGN.md §§3–5):
-- accounts, engagement, admin + audit, editorial, staging, analytics.
-- Forward-only. Rollback = DROP the created tables (empty at apply time).

CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified_at TEXT,
  password_hash TEXT,
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
  share_token_hash TEXT UNIQUE,
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
  referrer_path TEXT,
  ip_hash TEXT,
  ua_family TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE admin_users (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','editor','publisher','viewer')),
  access_identity_ref TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Append-only by design: the data-access layer exposes no UPDATE/DELETE path.
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

CREATE TABLE buying_guides (
  id INTEGER PRIMARY KEY,
  category_id INTEGER REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','published','archived')),
  published_at TEXT,
  author_admin_id INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE articles (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_blocks TEXT,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','in_review','published','archived')),
  published_at TEXT,
  author_admin_id INTEGER REFERENCES admin_users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE source_records (
  id INTEGER PRIMARY KEY,
  source_id TEXT NOT NULL,
  external_ref TEXT,
  raw_hash TEXT,
  normalised_json TEXT,
  licence_json TEXT,
  validation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (validation_status IN ('pending','passed','failed')),
  promoted_product_id INTEGER REFERENCES products(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE analytics_daily (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  metric TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, path, metric)
);

CREATE INDEX idx_favorites_product ON favorites (product_id);
CREATE INDEX idx_alerts_user ON price_alerts (user_id);
CREATE INDEX idx_alerts_product ON price_alerts (product_id);
CREATE INDEX idx_clicks_created ON affiliate_clicks (created_at);
CREATE INDEX idx_audit_entity ON audit_logs (entity_type, entity_id, created_at);
CREATE INDEX idx_guides_category ON buying_guides (category_id);
CREATE INDEX idx_sourcerec_source ON source_records (source_id, validation_status);
