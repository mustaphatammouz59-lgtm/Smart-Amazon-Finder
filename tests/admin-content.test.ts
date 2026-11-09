// Admin editorial content — Stage 04 §9: structured blocks, server-side
// sanitization, and the DATA §7.3 publish checklist (disclosure required,
// typed prices forbidden).
import { describe, expect, it } from 'vitest'
import type { AdminActor } from '../app/lib/db/admin'
import {
  contentChecklist,
  createContent,
  getContent,
  transitionContent,
  updateContent,
} from '../app/lib/db/admin-content'
import { findTypedPrices, hasDisclosure, parseBodyBlocks, stripHtml } from '../app/lib/sanitize'
import { freshCatalogDb } from './helpers/sqlite-d1'

async function owner(db: D1Database): Promise<AdminActor> {
  const row = await db
    .prepare("SELECT id, email, role FROM admin_users WHERE email = 'owner@example.invalid'")
    .first<AdminActor>()
  if (!row) throw new Error('fixture admin missing')
  return row
}

describe('sanitizer', () => {
  it('strips markup down to plain text and decodes entities once', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world')
    expect(stripHtml('<img src="x" onerror="alert(1)">Caption')).toBe('Caption')
    expect(stripHtml('Fish &amp; Chips')).toBe('Fish & Chips')
    expect(stripHtml('&amp;lt;script&amp;gt;')).toBe('&lt;script&gt;')
  })

  it('rejects unknown block types and non-arrays', () => {
    expect(() => parseBodyBlocks('not an array')).toThrow()
    expect(() => parseBodyBlocks([{ type: 'script', text: 'x' }])).toThrow()
    expect(parseBodyBlocks([{ type: 'paragraph', text: 'Ok' }])).toEqual([{ type: 'paragraph', text: 'Ok' }])
  })

  it('detects typed prices and disclosure blocks', () => {
    expect(findTypedPrices('Costs $49.99 today')).toHaveLength(1)
    expect(findTypedPrices('Costs 120 USD today')).toHaveLength(1)
    expect(findTypedPrices('No prices here')).toHaveLength(0)
    expect(hasDisclosure([{ type: 'disclosure', text: 'We may earn a commission.' }])).toBe(true)
    expect(hasDisclosure([{ type: 'paragraph', text: 'We may earn a commission.' }])).toBe(false)
  })
})

describe('articles workflow', () => {
  it('sanitizes blocks on save and keeps full bodies out of the audit log', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createContent(db, actor, 'article', { slug: 'stage04-article', title: 'Stage04 Article' })
    if (!('id' in created)) throw new Error('create failed')
    expect(
      await updateContent(db, actor, 'article', created.id, {
        bodyBlocks: [
          { type: 'paragraph', text: 'Hello <script>alert(1)</script> <b>world</b>' },
          { type: 'disclosure', text: 'We may earn a commission.' },
        ],
      }),
    ).toEqual({ ok: true })
    const row = await db
      .prepare('SELECT body_blocks FROM articles WHERE id = ?')
      .bind(created.id)
      .first<{ body_blocks: string }>()
    expect(row?.body_blocks).not.toContain('<script')
    expect(row?.body_blocks).not.toContain('<b>')
    expect(row?.body_blocks).toContain('Hello')
    const audit = await db
      .prepare("SELECT after_json FROM audit_logs WHERE action = 'article.update' AND entity_id = ?")
      .bind(created.id)
      .first<{ after_json: string | null }>()
    expect(audit?.after_json).toContain('"blocks":2')
    expect(audit?.after_json).not.toContain('alert')
  })

  it('blocks publishing until the checklist passes, then stamps published_at', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const created = await createContent(db, actor, 'article', { slug: 'stage04-gated', title: 'Stage04 Gated' })
    if (!('id' in created)) throw new Error('create failed')

    const empty = await contentChecklist(db, 'article', created.id)
    expect(empty?.publishable).toBe(false)
    expect(empty?.issues.map((i) => i.code)).toContain('body_empty')
    expect(empty?.issues.map((i) => i.code)).toContain('disclosure_missing')
    const refused = await transitionContent(db, actor, 'article', created.id, 'published')
    expect(refused.ok).toBe(false)

    await updateContent(db, actor, 'article', created.id, {
      bodyBlocks: [
        { type: 'paragraph', text: 'Our pick costs $49.99 this week.' },
        { type: 'disclosure', text: 'We may earn a commission.' },
      ],
    })
    const priced = await contentChecklist(db, 'article', created.id)
    expect(priced?.issues.map((i) => i.code)).toContain('typed_price')
    expect(priced?.publishable).toBe(false)

    await updateContent(db, actor, 'article', created.id, {
      bodyBlocks: [
        { type: 'paragraph', text: 'Our pick is linked below; prices are shown on the product page.' },
        { type: 'disclosure', text: 'We may earn a commission.' },
      ],
    })
    expect((await contentChecklist(db, 'article', created.id))?.publishable).toBe(true)
    expect(await transitionContent(db, actor, 'article', created.id, 'published')).toEqual({ ok: true })
    const published = await getContent(db, 'article', created.id)
    expect(published?.status).toBe('published')
    expect(published?.published_at).not.toBeNull()

    expect(await transitionContent(db, actor, 'article', created.id, 'draft')).toEqual({ ok: true })
    expect((await getContent(db, 'article', created.id))?.published_at).toBeNull()
  })
})

describe('buying guides (migration 0005 columns)', () => {
  it('stores body blocks and SEO overrides on guides', async () => {
    const { db } = freshCatalogDb()
    const actor = await owner(db)
    const category = await db
      .prepare('SELECT id FROM categories WHERE slug = ?')
      .bind('home-office')
      .first<{ id: number }>()
    const created = await createContent(db, actor, 'guide', {
      slug: 'stage04-guide',
      title: 'Stage04 Guide',
      categoryId: category?.id,
    })
    if (!('id' in created)) throw new Error('create failed')
    expect(
      await updateContent(db, actor, 'guide', created.id, {
        metaTitle: 'Stage04 Guide — SEO title',
        bodyBlocks: [
          { type: 'heading', text: 'How we chose' },
          { type: 'list', items: ['First criterion', 'Second criterion'] },
          { type: 'disclosure', text: 'We may earn a commission.' },
        ],
      }),
    ).toEqual({ ok: true })
    const guide = await getContent(db, 'guide', created.id)
    expect(guide?.meta_title).toBe('Stage04 Guide — SEO title')
    expect(guide?.body_blocks).toContain('How we chose')
    expect((await contentChecklist(db, 'guide', created.id))?.publishable).toBe(true)
  })
})
