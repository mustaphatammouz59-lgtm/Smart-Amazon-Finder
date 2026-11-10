import type { AdminActor } from './admin'
import { prepareProductValidationReset, writeAudit } from './admin'
import { reindexProduct } from './reindex'
import type { ProductRow } from './types'
import { decodeCursor, encodeCursor } from './types'

/**
 * Admin product DAL (Stage 04). Every mutation writes an audit_logs row
 * via writeAudit AFTER the change, with before/after snapshots where the
 * contract requires them.
 */

export interface AdminProductListFilters {
  q?: string
  status?: string
  validationStatus?: string
  categorySlug?: string
  brandSlug?: string
  sort?: 'name' | 'newest' | 'updated'
  cursor?: string | null
  limit?: number
}

export type AdminProductListItem = ProductRow & {
  category_name: string
  category_slug: string
  brand_name: string | null
  brand_slug: string | null
}

export interface AdminProductSpecRow {
  definition_id: number
  key: string
  label: string
  unit: string | null
  value_type: string
  is_filterable: number
  is_required: number
  is_comparison_criterion: number
  sort_weight: number
  value_number: number | null
  value_text: string | null
  value_bool: number | null
}

export interface AdminProductVariantRow {
  id: number
  variant_key: string
  label: string
  source_sku_ref: string | null
}

export interface AdminProductMediaRow {
  id: number
  kind: string
  url_or_key: string
  alt_text: string | null
  licence_status: string
  expires_at: string | null
  sort_order: number
}

export interface AdminProductDetail {
  product: ProductRow & {
    category_name: string
    category_slug: string
    brand_name: string | null
    brand_slug: string | null
  }
  specs: AdminProductSpecRow[]
  variants: AdminProductVariantRow[]
  attributes: Array<{ key: string; value: string }>
  media: AdminProductMediaRow[]
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

export async function listAdminProducts(
  db: D1Database,
  filters: AdminProductListFilters,
): Promise<{ items: AdminProductListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60)
  const offset = decodeCursor(filters.cursor)
  const binds: unknown[] = []
  const where: string[] = []
  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`
    where.push("(p.name LIKE ? ESCAPE '\\' OR p.slug LIKE ? ESCAPE '\\' OR p.model_ref LIKE ? ESCAPE '\\')")
    binds.push(pattern, pattern, pattern)
  }
  if (filters.status) {
    where.push('p.status = ?')
    binds.push(filters.status)
  }
  if (filters.validationStatus) {
    where.push('p.validation_status = ?')
    binds.push(filters.validationStatus)
  }
  if (filters.categorySlug) {
    where.push('c.slug = ?')
    binds.push(filters.categorySlug)
  }
  if (filters.brandSlug) {
    where.push('b.slug = ?')
    binds.push(filters.brandSlug)
  }
  let order: string
  if (filters.sort === 'name') order = 'p.name ASC, p.id ASC'
  else if (filters.sort === 'newest') order = 'p.created_at DESC, p.id DESC'
  else order = 'p.updated_at DESC, p.id DESC'
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const sql = `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name, b.slug AS brand_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<AdminProductListItem>()
  const hasMore = results.length > limit
  const items = hasMore ? results.slice(0, limit) : results
  return { items, nextCursor: hasMore ? encodeCursor(offset + limit) : null }
}

export async function getAdminProduct(
  db: D1Database,
  id: number,
): Promise<AdminProductDetail | null> {
  const product = await db
    .prepare(
      `SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name, b.slug AS brand_slug
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.id = ?`,
    )
    .bind(id)
    .first<AdminProductDetail['product']>()
  if (!product) return null
  const { results: specs } = await db
    .prepare(
      `SELECT d.id AS definition_id, d.key, d.label, d.unit, d.value_type,
              d.is_filterable, d.is_required, d.is_comparison_criterion, d.sort_weight,
              s.value_number, s.value_text, s.value_bool
         FROM attribute_definitions d
         LEFT JOIN product_specs s ON s.definition_id = d.id AND s.product_id = ?
        WHERE d.category_id = ?
        ORDER BY d.sort_weight DESC, d.label ASC`,
    )
    .bind(id, product.category_id)
    .all<AdminProductSpecRow>()
  const { results: variants } = await db
    .prepare(
      'SELECT id, variant_key, label, source_sku_ref FROM product_variants WHERE product_id = ? ORDER BY id',
    )
    .bind(id)
    .all<AdminProductVariantRow>()
  const { results: attributes } = await db
    .prepare('SELECT key, value FROM product_attributes WHERE product_id = ? ORDER BY key, value')
    .bind(id)
    .all<{ key: string; value: string }>()
  const { results: media } = await db
    .prepare(
      `SELECT id, kind, url_or_key, alt_text, licence_status, expires_at, sort_order
         FROM product_media WHERE product_id = ? ORDER BY sort_order ASC, id ASC`,
    )
    .bind(id)
    .all<AdminProductMediaRow>()
  return { product, specs, variants, attributes, media }
}

export async function updateProduct(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: {
    name?: string
    modelRef?: string | null
    editorialSummary?: string | null
    categorySlug?: string
    brandSlug?: string | null
    licenceStatus?: 'owned' | 'licensed' | 'restricted' | 'expired'
  },
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'unknown_category' | 'unknown_brand' }> {
  const before = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<ProductRow>()
  if (!before) return { ok: false, reason: 'not_found' }

  let categoryId: number | undefined
  if (patch.categorySlug !== undefined) {
    const category = await db
      .prepare('SELECT id FROM categories WHERE slug = ?')
      .bind(patch.categorySlug)
      .first<{ id: number }>()
    if (!category) return { ok: false, reason: 'unknown_category' }
    categoryId = category.id
  }
  let brandId: number | null | undefined
  if (patch.brandSlug !== undefined) {
    if (patch.brandSlug === null) {
      brandId = null
    } else {
      const brand = await db
        .prepare('SELECT id FROM brands WHERE slug = ?')
        .bind(patch.brandSlug)
        .first<{ id: number }>()
      if (!brand) return { ok: false, reason: 'unknown_brand' }
      brandId = brand.id
    }
  }

  const sets: string[] = []
  const binds: unknown[] = []
  if (patch.name !== undefined) {
    sets.push('name = ?')
    binds.push(patch.name)
  }
  if (patch.modelRef !== undefined) {
    sets.push('model_ref = ?')
    binds.push(patch.modelRef)
  }
  if (patch.editorialSummary !== undefined) {
    sets.push('editorial_summary = ?')
    binds.push(patch.editorialSummary)
  }
  if (categoryId !== undefined) {
    sets.push('category_id = ?')
    binds.push(categoryId)
  }
  if (brandId !== undefined) {
    sets.push('brand_id = ?')
    binds.push(brandId)
  }
  if (patch.licenceStatus !== undefined) {
    sets.push('licence_status = ?')
    binds.push(patch.licenceStatus)
  }
  // F-01 + Stage 04.6 (04.5-F1): any product-field edit (name, summary,
  // category, brand, licence) voids the stored validation verdict IN
  // THE SAME STATEMENT — the reset is folded into this UPDATE (the
  // construction updateOffer has used since Stage 04.2), so the edit
  // and the invalidation can never be observed separately. The FTS
  // projection refresh follows the committed write, as before.
  sets.push("validation_status = 'pending'", 'validated_at = NULL')
  sets.push("updated_at = datetime('now')")
  binds.push(id)
  await db
    .prepare(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run()
  await reindexProduct(db, id)
  const after = await db
    .prepare('SELECT * FROM products WHERE id = ?')
    .bind(id)
    .first<ProductRow>()
  await writeAudit(db, actor, 'product.update', 'product', id, before, after)
  return { ok: true }
}

export async function setProductSpecs(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  specs: Array<{ definitionId: number; value: number | string | boolean | null }>,
): Promise<
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'unknown_definition' | 'type_mismatch'; definitionId?: number }
> {
  const product = await db
    .prepare('SELECT id, category_id FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number; category_id: number }>()
  if (!product) return { ok: false, reason: 'not_found' }

  // Validate every definition + value type before mutating anything.
  const definitions = new Map<number, { id: number; category_id: number; value_type: string }>()
  for (const spec of specs) {
    const definition = await db
      .prepare('SELECT id, category_id, value_type FROM attribute_definitions WHERE id = ?')
      .bind(spec.definitionId)
      .first<{ id: number; category_id: number; value_type: string }>()
    if (!definition || definition.category_id !== product.category_id) {
      return { ok: false, reason: 'unknown_definition', definitionId: spec.definitionId }
    }
    definitions.set(spec.definitionId, definition)
    if (spec.value === null) continue
    if (definition.value_type === 'number') {
      if (typeof spec.value !== 'number' || !Number.isFinite(spec.value)) {
        return { ok: false, reason: 'type_mismatch', definitionId: spec.definitionId }
      }
    } else if (definition.value_type === 'text') {
      if (typeof spec.value !== 'string' || spec.value.length > 500) {
        return { ok: false, reason: 'type_mismatch', definitionId: spec.definitionId }
      }
    } else if (definition.value_type === 'bool') {
      if (typeof spec.value !== 'boolean') {
        return { ok: false, reason: 'type_mismatch', definitionId: spec.definitionId }
      }
    }
  }

  // Stage 04.6 (04.5-F1): the spec writes and the verdict reset commit
  // in ONE D1 batch — a single transaction. Specs are validation input
  // (a product with no specs fails), and the Stage 04.2 construction
  // (sequential writes, then a separate invalidation) left an interval
  // where the new specs were readable under the stale 'passed' verdict.
  // Inside the batch no intermediate state is observable at all, and if
  // any statement fails the whole batch rolls back: neither the spec
  // changes nor the reset is applied, so a failed mutation invalidates
  // nothing (a rejected write above returned even earlier).
  const statements: D1PreparedStatement[] = []
  for (const spec of specs) {
    const definition = definitions.get(spec.definitionId)
    if (!definition) continue
    if (spec.value === null) {
      statements.push(
        db
          .prepare('DELETE FROM product_specs WHERE product_id = ? AND definition_id = ?')
          .bind(productId, spec.definitionId),
      )
      continue
    }
    let valueNumber: number | null = null
    let valueText: string | null = null
    let valueBool: number | null = null
    if (definition.value_type === 'number') valueNumber = spec.value as number
    else if (definition.value_type === 'text') valueText = spec.value as string
    else if (definition.value_type === 'bool') valueBool = (spec.value as boolean) ? 1 : 0
    statements.push(
      db
        .prepare(
          `INSERT INTO product_specs (product_id, definition_id, value_number, value_text, value_bool)
           VALUES (?,?,?,?,?)
           ON CONFLICT(product_id, definition_id) DO UPDATE SET
             value_number = excluded.value_number,
             value_text = excluded.value_text,
             value_bool = excluded.value_bool`,
        )
        .bind(productId, spec.definitionId, valueNumber, valueText, valueBool),
    )
  }
  statements.push(prepareProductValidationReset(db, productId))
  await db.batch(statements)
  await reindexProduct(db, productId)
  await writeAudit(db, actor, 'product.specs.update', 'product', productId, null, {
    count: specs.length,
  })
  return { ok: true }
}

export async function setProductAttributes(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  attributes: Array<{ key: string; value: string }>,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'invalid_key' }> {
  const product = await db
    .prepare('SELECT id FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number }>()
  if (!product) return { ok: false, reason: 'not_found' }
  // Keys feed gift-finder matching, so the slug shape is enforced here too
  // (the API route validates with zod; the DAL is the last line of defence).
  for (const attr of attributes) {
    if (!/^[a-z0-9_]{1,40}$/.test(attr.key) || attr.value.length === 0 || attr.value.length > 200) {
      return { ok: false, reason: 'invalid_key' }
    }
  }
  const seen = new Set<string>()
  const deduped: Array<{ key: string; value: string }> = []
  for (const attr of attributes) {
    const marker = `${attr.key}\0${attr.value}`
    if (seen.has(marker)) continue
    seen.add(marker)
    deduped.push(attr)
  }
  // F-01 + Stage 04.6 (04.5-F1): attributes sit in the same product
  // record family; the uniform rule — every successful write to a
  // product's own data voids its stored verdict — applies here too,
  // and the delete + inserts + verdict reset commit in ONE D1 batch so
  // no intermediate state (new attributes under the stale verdict) is
  // observable, and a failed batch applies none of them.
  const statements: D1PreparedStatement[] = [
    db.prepare('DELETE FROM product_attributes WHERE product_id = ?').bind(productId),
  ]
  for (const attr of deduped) {
    statements.push(
      db
        .prepare('INSERT INTO product_attributes (product_id, key, value) VALUES (?,?,?)')
        .bind(productId, attr.key, attr.value),
    )
  }
  statements.push(prepareProductValidationReset(db, productId))
  await db.batch(statements)
  await reindexProduct(db, productId)
  await writeAudit(db, actor, 'product.attributes.update', 'product', productId, null, {
    count: deduped.length,
  })
  return { ok: true }
}

export async function listVariants(
  db: D1Database,
  productId: number,
): Promise<AdminProductVariantRow[]> {
  const { results } = await db
    .prepare(
      'SELECT id, variant_key, label, source_sku_ref FROM product_variants WHERE product_id = ? ORDER BY id',
    )
    .bind(productId)
    .all<AdminProductVariantRow>()
  return results
}

export async function createVariant(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  input: { variantKey: string; label: string; sourceSkuRef?: string },
): Promise<{ id: number } | { conflict: true } | { notFound: true }> {
  const product = await db
    .prepare('SELECT id FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number }>()
  if (!product) return { notFound: true }
  const existing = await db
    .prepare('SELECT id FROM product_variants WHERE product_id = ? AND variant_key = ?')
    .bind(productId, input.variantKey)
    .first<{ id: number }>()
  if (existing) return { conflict: true }
  try {
    const inserted = await db
      .prepare(
        'INSERT INTO product_variants (product_id, variant_key, label, source_sku_ref) VALUES (?,?,?,?) RETURNING id',
      )
      .bind(productId, input.variantKey, input.label, input.sourceSkuRef ?? null)
      .first<{ id: number }>()
    if (!inserted) return { conflict: true }
    await writeAudit(db, actor, 'product.variant.create', 'product', productId, null, {
      variantId: inserted.id,
      variantKey: input.variantKey,
      label: input.label,
    })
    return { id: inserted.id }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('UNIQUE') || message.toLowerCase().includes('constraint')) {
      return { conflict: true }
    }
    throw error
  }
}

export async function deleteVariant(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  variantId: number,
): Promise<{ ok: boolean }> {
  const existing = await db
    .prepare('SELECT id, variant_key, label, source_sku_ref FROM product_variants WHERE id = ? AND product_id = ?')
    .bind(variantId, productId)
    .first<AdminProductVariantRow>()
  if (!existing) return { ok: false }
  await db.prepare('DELETE FROM product_variants WHERE id = ? AND product_id = ?').bind(variantId, productId).run()
  await writeAudit(db, actor, 'product.variant.delete', 'product', productId, existing, null)
  return { ok: true }
}
