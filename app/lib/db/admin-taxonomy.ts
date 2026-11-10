/**
 * Admin taxonomy mutations (Stage 04): categories, brands and attribute
 * definitions. Every mutation writes an audit_logs row AFTER the change
 * with before/after row snapshots (see writeAudit in ./admin).
 *
 * Integrity notes:
 * - Category and brand slugs are immutable once created: public URLs and
 *   product references are built from them.
 * - Attribute definition key, value_type and category are immutable:
 *   product_specs rows and facet filters depend on all three.
 * - Categories have no archive/status column in the schema, so deletion
 *   is a hard delete offered ONLY when the category is fully
 *   unreferenced (no children, products, definitions or guides). The
 *   same in-use guard applies to brands (products) and attribute
 *   definitions (product_specs rows).
 */
import { writeAudit, type AdminActor } from './admin'

export interface CategoryRow {
  id: number
  parent_id: number | null
  slug: string
  name: string
  description: string | null
  sort_order: number
  is_indexable: number
  parent_slug: string | null
  products_count: number
  children_count: number
  definitions_count: number
  guides_count: number
}

export interface BrandRow {
  id: number
  slug: string
  name: string
  website_url: string | null
  products_count: number
}

export interface AttributeDefinitionRow {
  id: number
  category_id: number
  key: string
  label: string
  unit: string | null
  value_type: 'number' | 'text' | 'bool'
  is_filterable: number
  is_required: number
  is_comparison_criterion: number
  sort_weight: number
  specs_count: number
}

const CATEGORY_SELECT = `
  SELECT c.id, c.parent_id, c.slug, c.name, c.description, c.sort_order, c.is_indexable,
    parent.slug AS parent_slug,
    (SELECT COUNT(*) FROM products WHERE category_id = c.id) AS products_count,
    (SELECT COUNT(*) FROM categories WHERE parent_id = c.id) AS children_count,
    (SELECT COUNT(*) FROM attribute_definitions WHERE category_id = c.id) AS definitions_count,
    (SELECT COUNT(*) FROM buying_guides WHERE category_id = c.id) AS guides_count
  FROM categories c
  LEFT JOIN categories parent ON parent.id = c.parent_id`

const BRAND_SELECT = `
  SELECT b.id, b.slug, b.name, b.website_url,
    (SELECT COUNT(*) FROM products WHERE brand_id = b.id) AS products_count
  FROM brands b`

const DEFINITION_SELECT = `
  SELECT d.id, d.category_id, d.key, d.label, d.unit, d.value_type, d.is_filterable,
    d.is_required, d.is_comparison_criterion, d.sort_weight,
    (SELECT COUNT(*) FROM product_specs WHERE definition_id = d.id) AS specs_count
  FROM attribute_definitions d`

export async function getCategory(db: D1Database, id: number): Promise<CategoryRow | null> {
  return db.prepare(`${CATEGORY_SELECT} WHERE c.id = ?`).bind(id).first<CategoryRow>()
}

export async function listCategories(db: D1Database): Promise<CategoryRow[]> {
  const { results } = await db
    .prepare(`${CATEGORY_SELECT} ORDER BY c.sort_order ASC, c.name ASC, c.id ASC`)
    .all<CategoryRow>()
  return results
}

export interface CreateCategoryInput {
  slug: string
  name: string
  description?: string | null
  parentId?: number | null
  sortOrder?: number
  isIndexable?: boolean
}

export async function createCategory(
  db: D1Database,
  actor: AdminActor,
  input: CreateCategoryInput,
): Promise<{ id: number } | { conflict: 'slug' | 'unknown_parent' }> {
  const existing = await db
    .prepare('SELECT id FROM categories WHERE slug = ?')
    .bind(input.slug)
    .first<{ id: number }>()
  if (existing) return { conflict: 'slug' }
  const parentId = input.parentId ?? null
  if (parentId !== null) {
    const parent = await db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .bind(parentId)
      .first<{ id: number }>()
    if (!parent) return { conflict: 'unknown_parent' }
  }
  const inserted = await db
    .prepare(
      `INSERT INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
       VALUES (?,?,?,?,?,?) RETURNING id`,
    )
    .bind(
      parentId,
      input.slug,
      input.name,
      input.description ?? null,
      input.sortOrder ?? 0,
      input.isIndexable === undefined ? 1 : input.isIndexable ? 1 : 0,
    )
    .first<{ id: number }>()
  if (!inserted) return { conflict: 'slug' }
  const after = await getCategory(db, inserted.id)
  await writeAudit(db, actor, 'category.create', 'category', inserted.id, null, after)
  return { id: inserted.id }
}

export interface UpdateCategoryPatch {
  name?: string
  description?: string | null
  parentId?: number | null
  sortOrder?: number
  isIndexable?: boolean
}

export async function updateCategory(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateCategoryPatch,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'cycle' | 'unknown_parent' }> {
  const before = await getCategory(db, id)
  if (!before) return { ok: false, reason: 'not_found' }
  if (patch.parentId !== undefined && patch.parentId !== null) {
    const parent = await db
      .prepare('SELECT id FROM categories WHERE id = ?')
      .bind(patch.parentId)
      .first<{ id: number }>()
    if (!parent) return { ok: false, reason: 'unknown_parent' }
    // Cycle rule: the proposed parent must not be the category itself nor
    // any descendant of it. Walking UP from the proposed parent, reaching
    // this category proves the proposal would close a cycle (the visited
    // set also guards against a pre-existing cycle looping forever).
    const visited = new Set<number>()
    let cursor: number | null = patch.parentId
    while (cursor !== null) {
      if (cursor === id) return { ok: false, reason: 'cycle' }
      if (visited.has(cursor)) break
      visited.add(cursor)
      const row: { parent_id: number | null } | null = await db
        .prepare('SELECT parent_id FROM categories WHERE id = ?')
        .bind(cursor)
        .first<{ parent_id: number | null }>()
      cursor = row?.parent_id ?? null
    }
  }
  const sets: string[] = []
  const binds: unknown[] = []
  if (patch.name !== undefined) {
    sets.push('name = ?')
    binds.push(patch.name)
  }
  if (patch.description !== undefined) {
    sets.push('description = ?')
    binds.push(patch.description)
  }
  if (patch.parentId !== undefined) {
    sets.push('parent_id = ?')
    binds.push(patch.parentId)
  }
  if (patch.sortOrder !== undefined) {
    sets.push('sort_order = ?')
    binds.push(patch.sortOrder)
  }
  if (patch.isIndexable !== undefined) {
    sets.push('is_indexable = ?')
    binds.push(patch.isIndexable ? 1 : 0)
  }
  if (sets.length > 0) {
    await db
      .prepare(`UPDATE categories SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run()
  }
  const after = await getCategory(db, id)
  await writeAudit(db, actor, 'category.update', 'category', id, before, after)
  return { ok: true }
}

export async function deleteCategory(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<
  | { ok: true }
  | {
      ok: false
      reason: 'not_found' | 'in_use'
      counts?: { children: number; products: number; definitions: number; guides: number }
    }
> {
  const before = await getCategory(db, id)
  if (!before) return { ok: false, reason: 'not_found' }
  const counts = {
    children: before.children_count,
    products: before.products_count,
    definitions: before.definitions_count,
    guides: before.guides_count,
  }
  // The schema gives categories no archive/status, so delete is a hard
  // delete and is refused while anything still references the category.
  if (counts.children > 0 || counts.products > 0 || counts.definitions > 0 || counts.guides > 0) {
    return { ok: false, reason: 'in_use', counts }
  }
  await db.prepare('DELETE FROM categories WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'category.delete', 'category', id, before, null)
  return { ok: true }
}

export async function getBrand(db: D1Database, id: number): Promise<BrandRow | null> {
  return db.prepare(`${BRAND_SELECT} WHERE b.id = ?`).bind(id).first<BrandRow>()
}

export async function listBrands(db: D1Database): Promise<BrandRow[]> {
  const { results } = await db.prepare(`${BRAND_SELECT} ORDER BY b.name ASC, b.id ASC`).all<BrandRow>()
  return results
}

export interface CreateBrandInput {
  slug: string
  name: string
  websiteUrl?: string | null
}

export async function createBrand(
  db: D1Database,
  actor: AdminActor,
  input: CreateBrandInput,
): Promise<{ id: number } | { conflict: 'slug' }> {
  const existing = await db
    .prepare('SELECT id FROM brands WHERE slug = ?')
    .bind(input.slug)
    .first<{ id: number }>()
  if (existing) return { conflict: 'slug' }
  const inserted = await db
    .prepare('INSERT INTO brands (slug, name, website_url) VALUES (?,?,?) RETURNING id')
    .bind(input.slug, input.name, input.websiteUrl ?? null)
    .first<{ id: number }>()
  if (!inserted) return { conflict: 'slug' }
  const after = await getBrand(db, inserted.id)
  await writeAudit(db, actor, 'brand.create', 'brand', inserted.id, null, after)
  return { id: inserted.id }
}

export interface UpdateBrandPatch {
  name?: string
  websiteUrl?: string | null
}

/** Slug is immutable (public URLs are built from it), so it is not a patch field. */
export async function updateBrand(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateBrandPatch,
): Promise<{ ok: boolean }> {
  const before = await getBrand(db, id)
  if (!before) return { ok: false }
  const sets: string[] = []
  const binds: unknown[] = []
  if (patch.name !== undefined) {
    sets.push('name = ?')
    binds.push(patch.name)
  }
  if (patch.websiteUrl !== undefined) {
    sets.push('website_url = ?')
    binds.push(patch.websiteUrl)
  }
  if (sets.length > 0) {
    await db
      .prepare(`UPDATE brands SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run()
  }
  const after = await getBrand(db, id)
  await writeAudit(db, actor, 'brand.update', 'brand', id, before, after)
  return { ok: true }
}

export async function deleteBrand(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'in_use'; counts?: { products: number } }> {
  const before = await getBrand(db, id)
  if (!before) return { ok: false, reason: 'not_found' }
  if (before.products_count > 0) {
    return { ok: false, reason: 'in_use', counts: { products: before.products_count } }
  }
  await db.prepare('DELETE FROM brands WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'brand.delete', 'brand', id, before, null)
  return { ok: true }
}

export async function getAttributeDefinition(
  db: D1Database,
  id: number,
): Promise<AttributeDefinitionRow | null> {
  return db.prepare(`${DEFINITION_SELECT} WHERE d.id = ?`).bind(id).first<AttributeDefinitionRow>()
}

export async function listAttributeDefinitions(
  db: D1Database,
  categoryId: number,
): Promise<AttributeDefinitionRow[]> {
  const { results } = await db
    .prepare(`${DEFINITION_SELECT} WHERE d.category_id = ? ORDER BY d.sort_weight DESC, d.id ASC`)
    .bind(categoryId)
    .all<AttributeDefinitionRow>()
  return results
}

export interface CreateAttributeDefinitionInput {
  key: string
  label: string
  unit?: string | null
  valueType: 'number' | 'text' | 'bool'
  isFilterable?: boolean
  isRequired?: boolean
  isComparisonCriterion?: boolean
  sortWeight?: number
}

export async function createAttributeDefinition(
  db: D1Database,
  actor: AdminActor,
  categoryId: number,
  input: CreateAttributeDefinitionInput,
): Promise<{ id: number } | { conflict: 'key' | 'unknown_category' }> {
  const category = await db
    .prepare('SELECT id FROM categories WHERE id = ?')
    .bind(categoryId)
    .first<{ id: number }>()
  if (!category) return { conflict: 'unknown_category' }
  const existing = await db
    .prepare('SELECT id FROM attribute_definitions WHERE category_id = ? AND key = ?')
    .bind(categoryId, input.key)
    .first<{ id: number }>()
  if (existing) return { conflict: 'key' }
  const inserted = await db
    .prepare(
      `INSERT INTO attribute_definitions
         (category_id, key, label, unit, value_type, is_filterable, is_required, is_comparison_criterion, sort_weight)
       VALUES (?,?,?,?,?,?,?,?,?) RETURNING id`,
    )
    .bind(
      categoryId,
      input.key,
      input.label,
      input.unit ?? null,
      input.valueType,
      input.isFilterable ? 1 : 0,
      input.isRequired ? 1 : 0,
      input.isComparisonCriterion ? 1 : 0,
      input.sortWeight ?? 0,
    )
    .first<{ id: number }>()
  if (!inserted) return { conflict: 'key' }
  const after = await getAttributeDefinition(db, inserted.id)
  await writeAudit(db, actor, 'attribute_definition.create', 'attribute_definition', inserted.id, null, after)
  return { id: inserted.id }
}

export interface UpdateAttributeDefinitionPatch {
  label?: string
  unit?: string | null
  isFilterable?: boolean
  isRequired?: boolean
  isComparisonCriterion?: boolean
  sortWeight?: number
}

/**
 * key, value_type and category are IMMUTABLE (facet/spec integrity), so
 * they are deliberately not accepted in the patch.
 */
export async function updateAttributeDefinition(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateAttributeDefinitionPatch,
): Promise<{ ok: boolean }> {
  const before = await getAttributeDefinition(db, id)
  if (!before) return { ok: false }
  const sets: string[] = []
  const binds: unknown[] = []
  if (patch.label !== undefined) {
    sets.push('label = ?')
    binds.push(patch.label)
  }
  if (patch.unit !== undefined) {
    sets.push('unit = ?')
    binds.push(patch.unit)
  }
  if (patch.isFilterable !== undefined) {
    sets.push('is_filterable = ?')
    binds.push(patch.isFilterable ? 1 : 0)
  }
  if (patch.isRequired !== undefined) {
    sets.push('is_required = ?')
    binds.push(patch.isRequired ? 1 : 0)
  }
  if (patch.isComparisonCriterion !== undefined) {
    sets.push('is_comparison_criterion = ?')
    binds.push(patch.isComparisonCriterion ? 1 : 0)
  }
  if (patch.sortWeight !== undefined) {
    sets.push('sort_weight = ?')
    binds.push(patch.sortWeight)
  }
  if (sets.length > 0) {
    await db
      .prepare(`UPDATE attribute_definitions SET ${sets.join(', ')} WHERE id = ?`)
      .bind(...binds, id)
      .run()
  }
  const after = await getAttributeDefinition(db, id)
  await writeAudit(db, actor, 'attribute_definition.update', 'attribute_definition', id, before, after)
  return { ok: true }
}

export async function deleteAttributeDefinition(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'in_use'; counts?: { specs: number } }> {
  const before = await getAttributeDefinition(db, id)
  if (!before) return { ok: false, reason: 'not_found' }
  if (before.specs_count > 0) {
    return { ok: false, reason: 'in_use', counts: { specs: before.specs_count } }
  }
  await db.prepare('DELETE FROM attribute_definitions WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'attribute_definition.delete', 'attribute_definition', id, before, null)
  return { ok: true }
}
