/**
 * Spike S-01 (SYSTEM-ARCHITECTURE.md §9): prove FTS5 exists and performs —
 * create virtual table, bm25() ranking, snippet generation — with a
 * 10,000-row synthetic catalog. Runs on node:sqlite (same SQLite engine
 * family as D1). A separate check creates FTS5 inside D1-local via wrangler.
 */
import { DatabaseSync } from 'node:sqlite'

const db = new DatabaseSync(':memory:')
db.exec(`
  CREATE TABLE products_search (
    id INTEGER PRIMARY KEY, name TEXT, brand_name TEXT, category_name TEXT, editorial_summary TEXT
  );
  CREATE VIRTUAL TABLE products_fts USING fts5(
    name, brand_name, category_name, editorial_summary,
    content='products_search', content_rowid='id'
  );
`)
const words = [
  'ergonomic',
  'desk',
  'chair',
  'usb-c',
  'hub',
  'monitor',
  'arm',
  'lamp',
  'keyboard',
  'quiet',
  'aluminium',
  'adjustable',
  'charging',
  'cable',
  'stand',
  'wireless',
  'office',
  'home',
  'pro',
  'mini',
]
const brands = ['Acme', 'Nordform', 'BrightLab', 'Koda', 'Vantage']
const cats = ['Home Office & Productivity', 'Electronics Accessories']

const t0 = performance.now()
db.exec('BEGIN')
const ins = db.prepare('INSERT INTO products_search VALUES (?,?,?,?,?)')
for (let i = 1; i <= 10000; i++) {
  const pick = (n, off) =>
    Array.from({ length: n }, (_, k) => words[(i + off + k * 3) % words.length]).join(' ')
  ins.run(
    i,
    `${pick(3, i)} device ${i}`,
    brands[i % brands.length],
    cats[i % 2],
    `Editorial summary about ${pick(6, i + 2)} for product ${i}.`,
  )
}
db.exec('COMMIT')
const tInsert = performance.now() - t0

db.exec("INSERT INTO products_fts(products_fts) VALUES('rebuild')")
const t1 = performance.now()
const rows = db
  .prepare(
    'SELECT rowid AS id, bm25(products_fts) AS rank, snippet(products_fts, 0, ?, ?, ?, 8) AS snip FROM products_fts WHERE products_fts MATCH ? ORDER BY rank LIMIT 10',
  )
  .all('<b>', '</b>', '…', 'ergonomic desk')
const tQuery = performance.now() - t1
const t2 = performance.now()
const cnt = db.prepare('SELECT count(*) AS n FROM products_fts WHERE products_fts MATCH ?').get('"usb-c" hub')
const tCount = performance.now() - t2

console.log(
  JSON.stringify(
    {
      rows: 10000,
      insertWithFtsMaintainedMs: Math.round(tInsert),
      rebuildMs: 'included above (content populated before rebuild)',
      bm25Top10Ms: Number(tQuery.toFixed(2)),
      matchCountMs: Number(tCount.toFixed(2)),
      matchCount: cnt.n,
      sampleRank: rows[0]?.rank,
      sampleSnippet: rows[0]?.snip,
    },
    null,
    2,
  ),
)
