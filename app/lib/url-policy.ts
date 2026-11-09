/**
 * Stage 04.2 — centralized outbound destination URL policy (audit F-04).
 *
 * Before this module, offer creation accepted any value zod's `.url()`
 * parses — including `javascript:alert(1)`, which the DAL stored and the
 * public API then served as a product's destination_url. Every write path
 * (admin API schemas, admin page via the DAL, offer validation, and the
 * public read) now applies this one policy:
 *
 *   - scheme: https only (public outbound links);
 *   - no embedded credentials (user:pass@host);
 *   - hostname must not be localhost (in any spelling, including the
 *     trailing-dot form `localhost.`), a `.localhost` name, or a private /
 *     reserved / link-local / multicast IP literal (this app never fetches
 *     the URL, so this is defence-in-depth for anything that ever does, and
 *     it keeps internal addresses out of public pages);
 *   - port: absent or 443 only;
 *   - affiliate tracking parameters and punycode hosts stay allowed —
 *     they are the legitimate shape of merchant destinations.
 */

export type UrlPolicyRejection =
  | 'malformed'
  | 'not_https'
  | 'embedded_credentials'
  | 'forbidden_host'
  | 'forbidden_port'

export type UrlPolicyResult = { ok: true; normalized: string } | { ok: false; reason: UrlPolicyRejection }

const IPV4_SHAPE = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/

function isForbiddenIpv4(host: string): boolean {
  const m = IPV4_SHAPE.exec(host)
  if (!m) return false
  const [a, b] = [Number(m[1]), Number(m[2])]
  if ([m[1], m[2], m[3], m[4]].some((part) => Number(part) > 255)) return true // malformed octet: fail closed
  return (
    a === 0 || // "this" network / unspecified
    a === 10 || // private
    a === 127 || // loopback
    (a === 172 && b >= 16 && b <= 31) || // private
    (a === 192 && b === 168) || // private
    (a === 169 && b === 254) || // link-local (cloud metadata)
    a >= 224 // multicast / reserved
  )
}

/**
 * Parse a serialized IPv6 literal (brackets already stripped) into its
 * eight 16-bit groups, or null when the shape is not a well-formed
 * literal. Classification must be numeric: the WHATWG parser serializes
 * embedded IPv4 addresses as hex groups — `[::ffff:127.0.0.1]` arrives
 * here as `::ffff:7f00:1` — so any string-prefix or dotted-quad matching
 * over the serialized form silently misses mapped/compatible addresses
 * (Stage 04.3, NF-1). A trailing dotted-quad (kept by some parsers) is
 * first expanded to its two hex groups so both spellings classify alike.
 */
function parseIpv6Groups(host: string): number[] | null {
  let h = host
  const v4 = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(h)
  if (v4) {
    const [a, b, c, d] = [Number(v4[1]), Number(v4[2]), Number(v4[3]), Number(v4[4])]
    if (a > 255 || b > 255 || c > 255 || d > 255) return null
    const hi = ((a << 8) | b).toString(16)
    const lo = ((c << 8) | d).toString(16)
    h = `${h.slice(0, v4.index)}${hi}:${lo}`
  }
  const halves = h.split('::')
  if (halves.length > 2) return null
  const parseSide = (side: string): number[] | null => {
    if (side === '') return []
    const groups: number[] = []
    for (const part of side.split(':')) {
      if (!/^[0-9a-f]{1,4}$/.test(part)) return null
      groups.push(parseInt(part, 16))
    }
    return groups
  }
  const left = parseSide(halves[0])
  if (left === null) return null
  if (halves.length === 1) return left.length === 8 ? left : null
  const right = parseSide(halves[1])
  if (right === null) return null
  const missing = 8 - left.length - right.length
  if (missing < 1) return null // '::' must compress at least one group
  return [...left, ...Array.from({ length: missing }, () => 0), ...right]
}

/** Apply the IPv4 forbidden-range rules to the address embedded in groups[at..at+1]. */
function embeddedIpv4Forbidden(groups: number[], at: number): boolean {
  const hi = groups[at]
  const lo = groups[at + 1]
  return isForbiddenIpv4(`${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`)
}

function isForbiddenIpv6(host: string): boolean {
  // url.hostname keeps the square brackets of an IPv6 literal.
  const h = host.toLowerCase().replace(/^\[|\]$/g, '')
  const groups = parseIpv6Groups(h)
  if (groups === null) return true // unparseable literal: fail closed
  const [g0, g1, g2, g3, g4, g5] = groups
  const headFiveZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0
  // Stage 04.4 (NF-1): IPv4-mapped (::ffff:0:0/96) and IPv4-compatible
  // (::/96) forms are judged by the IPv4 rules on the embedded address —
  // mapped loopback/RFC-1918/link-local/metadata are forbidden, while a
  // genuinely public mapped address (e.g. ::ffff:8.8.8.8) stays allowed.
  // The compatible branch also covers :: (0.0.0.0) and ::1 (0.0.0.1).
  if (headFiveZero && g5 === 0xffff) return embeddedIpv4Forbidden(groups, 6)
  if (headFiveZero && g5 === 0) return embeddedIpv4Forbidden(groups, 6)
  if ((g0 & 0xff00) === 0xff00) return true // multicast ff00::/8
  if ((g0 & 0xffc0) === 0xfe80) return true // link-local fe80::/10
  if ((g0 & 0xfe00) === 0xfc00) return true // unique-local fc00::/7
  return false
}

export function validateDestinationUrl(raw: string | null | undefined): UrlPolicyResult {
  if (!raw || typeof raw !== 'string') return { ok: false, reason: 'malformed' }
  const trimmed = raw.trim()
  if (trimmed.length === 0 || trimmed.length > 2048) return { ok: false, reason: 'malformed' }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, reason: 'malformed' }
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'not_https' }
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'embedded_credentials' }
  const host = url.hostname.toLowerCase()
  // Stage 04.4 (NF-1): DNS names are compared root-dot-insensitively —
  // `localhost.` and `foo.localhost.` are the same names as without the
  // trailing dot and must not slip past the localhost rules. (A trailing
  // dot on an ordinary public name stays allowed; only the comparison
  // is normalized, the URL itself is untouched.)
  const dnsName = host.endsWith('.') ? host.slice(0, -1) : host
  if (host === '' || dnsName === 'localhost' || dnsName.endsWith('.localhost')) {
    return { ok: false, reason: 'forbidden_host' }
  }
  if (isForbiddenIpv4(host)) return { ok: false, reason: 'forbidden_host' }
  if (host.includes(':') && isForbiddenIpv6(host)) return { ok: false, reason: 'forbidden_host' }
  if (url.port !== '' && url.port !== '443') return { ok: false, reason: 'forbidden_port' }
  return { ok: true, normalized: url.href }
}

/** Convenience predicate for validation/read paths that only need a boolean. */
export function isAllowedDestinationUrl(raw: string | null | undefined): boolean {
  return validateDestinationUrl(raw).ok
}
