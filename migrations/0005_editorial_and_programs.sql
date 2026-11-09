-- 0005_editorial_and_programs.sql — Stage 04 editorial + programs columns
-- (DATABASE-DESIGN.md §§3, 7; API-ARCHITECTURE.md §6).
-- Purpose: structured body + SEO meta for buying guides (articles already
-- carry body_blocks), SEO meta for articles, and affiliate-programme
-- housekeeping fields (terms_checked_at, notes).
-- Additive only: every statement adds a nullable column; no existing
-- column, table, index or row is touched.
-- Rollback: columns are nullable and ignored by earlier code; no rollback
-- needed (DROP COLUMN is not relied upon — it is unavailable in SQLite
-- builds before 3.35 in any case, and D1 forward-only practice applies).

ALTER TABLE buying_guides ADD COLUMN body_blocks TEXT;
ALTER TABLE buying_guides ADD COLUMN meta_title TEXT;
ALTER TABLE buying_guides ADD COLUMN meta_description TEXT;
ALTER TABLE articles ADD COLUMN meta_title TEXT;
ALTER TABLE articles ADD COLUMN meta_description TEXT;
ALTER TABLE affiliate_programs ADD COLUMN terms_checked_at TEXT;
ALTER TABLE affiliate_programs ADD COLUMN notes TEXT;
