import { ApiError } from './api'

/**
 * Same-origin guard for admin mutations (Stage 04).
 * Browsers send an `Origin` header on cross-origin (and same-origin POST)
 * requests; when present it must equal the request URL's own origin,
 * otherwise the request is treated as a cross-site forgery attempt.
 * Non-browser clients (which authenticate with the Access JWT) may omit
 * the header — that allowance is deliberate: the JWT is the primary
 * control, and non-browser clients have no ambient authority to abuse.
 *
 * Stage 04.2 (audit F-05): the comparison used to cover only the HOST and
 * trusted the client-supplied `Host` header as the expected value, so an
 * http:// Origin passed against an https:// site (scheme downgrade) and
 * the "expected" side of the comparison was itself attacker-controlled.
 * The guard now compares the FULL origin (scheme + host + port) against
 * `new URL(request.url).origin` — the URL the platform actually routed —
 * and never consults the Host header.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('Origin')
  if (!origin) return
  let originOrigin: string
  try {
    originOrigin = new URL(origin).origin
  } catch {
    throw new ApiError('FORBIDDEN', 'Cross-origin admin requests are not allowed.')
  }
  let expectedOrigin: string
  try {
    expectedOrigin = new URL(request.url).origin
  } catch {
    throw new ApiError('FORBIDDEN', 'Cross-origin admin requests are not allowed.')
  }
  // `new URL('null').origin` is the string 'null' for opaque origins — it
  // can never equal a real http(s) origin, so it is rejected here too.
  if (originOrigin !== expectedOrigin) {
    throw new ApiError('FORBIDDEN', 'Cross-origin admin requests are not allowed.')
  }
}
