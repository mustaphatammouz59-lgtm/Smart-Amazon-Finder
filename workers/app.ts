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

  // Queue consumer foundation (SYSTEM-ARCHITECTURE.md §2): jobs are
  // acknowledged and logged in Stage 01. Real consumers (ingestion,
  // refresh, reindex) arrive with their stages.
  async queue(batch) {
    console.log(
      JSON.stringify({
        queue: batch.queue,
        messages: batch.messages.length,
        stage: 'foundation-ack',
      }),
    )
    batch.ackAll()
  },
} satisfies ExportedHandler<Env>
