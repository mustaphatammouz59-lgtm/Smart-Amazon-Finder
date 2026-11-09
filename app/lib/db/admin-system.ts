import { decodeCursor, encodeCursor } from './types'

/**
 * Admin system reads (Stage 04): audit viewer, admin/public user lists,
 * system status and analytics. Read-only — this module exposes no
 * UPDATE/DELETE path (audit_logs is append-only by design).
 */

export interface AuditFilters {
  entityType?: string
  entityId?: number
  actorId?: number
  action?: string
  cursor?: string | null
  limit?: number
}

export interface AuditLogRow {
  id: number
  actor_admin_id: number
  actor_email: string | null
  action: string
  entity_type: string
  entity_id: number | null
  before_json: string | null
  after_json: string | null
  created_at: string
}

export async function listAudit(
  db: D1Database,
  filters: AuditFilters,
): Promise<{ items: AuditLogRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100)
  const offset = decodeCursor(filters.cursor)
  const where: string[] = []
  const binds: unknown[] = []
  if (filters.entityType) {
    where.push('a.entity_type = ?')
    binds.push(filters.entityType)
  }
  if (filters.entityId !== undefined) {
    where.push('a.entity_id = ?')
    binds.push(filters.entityId)
  }
  if (filters.actorId !== undefined) {
    where.push('a.actor_admin_id = ?')
    binds.push(filters.actorId)
  }
  if (filters.action) {
    where.push('a.action = ?')
    binds.push(filters.action)
  }
  const sql = `SELECT a.id, a.actor_admin_id, u.email AS actor_email, a.action, a.entity_type,
                      a.entity_id, a.before_json, a.after_json, a.created_at
                 FROM audit_logs a
                 LEFT JOIN admin_users u ON u.id = a.actor_admin_id
                 ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}
                ORDER BY a.id DESC LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db.prepare(sql).bind(...binds).all<AuditLogRow>()
  const hasMore = results.length > limit
  return {
    items: hasMore ? results.slice(0, limit) : results,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export interface AdminUserRow {
  id: number
  email: string
  role: string
  access_identity_ref: string | null
  created_at: string
}

/** Admin accounts. The table holds no secret material — safe to list. */
export async function listAdminUsers(db: D1Database): Promise<AdminUserRow[]> {
  const { results } = await db
    .prepare('SELECT id, email, role, access_identity_ref, created_at FROM admin_users ORDER BY id ASC')
    .all<AdminUserRow>()
  return results
}

export interface PublicUserRow {
  id: number
  email: string
  email_verified_at: string | null
  created_at: string
  deleted_at: string | null
  favorites_count: number
  alerts_count: number
}

/**
 * Public accounts with engagement counts. Columns are selected
 * explicitly: password_hash must NEVER be selected by an admin surface.
 */
export async function listPublicUsers(
  db: D1Database,
  filters: { cursor?: string | null; limit?: number },
): Promise<{ items: PublicUserRow[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100)
  const offset = decodeCursor(filters.cursor)
  const { results } = await db
    .prepare(
      `SELECT u.id, u.email, u.email_verified_at, u.created_at, u.deleted_at,
              (SELECT COUNT(*) FROM favorites f WHERE f.user_id = u.id) AS favorites_count,
              (SELECT COUNT(*) FROM price_alerts pa WHERE pa.user_id = u.id) AS alerts_count
         FROM users u
        ORDER BY u.id DESC LIMIT ? OFFSET ?`,
    )
    .bind(limit + 1, offset)
    .all<PublicUserRow>()
  const hasMore = results.length > limit
  return {
    items: hasMore ? results.slice(0, limit) : results,
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export interface SystemStatus {
  d1: 'ok' | 'error' | 'missing'
  bindings: {
    kv: boolean
    r2: boolean
    queue: boolean
    searchRateLimiter: boolean
    adminRateLimiter: boolean
  }
  bindingCheck: string
  foundationMeta: Array<{ key: string; value: string; updated_at: string }>
  auditTotal: number
  analyticsRows: number
  queueNote: string
}

/**
 * System status. D1 gets a real SELECT 1 round-trip (like /api/health);
 * every other binding is PRESENCE ONLY — the platform exposes no
 * health/depth probe to the producer binding, and none is faked here.
 */
export async function getSystemStatus(db: D1Database, env: unknown): Promise<SystemStatus> {
  const record = env as Record<string, unknown> | null
  let d1: SystemStatus['d1'] = 'missing'
  if (db) {
    try {
      const row = await db.prepare('SELECT 1 AS one').first<{ one: number }>()
      d1 = row?.one === 1 ? 'ok' : 'error'
    } catch {
      d1 = 'error'
    }
  }
  let foundationMeta: SystemStatus['foundationMeta'] = []
  let auditTotal = 0
  let analyticsRows = 0
  if (d1 === 'ok') {
    try {
      const { results } = await db
        .prepare('SELECT key, value, updated_at FROM foundation_meta ORDER BY key')
        .all<{ key: string; value: string; updated_at: string }>()
      foundationMeta = results
      auditTotal = (await db.prepare('SELECT COUNT(*) AS n FROM audit_logs').first<{ n: number }>())?.n ?? 0
      analyticsRows =
        (await db.prepare('SELECT COUNT(*) AS n FROM analytics_daily').first<{ n: number }>())?.n ?? 0
    } catch {
      foundationMeta = []
      auditTotal = 0
      analyticsRows = 0
    }
  }
  return {
    d1,
    bindings: {
      kv: Boolean(record?.APP_KV),
      r2: Boolean(record?.MEDIA),
      queue: Boolean(record?.JOBS),
      searchRateLimiter: Boolean(record?.SEARCH_RATE_LIMITER),
      adminRateLimiter: Boolean(record?.ADMIN_RATE_LIMITER),
    },
    bindingCheck: 'presence-only (except D1 live probe)',
    foundationMeta,
    auditTotal,
    analyticsRows,
    queueNote:
      'Queue depth and DLQ contents are not exposed to the Workers producer binding; only send/consume are possible. Job contracts: reindex-search is implemented; ingest/validate/refresh-offers/sitemaps/alerts/rollups are contract no-ops until their stages.',
  }
}

export interface AnalyticsDailyRow {
  day: string
  path: string
  metric: string
  count: number
}

export interface AnalyticsSummary {
  daily: AnalyticsDailyRow[]
  clicks: { total: number; last30Days: number }
  note: string
}

export async function getAnalytics(db: D1Database): Promise<AnalyticsSummary> {
  const { results: daily } = await db
    .prepare('SELECT day, path, metric, count FROM analytics_daily ORDER BY day DESC, path, metric LIMIT 60')
    .all<AnalyticsDailyRow>()
  const total =
    (await db.prepare('SELECT COUNT(*) AS n FROM affiliate_clicks').first<{ n: number }>())?.n ?? 0
  const last30Days =
    (
      await db
        .prepare("SELECT COUNT(*) AS n FROM affiliate_clicks WHERE created_at >= datetime('now', '-30 days')")
        .first<{ n: number }>()
    )?.n ?? 0
  return {
    daily,
    clicks: { total, last30Days },
    note: 'Rollups are produced by the rollups queue job, which is a contract no-op until Stage 13; expect no data until real traffic exists.',
  }
}
