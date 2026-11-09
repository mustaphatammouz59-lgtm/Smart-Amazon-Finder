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
  // Stage 04.6: batch() needs each prepared statement's raw handle and
  // binds; prepare() registers them here keyed by the statement object.
  const internals = new WeakMap<object, { stmt: ReturnType<DatabaseSync['prepare']>; binds: () => unknown[] }>()
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
      internals.set(api, { stmt, binds: () => binds })
      return api
    },
    /**
     * D1 batch semantics, faithfully reproduced (Stage 04.6): the
     * statements execute in order inside ONE transaction; if any
     * statement fails, the whole batch rolls back and the error
     * propagates — no partial application is observable. Statements
     * that return rows (SELECT, or writes with RETURNING) expose them
     * as `results`, exactly as D1 does; plain writes report
     * meta.changes / meta.last_row_id.
     */
    async batch(statements: unknown[]) {
      raw.exec('BEGIN')
      try {
        const out: Array<{
          success: true
          results: unknown[]
          meta: { changes: number; last_row_id: number }
        }> = []
        for (const statement of statements as object[]) {
          const entry = internals.get(statement)
          if (!entry) {
            throw new Error('sqlite-d1 adapter: batch() received a statement not prepared by this database')
          }
          const binds = entry.binds() as never[]
          if (entry.stmt.columns().length > 0) {
            const results = entry.stmt.all(...binds) as unknown[]
            out.push({ success: true, results, meta: { changes: results.length, last_row_id: 0 } })
          } else {
            const r = entry.stmt.run(...binds)
            out.push({
              success: true,
              results: [],
              meta: { changes: r.changes, last_row_id: Number(r.lastInsertRowid) },
            })
          }
        }
        raw.exec('COMMIT')
        return out
      } catch (error) {
        try {
          raw.exec('ROLLBACK')
        } catch {
          // Transaction already gone (e.g. COMMIT itself failed first).
        }
        throw error
      }
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
