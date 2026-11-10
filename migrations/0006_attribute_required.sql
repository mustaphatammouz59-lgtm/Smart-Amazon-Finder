-- 0006_attribute_required.sql — Stage 05.3 required-attribute flag
-- (TAXONOMY-stage05-proposal.md §9, FI-1).
-- Purpose: add an is_required flag to attribute_definitions so the
-- product validation engine can enforce per-category required
-- attributes (VR-2) instead of leaving them as an editorial rule.
-- Additive only: a single column is added; no existing column, table,
-- index or row is otherwise touched.
-- Semantics: DEFAULT 0 keeps every existing definition (including the
-- 8 seeded roots) optional — behaviour-preserving. The flag is set per
-- definition by a future approved ingestion from the Revision 2
-- matrix (§9.1); this migration sets it on no definition.
-- Rollback: the column defaults to 0 and is ignored by earlier code;
-- no rollback needed (DROP COLUMN is not relied upon — it is
-- unavailable in SQLite builds before 3.35 in any case, and D1
-- forward-only practice applies).

ALTER TABLE attribute_definitions ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;
