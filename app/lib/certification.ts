/**
 * Stage 05.2 (R3) — structured safety-certification model.
 *
 * A single `safety_certified` boolean cannot carry the evidence this
 * catalog's compliance rules require (DATA-SOURCING-AND-COMPLIANCE.md:
 * no invented data; never infer certification from marketing wording).
 * The Stage 05.2 taxonomy therefore replaces the boolean on every
 * subcategory that carried it with three spec attributes, stored as
 * ordinary text spec values against the category's attribute
 * definitions (no schema change):
 *
 *   safety_certification_body   — certification body / mark (vocabulary below)
 *   safety_certification_id     — certifier file / control number, where published
 *   safety_certification_status — how the claim was verified (vocabulary below)
 *
 * This module is the reference implementation of the ONE derivation
 * rule that turns those recorded values into a certified/not-certified
 * answer for display, filtering and comparison:
 *
 *   certified  <=>  status is a VERIFIED status
 *                   AND body is a recognised third-party safety listing.
 *
 * A claim that exists only in marketing or marketplace copy
 * (`claimed_unverified`) NEVER counts as certified, and conformity or
 * EMC marks (CE, UKCA, FCC) are recorded factually as body values but
 * do not by themselves make a product "safety certified" — they are
 * manufacturer declarations / EMC authorisations, not third-party
 * safety listings.
 *
 * This module is deliberately not wired into the publication or
 * validation gates: certification evidence is a data-completeness and
 * presentation concern (see TAXONOMY-stage05-proposal.md §9, rule
 * VR-3). Wiring it into a gate is an ingestion-stage decision.
 */

/** Spec attribute keys used by the structured certification model. */
export const CERTIFICATION_BODY_KEY = 'safety_certification_body'
export const CERTIFICATION_ID_KEY = 'safety_certification_id'
export const CERTIFICATION_STATUS_KEY = 'safety_certification_status'

/**
 * Controlled vocabulary for `safety_certification_body`.
 * `UL`, `ETL`, `CSA`, `TUV`, `SGS` are third-party safety listings.
 * `CE` / `UKCA` are conformity markings (manufacturer declaration).
 * `FCC` is an EMC authorisation, not a safety listing.
 * `none` records that no certification was found or claimed.
 */
export const CERTIFICATION_BODIES = [
  'UL',
  'ETL',
  'CSA',
  'TUV',
  'SGS',
  'CE',
  'UKCA',
  'FCC',
  'none',
] as const
export type CertificationBody = (typeof CERTIFICATION_BODIES)[number]

/**
 * Controlled vocabulary for `safety_certification_status`, strongest
 * evidence first. A status is recorded only from evidence: a checked
 * certifier directory entry, or the manufacturer's own documentation.
 * Anything sourced from marketing/listing copy alone is
 * `claimed_unverified`.
 */
export const CERTIFICATION_STATUSES = [
  'verified_certifier_database',
  'verified_manufacturer_documentation',
  'claimed_unverified',
  'not_certified',
] as const
export type CertificationStatus = (typeof CERTIFICATION_STATUSES)[number]

/** Bodies whose listing is a third-party safety certification. */
export const CERTIFIED_BODIES: ReadonlySet<string> = new Set(['UL', 'ETL', 'CSA', 'TUV', 'SGS'])

/** Statuses backed by checkable evidence (not marketing copy). */
export const VERIFIED_STATUSES: ReadonlySet<string> = new Set([
  'verified_certifier_database',
  'verified_manufacturer_documentation',
])

export function isCertificationBody(value: string): value is CertificationBody {
  return (CERTIFICATION_BODIES as readonly string[]).includes(value)
}

export function isCertificationStatus(value: string): value is CertificationStatus {
  return (CERTIFICATION_STATUSES as readonly string[]).includes(value)
}

/**
 * The derivation rule: a product counts as safety certified only when
 * a recognised third-party safety listing is backed by a verified
 * status. Unknown/free-text values fail closed (not certified).
 */
export function isSafetyCertified(
  body: string | null | undefined,
  status: string | null | undefined,
): boolean {
  if (!body || !status) return false
  return CERTIFIED_BODIES.has(body) && VERIFIED_STATUSES.has(status)
}
