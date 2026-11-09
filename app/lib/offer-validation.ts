import { writeAudit, type AdminActor } from './db/admin'
import {
  evaluatePriceDisplay,
  isValidCurrencyCode,
  parsePriceTimestamp,
  type PriceDisplayReason,
} from './price-policy'
import { validateDestinationUrl } from './url-policy'

/**
 * Offer price-display + validation logic (Stage 04).
 *
 * Stage 04.2 (audit F-02/F-06/F-07/F-08): priceDisplayReason NO LONGER
 * mirrors applyPricePolicy by hand — both delegate to the single shared
 * implementation, evaluatePriceDisplay in app/lib/price-policy.ts, which
 * the SQL search filter also mirrors. The admin UI uses the reason to
 * explain why a stored price is (or is not) shown publicly — the value
 * itself is never exposed by the public API when the reason is not
 * 'displayable'.
 */

export type { PriceDisplayReason } from './price-policy'

export function priceDisplayReason(
  row: {
    current_price_cents: number | null
    price_observed_at: string | null
    licence_status: string
    validation_status: string
    currency: string
  },
  now: number = Date.now(),
): PriceDisplayReason {
  return evaluatePriceDisplay(row, now).reason
}

export interface OfferValidationIssue {
  field: string
  code: string
  severity: 'error' | 'warning'
  message: string
}

export interface OfferValidation {
  status: 'passed' | 'failed'
  issues: OfferValidationIssue[]
  checkedAt: string
  /**
   * Stage 04.4 (NF-2): set by runOfferValidation / commitOfferValidation
   * only (the pure read validateOffer leaves it undefined). Same contract
   * as product validation: 'persisted' means the verdict was written,
   * atomically confirmed against the inputs it was computed over;
   * 'data_changed_retry_required' means a validation input changed
   * mid-run and the verdict was discarded without writing anything.
   */
  persistence?: 'persisted' | 'data_changed_retry_required'
}

interface OfferCheckRow {
  id: number
  product_id: number
  merchant_id: number
  program_id: number | null
  destination_url: string
  currency: string
  current_price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
  licence_status: string
}

/**
 * Stage 04.4 (NF-2): the complete set of values the offer verdict is
 * computed over, captured by one read pass — the offer row's fields plus
 * merchant/product existence and the linked program's status. The
 * verdict may only be persisted while every value still holds (see
 * commitOfferValidation). `updated_at` is not used as a token: SQLite
 * timestamps have one-second resolution and could collide across two
 * distinct states; the inputs themselves cannot.
 */
export interface OfferValidationSnapshot {
  destinationUrl: string
  merchantId: number
  merchantExists: boolean
  productId: number
  productExists: boolean
  programId: number | null
  programStatus: string | null
  currency: string
  currentPriceCents: number | null
  priceObservedAt: string | null
  availabilityState: string | null
  licenceStatus: string
}

interface OfferInputs {
  offer: OfferCheckRow
  snapshot: OfferValidationSnapshot
}

async function readOfferInputs(db: D1Database, offerId: number): Promise<OfferInputs | null> {
  const offer = await db
    .prepare(
      `SELECT id, product_id, merchant_id, program_id, destination_url, currency,
              current_price_cents, price_observed_at, availability_state, licence_status
         FROM offers WHERE id = ?`,
    )
    .bind(offerId)
    .first<OfferCheckRow>()
  if (!offer) return null
  const merchant = await db
    .prepare('SELECT id FROM merchants WHERE id = ?')
    .bind(offer.merchant_id)
    .first<{ id: number }>()
  const product = await db
    .prepare('SELECT id FROM products WHERE id = ?')
    .bind(offer.product_id)
    .first<{ id: number }>()
  let programStatus: string | null = null
  if (offer.program_id !== null) {
    const program = await db
      .prepare('SELECT id, status FROM affiliate_programs WHERE id = ?')
      .bind(offer.program_id)
      .first<{ id: number; status: string }>()
    programStatus = program?.status ?? null
  }
  return {
    offer,
    snapshot: {
      destinationUrl: offer.destination_url,
      merchantId: offer.merchant_id,
      merchantExists: merchant !== null,
      productId: offer.product_id,
      productExists: product !== null,
      programId: offer.program_id,
      programStatus,
      currency: offer.currency,
      currentPriceCents: offer.current_price_cents,
      priceObservedAt: offer.price_observed_at,
      availabilityState: offer.availability_state,
      licenceStatus: offer.licence_status,
    },
  }
}

function offerIssues(inputs: OfferInputs): OfferValidationIssue[] {
  const { offer, snapshot } = inputs
  const issues: OfferValidationIssue[] = []
  const error = (field: string, code: string, message: string) =>
    issues.push({ field, code, severity: 'error', message })
  const warning = (field: string, code: string, message: string) =>
    issues.push({ field, code, severity: 'warning', message })

  // Stage 04.2 (F-04): the full centralized destination policy, not just a
  // protocol sniff — javascript:/data:/http:, embedded credentials,
  // localhost and private-network hosts all fail validation.
  const destination = validateDestinationUrl(offer.destination_url)
  if (!destination.ok) {
    error(
      'destination_url',
      'invalid_url',
      `Destination URL is not an allowed public https URL (${destination.reason}).`,
    )
  }

  if (!snapshot.merchantExists) {
    error('merchant_id', 'merchant_missing', 'The referenced merchant does not exist.')
  }

  if (!snapshot.productExists) {
    error('product_id', 'product_missing', 'The referenced product does not exist.')
  }

  const price = offer.current_price_cents
  if (price !== null && price !== undefined) {
    if (offer.licence_status !== 'licensed') {
      error(
        'current_price_cents',
        'price_unlicensed',
        'A price is stored but the licence status does not permit price display.',
      )
    }
    if (offer.price_observed_at === null) {
      error(
        'price_observed_at',
        'price_without_observed_at',
        'A price is stored without an observation timestamp.',
      )
    } else {
      // Stage 04.2 (F-02/F-08): the shared strict parser — an unparseable
      // or future observation is a data error, never "fresh".
      const parsed = parsePriceTimestamp(offer.price_observed_at)
      if (parsed === null) {
        error(
          'price_observed_at',
          'price_observed_at_invalid',
          'The observation timestamp cannot be parsed.',
        )
      } else if (parsed > Date.now()) {
        error(
          'price_observed_at',
          'price_observed_in_future',
          'The observation timestamp is in the future.',
        )
      }
    }
    if (price < 0) {
      error('current_price_cents', 'negative_price', 'Price must not be negative.')
    }
    if (price === 0) {
      error('current_price_cents', 'zero_price', 'A stored price of zero is not a real price (F-06).')
    }
  }
  if (!isValidCurrencyCode(offer.currency)) {
    error('currency', 'invalid_currency', 'Currency must be a three-letter uppercase code.')
  }

  if (price === null || price === undefined) {
    warning('current_price_cents', 'no_price', 'No price stored; this offer is link-only.')
  }
  if (offer.availability_state === null || offer.availability_state === 'unknown') {
    warning('availability_state', 'availability_unknown', 'Availability is unknown.')
  }
  if (offer.program_id !== null) {
    if (snapshot.programStatus !== 'active') {
      warning('program_id', 'program_inactive', 'The linked affiliate program is not active.')
    }
  }

  return issues
}

/**
 * Validate one offer against the compliance rules. Returns null when the
 * offer does not exist. Errors fail validation; warnings (link-only
 * offers, unknown availability, inactive program) do not — a null price
 * is the expected state of the link-only model.
 */
export async function validateOffer(
  db: D1Database,
  offerId: number,
): Promise<OfferValidation | null> {
  const begun = await beginOfferValidation(db, offerId)
  return begun ? begun.validation : null
}

/**
 * Phase 1 of an offer validation run (Stage 04.4, NF-2): capture the
 * input snapshot and compute the verdict over exactly that snapshot.
 * Exported so the begin → concurrent edit → commit interleaving is
 * directly testable against the real DAL; runOfferValidation is the
 * begin+commit composition used by every caller.
 */
export interface BegunOfferValidation {
  validation: OfferValidation
  snapshot: OfferValidationSnapshot
}

export async function beginOfferValidation(
  db: D1Database,
  offerId: number,
): Promise<BegunOfferValidation | null> {
  const inputs = await readOfferInputs(db, offerId)
  if (!inputs) return null
  const issues = offerIssues(inputs)
  const status = issues.some((i) => i.severity === 'error') ? 'failed' : 'passed'
  return {
    validation: { status, issues, checkedAt: new Date().toISOString() },
    snapshot: inputs.snapshot,
  }
}

/**
 * Phase 2 of an offer validation run (Stage 04.4, NF-2): persist the
 * begun verdict ONLY if every input in the snapshot still holds — the
 * same conditional-UPDATE construction as commitProductValidation.
 * One statement, atomic in SQLite/D1: the offer row's verdict-relevant
 * columns (null-safe `IS`), merchant/product existence, and the linked
 * program's status are re-stated as the WHERE clause, so an edit that
 * landed mid-run (updateOffer itself resets the verdict to 'pending' in
 * its own statement) makes the predicate miss and the stale verdict is
 * discarded rather than written over the edit. The run is audited either
 * way, with the persistence outcome recorded, so the audit trail never
 * claims a discarded verdict was stored.
 */
export async function commitOfferValidation(
  db: D1Database,
  actor: AdminActor,
  offerId: number,
  begun: BegunOfferValidation,
): Promise<OfferValidation> {
  const { validation, snapshot } = begun
  const result = await db
    .prepare(
      `UPDATE offers SET validation_status = ?
        WHERE id = ?
          AND destination_url IS ?
          AND merchant_id IS ?
          AND product_id IS ?
          AND program_id IS ?
          AND currency IS ?
          AND current_price_cents IS ?
          AND price_observed_at IS ?
          AND availability_state IS ?
          AND licence_status IS ?
          AND (EXISTS (SELECT 1 FROM merchants WHERE id = offers.merchant_id)) = ?
          AND (EXISTS (SELECT 1 FROM products WHERE id = offers.product_id)) = ?
          AND (SELECT status FROM affiliate_programs WHERE id = offers.program_id) IS ?`,
    )
    .bind(
      validation.status,
      offerId,
      snapshot.destinationUrl,
      snapshot.merchantId,
      snapshot.productId,
      snapshot.programId,
      snapshot.currency,
      snapshot.currentPriceCents,
      snapshot.priceObservedAt,
      snapshot.availabilityState,
      snapshot.licenceStatus,
      snapshot.merchantExists ? 1 : 0,
      snapshot.productExists ? 1 : 0,
      snapshot.programStatus,
    )
    .run()
  const persisted = result.meta.changes > 0
  await writeAudit(db, actor, 'offer.validate', 'offer', offerId, null, {
    validation_status: validation.status,
    checkedAt: validation.checkedAt,
    issues: validation.issues,
    persistence: persisted ? 'persisted' : 'data_changed_retry_required',
  })
  return {
    ...validation,
    persistence: persisted ? 'persisted' : 'data_changed_retry_required',
  }
}

/**
 * Run validation, persist the outcome on offers.validation_status, and
 * audit it ('offer.validate'). Returns null when the offer is missing.
 */
export async function runOfferValidation(
  db: D1Database,
  actor: AdminActor,
  offerId: number,
): Promise<OfferValidation | null> {
  const begun = await beginOfferValidation(db, offerId)
  if (!begun) return null
  return commitOfferValidation(db, actor, offerId, begun)
}
