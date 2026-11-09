import { describe, expect, it } from 'vitest'
import { freshCatalogDb } from './helpers/sqlite-d1'
import { ApiError, apiErrorResponse } from '../app/lib/api'
import { assertSpecWhitelist, parseSearchQuery } from '../app/lib/api-schemas'

/** API-ARCHITECTURE.md §§2, 8: error envelope + parameter discipline. */
describe('API error format', () => {
  it('renders the standard envelope with requestId', async () => {
    const res = apiErrorResponse(new ApiError('NOT_FOUND', 'Product not found.'))
    expect(res.status).toBe(404)
    const body = (await res.json()) as { error: { code: string; message: string; requestId: string } }
    expect(body.error.code).toBe('NOT_FOUND')
    expect(body.error.message).toBe('Product not found.')
    expect(body.error.requestId).toMatch(/^req_/)
  })

  it('maps validation errors to 400 with fields', async () => {
    const res = apiErrorResponse(
      new ApiError('VALIDATION_FAILED', 'Bad input.', { budget: 'Must be positive.' }),
    )
    expect(res.status).toBe(400)
    const body = (await res.json()) as { error: { fields?: Record<string, string> } }
    expect(body.error.fields?.budget).toBe('Must be positive.')
  })
})

describe('search parameter discipline', () => {
  it('parses a valid query and ignores unknown parameters', () => {
    const { query, brands } = parseSearchQuery(
      new URLSearchParams('q=hub&category=electronics-accessories&brand=devbrand&bogus=1'),
    )
    expect(query.q).toBe('hub')
    expect(brands).toEqual(['devbrand'])
  })

  it('rejects malformed values with VALIDATION_FAILED (never coerces)', () => {
    expect(() => parseSearchQuery(new URLSearchParams('priceMin=abc'))).toThrowError(ApiError)
    try {
      parseSearchQuery(new URLSearchParams('priceMin=abc'))
    } catch (e) {
      expect((e as ApiError).code).toBe('VALIDATION_FAILED')
    }
    expect(() => parseSearchQuery(new URLSearchParams('limit=999'))).toThrowError(ApiError)
    expect(() =>
      parseSearchQuery(new URLSearchParams('spec.usb_c_ports.min=xyz&category=electronics-accessories')),
    ).toThrowError(ApiError)
  })

  it('parses spec facets into typed filters', () => {
    const { specFilters } = parseSearchQuery(
      new URLSearchParams(
        'category=electronics-accessories&spec.usb_c_ports.min=2&spec.safety_certified.bool=true',
      ),
    )
    expect(specFilters).toEqual([
      { key: 'usb_c_ports', min: 2 },
      { key: 'safety_certified', bool: true },
    ])
  })
})

describe('spec facet whitelist', () => {
  it('accepts filterable definitions and rejects others', async () => {
    const { db } = freshCatalogDb()
    await expect(
      assertSpecWhitelist(db, 'electronics-accessories', [{ key: 'usb_c_ports', min: 1 }]),
    ).resolves.toBeUndefined()
    await expect(
      assertSpecWhitelist(db, 'electronics-accessories', [{ key: 'warranty_years' }]),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    await expect(
      assertSpecWhitelist(db, 'electronics-accessories', [{ key: 'nonexistent' }]),
    ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' })
    await expect(assertSpecWhitelist(db, undefined, [{ key: 'usb_c_ports' }])).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    })
  })
})
