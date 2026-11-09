-- 0004_search.sql — Stage 03 search projection + FTS5 index.
-- Gated on spike S-01: FTS5 PROVEN in D1 (see SYSTEM-ARCHITECTURE.md §9 verdict).
-- products_search is a maintained projection (DATABASE-DESIGN.md §5): the DAL
-- reindex path (queue job `reindex-search`) is its only writer. Only
-- published + validation-passed products are ever projected.
-- Rollback = DROP TABLE products_fts; DROP TABLE products_search.

CREATE TABLE products_search (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  brand_name TEXT,
  category_name TEXT,
  editorial_summary TEXT
);

CREATE VIRTUAL TABLE products_fts USING fts5(
  name, brand_name, category_name, editorial_summary,
  content='products_search', content_rowid='id'
);
