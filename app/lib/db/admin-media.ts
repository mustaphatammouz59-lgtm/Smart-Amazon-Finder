import { prepareProductValidationReset, writeAudit, type AdminActor } from './admin'
import { reindexProduct } from './reindex'

/**
 * Product media DAL (Stage 04). product_media rows point at R2 objects
 * via url_or_key; the route layer owns the R2 object itself — this
 * module owns rows and audit entries only. Every mutation is audited
 * (§6).
 *
 * Stage 04.6 (04.5-F1) ordering contract: every row mutation commits
 * together with the product's validation-verdict reset in ONE D1 batch,
 * so no observable state pairs a changed media set with the stale
 * 'passed' verdict. R2 is NOT transactional with D1 and no distributed
 * atomicity is claimed: callers upload the object BEFORE addProductMedia
 * (an unreferenced object is a harmless orphan; a failed batch leaves
 * no row), and delete the object only AFTER deleteMediaRow commits (a
 * failed object delete leaves an orphan, never a dangling row or a
 * stale verdict).
 */

export interface ProductMediaRow {
  id: number
  product_id: number
  kind: string
  url_or_key: string
  alt_text: string | null
  licence_status: string
  expires_at: string | null
  sort_order: number
}

const MEDIA_SELECT =
  'SELECT id, product_id, kind, url_or_key, alt_text, licence_status, expires_at, sort_order FROM product_media'

export async function listProductMedia(db: D1Database, productId: number): Promise<ProductMediaRow[]> {
  const { results } = await db
    .prepare(`${MEDIA_SELECT} WHERE product_id = ? ORDER BY sort_order ASC, id ASC`)
    .bind(productId)
    .all<ProductMediaRow>()
  return results
}

export async function getMediaRow(db: D1Database, id: number): Promise<ProductMediaRow | null> {
  return db.prepare(`${MEDIA_SELECT} WHERE id = ?`).bind(id).first<ProductMediaRow>()
}

export interface AddProductMediaInput {
  key: string
  altText?: string | null
  licenceStatus?: string
  expiresAt?: string | null
}

export async function addProductMedia(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  input: AddProductMediaInput,
): Promise<{ id: number } | { notFound: true }> {
  const product = await db
    .prepare('SELECT id FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number }>()
  if (!product) return { notFound: true }
  const maxRow = await db
    .prepare('SELECT MAX(sort_order) AS max_order FROM product_media WHERE product_id = ?')
    .bind(productId)
    .first<{ max_order: number | null }>()
  const sortOrder = (maxRow?.max_order ?? -1) + 1
  // F-01 + Stage 04.6 (04.5-F1): media rows are licence-bearing product
  // data — the INSERT and the product's verdict reset commit in ONE D1
  // batch, so the new row is never observable under the stale 'passed'
  // verdict, and a failed batch leaves no row at all.
  const [inserted] = await db.batch([
    db
      .prepare(
        `INSERT INTO product_media (product_id, kind, url_or_key, alt_text, licence_status, expires_at, sort_order)
         VALUES (?, 'r2_original', ?, ?, ?, ?, ?) RETURNING id`,
      )
      .bind(
        productId,
        input.key,
        input.altText ?? null,
        input.licenceStatus ?? 'owned',
        input.expiresAt ?? null,
        sortOrder,
      ),
    prepareProductValidationReset(db, productId),
  ])
  const insertedId = (inserted?.results?.[0] as { id: number } | undefined)?.id
  if (insertedId === undefined) return { notFound: true }
  await reindexProduct(db, productId)
  await writeAudit(db, actor, 'product.media.add', 'product_media', insertedId, null, {
    product_id: productId,
    url_or_key: input.key,
    sort_order: sortOrder,
  })
  return { id: insertedId }
}

export interface UpdateMediaPatch {
  altText?: string | null
  licenceStatus?: string
  expiresAt?: string | null
  sortOrder?: number
}

export async function updateMedia(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateMediaPatch,
): Promise<{ ok: boolean }> {
  const row = await getMediaRow(db, id)
  if (!row) return { ok: false }
  const sets: string[] = []
  const binds: unknown[] = []
  if (patch.altText !== undefined) {
    sets.push('alt_text = ?')
    binds.push(patch.altText)
  }
  if (patch.licenceStatus !== undefined) {
    sets.push('licence_status = ?')
    binds.push(patch.licenceStatus)
  }
  if (patch.expiresAt !== undefined) {
    sets.push('expires_at = ?')
    binds.push(patch.expiresAt)
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?')
    binds.push(patch.sortOrder)
  }
  if (sets.length > 0) {
    binds.push(id)
    // F-01 + Stage 04.6 (04.5-F1): a licence/expiry/alt-text change
    // voids the product's verdict — the row UPDATE and the verdict
    // reset commit in ONE D1 batch, never as two observable steps.
    await db.batch([
      db.prepare(`UPDATE product_media SET ${sets.join(', ')} WHERE id = ?`).bind(...binds),
      prepareProductValidationReset(db, row.product_id),
    ])
    await reindexProduct(db, row.product_id)
    await writeAudit(db, actor, 'product_media.update', 'product_media', id, row, patch)
  }
  // F-17 (minors): an empty patch changes nothing, so it also writes no
  // audit row — previously a no-op PATCH fabricated an audit entry.
  return { ok: true }
}

export async function deleteMediaRow(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<{ ok: true; row: ProductMediaRow } | { ok: false }> {
  const row = await getMediaRow(db, id)
  if (!row) return { ok: false }
  // F-01 + Stage 04.6 (04.5-F1): removing media (possibly the last
  // image) voids the verdict — the row DELETE and the verdict reset
  // commit in ONE D1 batch. Callers delete the R2 object only after
  // this commits (see the module header's ordering contract).
  await db.batch([
    db.prepare('DELETE FROM product_media WHERE id = ?').bind(id),
    prepareProductValidationReset(db, row.product_id),
  ])
  await reindexProduct(db, row.product_id)
  await writeAudit(db, actor, 'product_media.delete', 'product_media', id, row, null)
  return { ok: true, row }
}

/**
 * Make one media row the product's primary image: it takes sort_order 0
 * and every other row of the same product keeps its relative order,
 * renumbered 1..n-1.
 *
 * Deliberately NO verdict reset (Stage 04.6 inventory, 04.5 §4.2):
 * display ordering is not a validation input — the engine reads the
 * media COUNT, which this function cannot change — so reordering can
 * never make a stored verdict stale. The Stage 04.2 invalidation suite
 * pins this exclusion ('media add and delete invalidate; reordering
 * (setPrimary) does not').
 */
export async function setPrimaryMedia(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<{ ok: boolean }> {
  const target = await getMediaRow(db, id)
  if (!target) return { ok: false }
  const { results } = await db
    .prepare('SELECT id FROM product_media WHERE product_id = ? ORDER BY sort_order ASC, id ASC')
    .bind(target.product_id)
    .all<{ id: number }>()
  const ordered = [target.id, ...results.map((r) => r.id).filter((mediaId) => mediaId !== target.id)]
  // Sequential updates (the DAL never relies on db.batch — the local test
  // adapter does not implement it, and ordering here is not transactional).
  for (const [index, mediaId] of ordered.entries()) {
    await db.prepare('UPDATE product_media SET sort_order = ? WHERE id = ?').bind(index, mediaId).run()
  }
  await writeAudit(
    db,
    actor,
    'product_media.primary',
    'product_media',
    id,
    { sort_order: target.sort_order },
    { sort_order: 0, product_id: target.product_id },
  )
  return { ok: true }
}
