/**
 * Editorial content DAL (Stage 04): articles + buying guides.
 *
 * Mirrors app/lib/db/admin.ts conventions: every mutation writes an
 * audit_logs row via writeAudit; content is never deleted (archive via
 * transitionContent instead). Bodies are stored as JSON-serialised
 * ContentBlock[] (app/lib/sanitize.ts) — never raw HTML — and audit rows
 * for body changes record only a { blocks: n } summary, never the body.
 */
import type { AdminActor } from './admin'
import { writeAudit } from './admin'
import { decodeCursor, encodeCursor } from './types'
import type { ContentBlock } from '../sanitize'
import { blocksToText, findTypedPrices, hasDisclosure, parseBodyBlocks, sanitizeBlocks } from '../sanitize'

export type ContentKind = 'article' | 'guide'

const TABLE: Record<ContentKind, string> = { article: 'articles', guide: 'buying_guides' }
const ENTITY: Record<ContentKind, string> = { article: 'article', guide: 'guide' }

export interface ContentListItem {
  id: number
  slug: string
  title: string
  status: string
  published_at: string | null
  author_admin_id: number | null
  created_at: string
  updated_at: string
  category_id?: number | null
  category_slug?: string | null
  category_name?: string | null
}

export interface ContentDetail {
  id: number
  slug: string
  title: string
  status: string
  published_at: string | null
  author_admin_id: number | null
  created_at: string
  updated_at: string
  body_blocks: string | null
  meta_title: string | null
  meta_description: string | null
  category_id?: number | null
}

function escapeLike(value: string): string {
  return value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_')
}

function parseStoredBlocks(stored: string | null): ContentBlock[] {
  if (!stored) return []
  try {
    return parseBodyBlocks(JSON.parse(stored) as unknown)
  } catch {
    return []
  }
}

export async function listContent(
  db: D1Database,
  kind: ContentKind,
  filters: { status?: string; q?: string; cursor?: string; limit?: number },
): Promise<{ items: ContentListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 30, 1), 60)
  const offset = decodeCursor(filters.cursor)
  const isGuide = kind === 'guide'
  const alias = isGuide ? 'g' : 'a'
  const where: string[] = []
  const binds: unknown[] = []
  if (filters.status) {
    where.push(`${alias}.status = ?`)
    binds.push(filters.status)
  }
  if (filters.q) {
    where.push(`(${alias}.title LIKE ? ESCAPE '\\' OR ${alias}.slug LIKE ? ESCAPE '\\')`)
    const pattern = `%${escapeLike(filters.q)}%`
    binds.push(pattern, pattern)
  }
  const select = isGuide
    ? `SELECT g.id, g.slug, g.title, g.status, g.published_at, g.author_admin_id, g.created_at, g.updated_at,
              g.category_id, c.slug AS category_slug, c.name AS category_name
         FROM buying_guides g LEFT JOIN categories c ON c.id = g.category_id`
    : `SELECT a.id, a.slug, a.title, a.status, a.published_at, a.author_admin_id, a.created_at, a.updated_at
         FROM articles a`
  const sql = `${select}${where.length > 0 ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY ${alias}.updated_at DESC, ${alias}.id DESC LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db
    .prepare(sql)
    .bind(...binds)
    .all<ContentListItem>()
  const hasMore = results.length > limit
  return {
    items: hasMore ? results.slice(0, limit) : results,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export async function getContent(db: D1Database, kind: ContentKind, id: number): Promise<ContentDetail | null> {
  const sql =
    kind === 'guide'
      ? `SELECT id, category_id, slug, title, status, published_at, author_admin_id, created_at, updated_at,
                body_blocks, meta_title, meta_description
           FROM buying_guides WHERE id = ?`
      : `SELECT id, slug, title, status, published_at, author_admin_id, created_at, updated_at,
                body_blocks, meta_title, meta_description
           FROM articles WHERE id = ?`
  const row = await db.prepare(sql).bind(id).first<ContentDetail>()
  return row ?? null
}

export interface CreateContentInput {
  slug: string
  title: string
  categoryId?: number | null
  metaTitle?: string | null
  metaDescription?: string | null
}

export async function createContent(
  db: D1Database,
  actor: AdminActor,
  kind: ContentKind,
  input: CreateContentInput,
): Promise<{ id: number } | { conflict: 'slug' | 'unknown_category' }> {
  const table = TABLE[kind]
  let categoryId: number | null = null
  if (kind === 'guide' && input.categoryId !== undefined && input.categoryId !== null) {
    const category = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(input.categoryId).first<{ id: number }>()
    if (!category) return { conflict: 'unknown_category' }
    categoryId = category.id
  }
  const existing = await db.prepare(`SELECT id FROM ${table} WHERE slug = ?`).bind(input.slug).first<{ id: number }>()
  if (existing) return { conflict: 'slug' }
  let inserted: { id: number } | null
  try {
    inserted =
      kind === 'guide'
        ? await db
            .prepare(
              `INSERT INTO buying_guides (category_id, slug, title, status, author_admin_id, meta_title, meta_description)
               VALUES (?,?,?,'draft',?,?,?) RETURNING id`,
            )
            .bind(categoryId, input.slug, input.title, actor.id, input.metaTitle ?? null, input.metaDescription ?? null)
            .first<{ id: number }>()
        : await db
            .prepare(
              `INSERT INTO articles (slug, title, status, author_admin_id, meta_title, meta_description)
               VALUES (?,?,'draft',?,?,?) RETURNING id`,
            )
            .bind(input.slug, input.title, actor.id, input.metaTitle ?? null, input.metaDescription ?? null)
            .first<{ id: number }>()
  } catch (e) {
    // F-17 (minors): only a genuine uniqueness/constraint failure means
    // "slug conflict" — the old catch-all mapped EVERY insert error (FK
    // failures, DB errors) to a misleading 409. Anything else propagates.
    const message = String(e)
    if (message.includes('UNIQUE') || message.toLowerCase().includes('constraint')) {
      return { conflict: 'slug' }
    }
    throw e
  }
  if (!inserted) return { conflict: 'slug' }
  await writeAudit(db, actor, `${ENTITY[kind]}.create`, ENTITY[kind], inserted.id, null, {
    slug: input.slug,
    title: input.title,
  })
  return { id: inserted.id }
}

export interface UpdateContentPatch {
  title?: string
  metaTitle?: string | null
  metaDescription?: string | null
  categoryId?: number | null
  bodyBlocks?: ContentBlock[]
}

export async function updateContent(
  db: D1Database,
  actor: AdminActor,
  kind: ContentKind,
  id: number,
  patch: UpdateContentPatch,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'unknown_category' }> {
  const current = await getContent(db, kind, id)
  if (!current) return { ok: false, reason: 'not_found' }
  if (kind === 'guide' && patch.categoryId !== undefined && patch.categoryId !== null) {
    const category = await db.prepare('SELECT id FROM categories WHERE id = ?').bind(patch.categoryId).first<{ id: number }>()
    if (!category) return { ok: false, reason: 'unknown_category' }
  }
  const sets: string[] = []
  const binds: unknown[] = []
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  if (patch.title !== undefined) {
    sets.push('title = ?')
    binds.push(patch.title)
    before.title = current.title
    after.title = patch.title
  }
  if (patch.metaTitle !== undefined) {
    sets.push('meta_title = ?')
    binds.push(patch.metaTitle)
    before.meta_title = current.meta_title
    after.meta_title = patch.metaTitle
  }
  if (patch.metaDescription !== undefined) {
    sets.push('meta_description = ?')
    binds.push(patch.metaDescription)
    before.meta_description = current.meta_description
    after.meta_description = patch.metaDescription
  }
  if (kind === 'guide' && patch.categoryId !== undefined) {
    sets.push('category_id = ?')
    binds.push(patch.categoryId)
    before.category_id = current.category_id ?? null
    after.category_id = patch.categoryId
  }
  if (patch.bodyBlocks !== undefined) {
    const clean = sanitizeBlocks(patch.bodyBlocks)
    sets.push('body_blocks = ?')
    binds.push(JSON.stringify(clean))
    // Audit holds only a block-count summary — never the full body.
    before.body_blocks = { blocks: parseStoredBlocks(current.body_blocks).length }
    after.body_blocks = { blocks: clean.length }
  }
  if (sets.length === 0) return { ok: true }
  sets.push("updated_at = datetime('now')")
  binds.push(id)
  await db
    .prepare(`UPDATE ${TABLE[kind]} SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run()
  await writeAudit(db, actor, `${ENTITY[kind]}.update`, ENTITY[kind], id, before, after)
  return { ok: true }
}

export interface ChecklistIssue {
  field: string
  code: string
  severity: 'error' | 'warning'
  message: string
}

/**
 * Publish checklist (DATA §7.3 + SYS §4-J). Errors block publication:
 * empty title, empty body, missing disclosure block, typed prices in the
 * body. Warnings do not block: missing meta description, guide without a
 * category. Returns null when the content row does not exist.
 */
export async function contentChecklist(
  db: D1Database,
  kind: ContentKind,
  id: number,
): Promise<{ publishable: boolean; issues: ChecklistIssue[] } | null> {
  const row = await getContent(db, kind, id)
  if (!row) return null
  const issues: ChecklistIssue[] = []
  if (!row.title || row.title.trim().length === 0) {
    issues.push({ field: 'title', code: 'title_empty', severity: 'error', message: 'Title is empty.' })
  }
  const blocks = parseStoredBlocks(row.body_blocks)
  const bodyText = blocksToText(blocks)
  if (blocks.length === 0 || bodyText.trim().length === 0) {
    issues.push({ field: 'body_blocks', code: 'body_empty', severity: 'error', message: 'Body is empty.' })
  }
  if (!hasDisclosure(blocks)) {
    issues.push({
      field: 'body_blocks',
      code: 'disclosure_missing',
      severity: 'error',
      message: 'An affiliate disclosure block is required.',
    })
  }
  const prices = findTypedPrices(bodyText)
  if (prices.length > 0) {
    issues.push({
      field: 'body_blocks',
      code: 'typed_price',
      severity: 'error',
      message: `Typed prices are not allowed in editorial content (found: ${prices.join(', ')}). Prices must come from licensed offer data.`,
    })
  }
  if (!row.meta_description || row.meta_description.trim().length === 0) {
    issues.push({
      field: 'meta_description',
      code: 'meta_description_missing',
      severity: 'warning',
      message: 'Meta description is missing.',
    })
  }
  if (kind === 'guide' && (row.category_id === null || row.category_id === undefined)) {
    issues.push({
      field: 'category_id',
      code: 'category_missing',
      severity: 'warning',
      message: 'Buying guide has no category.',
    })
  }
  return { publishable: issues.every((issue) => issue.severity !== 'error'), issues }
}

const TARGET_ACTION: Record<'in_review' | 'published' | 'archived' | 'draft', string> = {
  published: 'publish',
  archived: 'archive',
  draft: 'draft',
  in_review: 'in_review',
}

export async function transitionContent(
  db: D1Database,
  actor: AdminActor,
  kind: ContentKind,
  id: number,
  target: 'in_review' | 'published' | 'archived' | 'draft',
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'checklist'; issues?: ChecklistIssue[] }> {
  const row = await getContent(db, kind, id)
  if (!row) return { ok: false, reason: 'not_found' }
  if (target === 'published') {
    const checklist = await contentChecklist(db, kind, id)
    if (checklist && !checklist.publishable) {
      return { ok: false, reason: 'checklist', issues: checklist.issues.filter((issue) => issue.severity === 'error') }
    }
  }
  const table = TABLE[kind]
  if (target === 'published') {
    await db
      .prepare(`UPDATE ${table} SET status = ?, published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`)
      .bind(target, id)
      .run()
  } else if (target === 'draft') {
    await db
      .prepare(`UPDATE ${table} SET status = ?, published_at = NULL, updated_at = datetime('now') WHERE id = ?`)
      .bind(target, id)
      .run()
  } else {
    await db
      .prepare(`UPDATE ${table} SET status = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(target, id)
      .run()
  }
  await writeAudit(db, actor, `${ENTITY[kind]}.${TARGET_ACTION[target]}`, ENTITY[kind], id, { status: row.status }, { status: target })
  return { ok: true }
}
