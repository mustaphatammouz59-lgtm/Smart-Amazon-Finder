/**
 * Anonymous, client-side product lists (favorites + comparison).
 *
 * Limitations — stated honestly, by design (Stage 05.1, owner decisions):
 * - Per-browser and per-device only: a list saved here is not visible in
 *   another browser, on another device, or in a private/incognito session
 *   after that session ends.
 * - No sync and no account: there is no server copy, no sign-in, and no
 *   way to recover a list from elsewhere.
 * - Lost when site data is cleared: clearing cookies/site data for this
 *   origin, or the browser evicting storage, deletes both lists.
 * - Slugs only, no personal data: the stored value is a JSON array of
 *   product slugs (e.g. "quiet-mechanical-keyboard"). No names, emails,
 *   identifiers, or browsing history are collected or sent anywhere by
 *   this module; product details are fetched per slug from the public
 *   catalog API when a list is viewed.
 * - Storage can fail silently (private mode, quota, disabled storage):
 *   reads then behave as an empty list and writes are dropped, so the
 *   in-memory UI state for the current page view still works.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const FAVORITES_KEY = 'saf:favorites:v1'
export const COMPARE_KEY = 'saf:compare:v1'
export const MAX_FAVORITES = 100
export const MAX_COMPARE = 4

/** Window event dispatched in the same tab whenever a list is saved/cleared. */
export const LISTS_CHANGED_EVENT = 'saf:lists-changed'

// ---------------------------------------------------------------------------
// Pure logic (DOM-free, unit-testable)
// ---------------------------------------------------------------------------

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function isValidSlug(s: unknown): s is string {
  return typeof s === 'string' && SLUG_PATTERN.test(s)
}

/**
 * Parse a raw stored value into a clean slug list: invalid JSON or a
 * non-array yields []; entries are filtered to valid slugs, de-duplicated
 * (first occurrence wins, order preserved), and truncated to `cap`.
 */
export function parseList(raw: string | null, cap: number): string[] {
  if (raw === null) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const entry of parsed) {
    if (out.length >= cap) break
    if (!isValidSlug(entry) || seen.has(entry)) continue
    seen.add(entry)
    out.push(entry)
  }
  return out
}

export function serializeList(slugs: string[]): string {
  return JSON.stringify(slugs)
}

export interface ToggleResult {
  list: string[]
  added: boolean
  capped: boolean
}

/**
 * Toggle `slug` in `list` subject to `cap`.
 * - Present slug -> removed (added: false, capped: false).
 * - Absent slug with room -> appended (added: true, capped: false).
 * - Absent slug at cap -> list unchanged (added: false, capped: true).
 * - Invalid slug -> list unchanged (added: false, capped: false).
 * Never mutates the input list.
 */
export function toggleInList(list: string[], slug: string, cap: number): ToggleResult {
  if (!isValidSlug(slug)) return { list: [...list], added: false, capped: false }
  if (list.includes(slug)) {
    return { list: list.filter((s) => s !== slug), added: false, capped: false }
  }
  if (list.length >= cap) return { list: [...list], added: false, capped: true }
  return { list: [...list, slug], added: true, capped: false }
}

// ---------------------------------------------------------------------------
// Browser wrappers (thin over the pure functions; storage may throw)
// ---------------------------------------------------------------------------

export function loadList(key: string, cap: number): string[] {
  try {
    return parseList(globalThis.localStorage.getItem(key), cap)
  } catch {
    return []
  }
}

export function saveList(key: string, slugs: string[]): void {
  try {
    globalThis.localStorage.setItem(key, serializeList(slugs))
  } catch {
    // Private mode / quota / storage disabled: fail silently. Callers keep
    // their in-memory state, so the current page view still behaves.
  }
  notifyListsChanged()
}

export function notifyListsChanged(): void {
  try {
    if (typeof globalThis.window !== 'undefined') {
      globalThis.window.dispatchEvent(new Event(LISTS_CHANGED_EVENT))
    }
  } catch {
    // No window (SSR) or dispatch unavailable — nothing to notify.
  }
}

/**
 * Subscribe to list changes from any source: the `storage` event (other
 * tabs) and the custom same-tab event dispatched by `saveList` /
 * `notifyListsChanged`. Returns an unsubscribe function. Safe to call
 * outside a browser (returns a no-op unsubscribe).
 */
export function subscribeLists(callback: () => void): () => void {
  if (typeof globalThis.window === 'undefined') return () => {}
  const handler = () => callback()
  globalThis.window.addEventListener('storage', handler)
  globalThis.window.addEventListener(LISTS_CHANGED_EVENT, handler)
  return () => {
    globalThis.window.removeEventListener('storage', handler)
    globalThis.window.removeEventListener(LISTS_CHANGED_EVENT, handler)
  }
}
