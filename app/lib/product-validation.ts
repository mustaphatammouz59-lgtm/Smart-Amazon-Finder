import type { AdminActor } from './db/admin'
import { writeAudit } from './db/admin'
import { reindexProduct } from './db/reindex'
import type { ProductRow } from './db/types'
import { CERTIFICATION_BODIES, CERTIFICATION_STATUSES, CERTIFIED_BODIES, VERIFIED_STATUSES } from './certification'
import { validateDestinationUrl } from './url-policy'

/**
 * Product validation + indexability (Stage 04; SEO-STRATEGY.md §6).
 * `validateProduct` is a pure read (computes issues without persisting);
 * `runProductValidation` persists the outcome and audits it.
 * `productIndexability` is display-only: it explains, per condition,
 * why a product would or would not be indexable.
 *
 * Stage 05.3 extension (TAXONOMY-stage05-proposal.md §9, FI-1 + FI-2):
 * the snapshot now also covers the product category's full definition
 * set together with the product's spec values for it
 * (`attributeStates`), so the engine can enforce required attributes
 * (definitions flagged `is_required` by migration 0006) and the
 * conditional electrical/safety rules — the surge-protection /
 * surge-rating pairing (VR-4) and certification-vocabulary /
 * consistency checks (VR-3). Because those verdicts depend on
 * individual spec values and definition flags (not just the spec
 * count), the commit guard additionally re-checks a SQL-computed
 * fingerprint of the whole definition+spec state: any mid-run change
 * to a definition's key/type/required flag or to any spec value —
 * even one that leaves the spec count unchanged — discards the
 * verdict exactly like the Stage 04.4 snapshot terms do.
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

/**
 * Stage 05.3: the spec fingerprint expression, shared by the snapshot
 * read (which binds the product/category ids as literals) and the
 * commit guard (which references products.id / products.category_id)
 * so the two encodings can never drift apart. The fingerprint covers,
 * per definition of the category (ordered by definition id): the
 * definition id, key, value_type and is_required flag, plus the
 * product's three spec value columns (NULL encoded as char(0);
 * segments are char(30)-separated and rows char(31)-separated). It is computed IN
 * SQL on both sides (SQLite group_concat over an ordered subquery;
 * the LIMIT -1 idiom keeps the ORDER BY effective inside the
 * subquery) so the identical engine encodes both snapshots.
 */
function specFingerprintSql(productIdExpr: string, categoryIdExpr: string): string {
  return `(SELECT COALESCE(group_concat(seg, char(31)), '') FROM (
    SELECT d.id || char(30) || d.key || char(30) || d.value_type || char(30) || d.is_required || char(30)
      || COALESCE(CAST(s.value_number AS TEXT), char(0)) || char(30) || COALESCE(s.value_text, char(0)) || char(30)
      || COALESCE(CAST(s.value_bool AS TEXT), char(0)) AS seg
      FROM attribute_definitions d
      LEFT JOIN product_specs s ON s.definition_id = d.id AND s.product_id = ${productIdExpr}
     WHERE d.category_id = ${categoryIdExpr} ORDER BY d.id LIMIT -1))`
}

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
/** One definition of the product's category + the product's spec values for it (Stage 05.3). */
export interface ProductAttributeState {
  definitionId: number
  key: string
  valueType: string
  isRequired: boolean
  valueNumber: number | null
  valueText: string | null
  valueBool: number | null
}

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
  /**
   * Stage 05.3: every attribute definition of the product's category
   * (ordered by definition id) with the product's recorded spec values
   * for it (all three value columns null when no spec row exists).
   * The FI-1 required-attribute checks and the FI-2 conditional
   * surge/certification checks are computed over exactly this set.
   */
  attributeStates: ProductAttributeState[]
  /**
   * Stage 05.3: SQL-computed fingerprint of the definition set +
   * spec values in `attributeStates` (see specFingerprintSql). The
   * commit guard re-computes it over the live rows and persists the
   * verdict only while it still matches.
   */
  specFingerprint: string
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
  const { results: attributeRows } = await db
    .prepare(
      `SELECT d.id AS definition_id, d.key, d.value_type, d.is_required, s.value_number, s.value_text, s.value_bool
         FROM attribute_definitions d
         LEFT JOIN product_specs s ON s.definition_id = d.id AND s.product_id = ?
        WHERE d.category_id = ? ORDER BY d.id`,
    )
    .bind(productId, product.category_id)
    .all<{
      definition_id: number
      key: string
      value_type: string
      is_required: number
      value_number: number | null
      value_text: string | null
      value_bool: number | null
    }>()
  const fingerprintRow = await db
    .prepare(`SELECT ${specFingerprintSql('?', '?')} AS fp`)
    .bind(productId, product.category_id)
    .first<{ fp: string }>()
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
      attributeStates: attributeRows.map((row) => ({
        definitionId: row.definition_id,
        key: row.key,
        valueType: row.value_type,
        isRequired: row.is_required === 1,
        valueNumber: row.value_number,
        valueText: row.value_text,
        valueBool: row.value_bool,
      })),
      specFingerprint: fingerprintRow?.fp ?? '',
    },
  }
}

/**
 * Stage 05.3: classify one attribute state for the FI-1/FI-2 checks.
 * 'missing' — no recorded value at all, or a text value that trims to
 * '' (an empty-text row still counts in the legacy specCount, but for
 * these checks empty text is no value). 'invalid' — a value exists but
 * not in the column matching the definition's value_type (a value in
 * a wrong column, a non-finite number, or a bool outside {0,1}).
 * 'valid' — a value in the matching column, exposed through the typed
 * accessors (numValue / textValue / boolValue).
 */
interface SpecState {
  kind: 'missing' | 'invalid' | 'valid'
  numValue: number | null
  textValue: string | null
  boolValue: boolean | null
}

function specStateOf(state: ProductAttributeState): SpecState {
  const none: SpecState = { kind: 'missing', numValue: null, textValue: null, boolValue: null }
  const invalid: SpecState = { kind: 'invalid', numValue: null, textValue: null, boolValue: null }
  const hasNumber = state.valueNumber !== null
  const hasText = state.valueText !== null
  const hasBool = state.valueBool !== null
  if (!hasNumber && !hasText && !hasBool) return none
  if (state.valueType === 'number') {
    if (hasText || hasBool) return invalid
    if (!hasNumber) return none
    if (!Number.isFinite(state.valueNumber)) return invalid
    return { kind: 'valid', numValue: state.valueNumber, textValue: null, boolValue: null }
  }
  if (state.valueType === 'text') {
    if (hasNumber || hasBool) return invalid
    if (!hasText) return none
    if ((state.valueText as string).trim() === '') return none
    return { kind: 'valid', numValue: null, textValue: state.valueText, boolValue: null }
  }
  if (state.valueType === 'bool') {
    if (hasNumber || hasText) return invalid
    if (!hasBool) return none
    if (state.valueBool !== 0 && state.valueBool !== 1) return invalid
    return { kind: 'valid', numValue: null, textValue: null, boolValue: state.valueBool === 1 }
  }
  return invalid
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

  // Stage 05.3 (FI-1, VR-2): required attributes are engine-enforced.
  // A required definition must carry a value that is valid for its
  // declared type; `false` for a bool is a recorded, valid value.
  const statesByKey = new Map(snapshot.attributeStates.map((s) => [s.key, s]))
  for (const state of snapshot.attributeStates) {
    if (!state.isRequired) continue
    const spec = specStateOf(state)
    if (spec.kind === 'missing') {
      issues.push({
        field: `specs.${state.key}`,
        code: 'missing_required_attribute',
        severity: 'error',
        message: `Required attribute "${state.key}" has no recorded value.`,
      })
    } else if (spec.kind === 'invalid') {
      issues.push({
        field: `specs.${state.key}`,
        code: 'invalid_required_attribute',
        severity: 'error',
        message: `Required attribute "${state.key}" has a value that is invalid for its ${state.valueType} type.`,
      })
    }
  }

  // Stage 05.3 (FI-2, VR-4): the conditional surge rules, evaluated
  // only when the category carries both surge keys.
  const surgeProtection = statesByKey.get('surge_protection')
  const surgeRating = statesByKey.get('surge_rating_joules')
  if (surgeProtection && surgeRating) {
    const protection = specStateOf(surgeProtection)
    if (protection.kind === 'valid') {
      const rating = specStateOf(surgeRating)
      if (protection.boolValue === true) {
        if (rating.kind === 'missing') {
          issues.push({
            field: 'specs.surge_rating_joules',
            code: 'missing_surge_rating',
            severity: 'error',
            message: 'A surge protector must record a surge rating in joules.',
          })
        } else if (rating.kind === 'invalid') {
          issues.push({
            field: 'specs.surge_rating_joules',
            code: 'invalid_surge_rating',
            severity: 'error',
            message: 'The recorded surge rating is invalid for its number type.',
          })
        } else if (rating.numValue !== null && rating.numValue <= 0) {
          issues.push({
            field: 'specs.surge_rating_joules',
            code: 'invalid_surge_rating',
            severity: 'error',
            message: 'A surge rating must be greater than zero.',
          })
        }
      } else if (protection.boolValue === false && rating.kind !== 'missing') {
        issues.push({
          field: 'specs.surge_rating_joules',
          code: 'surge_rating_on_plain_strip',
          severity: 'error',
          message: 'A plain power strip must not carry a surge rating.',
        })
      }
    }
  }

  // Stage 05.3 (FI-2, VR-3): certification vocabulary + consistency.
  // Evaluated when the category carries either certification key.
  // Being uncertified is NOT an error: none / not_certified /
  // claimed_unverified are honest, publishable records — only
  // out-of-vocabulary values, unverifiable verified claims, and
  // body/status contradictions fail.
  const certBody = statesByKey.get('safety_certification_body')
  const certStatus = statesByKey.get('safety_certification_status')
  if (certBody || certStatus) {
    if (
      certBody &&
      certBody.valueText !== null &&
      certBody.valueText.trim() !== '' &&
      !(CERTIFICATION_BODIES as readonly string[]).includes(certBody.valueText)
    ) {
      issues.push({
        field: 'specs.safety_certification_body',
        code: 'invalid_certification_body',
        severity: 'error',
        message: `Safety certification body "${certBody.valueText}" is not a recognised certification body.`,
      })
    }
    if (
      certStatus &&
      certStatus.valueText !== null &&
      certStatus.valueText.trim() !== '' &&
      !(CERTIFICATION_STATUSES as readonly string[]).includes(certStatus.valueText)
    ) {
      issues.push({
        field: 'specs.safety_certification_status',
        code: 'invalid_certification_status',
        severity: 'error',
        message: `Safety certification status "${certStatus.valueText}" is not a recognised certification status.`,
      })
    }
    const bodySpec = certBody ? specStateOf(certBody) : null
    const statusSpec = certStatus ? specStateOf(certStatus) : null
    const body = bodySpec?.kind === 'valid' ? bodySpec.textValue : null
    const status = statusSpec?.kind === 'valid' ? statusSpec.textValue : null
    if (status !== null && VERIFIED_STATUSES.has(status) && (body === null || !CERTIFIED_BODIES.has(body))) {
      issues.push({
        field: 'specs.safety_certification_status',
        code: 'certification_claim_unverifiable',
        severity: 'error',
        message:
          'A verified certification status requires a third-party listing body (UL, ETL, CSA, TUV or SGS).',
      })
    }
    if (body !== null && CERTIFIED_BODIES.has(body) && status === 'not_certified') {
      issues.push({
        field: 'specs.safety_certification_status',
        code: 'certification_contradictory',
        severity: 'error',
        message: 'A recorded listing body contradicts a not_certified status.',
      })
    }
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
 * (null-safe `IS` comparisons), category existence, the three child
 * counts as correlated subqueries, and (Stage 05.3) the spec
 * fingerprint over the category's definitions + the product's spec
 * values — the exact values the verdict was computed over. SQLite/D1 executes one statement atomically and
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
          AND (SELECT COUNT(*) FROM offers WHERE product_id = products.id) = ?
          AND ${specFingerprintSql('products.id', 'products.category_id')} IS ?`,
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
      snapshot.specFingerprint,
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
      `SELECT o.destination_url, o.validation_status
         FROM offers o
        WHERE o.product_id = ? ORDER BY o.id`,
    )
    .bind(productId)
    .all<{
      destination_url: string
      validation_status: string
    }>()
  // Stage 05.1 (SEO-STRATEGY.md §6): the offer term is a LAWFUL offer,
  // not a price-displayable one. Under the Stage 05 link-out model offers
  // store no price (a price may display only when licensed + validated +
  // ≤24h fresh per price-policy.ts), so a price-based test would make
  // every offered product non-indexable forever. A price-less offer with
  // validation_status 'passed' and a destination that passes the URL
  // policy is lawful — offer validation treats its missing price as only
  // the 'no_price' warning ("link-only"). Price fields (amount,
  // licence-for-price, freshness) are irrelevant to lawfulness.
  // SEO §6 also allows "a deliberate editorial-only flag" instead of an
  // offer. There is no such flag column and no migration is authorized
  // for this stage, so a product with ZERO offers is treated as the
  // de-facto editorial-only state and gets no offer-related reason.
  const hasLawfulOffer = offerRows.some(
    (o) => o.validation_status === 'passed' && validateDestinationUrl(o.destination_url).ok,
  )
  if (offerRows.length > 0 && !hasLawfulOffer) {
    reasons.push('No lawful offer is available.')
  }
  return { indexable: reasons.length === 0, reasons }
}

/**
 * Category indexability (Stage 05.1; SEO-STRATEGY.md §6). Read-only
 * reporting computation, like productIndexability: returns null when
 * the category does not exist.
 *
 * §6 category terms: ≥ 5 published products, original intro copy, and
 * ≥ 1 guide or a completed "how to choose" block. The first two are
 * checked against the catalog here (published products = direct
 * category_id match with status 'published' AND validation_status
 * 'passed'; intro copy = categories.description non-empty after trim).
 * The guide/how-to term cannot be satisfied in this stage — no buying
 * guide / "how to choose" block is linked to categories yet (that
 * arrives with the content stage) — so it is ALWAYS reported as a
 * reason rather than silently passed, which honestly makes every
 * category non-indexable for now.
 */
export async function categoryIndexability(
  db: D1Database,
  categoryId: number,
): Promise<{ indexable: boolean; reasons: string[] } | null> {
  const category = await db
    .prepare('SELECT id, description FROM categories WHERE id = ?')
    .bind(categoryId)
    .first<{ id: number; description: string | null }>()
  if (!category) return null
  const reasons: string[] = []
  const countRow = await db
    .prepare(
      `SELECT COUNT(*) AS n FROM products
        WHERE category_id = ? AND status = 'published' AND validation_status = 'passed'`,
    )
    .bind(categoryId)
    .first<{ n: number }>()
  const publishedCount = countRow?.n ?? 0
  if (publishedCount < 5) {
    reasons.push(
      `Category has ${publishedCount} published, validated products; 5 are required.`,
    )
  }
  if (!category.description || category.description.trim().length === 0) {
    reasons.push('Category intro copy (description) is missing.')
  }
  reasons.push(
    'No buying guide or completed "how to choose" block is linked yet (arrives with the content stage).',
  )
  return { indexable: reasons.length === 0, reasons }
}
