/**
 * API v1 transport helpers (API-ARCHITECTURE.md §§2, 8).
 * Every API response is JSON; every error uses the standard envelope:
 * { error: { code, message, fields?, requestId } }.
 */

export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INTERNAL'

const STATUS: Record<ApiErrorCode, number> = {
  VALIDATION_FAILED: 400,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  PAYLOAD_TOO_LARGE: 413,
  UPSTREAM_UNAVAILABLE: 502,
  INTERNAL: 500,
}

export class ApiError extends Error {
  code: ApiErrorCode
  fields?: Record<string, string>
  /** Seconds for a Retry-After header (RATE_LIMITED responses). */
  retryAfter?: number
  constructor(code: ApiErrorCode, message: string, fields?: Record<string, string>, retryAfter?: number) {
    super(message)
    this.code = code
    this.fields = fields
    this.retryAfter = retryAfter
  }
}

export function requestId(): string {
  return `req_${crypto.randomUUID().replaceAll('-', '').slice(0, 16)}`
}

export function apiJson(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function apiErrorResponse(error: unknown): Response {
  const rid = requestId()
  if (error instanceof ApiError) {
    return Response.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.fields ? { fields: error.fields } : {}),
          requestId: rid,
        },
      },
      {
        status: STATUS[error.code],
        headers: {
          'Cache-Control': 'no-store',
          ...(error.retryAfter ? { 'Retry-After': String(error.retryAfter) } : {}),
        },
      },
    )
  }
  console.error(JSON.stringify({ requestId: rid, error: String(error) }))
  return Response.json(
    { error: { code: 'INTERNAL', message: 'An internal error occurred.', requestId: rid } },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  )
}

/** Wrap a route handler so thrown ApiErrors become the standard envelope. */
export function withApi<T extends unknown[]>(
  fn: (...args: T) => Promise<Response>,
): (...args: T) => Promise<Response> {
  return async (...args: T) => {
    try {
      return await fn(...args)
    } catch (error) {
      return apiErrorResponse(error)
    }
  }
}

/** Default maximum JSON request body for POST endpoints: 16 KB. */
export const MAX_JSON_BODY_BYTES = 16 * 1024

/**
 * Read and parse a JSON request body with a hard size cap (Stage 03.2).
 * The declared Content-Length is checked first; the actual bytes are
 * then measured (a lying or absent header cannot smuggle a large body).
 * Oversized bodies are rejected with 413 PAYLOAD_TOO_LARGE — never
 * truncated. Invalid JSON is a 400 VALIDATION_FAILED.
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number = MAX_JSON_BODY_BYTES,
): Promise<unknown> {
  const declared = Number(request.headers.get('content-length') ?? 'NaN')
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new ApiError('PAYLOAD_TOO_LARGE', `Request body exceeds the ${maxBytes}-byte limit.`)
  }
  const text = await request.text()
  if (new TextEncoder().encode(text).length > maxBytes) {
    throw new ApiError('PAYLOAD_TOO_LARGE', `Request body exceeds the ${maxBytes}-byte limit.`)
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new ApiError('VALIDATION_FAILED', 'Request body must be valid JSON.')
  }
}
