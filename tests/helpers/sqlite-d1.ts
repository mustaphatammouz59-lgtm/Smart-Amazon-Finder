import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Test adapter: a real SQLite database (node:sqlite, same engine family
 * as D1 — including FTS5) behind the subset of the D1Database interface
 * the DAL uses. Lets the integrity/search suites execute the actual SQL.
 */
export function createTestDb(): { db: D1Database; raw: DatabaseSync } {
  const raw = new DatabaseSync(':memory:')
  const adapter = {
    prepare(sql: string) {
      const stmt = raw.prepare(sql)
      let binds: unknown[] = []
      const api = {
        bind(...args: unknown[]) {
          binds = args
          return api
        },
        async all<T>() {
          return { results: stmt.all(...(binds as never[])) as T[], success: true, meta: {} }
        },
        async first<T>() {
          return (stmt.get(...(binds as never[])) as T | undefined) ?? null
        },
        async run() {
          const r = stmt.run(...(binds as never[]))
          return { success: true, meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) } }
        },
      }
      return api
    },
    async exec(sql: string) {
      raw.exec(sql)
      return { count: 0, duration: 0 }
    },
  }
  return { db: adapter as unknown as D1Database, raw }
}

const ROOT = join(process.cwd())

export function applyMigrations(raw: DatabaseSync): void {
  const dir = join(ROOT, 'migrations')
  for (const file of readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    raw.exec(readFileSync(join(dir, file), 'utf-8'))
  }
}

export function applyFixtures(raw: DatabaseSync): void {
  raw.exec(readFileSync(join(ROOT, 'fixtures/catalog-seeds.sql'), 'utf-8'))
  raw.exec(readFileSync(join(ROOT, 'fixtures/dev-catalog.sql'), 'utf-8'))
}

export function freshCatalogDb(): { db: D1Database; raw: DatabaseSync } {
  const { db, raw } = createTestDb()
  applyMigrations(raw)
  applyFixtures(raw)
  return { db, raw }
}
