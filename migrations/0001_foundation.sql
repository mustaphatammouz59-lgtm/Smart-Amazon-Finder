-- 0001_foundation.sql — Stage 01 foundation migration.
-- Creates ONLY the infrastructure table used to prove D1 read/write in
-- the foundation stage. The full catalog schema (DATABASE-DESIGN.md) is
-- implemented in Stage 03 as its own numbered migrations.
CREATE TABLE IF NOT EXISTS foundation_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO foundation_meta (key, value) VALUES ('schema_stage', 'stage-01-foundation');
