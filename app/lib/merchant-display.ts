/**
 * Stage 06.9 — merchant display names for offer cards (finding B-16).
 *
 * The merchants table stores domain strings as names ("ikea.com"), and
 * nine different IKEA country stores all rendered as "View at ikea.com".
 * This module derives an honest reader-facing name at the DISPLAY layer
 * only — merchant data is never rewritten:
 *
 *  - the brand comes from the merchant record's identity (its slug);
 *  - the region, where the destination is a regional store, comes from
 *    the offer's own destination URL (host or country path segment),
 *    i.e. from the store the link actually leads to.
 *
 * Two merchant records cannot yield an honest name from the record
 * alone and are documented in the Stage 06.9 report: `media-ergotron-com`
 * (a media CDN host, not a store) and `brd-tripplite-com` (a redirect
 * host). For those, the brand is taken from the destination domain.
 */

const BRAND_BY_MERCHANT_SLUG: Record<string, string> = {
  'anker-com': 'Anker',
  'apple-com': 'Apple',
  'belkin-com': 'Belkin',
  'benq-com': 'BenQ',
  'brd-tripplite-com': 'Tripp Lite',
  'caldigit-com': 'CalDigit',
  'comfilife-com': 'ComfiLife',
  'dell-com': 'Dell',
  'dyson-co-uk': 'Dyson',
  'ergotron-com': 'Ergotron',
  'eu-ugreen-com': 'UGREEN',
  'eustore-hermanmiller-com': 'Herman Miller',
  'ikea-cn': 'IKEA',
  'ikea-com': 'IKEA',
  'ikea-com-tr': 'IKEA',
  'ikea-com-tw': 'IKEA',
  'in-shopping-haworth-com': 'Haworth',
  'kensington-com': 'Kensington',
  'lamicallshop-com': 'Lamicall',
  'media-ergotron-com': 'Ergotron',
  'nulaxy-com': 'Nulaxy',
  'ottlite-com': 'OttLite',
  'plugable-com': 'Plugable',
  'steelcase-com': 'Steelcase',
  'store-haworth-com': 'Haworth',
  'store-hermanmiller-com': 'Herman Miller',
  'tomtoc-com': 'Tomtoc',
  'tripplite-eaton-com': 'Tripp Lite',
  'ugreen-com': 'UGREEN',
}

const IKEA_COUNTRY_LABELS: Record<string, string> = {
  ie: 'Ireland',
  at: 'Austria',
  nz: 'New Zealand',
  nl: 'Netherlands',
  sg: 'Singapore',
  th: 'Thailand',
  tw: 'Taiwan',
  in: 'India',
  ee: 'Estonia',
  mx: 'Mexico',
}

const HOST_REGIONS: Record<string, string> = {
  'ikea.com.tr': 'Türkiye',
  'ikea.cn': 'China',
  'dyson.co.uk': 'UK',
  'eu.ugreen.com': 'Europe',
  'in.shopping.haworth.com': 'India',
  'eustore.hermanmiller.com': 'Europe',
}

const PATH_LOCALE_REGIONS: [RegExp, string][] = [
  [/\/eu-en(\/|$)/, 'Europe'],
  [/\/en-au(\/|$)/, 'Australia'],
  [/\/en-sg(\/|$)/, 'Singapore'],
  [/\/en-ca(\/|$)/, 'Canada'],
  [/\/en-ph(\/|$)/, 'Philippines'],
  [/\/en-ap(\/|$)/, 'Asia-Pacific'],
  [/\/nz(\/|$)/, 'New Zealand'],
]

/** Region label for a destination URL, or null for the default (US) store. */
export function merchantRegionLabel(destinationUrl: string | null): string | null {
  if (!destinationUrl) return null
  let url: URL
  try {
    url = new URL(destinationUrl)
  } catch {
    return null
  }
  const host = url.hostname.replace(/^www\./, '')
  const hostRegion = HOST_REGIONS[host]
  if (hostRegion) return hostRegion
  if (host === 'ikea.com' || host.endsWith('.ikea.com')) {
    const segment = url.pathname.split('/').filter(Boolean)[0]
    if (segment && segment !== 'us' && segment in IKEA_COUNTRY_LABELS) {
      return IKEA_COUNTRY_LABELS[segment]
    }
    return null
  }
  for (const [pattern, label] of PATH_LOCALE_REGIONS) {
    if (pattern.test(url.pathname)) return label
  }
  return null
}

/**
 * Reader-facing merchant name for an offer card, e.g. "IKEA (Ireland)",
 * "UGREEN (Europe)", "Belkin". Falls back to the stored merchant name
 * for a merchant slug this module does not know.
 */
export function merchantDisplayName(
  merchantSlug: string,
  merchantName: string,
  destinationUrl: string | null,
): string {
  const brand = BRAND_BY_MERCHANT_SLUG[merchantSlug] ?? merchantName
  const region = merchantRegionLabel(destinationUrl)
  return region ? `${brand} (${region})` : brand
}
