/**
 * Admin mutations (Stage 03 skeleton). Every mutation writes an audit_logs
 * row (API-ARCHITECTURE.md §6). Deletion of products is NOT offered:
 * integrity rule 4 — archive instead.
 */
import { reindexProduct } from './reindex'
export interface AdminActor {
  id: number
  email: string
  role: string
}

export async function writeAudit(
  db: D1Database,
  actor: AdminActor,
  action: string,
  entityType: string,
  entityId: number | null,
  before: unknown,
  after: unknown,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO audit_logs (actor_admin_id, action, entity_type, entity_id, before_json, after_json) VALUES (?,?,?,?,?,?)',
    )
    .bind(
      actor.id,
      action,
      entityType,
      entityId,
      before ? JSON.stringify(before) : null,
      after ? JSON.stringify(after) : null,
    )
    .run()
}

export interface NewProductInput {
  categorySlug: string
  brandSlug?: string
  slug: string
  name: string
  modelRef?: string
  editorialSummary?: string
}

export async function createProduct(
  db: D1Database,
  actor: AdminActor,
  input: NewProductInput,
): Promise<{ id: number } | { conflict: true }> {
  const category = await db
    .prepare('SELECT id FROM categories WHERE slug = ?')
    .bind(input.categorySlug)
    .first<{ id: number }>()
  if (!category) return { conflict: true }
  let brandId: number | null = null
  if (input.brandSlug) {
    const brand = await db
      .prepare('SELECT id FROM brands WHERE slug = ?')
      .bind(input.brandSlug)
      .first<{ id: number }>()
    if (!brand) return { conflict: true }
    brandId = brand.id
  }
  const existing = await db
    .prepare('SELECT id FROM products WHERE slug = ?')
    .bind(input.slug)
    .first<{ id: number }>()
  if (existing) return { conflict: true }
  const inserted = await db
    .prepare(
      `INSERT INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, validation_status, source_id)
       VALUES (?,?,?,?,?,?,'draft','pending','manual-entry') RETURNING id`,
    )
    .bind(
      category.id,
      brandId,
      input.slug,
      input.name,
      input.modelRef ?? null,
      input.editorialSummary ?? null,
    )
    .first<{ id: number }>()
  if (!inserted) return { conflict: true }
  await writeAudit(db, actor, 'product.create', 'product', inserted.id, null, {
    slug: input.slug,
    name: input.name,
  })
  return { id: inserted.id }
}

/**
 * Stage 04.2 (audit F-01) — the invalidation rule every gate-relevant write
 * path shares: when data a stored validation verdict was computed over
 * changes, the verdict is void. The product returns to 'pending' in the
 * SAME logical step as the write, so the public gate (published + passed)
 * closes immediately — a previously-published product edited into
 * invalidity disappears from detail, lists and FTS search until it is
 * re-validated and re-published. The FTS projection is refreshed in the
 * same step (F-14), so search reflects the invalidation even before its
 * join re-check runs. Only successful mutations call this: a rejected
 * write changes nothing, invalidates nothing.
 */
export async function invalidateProductValidation(db: D1Database, productId: number): Promise<void> {
  await db
    .prepare(
      "UPDATE products SET validation_status = 'pending', validated_at = NULL, updated_at = datetime('now') WHERE id = ? AND validation_status != 'pending'",
    )
    .bind(productId)
    .run()
  await reindexProduct(db, productId)
}

/**
 * Stage 04.6 (audit 04.5-F1): the verdict reset as a PREPARED STATEMENT,
 * for write paths that must apply it atomically with their own data
 * write — folded into the same UPDATE (product fields) or into the same
 * D1 batch (specs, attributes, media). The Stage 04.2 construction ran
 * the data write and this reset as two sequential statements; between
 * them the new data was publicly readable under the stale 'passed'
 * verdict (04.5 probe W1). Folding the reset into the mutation's own
 * atomic unit removes that interval entirely: no observable state pairs
 * changed data with the verdict computed over the old data. Callers run
 * reindexProduct themselves after the atomic write commits — the
 * projection refresh is not part of the invariant-critical write, and
 * the public gate (published + passed, re-checked by join on every
 * public read) is already closed by the reset itself.
 */
export function prepareProductValidationReset(db: D1Database, productId: number): D1PreparedStatement {
  return db
    .prepare(
      "UPDATE products SET validation_status = 'pending', validated_at = NULL, updated_at = datetime('now') WHERE id = ?",
    )
    .bind(productId)
}

/**
 * Publication gate (integrity rules 2 + workflow): a product may transition
 * to 'published' ONLY when validation_status='passed'. Every transition is
 * audited with before/after status.
 *
 * Stage 04.2 (audit F-13): the gate is enforced by a CONDITIONAL UPDATE,
 * not by the read above — if a concurrent edit invalidates the product
 * between the read and the write, the UPDATE matches no row and the
 * publish fails with 'validation_gate' instead of publishing stale data.
 */
export async function transitionProductStatus(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  target: 'in_review' | 'published' | 'archived' | 'draft',
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'validation_gate' }> {
  const row = await db
    .prepare('SELECT id, status, validation_status FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number; status: string; validation_status: string }>()
  if (!row) return { ok: false, reason: 'not_found' }
  if (target === 'published') {
    const result = await db
      .prepare(
        "UPDATE products SET status = 'published', updated_at = datetime('now') WHERE id = ? AND validation_status = 'passed'",
      )
      .bind(productId)
      .run()
    if (result.meta.changes === 0) return { ok: false, reason: 'validation_gate' }
  } else {
    await db
      .prepare("UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?")
      .bind(target, productId)
      .run()
  }
  await writeAudit(
    db,
    actor,
    `product.${target === 'published' ? 'publish' : target}`,
    'product',
    productId,
    { status: row.status },
    { status: target },
  )
  // F-14: keep the FTS projection in step with status changes.
  await reindexProduct(db, productId)
  return { ok: true }
}

export async function adminOverview(db: D1Database): Promise<Record<string, number>> {
  const counts = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0
  return {
    products_total: await counts('SELECT COUNT(*) AS n FROM products'),
    products_published: await counts("SELECT COUNT(*) AS n FROM products WHERE status = 'published'"),
    products_validation_failed: await counts(
      "SELECT COUNT(*) AS n FROM products WHERE validation_status = 'failed'",
    ),
    offers_total: await counts('SELECT COUNT(*) AS n FROM offers'),
    audit_entries: await counts('SELECT COUNT(*) AS n FROM audit_logs'),
  }
}
