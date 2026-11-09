import { writeAudit, type AdminActor } from './admin'
import { decodeCursor, encodeCursor } from './types'
import { priceDisplayReason, type PriceDisplayReason } from '../offer-validation'
import { normalizeCurrencyCode, parsePriceTimestamp } from '../price-policy'
import { validateDestinationUrl } from '../url-policy'

/**
 * Admin commerce DAL (Stage 04): merchants, affiliate programs, offers
 * and source records. Every mutation writes an audit_logs row via
 * writeAudit (API-ARCHITECTURE.md §6). No affiliate relationship or
 * tracking value is ever invented here — link templates, tracking
 * params and terms are stored exactly as the admin entered them.
 */

/* ------------------------------ merchants ------------------------------ */

export interface MerchantItem {
  id: number
  slug: string
  name: string
  base_domain: string
  programs_count: number
  offers_count: number
}

const MERCHANT_SELECT = `
  SELECT m.id, m.slug, m.name, m.base_domain,
         (SELECT COUNT(*) FROM affiliate_programs p WHERE p.merchant_id = m.id) AS programs_count,
         (SELECT COUNT(*) FROM offers o WHERE o.merchant_id = m.id) AS offers_count
    FROM merchants m`

export async function listMerchants(db: D1Database): Promise<MerchantItem[]> {
  const { results } = await db
    .prepare(`${MERCHANT_SELECT} ORDER BY m.name ASC, m.id ASC`)
    .all<MerchantItem>()
  return results
}

export async function getMerchant(db: D1Database, id: number): Promise<MerchantItem | null> {
  return db.prepare(`${MERCHANT_SELECT} WHERE m.id = ?`).bind(id).first<MerchantItem>()
}

export interface CreateMerchantInput {
  slug: string
  name: string
  baseDomain: string
}

export async function createMerchant(
  db: D1Database,
  actor: AdminActor,
  input: CreateMerchantInput,
): Promise<{ id: number } | { conflict: 'slug' }> {
  const existing = await db
    .prepare('SELECT id FROM merchants WHERE slug = ?')
    .bind(input.slug)
    .first<{ id: number }>()
  if (existing) return { conflict: 'slug' }
  let inserted: { id: number } | null
  try {
    inserted = await db
      .prepare('INSERT INTO merchants (slug, name, base_domain) VALUES (?,?,?) RETURNING id')
      .bind(input.slug, input.name, input.baseDomain)
      .first<{ id: number }>()
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { conflict: 'slug' }
    throw e
  }
  if (!inserted) return { conflict: 'slug' }
  await writeAudit(db, actor, 'merchant.create', 'merchant', inserted.id, null, {
    slug: input.slug,
    name: input.name,
    base_domain: input.baseDomain,
  })
  return { id: inserted.id }
}

export interface UpdateMerchantInput {
  name?: string
  baseDomain?: string
}

export async function updateMerchant(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateMerchantInput,
): Promise<{ ok: boolean }> {
  const row = await db
    .prepare('SELECT id, slug, name, base_domain FROM merchants WHERE id = ?')
    .bind(id)
    .first<{ id: number; slug: string; name: string; base_domain: string }>()
  if (!row) return { ok: false }
  const sets: string[] = []
  const binds: unknown[] = []
  const after: Record<string, unknown> = {}
  if (patch.name !== undefined) {
    sets.push('name = ?')
    binds.push(patch.name)
    after.name = patch.name
  }
  if (patch.baseDomain !== undefined) {
    sets.push('base_domain = ?')
    binds.push(patch.baseDomain)
    after.base_domain = patch.baseDomain
  }
  if (sets.length === 0) return { ok: true }
  binds.push(id)
  await db.prepare(`UPDATE merchants SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run()
  await writeAudit(
    db,
    actor,
    'merchant.update',
    'merchant',
    id,
    { name: row.name, base_domain: row.base_domain },
    after,
  )
  return { ok: true }
}

export type DeleteMerchantResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'in_use'; programs_count: number; offers_count: number }

export async function deleteMerchant(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<DeleteMerchantResult> {
  const row = await db
    .prepare('SELECT id, slug FROM merchants WHERE id = ?')
    .bind(id)
    .first<{ id: number; slug: string }>()
  if (!row) return { ok: false, reason: 'not_found' }
  const programs = await db
    .prepare('SELECT COUNT(*) AS n FROM affiliate_programs WHERE merchant_id = ?')
    .bind(id)
    .first<{ n: number }>()
  const offers = await db
    .prepare('SELECT COUNT(*) AS n FROM offers WHERE merchant_id = ?')
    .bind(id)
    .first<{ n: number }>()
  const programsCount = programs?.n ?? 0
  const offersCount = offers?.n ?? 0
  if (programsCount > 0 || offersCount > 0) {
    return { ok: false, reason: 'in_use', programs_count: programsCount, offers_count: offersCount }
  }
  await db.prepare('DELETE FROM merchants WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'merchant.delete', 'merchant', id, { slug: row.slug }, null)
  return { ok: true }
}

/* --------------------------- affiliate programs --------------------------- */

export interface ProgramItem {
  id: number
  merchant_id: number
  name: string
  link_template: string
  tracking_param: string | null
  terms_url: string | null
  status: string
  terms_checked_at: string | null
  notes: string | null
  merchant_slug: string
  merchant_name: string
  offers_count: number
}

const PROGRAM_SELECT = `
  SELECT p.id, p.merchant_id, p.name, p.link_template, p.tracking_param, p.terms_url,
         p.status, p.terms_checked_at, p.notes,
         m.slug AS merchant_slug, m.name AS merchant_name,
         (SELECT COUNT(*) FROM offers o WHERE o.program_id = p.id) AS offers_count
    FROM affiliate_programs p JOIN merchants m ON m.id = p.merchant_id`

export async function listPrograms(
  db: D1Database,
  filters: { merchantId?: number } = {},
): Promise<ProgramItem[]> {
  if (filters.merchantId !== undefined) {
    const { results } = await db
      .prepare(`${PROGRAM_SELECT} WHERE p.merchant_id = ? ORDER BY p.id ASC`)
      .bind(filters.merchantId)
      .all<ProgramItem>()
    return results
  }
  const { results } = await db.prepare(`${PROGRAM_SELECT} ORDER BY p.id ASC`).all<ProgramItem>()
  return results
}

export async function getProgram(db: D1Database, id: number): Promise<ProgramItem | null> {
  return db.prepare(`${PROGRAM_SELECT} WHERE p.id = ?`).bind(id).first<ProgramItem>()
}

export interface CreateProgramInput {
  merchantId: number
  name: string
  linkTemplate: string
  trackingParam?: string | null
  termsUrl?: string | null
  status?: string
  termsCheckedAt?: string | null
  notes?: string | null
}

export async function createProgram(
  db: D1Database,
  actor: AdminActor,
  input: CreateProgramInput,
): Promise<{ id: number } | { conflict: 'unknown_merchant' }> {
  const merchant = await db
    .prepare('SELECT id FROM merchants WHERE id = ?')
    .bind(input.merchantId)
    .first<{ id: number }>()
  if (!merchant) return { conflict: 'unknown_merchant' }
  const inserted = await db
    .prepare(
      `INSERT INTO affiliate_programs
         (merchant_id, name, link_template, tracking_param, terms_url, status, terms_checked_at, notes)
       VALUES (?,?,?,?,?,?,?,?) RETURNING id`,
    )
    .bind(
      input.merchantId,
      input.name,
      input.linkTemplate,
      input.trackingParam ?? null,
      input.termsUrl ?? null,
      input.status ?? 'inactive',
      input.termsCheckedAt ?? null,
      input.notes ?? null,
    )
    .first<{ id: number }>()
  if (!inserted) return { conflict: 'unknown_merchant' }
  await writeAudit(db, actor, 'program.create', 'affiliate_program', inserted.id, null, {
    merchant_id: input.merchantId,
    name: input.name,
    status: input.status ?? 'inactive',
  })
  return { id: inserted.id }
}

export type UpdateProgramInput = Partial<Omit<CreateProgramInput, 'merchantId'>>

const PROGRAM_COLUMNS: Array<[keyof UpdateProgramInput, string]> = [
  ['name', 'name'],
  ['linkTemplate', 'link_template'],
  ['trackingParam', 'tracking_param'],
  ['termsUrl', 'terms_url'],
  ['status', 'status'],
  ['termsCheckedAt', 'terms_checked_at'],
  ['notes', 'notes'],
]

export async function updateProgram(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateProgramInput,
): Promise<{ ok: true } | { ok: false; reason: 'not_found' }> {
  const row = await db
    .prepare(
      `SELECT id, name, link_template, tracking_param, terms_url, status, terms_checked_at, notes
         FROM affiliate_programs WHERE id = ?`,
    )
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) return { ok: false, reason: 'not_found' }
  const sets: string[] = []
  const binds: unknown[] = []
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const [key, column] of PROGRAM_COLUMNS) {
    const value = patch[key]
    if (value === undefined) continue
    sets.push(`${column} = ?`)
    binds.push(value)
    before[column] = row[column]
    after[column] = value
  }
  if (sets.length === 0) return { ok: true }
  binds.push(id)
  await db
    .prepare(`UPDATE affiliate_programs SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...binds)
    .run()
  // Docs require high-severity marking when the link template or the
  // program status changes; there is no severity column on audit_logs,
  // so the marker travels inside after_json.
  const sensitiveChange =
    (patch.linkTemplate !== undefined && patch.linkTemplate !== row.link_template) ||
    (patch.status !== undefined && patch.status !== row.status)
  if (sensitiveChange) after.severity = 'high'
  await writeAudit(db, actor, 'program.update', 'affiliate_program', id, before, after)
  return { ok: true }
}

export type DeleteProgramResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'in_use'; offers_count: number }

export async function deleteProgram(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<DeleteProgramResult> {
  const row = await db
    .prepare('SELECT id, name FROM affiliate_programs WHERE id = ?')
    .bind(id)
    .first<{ id: number; name: string }>()
  if (!row) return { ok: false, reason: 'not_found' }
  const offers = await db
    .prepare('SELECT COUNT(*) AS n FROM offers WHERE program_id = ?')
    .bind(id)
    .first<{ n: number }>()
  const offersCount = offers?.n ?? 0
  if (offersCount > 0) return { ok: false, reason: 'in_use', offers_count: offersCount }
  await db.prepare('DELETE FROM affiliate_programs WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'program.delete', 'affiliate_program', id, { name: row.name }, null)
  return { ok: true }
}

/**
 * Render a sample outbound link from a program template. This is a
 * preview only: it stores nothing and activates nothing. The template
 * must contain the '{destination}' placeholder; the destination is
 * URL-encoded into it, and the tracking param (exactly as the admin
 * entered it, e.g. 'tag=example-20') is appended when absent.
 */
export function buildSampleLink(
  program: { link_template: string; tracking_param: string | null },
  destination: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  if (!program.link_template.includes('{destination}')) {
    return { ok: false, reason: 'Link template does not contain the {destination} placeholder.' }
  }
  let url = program.link_template.replaceAll('{destination}', encodeURIComponent(destination))
  const tracking = program.tracking_param
  if (tracking && !url.includes(tracking)) {
    url += (url.includes('?') ? '&' : '?') + tracking
  }
  try {
    new URL(url)
  } catch {
    return { ok: false, reason: 'The rendered sample link is not a valid URL.' }
  }
  return { ok: true, url }
}

/* --------------------------------- offers --------------------------------- */

export interface AdminOfferItem {
  id: number
  product_id: number
  variant_id: number | null
  merchant_id: number
  program_id: number | null
  merchant_item_ref: string | null
  destination_url: string
  currency: string
  current_price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
  licence_status: string
  validation_status: string
  last_refreshed_at: string | null
  product_slug: string
  product_name: string
  merchant_slug: string
  merchant_name: string
  price_display: { visible: boolean; reason: PriceDisplayReason; price_cents: number | null }
}

interface AdminOfferRow {
  id: number
  product_id: number
  variant_id: number | null
  merchant_id: number
  program_id: number | null
  merchant_item_ref: string | null
  destination_url: string
  currency: string
  current_price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
  licence_status: string
  validation_status: string
  last_refreshed_at: string | null
  product_slug: string
  product_name: string
  merchant_slug: string
  merchant_name: string
}

const OFFER_SELECT = `
  SELECT o.id, o.product_id, o.variant_id, o.merchant_id, o.program_id, o.merchant_item_ref,
         o.destination_url, o.currency, o.current_price_cents, o.price_observed_at,
         o.availability_state, o.licence_status, o.validation_status, o.last_refreshed_at,
         p.slug AS product_slug, p.name AS product_name,
         m.slug AS merchant_slug, m.name AS merchant_name
    FROM offers o
    JOIN products p ON p.id = o.product_id
    JOIN merchants m ON m.id = o.merchant_id`

function toAdminOffer(row: AdminOfferRow): AdminOfferItem {
  const reason = priceDisplayReason(row)
  const visible = reason === 'displayable'
  return {
    ...row,
    price_display: { visible, reason, price_cents: visible ? row.current_price_cents : null },
  }
}

export interface ListAdminOffersFilters {
  productId?: number
  merchantId?: number
  validationStatus?: string
  licenceStatus?: string
  cursor?: string | null
  limit?: number
}

export async function listAdminOffers(
  db: D1Database,
  filters: ListAdminOffersFilters = {},
): Promise<{ items: AdminOfferItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60)
  const offset = decodeCursor(filters.cursor)
  const where: string[] = []
  const binds: unknown[] = []
  if (filters.productId !== undefined) {
    where.push('o.product_id = ?')
    binds.push(filters.productId)
  }
  if (filters.merchantId !== undefined) {
    where.push('o.merchant_id = ?')
    binds.push(filters.merchantId)
  }
  if (filters.validationStatus !== undefined) {
    where.push('o.validation_status = ?')
    binds.push(filters.validationStatus)
  }
  if (filters.licenceStatus !== undefined) {
    where.push('o.licence_status = ?')
    binds.push(filters.licenceStatus)
  }
  const sql = `${OFFER_SELECT}${where.length > 0 ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY o.id DESC LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db.prepare(sql).bind(...binds).all<AdminOfferRow>()
  const hasMore = results.length > limit
  const page = hasMore ? results.slice(0, limit) : results
  return {
    items: page.map(toAdminOffer),
    nextCursor: hasMore ? encodeCursor(offset + limit) : null,
  }
}

export async function getAdminOffer(db: D1Database, id: number): Promise<AdminOfferItem | null> {
  const row = await db.prepare(`${OFFER_SELECT} WHERE o.id = ?`).bind(id).first<AdminOfferRow>()
  return row ? toAdminOffer(row) : null
}

/**
 * Every write normalises observation timestamps to the canonical SQLite
 * 'YYYY-MM-DD HH:MM:SS' (UTC) format, which the shared price policy
 * (app/lib/price-policy.ts) and SQLite's julianday() both parse identically
 * (Stage 04.2, F-08).
 *
 * Stage 04.4 (NF-3): the write path FAILS CLOSED. Only values the ONE
 * shared strict parser accepts are storable — checkOfferFields rejects
 * anything else with 'invalid_observed_at' before any SQL runs. The old
 * Date.parse fallback and store-verbatim behaviour are gone: a value
 * like a Julian-day numeric string ('2461000.5') is a valid instant to
 * SQLite's julianday() but unparseable to the JS parser, so storing it
 * let the search filter count a price the product page hid. This
 * function therefore never returns raw input: unparseable values map to
 * null (unreachable from the DAL, which rejects them first) rather than
 * being persisted as-is.
 */
export function normalizeObservedAt(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const parsed = parsePriceTimestamp(value)
  if (parsed === null) return null
  return new Date(parsed).toISOString().slice(0, 19).replace('T', ' ')
}

export interface CreateOfferInput {
  productId: number
  variantId?: number | null
  merchantId: number
  programId?: number | null
  merchantItemRef?: string | null
  destinationUrl: string
  currency?: string
  currentPriceCents?: number | null
  priceObservedAt?: string | null
  availabilityState?: string | null
  licenceStatus?: string
}

export type CreateOfferResult =
  | { id: number }
  | {
      conflict:
        | 'duplicate'
        | 'unknown_product'
        | 'unknown_merchant'
        | 'unknown_program'
        | 'unknown_variant'
        | 'invalid_destination'
        | 'invalid_currency'
        | 'invalid_price'
        | 'invalid_observed_at'
    }

/**
 * Stage 04.2 (F-04/F-06/F-07/F-12): the DAL is the choke point shared by
 * the admin API and the admin page, so the write-side invariants live here,
 * not only in the API schemas — destination URLs must pass the centralized
 * outbound policy, currency must normalize to a valid ISO 4217 code, and a
 * stored price must be a positive integer (or null: link-only).
 */
function checkOfferFields(input: {
  destinationUrl?: string
  currency?: string | null
  currentPriceCents?: number | null
  priceObservedAt?: string | null
}):
  | { conflict: 'invalid_destination' | 'invalid_currency' | 'invalid_price' | 'invalid_observed_at' }
  | { currency: string | null } {
  if (input.destinationUrl !== undefined && !validateDestinationUrl(input.destinationUrl).ok) {
    return { conflict: 'invalid_destination' }
  }
  // Stage 04.4 (NF-3): an observation timestamp is storable only if the
  // ONE shared strict parser accepts it — anything else (garbage,
  // Julian-day numeric strings, colon-less offsets, whitespace-padded
  // values) is rejected here, before any write, so the raw value can
  // never reach the row and the JS/SQLite engines can never disagree
  // about a stored timestamp. Null/undefined keep their existing
  // meaning (link-only offer / field untouched).
  if (
    input.priceObservedAt !== undefined &&
    input.priceObservedAt !== null &&
    parsePriceTimestamp(input.priceObservedAt) === null
  ) {
    return { conflict: 'invalid_observed_at' }
  }
  let currency: string | null = null
  if (input.currency !== undefined && input.currency !== null) {
    currency = normalizeCurrencyCode(input.currency)
    if (currency === null) return { conflict: 'invalid_currency' }
  }
  if (
    input.currentPriceCents !== undefined &&
    input.currentPriceCents !== null &&
    (!Number.isInteger(input.currentPriceCents) || input.currentPriceCents <= 0)
  ) {
    return { conflict: 'invalid_price' }
  }
  return { currency }
}

async function findDuplicateOffer(
  db: D1Database,
  productId: number,
  variantId: number | null,
  merchantId: number,
  excludeId?: number,
): Promise<boolean> {
  const sql = `SELECT id FROM offers
                WHERE product_id = ? AND merchant_id = ? AND variant_id IS ?${excludeId !== undefined ? ' AND id != ?' : ''}`
  const binds: unknown[] =
    excludeId !== undefined ? [productId, merchantId, variantId, excludeId] : [productId, merchantId, variantId]
  const row = await db.prepare(sql).bind(...binds).first<{ id: number }>()
  return row !== null
}

export async function createOffer(
  db: D1Database,
  actor: AdminActor,
  input: CreateOfferInput,
): Promise<CreateOfferResult> {
  const product = await db
    .prepare('SELECT id FROM products WHERE id = ?')
    .bind(input.productId)
    .first<{ id: number }>()
  if (!product) return { conflict: 'unknown_product' }
  const merchant = await db
    .prepare('SELECT id FROM merchants WHERE id = ?')
    .bind(input.merchantId)
    .first<{ id: number }>()
  if (!merchant) return { conflict: 'unknown_merchant' }
  const variantId = input.variantId ?? null
  if (variantId !== null) {
    const variant = await db
      .prepare('SELECT id, product_id FROM product_variants WHERE id = ?')
      .bind(variantId)
      .first<{ id: number; product_id: number }>()
    if (!variant || variant.product_id !== input.productId) return { conflict: 'unknown_variant' }
  }
  const programId = input.programId ?? null
  if (programId !== null) {
    const program = await db
      .prepare('SELECT id FROM affiliate_programs WHERE id = ?')
      .bind(programId)
      .first<{ id: number }>()
    if (!program) return { conflict: 'unknown_program' }
  }
  const checked = checkOfferFields({
    destinationUrl: input.destinationUrl,
    currency: input.currency ?? 'USD',
    currentPriceCents: input.currentPriceCents ?? null,
    priceObservedAt: input.priceObservedAt ?? null,
  })
  if ('conflict' in checked) return checked
  if (await findDuplicateOffer(db, input.productId, variantId, input.merchantId)) {
    return { conflict: 'duplicate' }
  }
  let inserted: { id: number } | null
  try {
    inserted = await db
      .prepare(
        `INSERT INTO offers
           (product_id, variant_id, merchant_id, program_id, merchant_item_ref, destination_url,
            currency, current_price_cents, price_observed_at, availability_state, licence_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
      )
      .bind(
        input.productId,
        variantId,
        input.merchantId,
        programId,
        input.merchantItemRef ?? null,
        input.destinationUrl,
        checked.currency ?? 'USD',
        input.currentPriceCents ?? null,
        normalizeObservedAt(input.priceObservedAt),
        input.availabilityState ?? null,
        input.licenceStatus ?? 'restricted',
      )
      .first<{ id: number }>()
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { conflict: 'duplicate' }
    throw e
  }
  if (!inserted) return { conflict: 'duplicate' }
  await writeAudit(db, actor, 'offer.create', 'offer', inserted.id, null, {
    product_id: input.productId,
    variant_id: variantId,
    merchant_id: input.merchantId,
    program_id: programId,
    destination_url: input.destinationUrl,
  })
  return { id: inserted.id }
}

export type UpdateOfferInput = Partial<CreateOfferInput>

const OFFER_COLUMNS: Array<[keyof UpdateOfferInput, string]> = [
  ['productId', 'product_id'],
  ['variantId', 'variant_id'],
  ['merchantId', 'merchant_id'],
  ['programId', 'program_id'],
  ['merchantItemRef', 'merchant_item_ref'],
  ['destinationUrl', 'destination_url'],
  ['currency', 'currency'],
  ['currentPriceCents', 'current_price_cents'],
  ['priceObservedAt', 'price_observed_at'],
  ['availabilityState', 'availability_state'],
  ['licenceStatus', 'licence_status'],
]

export async function updateOffer(
  db: D1Database,
  actor: AdminActor,
  id: number,
  patch: UpdateOfferInput,
): Promise<
  | { ok: true }
  | {
      ok: false
      reason:
        | 'not_found'
        | 'duplicate'
        | 'unknown_program'
        | 'invalid_destination'
        | 'invalid_currency'
        | 'invalid_price'
        | 'invalid_observed_at'
    }
> {
  const row = await db
    .prepare(
      `SELECT id, product_id, variant_id, merchant_id, program_id, merchant_item_ref,
              destination_url, currency, current_price_cents, price_observed_at,
              availability_state, licence_status, validation_status
         FROM offers WHERE id = ?`,
    )
    .bind(id)
    .first<Record<string, unknown>>()
  if (!row) return { ok: false, reason: 'not_found' }
  if (patch.programId !== undefined && patch.programId !== null) {
    const program = await db
      .prepare('SELECT id FROM affiliate_programs WHERE id = ?')
      .bind(patch.programId)
      .first<{ id: number }>()
    if (!program) return { ok: false, reason: 'unknown_program' }
  }
  // Stage 04.2: same write-side invariants as createOffer (DAL choke point).
  const checked = checkOfferFields({
    destinationUrl: patch.destinationUrl,
    currency: patch.currency,
    currentPriceCents: patch.currentPriceCents,
    priceObservedAt: patch.priceObservedAt,
  })
  if ('conflict' in checked) return { ok: false, reason: checked.conflict }
  const sets: string[] = []
  const binds: unknown[] = []
  const before: Record<string, unknown> = {}
  const after: Record<string, unknown> = {}
  for (const [key, column] of OFFER_COLUMNS) {
    const raw = patch[key]
    if (raw === undefined) continue
    const value =
      key === 'priceObservedAt'
        ? normalizeObservedAt(raw as string | null)
        : key === 'currency'
          ? checked.currency
          : raw
    sets.push(`${column} = ?`)
    binds.push(value)
    before[column] = row[column]
    after[column] = value
  }
  if (sets.length === 0) return { ok: true }
  // Stage 04.2 (F-01): EVERY successful offer edit invalidates the stored
  // validation verdict IN THE SAME STATEMENT — the previous verdict was
  // computed over different data, so the offer falls back to 'pending'
  // (price hidden, destination unexposed) until it is re-validated.
  sets.push("validation_status = 'pending'")
  before.validation_status = row.validation_status
  after.validation_status = 'pending'
  const productId = patch.productId ?? (row.product_id as number)
  const variantId = patch.variantId !== undefined ? patch.variantId : (row.variant_id as number | null)
  const merchantId = patch.merchantId ?? (row.merchant_id as number)
  if (await findDuplicateOffer(db, productId, variantId ?? null, merchantId, id)) {
    return { ok: false, reason: 'duplicate' }
  }
  binds.push(id)
  try {
    await db.prepare(`UPDATE offers SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run()
  } catch (e) {
    if (String(e).includes('UNIQUE')) return { ok: false, reason: 'duplicate' }
    throw e
  }
  await writeAudit(db, actor, 'offer.update', 'offer', id, before, after)
  return { ok: true }
}

export type DeleteOfferResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'in_use'; history: number }

export async function deleteOffer(
  db: D1Database,
  actor: AdminActor,
  id: number,
): Promise<DeleteOfferResult> {
  const row = await db
    .prepare('SELECT id FROM offers WHERE id = ?')
    .bind(id)
    .first<{ id: number }>()
  if (!row) return { ok: false, reason: 'not_found' }
  const history = await db
    .prepare('SELECT COUNT(*) AS n FROM price_history WHERE offer_id = ?')
    .bind(id)
    .first<{ n: number }>()
  const historyCount = history?.n ?? 0
  if (historyCount > 0) return { ok: false, reason: 'in_use', history: historyCount }
  await db.prepare('DELETE FROM offers WHERE id = ?').bind(id).run()
  await writeAudit(db, actor, 'offer.delete', 'offer', id, null, null)
  return { ok: true }
}

/**
 * Queue an offer refresh. The 'refresh-offers' queue consumer is a
 * contract no-op until Stage 06 — this only enqueues the job and
 * audits the request ('offer.refresh_queued'); no price is fetched
 * or changed here.
 */
export async function queueOfferRefresh(
  jobs: Queue,
  db: D1Database,
  actor: AdminActor,
  offerId: number,
): Promise<{ ok: boolean }> {
  const row = await db
    .prepare('SELECT id FROM offers WHERE id = ?')
    .bind(offerId)
    .first<{ id: number }>()
  if (!row) return { ok: false }
  await jobs.send({ job: 'refresh-offers', offerId })
  await writeAudit(db, actor, 'offer.refresh_queued', 'offer', offerId, null, {
    job: 'refresh-offers',
  })
  return { ok: true }
}

/* ------------------------------ source records ----------------------------- */

/**
 * Source records are read-only in this stage (the import pipeline is
 * Stage 06). Listings deliberately exclude the normalised_json /
 * licence_json bodies — those are detail-only.
 */
export interface SourceListItem {
  id: number
  source_id: string
  external_ref: string | null
  validation_status: string
  promoted_product_id: number | null
  created_at: string
  raw_hash: string | null
}

export interface SourceDetail extends SourceListItem {
  normalised_json: string | null
  licence_json: string | null
}

export interface ListSourcesFilters {
  sourceId?: string
  validationStatus?: string
  cursor?: string | null
  limit?: number
}

export async function listSources(
  db: D1Database,
  filters: ListSourcesFilters = {},
): Promise<{ items: SourceListItem[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(filters.limit ?? 24, 1), 60)
  const offset = decodeCursor(filters.cursor)
  const where: string[] = []
  const binds: unknown[] = []
  if (filters.sourceId !== undefined) {
    where.push('source_id = ?')
    binds.push(filters.sourceId)
  }
  if (filters.validationStatus !== undefined) {
    where.push('validation_status = ?')
    binds.push(filters.validationStatus)
  }
  const sql = `SELECT id, source_id, external_ref, validation_status, promoted_product_id, created_at, raw_hash
                 FROM source_records${where.length > 0 ? ` WHERE ${where.join(' AND ')}` : ''}
                ORDER BY id DESC LIMIT ? OFFSET ?`
  binds.push(limit + 1, offset)
  const { results } = await db.prepare(sql).bind(...binds).all<SourceListItem>()
  const hasMore = results.length > limit
  const page = hasMore ? results.slice(0, limit) : results
  return { items: page, nextCursor: hasMore ? encodeCursor(offset + limit) : null }
}

export async function getSource(db: D1Database, id: number): Promise<SourceDetail | null> {
  return db
    .prepare(
      `SELECT id, source_id, external_ref, raw_hash, normalised_json, licence_json,
              validation_status, promoted_product_id, created_at
         FROM source_records WHERE id = ?`,
    )
    .bind(id)
    .first<SourceDetail>()
}
