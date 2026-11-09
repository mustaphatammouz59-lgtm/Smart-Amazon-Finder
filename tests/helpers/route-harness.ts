import { expect } from 'vitest'
import type { DatabaseSync } from 'node:sqlite'
import { memoryR2Bucket, rateLimiterStub, setStubEnv } from './cloudflare-workers'
import type { JwksServer } from './jwks-server'

/**
 * Route-test harness (Stage 04.2): wires the stub `cloudflare:workers`
 * env to a fresh sqlite D1, the local JWKS server, controllable
 * rate-limiter stubs and an in-memory R2 bucket — then invokes route
 * loaders/actions directly with real Request objects, exactly as the
 * Workers runtime would deliver them. Expected-vs-actual status codes
 * for the security matrix are asserted in the suites themselves.
 */

export const ADMIN_BASE = 'https://admin.example.test'

export const EMAILS = {
  owner: 'owner@example.invalid',
  admin: 'admin@example.invalid',
  editor: 'editor@example.invalid',
  publisher: 'publisher@example.invalid',
  viewer: 'viewer@example.invalid',
} as const

export interface RouteEnv {
  searchLimiter: { success: boolean }
  adminLimiter: { success: boolean }
  bucket: ReturnType<typeof memoryR2Bucket>
  queue: { sent: unknown[]; send: (message: unknown) => Promise<void> }
}

/** Insert the non-owner admin users the RBAC matrix needs (owner exists in fixtures). */
export function seedAdminUsers(raw: DatabaseSync): void {
  const insert = raw.prepare('INSERT OR IGNORE INTO admin_users (email, role) VALUES (?, ?)')
  insert.run(EMAILS.admin, 'admin')
  insert.run(EMAILS.editor, 'editor')
  insert.run(EMAILS.publisher, 'publisher')
  insert.run(EMAILS.viewer, 'viewer')
}

export function setupRouteEnv(db: D1Database, jwks: JwksServer): RouteEnv {
  const searchLimiter = { success: true }
  const adminLimiter = { success: true }
  const bucket = memoryR2Bucket()
  const queue = {
    sent: [] as unknown[],
    send: async (message: unknown) => {
      queue.sent.push(message)
    },
  }
  setStubEnv({
    DB: db,
    ACCESS_TEAM_DOMAIN: jwks.issuer,
    ACCESS_AUD: jwks.audience,
    SEARCH_RATE_LIMITER: rateLimiterStub(searchLimiter),
    ADMIN_RATE_LIMITER: rateLimiterStub(adminLimiter),
    MEDIA: bucket,
    JOBS: queue,
    DEV_FIXTURES: 'enabled',
  })
  return { searchLimiter, adminLimiter, bucket, queue }
}

export interface ReqOptions {
  method?: string
  token?: string | null
  /** Origin header value; pass null to omit, undefined for the same-origin default on mutations. */
  origin?: string | null
  json?: unknown
  rawBody?: string
  contentType?: string
  headers?: Record<string, string>
}

export function apiReq(path: string, options: ReqOptions = {}): Request {
  const headers = new Headers(options.headers ?? {})
  if (options.token) headers.set('Cf-Access-Jwt-Assertion', options.token)
  const method = options.method ?? 'GET'
  if (options.origin === undefined) {
    if (method !== 'GET' && method !== 'HEAD') headers.set('Origin', ADMIN_BASE)
  } else if (options.origin !== null) {
    headers.set('Origin', options.origin)
  }
  let body: string | undefined
  if (options.json !== undefined) {
    body = JSON.stringify(options.json)
    headers.set('Content-Type', 'application/json')
  } else if (options.rawBody !== undefined) {
    body = options.rawBody
    if (options.contentType) headers.set('Content-Type', options.contentType)
  }
  return new Request(`${ADMIN_BASE}${path}`, { method, headers, body })
}

type RouteFn = (args: never) => Promise<Response>

/** Invoke a route loader/action with runtime-shaped args. */
export async function invoke(fn: unknown, request: Request, params: Record<string, string> = {}): Promise<Response> {
  return (fn as RouteFn)({ request, params, context: {} } as never)
}

export async function bodyJson(res: Response): Promise<Record<string, never>> {
  return (await res.json()) as Record<string, never>
}

/** Assert the standard error envelope: status + { error: { code } }. */
export async function expectError(res: Response, status: number, code: string): Promise<void> {
  expect(res.status).toBe(status)
  const body = (await res.json()) as { error?: { code?: string } }
  expect(body.error?.code).toBe(code)
}
