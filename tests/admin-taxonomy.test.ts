// Admin taxonomy — Stage 04 §9: categories, brands and attribute definitions
// with dependency protection (nothing in use can be deleted).
import { describe, expect, it } from 'vitest'
import type { AdminActor } from '../app/lib/db/admin'
import {
  createAttributeDefinition,
  createBrand,
  createCategory,
  deleteAttributeDefinition,
  deleteBrand,
  deleteCategory,
  listAttributeDefinitions,
  listCategories,
  updateAttributeDefinition,
  updateBrand,
  updateCategory,
} from '../app/lib/db/admin-taxonomy'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

async function categoryId(db: D1Database, slug: string): Promise<number> {
  const row = await db.prepare('SELECT id FROM categories WHERE slug = ?').bind(slug).first<{ id: number }>()
  if (!row) throw new Error(`category ${slug} missing`)
  return row.id
}

describe('categories', () => {
  it('creates, detects duplicate slugs, and refuses parents that would cycle', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const parent = await createCategory(db, actor, { slug: 'stage04-parent', name: 'Stage04 Parent' })
    expect('id' in parent).toBe(true)
    expect(await createCategory(db, actor, { slug: 'stage04-parent', name: 'Again' })).toEqual({
      conflict: 'slug',
    })
    if (!('id' in parent)) return
    const child = await createCategory(db, actor, {
      slug: 'stage04-child',
      name: 'Stage04 Child',
      parentId: parent.id,
    })
    if (!('id' in child)) throw new Error('child create failed')
    expect(await updateCategory(db, actor, parent.id, { parentId: child.id })).toEqual({
      ok: false,
      reason: 'cycle',
    })
    expect(await updateCategory(db, actor, child.id, { parentId: 99999 })).toEqual({
      ok: false,
      reason: 'unknown_parent',
    })
  })

  it('refuses to delete a category that still has products or definitions', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const homeOffice = await categoryId(db, 'home-office')
    const result = await deleteCategory(db, actor, homeOffice)
    expect(result.ok).toBe(false)
    if (!result.ok && result.reason === 'in_use') {
      expect(result.counts?.products).toBe(4)
      expect(result.counts?.definitions).toBe(4)
    }
    const categories = await listCategories(db)
    expect(categories.some((c) => c.slug === 'home-office')).toBe(true)
  })

  it('deletes an unused category', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createCategory(db, actor, { slug: 'stage04-empty', name: 'Stage04 Empty' })
    if (!('id' in created)) throw new Error('create failed')
    expect(await deleteCategory(db, actor, created.id)).toEqual({ ok: true })
  })
})

describe('brands', () => {
  it('refuses to delete a brand with products; deletes an unused brand', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const brands = await db.prepare('SELECT id FROM brands WHERE slug = ?').bind('devbrand').first<{ id: number }>()
    const inUse = await deleteBrand(db, actor, brands?.id ?? 0)
    expect(inUse.ok).toBe(false)
    const created = await createBrand(db, actor, { slug: 'stage04-brand', name: 'Stage04 Brand' })
    expect(await createBrand(db, actor, { slug: 'stage04-brand', name: 'Dupe' })).toEqual({ conflict: 'slug' })
    if (!('id' in created)) throw new Error('create failed')
    expect(await updateBrand(db, actor, created.id, { name: 'Stage04 Brand Renamed' })).toEqual({ ok: true })
    expect(await deleteBrand(db, actor, created.id)).toEqual({ ok: true })
  })
})

describe('attribute definitions', () => {
  it('creates per category, rejects duplicate keys, and blocks deletion while specs exist', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const homeOffice = await categoryId(db, 'home-office')
    const created = await createAttributeDefinition(db, actor, homeOffice, {
      key: 'stage04_def',
      label: 'Stage04 Def',
      valueType: 'number',
    })
    expect('id' in created).toBe(true)
    expect(
      await createAttributeDefinition(db, actor, homeOffice, {
        key: 'stage04_def',
        label: 'Dupe',
        valueType: 'text',
      }),
    ).toEqual({ conflict: 'key' })

    const definitions = await listAttributeDefinitions(db, homeOffice)
    const adjustable = definitions.find((d) => d.key === 'height_adjustable')
    expect(adjustable?.specs_count).toBe(2)
    if (adjustable) {
      const blocked = await deleteAttributeDefinition(db, actor, adjustable.id)
      expect(blocked.ok).toBe(false)
      if (!blocked.ok && blocked.reason === 'in_use') expect(blocked.counts?.specs).toBe(2)
      expect(await updateAttributeDefinition(db, actor, adjustable.id, { label: 'Height adjustable?' })).toEqual({
        ok: true,
      })
    }
    if ('id' in created) expect(await deleteAttributeDefinition(db, actor, created.id)).toEqual({ ok: true })
  })
})
