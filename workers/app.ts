import { createRequestHandler } from 'react-router'

const requestHandler = createRequestHandler(
  () => import('virtual:react-router/server-build'),
  import.meta.env.MODE,
)

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  // Foundation stage: keep the whole pre-launch site out of indexes at
  // the header level too (matches robots.txt policy).
  'X-Robots-Tag': 'noindex, nofollow',
  // Stage 04.2 (audit F-11): HSTS + a CSP were missing entirely. The CSP
  // is deliberately in a compatibility posture: React Router's SSR
  // bootstrap uses inline scripts/styles and there is no nonce pipeline
  // yet, so script/style allow 'unsafe-inline' — but objects, plugins,
  // base-tag hijacking, framing and cross-origin script/style sources
  // are all closed, and every fetch defaults to same-origin.
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; '),
}

export default {
  async fetch(request, env, ctx) {
    const response = await requestHandler(request, {
      cloudflare: { env, ctx },
    })
    const headers = new Headers(response.headers)
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      if (!headers.has(name)) headers.set(name, value)
    }
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },

  // Queue consumers (API-ARCHITECTURE.md §7, Stage 03): `reindex-search`
  // is implemented against the DAL; the remaining contracts are safe
  // no-ops until their stages land. Failures retry, then dead-letter
  // (consumer config in wrangler.jsonc).
  async queue(batch, env) {
    const { reindexProduct, rebuildSearchIndex } = await import('../app/lib/db/reindex')
    for (const message of batch.messages) {
      const body = (message.body ?? {}) as { job?: string; productId?: number }
      try {
        switch (body.job) {
          case 'reindex-search':
            if (typeof body.productId === 'number') {
              await reindexProduct(env.DB, body.productId)
            } else {
              await rebuildSearchIndex(env.DB)
            }
            break
          case 'ingest':
          case 'validate':
          case 'refresh-offers':
          case 'sitemaps':
          case 'alerts':
          case 'rollups':
            console.log(JSON.stringify({ queue: batch.queue, job: body.job, stage: 'contract-noop' }))
            break
          default:
            console.error(JSON.stringify({ queue: batch.queue, job: body.job ?? null, error: 'unknown-job' }))
        }
        message.ack()
      } catch (error) {
        console.error(JSON.stringify({ queue: batch.queue, job: body.job ?? null, error: String(error) }))
        message.retry()
      }
    }
  },
} satisfies ExportedHandler<Env>
