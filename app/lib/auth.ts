import { ApiError } from './api'
import { verifierFor, type AccessConfig, type AccessVerifier } from './access'
import type { AdminActor } from './db/admin'

/**
 * Admin authorization (API-ARCHITECTURE.md §6, SECURITY-PLAN §3).
 * Two independent layers: Cloudflare Access is the edge pre-filter, and
 * this guard authenticates independently — the Access JWT is verified
 * cryptographically in app/lib/access.ts and identity is derived from
 * its claims, never from the plaintext email header. The guard then
 * resolves the admin in `admin_users` and applies the RBAC matrix below.
 */

export type AdminRole = 'owner' | 'admin' | 'editor' | 'publisher' | 'viewer'
const ROLE_RANK: Record<AdminRole, number> = { viewer: 0, editor: 1, publisher: 2, admin: 3, owner: 4 }

/** Minimum role per admin area (API doc §6 table). */
export const ADMIN_RBAC: Record<string, { read: AdminRole; write?: AdminRole; publish?: AdminRole }> = {
  overview: { read: 'viewer' },
  products: { read: 'editor', write: 'editor', publish: 'publisher' },
  categories: { read: 'admin', write: 'admin' },
  brands: { read: 'admin', write: 'admin' },
  offers: { read: 'editor', write: 'editor' },
  sources: { read: 'admin', write: 'admin' },
  content: { read: 'editor', write: 'editor', publish: 'publisher' },
  programs: { read: 'admin', write: 'admin' },
  users: { read: 'admin', write: 'admin' },
  analytics: { read: 'viewer' },
  audit: { read: 'admin' },
  settings: { read: 'owner', write: 'owner' },
}

export function roleAllowed(role: string, area: string, action: 'read' | 'write' | 'publish'): boolean {
  const rule = ADMIN_RBAC[area]
  if (!rule) return false
  const required = rule[action] ?? rule.read
  const have = ROLE_RANK[role as AdminRole]
  return have !== undefined && have >= ROLE_RANK[required]
}

export async function requireAdmin(
  request: Request,
  db: D1Database,
  area: string,
  action: 'read' | 'write' | 'publish',
  access: AccessConfig | null,
  verifier?: AccessVerifier,
): Promise<AdminActor> {
  // Fail closed when Access verification is not configured server-side.
  if (!access) {
    console.error(JSON.stringify({ accessVerification: 'not-configured' }))
    throw new ApiError('UNAUTHENTICATED', 'Admin authentication is required.')
  }
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) {
    throw new ApiError('UNAUTHENTICATED', 'Admin authentication is required.')
  }
  // Identity comes ONLY from the cryptographically verified claims.
  const identity = await (verifier ?? verifierFor(access)).verify(token)
  // If the (untrusted) email header is present it must agree with the
  // verified claim; a disagreement means the request did not come
  // through a coherent Access path.
  const headerEmail = request.headers.get('Cf-Access-Authenticated-User-Email')
  if (headerEmail && headerEmail.toLowerCase() !== identity.email) {
    throw new ApiError('UNAUTHENTICATED', 'Admin authentication is required.')
  }
  const admin = await db
    .prepare('SELECT id, email, role FROM admin_users WHERE email = ?')
    .bind(identity.email)
    .first<AdminActor>()
  if (!admin) {
    throw new ApiError('UNAUTHENTICATED', 'No admin account exists for this identity.')
  }
  if (!roleAllowed(admin.role, area, action)) {
    throw new ApiError('FORBIDDEN', `Role '${admin.role}' may not perform '${action}' on '${area}'.`)
  }
  return admin
}
