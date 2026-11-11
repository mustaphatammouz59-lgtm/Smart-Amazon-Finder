/**
 * Stage 06.9 — shared specification display formatting.
 *
 * One formatting layer for every reader-facing spec value, used by the
 * product page and the comparison page so the two can never disagree.
 * It fixes three Stage 06.8 findings:
 *
 *  - B-13: raw controlled-vocabulary strings (snake_case enums such as
 *    `not_certified`) were rendered to readers verbatim. Every known
 *    enum now has a human label, and a generic humaniser guarantees no
 *    snake_case string can reach the page.
 *  - US customary units: measurement specs stored in metric units are
 *    displayed with the US customary equivalent alongside, e.g.
 *    "160 cm (63 in)". Storage stays metric; this is display only.
 *  - The electrical-compatibility vocabulary added in Stage 06.9
 *    (plug_type / us_compatibility) gets its reader labels here.
 *
 * Rounding rules for conversions (chosen to preserve technical meaning,
 * never to add precision the source does not have):
 *  - cm -> in: nearest 0.1 in below 10 in; nearest whole inch at/above.
 *  - kg -> lb: one decimal place.
 *  - m  -> ft: one decimal place.
 * Values whose dictionary unit is already imperial (in) or not a
 * measurement (W, J, lm, Gbps, years, ...) are never converted.
 */

/** Spec key carrying the evidenced certification-scope note (Stage 06.9). */
export const CERTIFICATION_SCOPE_KEY = 'safety_certification_scope'

const CERTIFICATION_BODY_LABELS: Record<string, string> = {
  none: 'None recorded',
}

const CERTIFICATION_STATUS_LABELS: Record<string, string> = {
  not_certified: 'Not certified',
  verified_manufacturer_documentation: 'Verified — manufacturer documentation',
  verified_certifier_database: 'Verified — certifier database',
  claimed_unverified: 'Claimed — not independently verified',
}

const PLUG_TYPE_LABELS: Record<string, string> = {
  type_a: 'Type A (North America)',
  type_b: 'Type B (North America, grounded)',
  type_c: 'Type C (Europlug)',
  type_g: 'Type G (UK)',
  type_i: 'Type I (Australia / New Zealand)',
  usb_powered: 'USB-powered (no mains plug)',
  hardwired: 'Hardwired',
  unknown: 'Not stated by the manufacturer',
}

const US_COMPATIBILITY_LABELS: Record<string, string> = {
  us_native: 'US native',
  universal_voltage_fixed_non_us_plug: 'Universal voltage, fixed non-US plug',
  non_us_electrical: 'Non-US electrical build',
  usb_powered_na: 'USB-powered — region independent',
  unknown: 'Not confirmed',
}

const DEVICE_TYPE_LABELS: Record<string, string> = {
  'phone-or-tablet': 'Phone or tablet',
  laptop: 'Laptop',
}

const ENUM_LABELS_BY_KEY: Record<string, Record<string, string>> = {
  safety_certification_body: CERTIFICATION_BODY_LABELS,
  safety_certification_status: CERTIFICATION_STATUS_LABELS,
  plug_type: PLUG_TYPE_LABELS,
  us_compatibility: US_COMPATIBILITY_LABELS,
  device_type: DEVICE_TYPE_LABELS,
}

/** Humanise a snake_case token: "some_raw_value" -> "Some raw value". */
export function humanizeEnumValue(value: string): string {
  if (!value.includes('_')) return value
  const words = value.replace(/_/g, ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Reader label for a stored text spec value. Known vocabularies map to
 * curated labels; any other value containing underscores is humanised
 * so raw enum strings never render.
 */
export function specTextLabel(key: string, value: string): string {
  const byKey = ENUM_LABELS_BY_KEY[key]
  if (byKey && value in byKey) return byKey[value]
  return humanizeEnumValue(value)
}

function trimDecimal(n: number, decimals: number): string {
  const s = n.toFixed(decimals)
  return s.includes('.') ? s.replace(/\.?0+$/, '') : s
}

/**
 * US customary equivalent for a metric measurement, or null when the
 * unit is not a convertible metric measurement unit.
 */
export function usCustomaryEquivalent(value: number, unit: string | null): string | null {
  if (unit === 'cm') {
    const inches = value / 2.54
    return inches >= 10 ? `${Math.round(inches)} in` : `${trimDecimal(inches, 1)} in`
  }
  if (unit === 'kg') {
    return `${trimDecimal(value * 2.20462, 1)} lb`
  }
  if (unit === 'm') {
    return `${trimDecimal(value * 3.28084, 1)} ft`
  }
  return null
}

export interface SpecDisplayInput {
  key: string
  unit: string | null
  value_number?: number | null
  value_text?: string | null
  /** Accepts the DAL's 0/1 integer or a plain boolean (compare API). */
  value_bool?: number | boolean | null
}

/**
 * Format one spec value for readers. Returns null when the spec holds
 * no value at all (callers decide how absence is stated).
 */
export function formatSpecDisplay(input: SpecDisplayInput): string | null {
  if (input.value_number !== null && input.value_number !== undefined) {
    const base = input.unit ? `${input.value_number} ${input.unit}` : String(input.value_number)
    const equivalent = usCustomaryEquivalent(input.value_number, input.unit)
    return equivalent ? `${base} (${equivalent})` : base
  }
  if (input.value_bool !== null && input.value_bool !== undefined) {
    return input.value_bool === 1 || input.value_bool === true ? 'Yes' : 'No'
  }
  if (input.value_text !== null && input.value_text !== undefined) {
    return specTextLabel(input.key, input.value_text)
  }
  return null
}
