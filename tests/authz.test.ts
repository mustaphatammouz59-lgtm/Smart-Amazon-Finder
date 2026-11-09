import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from './helpers/sqlite-d1'
import { requireAdmin, roleAllowed } from '../app/lib/auth'
import { TEST_CONFIG, mintToken, verifierWith } from './helpers/jwt'
import { ApiError } from '../app/lib/api'

/**
 * Authz matrix harness (Stage 03 deliverable): the RBAC table from
 * API-ARCHITECTURE.md §6 exercised as pure rules + the Access-header
 * guard resolved against admin_users.
 */
describe('RBAC matrix', () => {
  const cases: Array<[string, string, 'read' | 'write' | 'publish', boolean]> = [
    ['viewer', 'overview', 'read', true],
    ['viewer', 'products', 'write', false],
    ['editor', 'products', 'write', true],
    ['editor', 'products', 'publish', false],
    ['publisher', 'products', 'publish', true],
    ['publisher', 'products', 'write', true], // publisher outranks editor in the role ladder (SECURITY-PLAN)
    ['admin', 'audit', 'read', true],
    ['editor', 'audit', 'read', false],
    ['admin', 'settings', 'write', false],
    ['owner', 'settings', 'write', true],
    ['viewer', 'analytics', 'read', true],
    ['editor', 'categories', 'write', false],
    ['admin', 'categories', 'write', true],
    ['ghost', 'overview', 'read', false],
  ]
  for (const [role, area, action, expected] of cases) {
    it(`${role} ${action} ${area} → ${expected}`, () => {
      expect(roleAllowed(role, area, action)).toBe(expected)
    })
  }
})

describe('requireAdmin guard (Stage 03.2 — verified JWT identity)', () => {
  const { verifier } = verifierWith(['key-1'])
  const req = (headers: Record<string, string>) =>
    new Request('https://example.invalid/api/admin/overview', { headers })

  it('rejects requests without a JWT (401) — an email header alone is worthless', async () => {
    const { db } = freshCatalogDb()
    await expect(requireAdmin(req({}), db, 'overview', 'read', TEST_CONFIG, verifier)).rejects.toMatchObject({
      code: 'UNAUTHENTICATED',
    })
    await expect(
      requireAdmin(
        req({ 'Cf-Access-Authenticated-User-Email': 'owner@example.invalid' }),
        db,
        'overview',
        'read',
        TEST_CONFIG,
        verifier,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('fails closed when Access is not configured server-side', async () => {
    const { db } = freshCatalogDb()
    const token = await mintToken()
    await expect(
      requireAdmin(req({ 'Cf-Access-Jwt-Assertion': token }), db, 'overview', 'read', null, verifier),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects a valid JWT whose identity has no admin record (401)', async () => {
    const { db } = freshCatalogDb()
    const token = await mintToken({ claims: { email: 'nobody@example.invalid' } })
    await expect(
      requireAdmin(req({ 'Cf-Access-Jwt-Assertion': token }), db, 'overview', 'read', TEST_CONFIG, verifier),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('rejects an email header that disagrees with the verified claim', async () => {
    const { db } = freshCatalogDb()
    const token = await mintToken()
    await expect(
      requireAdmin(
        req({
          'Cf-Access-Jwt-Assertion': token,
          'Cf-Access-Authenticated-User-Email': 'someone-else@example.invalid',
        }),
        db,
        'overview',
        'read',
        TEST_CONFIG,
        verifier,
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
  })

  it('enforces RBAC on the verified identity (403 insufficient role, owner passes)', async () => {
    const { db, raw } = freshCatalogDb()
    raw.prepare("INSERT INTO admin_users (email, role) VALUES ('editor@example.invalid', 'editor')").run()
    const editorToken = await mintToken({ claims: { email: 'editor@example.invalid' } })
    await expect(
      requireAdmin(
        req({ 'Cf-Access-Jwt-Assertion': editorToken }),
        db,
        'products',
        'publish',
        TEST_CONFIG,
        verifier,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
    const editor = await requireAdmin(
      req({ 'Cf-Access-Jwt-Assertion': editorToken }),
      db,
      'products',
      'write',
      TEST_CONFIG,
      verifier,
    )
    expect(editor.role).toBe('editor')
    const ownerToken = await mintToken()
    const owner = await requireAdmin(
      req({ 'Cf-Access-Jwt-Assertion': ownerToken }),
      db,
      'overview',
      'read',
      TEST_CONFIG,
      verifier,
    )
    expect(owner.role).toBe('owner')
    expect(new ApiError('FORBIDDEN', 'x')).toBeInstanceOf(Error)
  })
})
