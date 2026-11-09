import type { AdminActor } from './db/admin'
import { writeAudit } from './db/admin'
import { applyPricePolicy } from './db/offers'
import { reindexProduct } from './db/reindex'
import type { ProductRow } from './db/types'

/**
 * Product validation + indexability (Stage 04; SEO-STRATEGY.md §6).
 * `validateProduct` is a pure read (computes issues without persisting);
 * `runProductValidation` persists the outcome and audits it.
 * `productIndexability` is display-only: it explains, per condition,
 * why a product would or would not be indexable.
 */

export interface ValidationIssue {
  field: string
  code: string
  severity: 'error' | 'warning'
  message: string
}

export interface ProductValidation {
  status: 'passed' | 'failed'
  issues: ValidationIssue[]
  checkedAt: string
  /**
   * Stage 04.4 (NF-2): set by runProductValidation / commitProductValidation
   * only (the pure read validateProduct leaves it undefined).
   * 'persisted' — the verdict was written, atomically confirmed against
   * the exact inputs it was computed over.
   * 'data_changed_retry_required' — a validation input changed while the
   * run was in flight; the verdict was DISCARDED and nothing was written,
   * so the stored state (including the concurrent edit's own F-01
   * invalidation) stands until a fresh run succeeds.
   */
  persistence?: 'persisted' | 'data_changed_retry_required'
}

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The "spec has a value" predicate — shared by the count query and by
 *  the snapshot guard in commitProductValidation so the two can never
 *  drift apart. */
const SPEC_VALUE_CONDITION =
  '(value_number IS NOT NULL OR value_text IS NOT NULL OR value_bool IS NOT NULL)'

async function countSpecsWithValue(db: D1Database, productId: number): Promise<number> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM product_specs
        WHERE product_id = ?
          AND ${SPEC_VALUE_CONDITION}`,
    )
    .bind(productId)
    .first<{ n: number }>()
  return row?.n ?? 0
}

/**
 * Stage 04.4 (NF-2): the complete set of values the product verdict is
 * computed over, captured by ONE read pass. The verdict may only be
 * persisted while every one of these still holds (see
 * commitProductValidation) — that is what ties a stored verdict to the
 * data it describes. `updated_at` is deliberately NOT part of the
 * snapshot: SQLite's datetime('now') has one-second resolution, so two
 * distinct states can share a timestamp; the inputs themselves cannot
 * collide. Fields the engine never reads (model_ref, status) are not
 * verdict inputs and are excluded — changing them alone cannot make a
 * persisted verdict stale.
 */
export interface ProductValidationSnapshot {
  name: string
  slug: string
  categoryId: number
  categoryExists: boolean
  brandId: number | null
  licenceStatus: string
  editorialSummary: string | null
  specCountWithValue: number
  mediaCount: number
  offerCount: number
}

async function readProductInputs(
  db: D1Database,
  productId: number,
): Promise<{ product: ProductRow; snapshot: ProductValidationSnapshot } | null> {
  const product = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(productId)
    .first<ProductRow>()
  if (!product) return null
  const category = await db
    .prepare('SELECT id FROM categories WHERE id = ?')
    .bind(product.category_id)
    .first<{ id: number }>()
  const specCount = await countSpecsWithValue(db, productId)
  const mediaRow = await db
    .prepare('SELECT COUNT(*) AS n FROM product_media WHERE product_id = ?')
    .bind(productId)
    .first<{ n: number }>()
  const offersRow = await db
    .prepare('SELECT COUNT(*) AS n FROM offers WHERE product_id = ?')
    .bind(productId)
    .first<{ n: number }>()
  return {
    product,
    snapshot: {
      name: product.name,
      slug: product.slug,
      categoryId: product.category_id,
      categoryExists: category !== null,
      brandId: product.brand_id,
      licenceStatus: product.licence_status,
      editorialSummary: product.editorial_summary,
      specCountWithValue: specCount,
      mediaCount: mediaRow?.n ?? 0,
      offerCount: offersRow?.n ?? 0,
    },
  }
}

function productIssues(snapshot: ProductValidationSnapshot): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (snapshot.name.trim().length < 3) {
    issues.push({
      field: 'name',
      code: 'name_too_short',
      severity: 'error',
      message: 'Product name must be at least 3 characters long.',
    })
  }
  if (!SLUG_RE.test(snapshot.slug)) {
    issues.push({
      field: 'slug',
      code: 'invalid_slug',
      severity: 'error',
      message: 'Product slug must be lowercase alphanumeric segments joined by hyphens.',
    })
  }
  if (!snapshot.categoryExists) {
    issues.push({
      field: 'category',
      code: 'missing_category',
      severity: 'error',
      message: 'Product category does not exist.',
    })
  }
  if (snapshot.licenceStatus === 'expired') {
    issues.push({
      field: 'licence_status',
      code: 'licence_expired',
      severity: 'error',
      message: 'Product licence status is expired.',
    })
  }
  if (!snapshot.editorialSummary || snapshot.editorialSummary.trim().length === 0) {
    issues.push({
      field: 'editorial_summary',
      code: 'missing_summary',
      severity: 'error',
      message: 'Editorial summary is missing.',
    })
  }
  if (snapshot.specCountWithValue === 0) {
    issues.push({
      field: 'specs',
      code: 'missing_specs',
      severity: 'error',
      message: 'Product has no specification values.',
    })
  }

  if (snapshot.brandId === null) {
    issues.push({
      field: 'brand',
      code: 'missing_brand',
      severity: 'warning',
      message: 'Product has no brand.',
    })
  }
  if (snapshot.licenceStatus === 'restricted') {
    issues.push({
      field: 'licence_status',
      code: 'licence_restricted',
      severity: 'warning',
      message: 'Product licence status is restricted.',
    })
  }
  if (snapshot.mediaCount === 0) {
    issues.push({
      field: 'media',
      code: 'missing_media',
      severity: 'warning',
      message: 'Product has no media.',
    })
  }
  if (snapshot.offerCount === 0) {
    issues.push({
      field: 'offers',
      code: 'missing_offers',
      severity: 'warning',
      message: 'Product has no offers.',
    })
  }

  return issues
}

export async function validateProduct(
  db: D1Database,
  productId: number,
): Promise<ProductValidation | null> {
  const begun = await beginProductValidation(db, productId)
  return begun ? begun.validation : null
}

/**
 * Phase 1 of a validation run (Stage 04.4, NF-2): capture the input
 * snapshot and compute the verdict over exactly that snapshot.
 * Exported so the begin → concurrent edit → commit interleaving is
 * directly testable against the real DAL; runProductValidation is the
 * begin+commit composition used by every caller.
 */
export interface BegunProductValidation {
  validation: ProductValidation
  snapshot: ProductValidationSnapshot
}

export async function beginProductValidation(
  db: D1Database,
  productId: number,
): Promise<BegunProductValidation | null> {
  const read = await readProductInputs(db, productId)
  if (!read) return null
  const issues = productIssues(read.snapshot)
  const status = issues.some((i) => i.severity === 'error') ? 'failed' : 'passed'
  return {
    validation: { status, issues, checkedAt: new Date().toISOString() },
    snapshot: read.snapshot,
  }
}

/**
 * Phase 2 of a validation run (Stage 04.4, NF-2): persist the begun
 * verdict — but ONLY if every input in the snapshot still holds.
 *
 * The persistence is a single conditional UPDATE whose WHERE clause
 * re-states the snapshot: the product row's verdict-relevant columns
 * (null-safe `IS` comparisons), category existence, and the three child
 * counts as correlated subqueries — the exact values the verdict was
 * computed over. SQLite/D1 executes one statement atomically and
 * serializes writers, so the check and the write cannot interleave:
 * if a concurrent edit (which itself invalidates per F-01) landed after
 * the snapshot was captured, the predicate no longer matches, zero rows
 * change, and the stale verdict is discarded instead of resurrecting a
 * 'passed' the current data has not earned. The run is still audited —
 * with persistence:'data_changed_retry_required', so the audit trail
 * never claims a discarded verdict was stored — and no reindex is
 * needed: this path wrote nothing, and the concurrent edit already
 * refreshed the projection in its own step.
 */
export async function commitProductValidation(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  begun: BegunProductValidation,
): Promise<ProductValidation> {
  const { validation, snapshot } = begun
  const result = await db
    .prepare(
      `UPDATE products
          SET validation_status = ?, validated_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
          AND name IS ?
          AND slug IS ?
          AND category_id IS ?
          AND brand_id IS ?
          AND licence_status IS ?
          AND editorial_summary IS ?
          AND (EXISTS (SELECT 1 FROM categories WHERE id = products.category_id)) = ?
          AND (SELECT COUNT(*) FROM product_specs
                WHERE product_id = products.id AND ${SPEC_VALUE_CONDITION}) = ?
          AND (SELECT COUNT(*) FROM product_media WHERE product_id = products.id) = ?
          AND (SELECT COUNT(*) FROM offers WHERE product_id = products.id) = ?`,
    )
    .bind(
      validation.status,
      productId,
      snapshot.name,
      snapshot.slug,
      snapshot.categoryId,
      snapshot.brandId,
      snapshot.licenceStatus,
      snapshot.editorialSummary,
      snapshot.categoryExists ? 1 : 0,
      snapshot.specCountWithValue,
      snapshot.mediaCount,
      snapshot.offerCount,
    )
    .run()
  const persisted = result.meta.changes > 0
  const errorCount = validation.issues.filter((i) => i.severity === 'error').length
  const warningCount = validation.issues.filter((i) => i.severity === 'warning').length
  await writeAudit(db, actor, 'product.validate', 'product', productId, null, {
    status: validation.status,
    errorCount,
    warningCount,
    persistence: persisted ? 'persisted' : 'data_changed_retry_required',
  })
  if (!persisted) {
    return { ...validation, persistence: 'data_changed_retry_required' }
  }
  // F-14: a fresh verdict refreshes the FTS projection in the same step,
  // so search visibility follows the verdict without waiting for a job.
  await reindexProduct(db, productId)
  return { ...validation, persistence: 'persisted' }
}

export async function runProductValidation(
  db: D1Database,
  actor: AdminActor,
  productId: number,
): Promise<ProductValidation | null> {
  const begun = await beginProductValidation(db, productId)
  if (!begun) return null
  return commitProductValidation(db, actor, productId, begun)
}

export async function productIndexability(
  db: D1Database,
  productId: number,
): Promise<{ indexable: boolean; reasons: string[] } | null> {
  const product = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(productId)
    .first<ProductRow>()
  if (!product) return null
  const reasons: string[] = []
  if (product.status !== 'published') {
    reasons.push('Product is not published.')
  }
  if (product.validation_status !== 'passed') {
    reasons.push('Validation has not passed.')
  }
  if (!product.editorial_summary || product.editorial_summary.trim().length === 0) {
    reasons.push('Editorial summary is missing.')
  }
  const specCount = await countSpecsWithValue(db, productId)
  if (specCount === 0) {
    reasons.push('Product has no specifications.')
  }
  const { results: offerRows } = await db
    .prepare(
      `SELECT m.slug AS merchant_slug, m.name AS merchant_name, o.destination_url, o.currency,
              o.current_price_cents, o.price_observed_at, o.availability_state,
              o.licence_status, o.validation_status
         FROM offers o JOIN merchants m ON m.id = o.merchant_id
        WHERE o.product_id = ? ORDER BY o.id`,
    )
    .bind(productId)
    .all<{
      merchant_slug: string
      merchant_name: string
      destination_url: string
      currency: string
      current_price_cents: number | null
      price_observed_at: string | null
      availability_state: string | null
      licence_status: string
      validation_status: string
    }>()
  const offerViews = offerRows.map((r) => applyPricePolicy(r))
  if (offerViews.length > 0 && !offerViews.some((o) => o.price_cents !== null)) {
    reasons.push('No price-displayable offer is available.')
  }
  return { indexable: reasons.length === 0, reasons }
}
