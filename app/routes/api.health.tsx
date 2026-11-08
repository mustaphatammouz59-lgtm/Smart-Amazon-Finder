import { env } from 'cloudflare:workers'

/**
 * Foundation health endpoint — the S-02 spike surface.
 * Reports runtime binding availability without exposing any secret
 * values. D1 is proven with a real `SELECT 1` round-trip.
 */
export async function loader() {
  const checks: Record<string, 'ok' | 'error' | 'missing'> = {}

  const db = (env as Env).DB as D1Database | undefined
  if (!db) {
    checks.d1 = 'missing'
  } else {
    try {
      const row = await db.prepare('SELECT 1 AS one').first<{ one: number }>()
      checks.d1 = row?.one === 1 ? 'ok' : 'error'
    } catch {
      checks.d1 = 'error'
    }
  }

  const kv = (env as Env).APP_KV as KVNamespace | undefined
  checks.kv = kv ? 'ok' : 'missing'

  const r2 = (env as Env).MEDIA as R2Bucket | undefined
  checks.r2 = r2 ? 'ok' : 'missing'

  const queue = (env as Env).JOBS as Queue | undefined
  checks.queues = queue ? 'ok' : 'missing'

  const healthy = checks.d1 === 'ok'
  return Response.json(
    {
      status: healthy ? 'ok' : 'degraded',
      runtime: 'cloudflare-workers',
      bindings: checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  )
}
