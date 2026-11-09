/**
 * Stage 04.2 — the ONE shared price-display policy (audit F-02/F-06/F-07/F-08).
 *
 * Before this module the freshness rule existed three times: the public
 * policy in db/offers.ts, the admin explanation in offer-validation.ts, and
 * the SQL filter in db/search.ts. They disagreed: a future observation
 * counted as fresh forever in all three; the JS paths parsed timestamps with
 * `Date.parse(x + 'Z')`, which returns NaN for real ISO 8601 values that
 * already carry a zone, while SQLite's julianday() parses them fine; a
 * negative price displayed; and currency validity was enforced only by the
 * API schemas, never here.
 *
 * Now every surface uses this module:
 *   - public display:  db/offers.ts applyPricePolicy()
 *   - admin explain:   offer-validation.ts priceDisplayReason()
 *   - offer validation: offer-validation.ts validateOffer()
 *   - SQL search:      db/search.ts mirrors freshnessSqlCondition() and the
 *                      two are pinned to agree by tests/security/price-policy.
 *
 * A price may display only when ALL of these hold:
 *   - a positive integer price is present (0 and negatives are not prices);
 *   - the price use is licensed;
 *   - the offer's stored validation_status is 'passed';
 *   - the currency is a syntactically valid uppercase ISO 4217 code;
 *   - the observation timestamp parses AND is neither in the future NOR
 *     older than PRICE_FRESHNESS_MS (24 h). Future data is never fresh.
 */
import { PRICE_FRESHNESS_MS } from './db/types'

const TIMESTAMP_SHAPE =
  /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?\s*(Z|[+-]\d{2}:\d{2})?$/

/**
 * Strictly parse a stored observation timestamp to epoch milliseconds.
 *
 * The accepted grammar and the arithmetic deliberately MIRROR SQLite's
 * julianday() — verified empirically against the same SQLite build the
 * test adapter and D1 run — because the JS policy and the SQL search
 * filter must return identical verdicts for every stored value (F-08):
 *   - shapes: `YYYY-MM-DD[ T]HH:MM[:SS[.fff]]` with optional `Z` or
 *     `±HH:MM` zone (zone-less values are UTC, exactly as SQLite reads
 *     them); seconds default to 0; a colon-less offset is rejected, as
 *     SQLite rejects it;
 *   - ranges: month 1–12, day 1–31, hour 0–24, minute/second 0–59 —
 *     outside these, julianday() is NULL and this returns null (fail
 *     closed: null is never fresh);
 *   - in-range overflow (Feb 30, Apr 31, hour 24) is computed
 *     arithmetically by julianday(); Date arithmetic rolls identically,
 *     so both engines land on the same instant.
 * The canonical stored form (written by normalizeObservedAt and by
 * SQLite's datetime('now')) is `YYYY-MM-DD HH:MM:SS` in UTC.
 */
export function parsePriceTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  // No trimming: julianday() also returns NULL for whitespace-padded
  // values, and stored values are normalized (or garbage) by the write
  // path — strictness here is what keeps the engines in agreement.
  const m = TIMESTAMP_SHAPE.exec(value)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  const hour = Number(m[4])
  const minute = Number(m[5])
  const second = m[6] === undefined ? 0 : Number(m[6])
  const fracMs = m[7] ? Math.round(Number(`0.${m[7]}`) * 1000) : 0
  if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 24 || minute > 59 || second > 59) {
    return null
  }
  // setUTCFullYear (not Date.UTC) so years 0–99 are not shifted to 19xx.
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(hour, minute, second, fracMs)
  let ms = date.getTime()
  const zone = m[8]
  if (zone && zone !== 'Z') {
    const sign = zone.startsWith('-') ? -1 : 1
    const offHours = Number(zone.slice(1, 3))
    const offMinutes = Number(zone.slice(4, 6))
    if (offHours > 23 || offMinutes > 59) return null
    ms -= sign * (offHours * 60 + offMinutes) * 60_000
  }
  return ms
}

/**
 * SQL mirror of the freshness window for one offers row alias, kept next to
 * the JS rule so the two cannot silently drift: julianday() yields NULL for
 * unparseable text (→ row excluded), and the BETWEEN bounds reject both
 * stale and future observations, exactly like isPriceFresh below.
 */
export function freshnessSqlCondition(alias: string): string {
  return `(${alias}.price_observed_at IS NOT NULL
     AND (julianday('now') - julianday(${alias}.price_observed_at)) * ${PRICE_FRESHNESS_MS} BETWEEN 0 AND ${PRICE_FRESHNESS_MS})`
}

/** True iff the timestamp parses and 0 <= now - observed <= 24 h. */
export function isPriceFresh(observedAt: string | null | undefined, now: number = Date.now()): boolean {
  const parsed = parsePriceTimestamp(observedAt)
  if (parsed === null) return false
  const age = now - parsed
  return age >= 0 && age <= PRICE_FRESHNESS_MS
}

/** Syntactic ISO 4217: exactly three uppercase ASCII letters. */
export function isValidCurrencyCode(code: string | null | undefined): boolean {
  return typeof code === 'string' && /^[A-Z]{3}$/.test(code)
}

/** Normalize an operator-typed currency for storage, or null when invalid. */
export function normalizeCurrencyCode(code: string | null | undefined): string | null {
  if (typeof code !== 'string') return null
  const normalized = code.trim().toUpperCase()
  return isValidCurrencyCode(normalized) ? normalized : null
}

export type PriceDisplayReason =
  | 'no_price'
  | 'invalid_price'
  | 'unlicensed'
  | 'unvalidated'
  | 'invalid_currency'
  | 'invalid_timestamp'
  | 'future_timestamp'
  | 'stale'
  | 'displayable'

export interface PriceBearingRow {
  current_price_cents: number | null
  price_observed_at: string | null
  licence_status: string
  validation_status: string
  currency: string
}

export interface PriceDisplayDecision {
  displayable: boolean
  reason: PriceDisplayReason
}

/**
 * The single decision procedure behind public display and admin explanation.
 * `now` is injectable so boundary tests run against a fixed clock.
 */
export function evaluatePriceDisplay(
  row: PriceBearingRow,
  now: number = Date.now(),
): PriceDisplayDecision {
  if (row.current_price_cents === null || row.current_price_cents === undefined) {
    return { displayable: false, reason: 'no_price' }
  }
  if (row.current_price_cents === 0) return { displayable: false, reason: 'no_price' }
  if (row.current_price_cents < 0) return { displayable: false, reason: 'invalid_price' }
  if (row.licence_status !== 'licensed') return { displayable: false, reason: 'unlicensed' }
  if (row.validation_status !== 'passed') return { displayable: false, reason: 'unvalidated' }
  if (!isValidCurrencyCode(row.currency)) return { displayable: false, reason: 'invalid_currency' }
  const parsed = parsePriceTimestamp(row.price_observed_at)
  if (parsed === null) return { displayable: false, reason: 'invalid_timestamp' }
  if (parsed > now) return { displayable: false, reason: 'future_timestamp' }
  if (now - parsed > PRICE_FRESHNESS_MS) return { displayable: false, reason: 'stale' }
  return { displayable: true, reason: 'displayable' }
}
