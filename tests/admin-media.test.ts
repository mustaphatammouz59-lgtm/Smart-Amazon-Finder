// Admin media — Stage 04 §9: content sniffing by magic bytes (never the
// filename), safe storage keys, size cap, and the media DAL lifecycle.
import { describe, expect, it } from 'vitest'
import type { AdminActor } from '../app/lib/db/admin'
import {
  addProductMedia,
  deleteMediaRow,
  listProductMedia,
  setPrimaryMedia,
  updateMedia,
} from '../app/lib/db/admin-media'
import { MAX_MEDIA_BYTES, buildMediaKey, sniffImageType, storeMedia } from '../app/lib/media'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

async function productId(db: D1Database, slug: string): Promise<number> {
  const row = await db.prepare('SELECT id FROM products WHERE slug = ?').bind(slug).first<{ id: number }>()
  if (!row) throw new Error(`product ${slug} missing`)
  return row.id
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46])
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const GIF = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
const WEBP = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
])
const EXE = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00])
const TEXT = new TextEncoder().encode('this is not an image')

describe('content sniffing', () => {
  it('recognises JPEG, PNG, GIF and WebP by magic bytes', () => {
    expect(sniffImageType(JPEG)).toEqual({ type: 'jpeg', ext: 'jpg', contentType: 'image/jpeg' })
    expect(sniffImageType(PNG)).toEqual({ type: 'png', ext: 'png', contentType: 'image/png' })
    expect(sniffImageType(GIF)).toEqual({ type: 'gif', ext: 'gif', contentType: 'image/gif' })
    expect(sniffImageType(WEBP)).toEqual({ type: 'webp', ext: 'webp', contentType: 'image/webp' })
  })

  it('rejects executables, text and truncated buffers', () => {
    expect(sniffImageType(EXE)).toBeNull()
    expect(sniffImageType(TEXT)).toBeNull()
    expect(sniffImageType(new Uint8Array([0xff, 0xd8]))).toBeNull()
    expect(sniffImageType(new Uint8Array(0))).toBeNull()
  })

  it('caps uploads at 5 MiB and builds keys with no user-controlled parts', () => {
    expect(MAX_MEDIA_BYTES).toBe(5 * 1024 * 1024)
    const key = buildMediaKey(42, 'png')
    expect(key).toMatch(/^products\/42\/[0-9a-f-]{36}\.png$/)
    expect(buildMediaKey(42, 'png')).not.toBe(key)
  })

  it('stores bytes through the R2 binding interface', async () => {
    const puts: Array<{ key: string; size: number; type?: string }> = []
    const bucket = {
      put: async (key: string, value: Uint8Array, options?: { httpMetadata?: { contentType?: string } }) => {
        puts.push({ key, size: value.byteLength, type: options?.httpMetadata?.contentType })
        return {}
      },
    } as unknown as R2Bucket
    await storeMedia(bucket, 'products/1/abc.png', PNG, 'image/png')
    expect(puts).toEqual([{ key: 'products/1/abc.png', size: PNG.byteLength, type: 'image/png' }])
  })
})

describe('media DAL lifecycle', () => {
  it('adds, reorders (primary), updates and deletes rows with audit entries', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const id = await productId(db, 'dev-fixture-desk-riser')
    const first = await addProductMedia(db, actor, id, { key: buildMediaKey(id, 'png'), altText: 'Front view' })
    const second = await addProductMedia(db, actor, id, { key: buildMediaKey(id, 'jpg'), altText: 'Side view' })
    expect('id' in first && 'id' in second).toBe(true)
    let rows = await listProductMedia(db, id)
    expect(rows.map((r) => r.sort_order)).toEqual([0, 1])

    if ('id' in second) {
      expect(await setPrimaryMedia(db, actor, second.id)).toEqual({ ok: true })
      rows = await listProductMedia(db, id)
      expect(rows[0]?.alt_text).toBe('Side view')
      expect(rows.map((r) => r.sort_order)).toEqual([0, 1])
      expect(await updateMedia(db, actor, second.id, { altText: 'Side view, updated' })).toEqual({ ok: true })
      const deleted = await deleteMediaRow(db, actor, second.id)
      expect(deleted.ok).toBe(true)
      if (deleted.ok) expect(deleted.row.alt_text).toBe('Side view, updated')
    }
    expect(await listProductMedia(db, id)).toHaveLength(1)
    const audit = await db
      .prepare("SELECT COUNT(*) AS n FROM audit_logs WHERE action LIKE 'product_media.%' OR action = 'product.media.add'")
      .first<{ n: number }>()
    expect(audit?.n).toBeGreaterThanOrEqual(4)
  })

  it('refuses media for a missing product', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const result = await addProductMedia(db, actor, 99999, { key: 'products/99999/x.png' })
    expect(result).toEqual({ notFound: true })
  })
})
