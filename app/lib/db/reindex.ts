/**
 * Search projection maintenance (DATABASE-DESIGN.md §5). The projection
 * table `products_search` mirrors ONLY published + validation-passed
 * products; the `reindex-search` queue job calls this after publish events.
 * Fixture rows follow the same rule here — the read-side gate decides
 * whether fixtures are visible; the index simply mirrors the gate.
 */
export async function reindexProduct(db: D1Database, productId: number): Promise<void> {
  const row = await db
    .prepare(
      `SELECT p.id, p.name, b.name AS brand_name, c.name AS category_name, p.editorial_summary
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.id = ? AND p.status = 'published' AND p.validation_status = 'passed'`,
    )
    .bind(productId)
    .first<{
      id: number
      name: string
      brand_name: string | null
      category_name: string
      editorial_summary: string | null
    }>()
  await db.prepare('DELETE FROM products_search WHERE id = ?').bind(productId).run()
  if (row) {
    await db
      .prepare(
        'INSERT INTO products_search (id, name, brand_name, category_name, editorial_summary) VALUES (?,?,?,?,?)',
      )
      .bind(row.id, row.name, row.brand_name, row.category_name, row.editorial_summary)
      .run()
  }
  await db.prepare("INSERT INTO products_fts(products_fts) VALUES('rebuild')").run()
}

export async function rebuildSearchIndex(db: D1Database): Promise<number> {
  await db.prepare('DELETE FROM products_search').run()
  await db
    .prepare(
      `INSERT INTO products_search (id, name, brand_name, category_name, editorial_summary)
       SELECT p.id, p.name, b.name, c.name, p.editorial_summary
         FROM products p
         JOIN categories c ON c.id = p.category_id
         LEFT JOIN brands b ON b.id = p.brand_id
        WHERE p.status = 'published' AND p.validation_status = 'passed'`,
    )
    .run()
  await db.prepare("INSERT INTO products_fts(products_fts) VALUES('rebuild')").run()
  const row = await db.prepare('SELECT COUNT(*) AS n FROM products_search').first<{ n: number }>()
  return row?.n ?? 0
}
