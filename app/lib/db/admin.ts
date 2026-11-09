/**
 * Admin mutations (Stage 03 skeleton). Every mutation writes an audit_logs
 * row (API-ARCHITECTURE.md §6). Deletion of products is NOT offered:
 * integrity rule 4 — archive instead.
 */
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
 * Publication gate (integrity rules 2 + workflow): a product may transition
 * to 'published' ONLY when validation_status='passed'. Every transition is
 * audited with before/after status.
 */
export async function transitionProductStatus(
  db: D1Database,
  actor: AdminActor,
  productId: number,
  target: 'in_review' | 'published' | 'archived',
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'validation_gate' }> {
  const row = await db
    .prepare('SELECT id, status, validation_status FROM products WHERE id = ?')
    .bind(productId)
    .first<{ id: number; status: string; validation_status: string }>()
  if (!row) return { ok: false, reason: 'not_found' }
  if (target === 'published' && row.validation_status !== 'passed') {
    return { ok: false, reason: 'validation_gate' }
  }
  await db
    .prepare("UPDATE products SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(target, productId)
    .run()
  await writeAudit(
    db,
    actor,
    `product.${target === 'published' ? 'publish' : target}`,
    'product',
    productId,
    { status: row.status },
    { status: target },
  )
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
