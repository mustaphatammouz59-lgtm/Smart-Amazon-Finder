import { describe, expect, it } from 'vitest'
import { createTestDb, freshCatalogDb } from '../helpers/sqlite-d1'
import { createProduct, transitionProductStatus, type AdminActor } from '../../app/lib/db/admin'
import { setProductAttributes, setProductSpecs, updateProduct } from '../../app/lib/db/admin-products'
import { addProductMedia, deleteMediaRow, updateMedia } from '../../app/lib/db/admin-media'
import { runProductValidation } from '../../app/lib/product-validation'
import { getProductBySlug } from '../../app/lib/db/catalog'

/**
 * Stage 04.6 regression suite — 04.5-F1 (LOW, confirmed): product edit
 * paths wrote data first and invalidated the stored validation verdict
 * in a SEPARATE statement. Between the two, the new data was publicly
 * readable under the stale 'passed' verdict (04.5 probe W1).
 *
 * The fix folds the verdict reset into the mutation's own atomic unit:
 * the same UPDATE for product fields (the updateOffer construction),
 * and ONE D1 batch — a single transaction — for specs, attributes and
 * media. These tests prove the window is gone three ways:
 *
 *  1. A statement-boundary monitor wraps the database during each real
 *     DAL edit and asserts, after EVERY statement the edit executes,
 *     that the product is never observable in the state (verdict input
 *     changed) AND (validation_status = 'passed'). Against the Stage
 *     04.4 code this monitor trips on the data statement of
 *     updateProduct / setProductSpecs / addProductMedia /
 *     deleteMediaRow; against the fix it cannot trip, because the
 *     first observable state after each atomic unit already carries
 *     'pending'.
 *  2. Failure injection: when the D1 batch fails, NOTHING is applied —
 *     neither the data change nor the reset — so a failed mutation
 *     leaves the previously valid state fully intact.
 *  3. The batch mechanism itself: the test adapter's batch() is proven
 *     transactional with a genuine mid-batch SQL failure (rollback of
 *     every statement), which is the D1 semantic the DAL relies on
 *     (and which the workerd sweep exercises against real D1).
 */

type Raw = ReturnType<typeof freshCatalogDb>['raw']

function owner(raw: Raw): AdminActor {
  return raw
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .get() as AdminActor
}

function definitionId(raw: Raw, key: string): number {
  const row = raw
    .prepare(
      `SELECT d.id FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = 'home-office' AND d.key = ?`,
    )
    .get(key) as { id: number }
  return row.id
}

/** The exact verdict-input set the product validation engine reads. */
interface GuardInputs {
  name: string
  slug: string
  category_id: number
  brand_id: number | null
  licence_status: string
  editorial_summary: string | null
  spec_count: number
  media_count: number
  offer_count: number
}

function guardInputs(raw: Raw, productId: number): GuardInputs {
  const row = raw
    .prepare(
      'SELECT name, slug, category_id, brand_id, licence_status, editorial_summary FROM products WHERE id = ?',
    )
    .get(productId) as Omit<GuardInputs, 'spec_count' | 'media_count' | 'offer_count'>
  const count = (sql: string) => (raw.prepare(sql).get(productId) as { n: number }).n
  return {
    ...row,
    spec_count: count(
      `SELECT COUNT(*) AS n FROM product_specs WHERE product_id = ?
         AND (value_number IS NOT NULL OR value_text IS NOT NULL OR value_bool IS NOT NULL)`,
    ),
    media_count: count('SELECT COUNT(*) AS n FROM product_media WHERE product_id = ?'),
    offer_count: count('SELECT COUNT(*) AS n FROM offers WHERE product_id = ?'),
  }
}

function validationState(raw: Raw, productId: number): { status: string; validation_status: string; validated_at: string | null } {
  return raw
    .prepare('SELECT status, validation_status, validated_at FROM products WHERE id = ?')
    .get(productId) as { status: string; validation_status: string; validated_at: string | null }
}

/**
 * Wrap a D1Database so that after every statement (and every batch)
 * the wrapped call executes, the F1 invariant is checked against the
 * pre-edit inputs: while validation_status is still 'passed', every
 * verdict input must still equal its pre-edit value. Any observable
 * intermediate state pairing changed data with the stale verdict
 * throws an assertion error at the exact statement boundary.
 * `extraWatch` extends the watched projection beyond verdict inputs
 * (e.g. a media row's own fields for a metadata update — data the
 * engine does not read, but which the brief's invariant still covers:
 * changed product data must never be observable under a stale
 * 'passed').
 */
function monitoredDb(
  db: D1Database,
  raw: Raw,
  productId: number,
  before: GuardInputs,
  extraWatch?: () => unknown,
): D1Database {
  const beforeExtra = extraWatch?.()
  const check = () => {
    const state = validationState(raw, productId)
    if (state.validation_status === 'passed') {
      expect(guardInputs(raw, productId)).toEqual(before)
      if (extraWatch) expect(extraWatch()).toEqual(beforeExtra)
    }
  }
  const wrapped = {
    prepare(sql: string) {
      const stmt = db.prepare(sql) as unknown as Record<string, (...args: never[]) => Promise<unknown>>
      for (const method of ['run', 'all', 'first'] as const) {
        const original = stmt[method].bind(stmt)
        stmt[method] = async (...args: never[]) => {
          const result = await original(...args)
          check()
          return result
        }
      }
      return stmt
    },
    async batch(statements: D1PreparedStatement[]) {
      const result = await db.batch(statements)
      check()
      return result
    },
    async exec(sql: string) {
      const result = await db.exec(sql)
      check()
      return result
    },
  }
  return wrapped as unknown as D1Database
}

/** A db whose batch always fails — simulates a D1 transaction error. */
function batchFailingDb(db: D1Database): D1Database {
  return {
    ...db,
    batch: async () => {
      throw new Error('injected D1 batch failure')
    },
  } as D1Database
}

/** Create a valid product, validate it (passed) and publish it. */
async function publishedProduct(
  raw: Raw,
  db: D1Database,
  actor: AdminActor,
  slug: string,
  options: { withMedia?: boolean } = {},
): Promise<number> {
  const created = await createProduct(db, actor, {
    categorySlug: 'home-office',
    slug,
    name: 'Atomicity Widget',
    editorialSummary: 'A thoroughly described widget.',
  })
  if (!('id' in created)) throw new Error('create failed')
  const id = created.id
  await setProductSpecs(db, actor, id, [{ definitionId: definitionId(raw, 'height_adjustable'), value: true }])
  if (options.withMedia) {
    const media = await addProductMedia(db, actor, id, { key: `products/${id}/seed.png` })
    if (!('id' in media)) throw new Error('media seed failed')
  }
  expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
  expect(await transitionProductStatus(db, actor, id, 'published')).toEqual({ ok: true })
  expect(validationState(raw, id)).toMatchObject({ status: 'published', validation_status: 'passed' })
  expect(validationState(raw, id).validated_at).not.toBeNull()
  return id
}

describe('D1 batch mechanism (adapter fidelity for the semantics the DAL relies on)', () => {
  it('commits every statement and returns RETURNING rows like D1', async () => {
    const { db, raw } = createTestDb()
    raw.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT UNIQUE)')
    const results = await db.batch([
      db.prepare("INSERT INTO t (v) VALUES ('a') RETURNING id"),
      db.prepare("INSERT INTO t (v) VALUES ('b') RETURNING id"),
    ])
    expect(results[0]?.results[0]).toEqual({ id: 1 })
    expect(results[1]?.results[0]).toEqual({ id: 2 })
    expect((raw.prepare('SELECT COUNT(*) AS n FROM t').get() as { n: number }).n).toBe(2)
  })

  it('rolls back EVERY statement when a later statement fails (genuine SQL failure)', async () => {
    const { db, raw } = createTestDb()
    raw.exec('CREATE TABLE t (id INTEGER PRIMARY KEY, v TEXT UNIQUE)')
    await expect(
      db.batch([
        db.prepare("INSERT INTO t (v) VALUES ('x')"),
        db.prepare("INSERT INTO t (v) VALUES ('x')"), // UNIQUE violation mid-batch
      ]),
    ).rejects.toThrow()
    expect((raw.prepare('SELECT COUNT(*) AS n FROM t').get() as { n: number }).n).toBe(0)
  })
})

describe('04.5-F1: no observable state pairs changed data with a stale passed verdict', () => {
  it('updateProduct: the field write and the verdict reset are one statement', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-fields')
    const before = guardInputs(raw, id)
    const monitored = monitoredDb(db, raw, id, before)
    expect(await updateProduct(monitored, actor, id, { name: 'Renamed Atomically', editorialSummary: 'New summary.' })).toEqual({ ok: true })
    const state = validationState(raw, id)
    expect(state.validation_status).toBe('pending')
    expect(state.validated_at).toBeNull()
    expect(guardInputs(raw, id).name).toBe('Renamed Atomically')
    expect(await getProductBySlug(db, 'f1-fields', false)).toBeNull()
  })

  it('setProductSpecs: spec writes and the verdict reset commit in one batch', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-specs')
    const before = guardInputs(raw, id)
    const monitored = monitoredDb(db, raw, id, before)
    expect(
      await setProductSpecs(monitored, actor, id, [{ definitionId: definitionId(raw, 'max_load_kg'), value: 25 }]),
    ).toEqual({ ok: true })
    expect(guardInputs(raw, id).spec_count).toBe(2)
    expect(validationState(raw, id).validation_status).toBe('pending')
    expect(await getProductBySlug(db, 'f1-specs', false)).toBeNull()
  })

  it('setProductAttributes: the rewrite and the verdict reset commit in one batch', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-attributes')
    const before = guardInputs(raw, id)
    // Attributes are not verdict inputs either (the engine never reads
    // product_attributes), so the attribute rows are watched
    // explicitly — under the Stage 04.4 sequential construction this
    // monitor trips on the DELETE/INSERTs, which landed while the
    // product still said 'passed'.
    const attributeRows = () =>
      raw.prepare('SELECT key, value FROM product_attributes WHERE product_id = ? ORDER BY key, value').all(id)
    const monitored = monitoredDb(db, raw, id, before, attributeRows)
    expect(await setProductAttributes(monitored, actor, id, [{ key: 'color_family', value: 'red' }])).toEqual({ ok: true })
    const attrs = raw.prepare('SELECT key, value FROM product_attributes WHERE product_id = ?').all(id) as unknown[]
    expect(attrs).toEqual([{ key: 'color_family', value: 'red' }])
    expect(validationState(raw, id).validation_status).toBe('pending')
    expect(await getProductBySlug(db, 'f1-attributes', false)).toBeNull()
  })

  it('addProductMedia: the row insert and the verdict reset commit in one batch', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-media-add')
    const before = guardInputs(raw, id)
    const monitored = monitoredDb(db, raw, id, before)
    const added = await addProductMedia(monitored, actor, id, { key: `products/${id}/new.png` })
    expect('id' in added).toBe(true)
    expect(guardInputs(raw, id).media_count).toBe(1)
    expect(validationState(raw, id).validation_status).toBe('pending')
    expect(await getProductBySlug(db, 'f1-media-add', false)).toBeNull()
  })

  it('updateMedia: the metadata write and the verdict reset commit in one batch', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-media-update', { withMedia: true })
    const mediaId = (raw.prepare('SELECT id FROM product_media WHERE product_id = ?').get(id) as { id: number }).id
    const before = guardInputs(raw, id)
    // The media row's licence is not a verdict input (the engine reads
    // the media COUNT), so it is watched explicitly: under the Stage
    // 04.4 two-statement construction this monitor trips on the row
    // UPDATE, which landed while the product still said 'passed'.
    const mediaLicence = () =>
      (raw.prepare('SELECT licence_status FROM product_media WHERE id = ?').get(mediaId) as { licence_status: string })
        .licence_status
    const monitored = monitoredDb(db, raw, id, before, mediaLicence)
    expect(await updateMedia(monitored, actor, mediaId, { licenceStatus: 'expired' })).toEqual({ ok: true })
    const row = raw.prepare('SELECT licence_status FROM product_media WHERE id = ?').get(mediaId) as { licence_status: string }
    expect(row.licence_status).toBe('expired')
    expect(validationState(raw, id).validation_status).toBe('pending')
    expect(await getProductBySlug(db, 'f1-media-update', false)).toBeNull()
  })

  it('deleteMediaRow: the row delete and the verdict reset commit in one batch', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-media-delete', { withMedia: true })
    const mediaId = (raw.prepare('SELECT id FROM product_media WHERE product_id = ?').get(id) as { id: number }).id
    const before = guardInputs(raw, id)
    const monitored = monitoredDb(db, raw, id, before)
    const deleted = await deleteMediaRow(monitored, actor, mediaId)
    expect(deleted.ok).toBe(true)
    expect(guardInputs(raw, id).media_count).toBe(0)
    expect(validationState(raw, id).validation_status).toBe('pending')
    expect(await getProductBySlug(db, 'f1-media-delete', false)).toBeNull()
  })
})

describe('04.5-F1: a failed D1 batch applies neither the data change nor the reset', () => {
  it('setProductSpecs failure: specs, verdict and audit all unchanged', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-fail-specs')
    const auditsBefore = (raw.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'product.specs.update'").get() as { n: number }).n
    await expect(
      setProductSpecs(batchFailingDb(db), actor, id, [{ definitionId: definitionId(raw, 'max_load_kg'), value: 25 }]),
    ).rejects.toThrow('injected D1 batch failure')
    expect(guardInputs(raw, id).spec_count).toBe(1)
    expect(validationState(raw, id).validation_status).toBe('passed')
    expect(await getProductBySlug(db, 'f1-fail-specs', false)).not.toBeNull()
    const auditsAfter = (raw.prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action = 'product.specs.update'").get() as { n: number }).n
    expect(auditsAfter).toBe(auditsBefore)
  })

  it('setProductAttributes failure: attributes and verdict unchanged', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-fail-attrs')
    await setProductAttributes(db, actor, id, [{ key: 'color_family', value: 'blue' }])
    // Re-validate back to passed so the failure case starts from a live verdict.
    expect((await runProductValidation(db, actor, id))?.status).toBe('passed')
    await expect(
      setProductAttributes(batchFailingDb(db), actor, id, [{ key: 'color_family', value: 'green' }]),
    ).rejects.toThrow('injected D1 batch failure')
    const attrs = raw.prepare('SELECT key, value FROM product_attributes WHERE product_id = ?').all(id) as unknown[]
    expect(attrs).toEqual([{ key: 'color_family', value: 'blue' }])
    expect(validationState(raw, id).validation_status).toBe('passed')
  })

  it('addProductMedia failure: no row is left behind and the verdict stands', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-fail-media')
    await expect(
      addProductMedia(batchFailingDb(db), actor, id, { key: `products/${id}/never.png` }),
    ).rejects.toThrow('injected D1 batch failure')
    expect(guardInputs(raw, id).media_count).toBe(0)
    expect(validationState(raw, id).validation_status).toBe('passed')
    expect(await getProductBySlug(db, 'f1-fail-media', false)).not.toBeNull()
  })

  it('deleteMediaRow failure: the row and the verdict both stand', async () => {
    const { db, raw } = freshCatalogDb()
    const actor = owner(raw)
    const id = await publishedProduct(raw, db, actor, 'f1-fail-delete', { withMedia: true })
    const mediaId = (raw.prepare('SELECT id FROM product_media WHERE product_id = ?').get(id) as { id: number }).id
    await expect(deleteMediaRow(batchFailingDb(db), actor, mediaId)).rejects.toThrow('injected D1 batch failure')
    expect(guardInputs(raw, id).media_count).toBe(1)
    expect(validationState(raw, id).validation_status).toBe('passed')
    expect(await getProductBySlug(db, 'f1-fail-delete', false)).not.toBeNull()
  })
})
