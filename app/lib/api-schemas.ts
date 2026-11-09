import { z } from 'zod'
import { ApiError } from './api'
import type { SpecFilter } from './db/types'

/**
 * API v1 input validation (API-ARCHITECTURE.md §2): explicit whitelisted
 * parameters; unknown parameters are ignored, malformed values return
 * 400 VALIDATION_FAILED — never silently coerced.
 */

const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Must be a slug.')

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  category: slug.optional(),
  sort: z.enum(['relevance', 'price-asc', 'price-desc', 'name']).optional(),
  priceMin: z.coerce.number().min(0).max(100000).optional(),
  priceMax: z.coerce.number().min(0).max(100000).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  cursor: z.string().max(200).optional(),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>

export function parseSearchQuery(params: URLSearchParams): {
  query: SearchQuery
  brands: string[]
  specFilters: SpecFilter[]
} {
  const raw: Record<string, string> = {}
  for (const key of ['q', 'category', 'sort', 'priceMin', 'priceMax', 'limit', 'cursor']) {
    const v = params.get(key)
    if (v !== null) raw[key] = v
  }
  const parsed = searchQuerySchema.safeParse(raw)
  if (!parsed.success) {
    const fields: Record<string, string> = {}
    for (const issue of parsed.error.issues) fields[String(issue.path[0] ?? 'query')] = issue.message
    throw new ApiError('VALIDATION_FAILED', 'One or more query parameters are invalid.', fields)
  }
  const brands = params.getAll('brand').filter((b) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(b))
  if (brands.length !== params.getAll('brand').length) {
    throw new ApiError('VALIDATION_FAILED', 'Invalid brand parameter.', { brand: 'Must be a slug.' })
  }
  // Spec facets arrive as spec.<key>.min / .max / .bool / .text
  const byKey = new Map<string, SpecFilter>()
  for (const [key, value] of params.entries()) {
    const m = /^spec\.([a-z0-9_]+)\.(min|max|bool|text)$/.exec(key)
    if (!m) continue
    const [, specKey, kind] = m
    const filter = byKey.get(specKey) ?? { key: specKey }
    if (kind === 'min' || kind === 'max') {
      const n = Number(value)
      if (!Number.isFinite(n)) {
        throw new ApiError('VALIDATION_FAILED', `Invalid value for ${key}.`, { [key]: 'Must be a number.' })
      }
      filter[kind] = n
    } else if (kind === 'bool') {
      if (value !== 'true' && value !== 'false') {
        throw new ApiError('VALIDATION_FAILED', `Invalid value for ${key}.`, {
          [key]: 'Must be true or false.',
        })
      }
      filter.bool = value === 'true'
    } else {
      filter.text = value.slice(0, 80)
    }
    byKey.set(specKey, filter)
  }
  return { query: parsed.data, brands, specFilters: [...byKey.values()] }
}

/** Spec facet keys must be filterable definitions of the category (whitelist). */
export async function assertSpecWhitelist(
  db: D1Database,
  categorySlug: string | undefined,
  filters: SpecFilter[],
): Promise<void> {
  if (filters.length === 0) return
  if (!categorySlug) {
    throw new ApiError('VALIDATION_FAILED', 'Spec filters require a category.', {
      category: 'Required with spec filters.',
    })
  }
  const { results } = await db
    .prepare(
      `SELECT d.key FROM attribute_definitions d JOIN categories c ON c.id = d.category_id
        WHERE c.slug = ? AND d.is_filterable = 1`,
    )
    .bind(categorySlug)
    .all<{ key: string }>()
  const allowed = new Set(results.map((r) => r.key))
  for (const f of filters) {
    if (!allowed.has(f.key)) {
      throw new ApiError('VALIDATION_FAILED', `Unknown or non-filterable spec: ${f.key}.`, {
        [`spec.${f.key}`]: 'Not a filterable specification for this category.',
      })
    }
  }
}
