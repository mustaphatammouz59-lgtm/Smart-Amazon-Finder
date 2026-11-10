import { describe, expect, it } from 'vitest'
import {
  COMPARE_KEY,
  FAVORITES_KEY,
  MAX_COMPARE,
  MAX_FAVORITES,
  isValidSlug,
  parseList,
  serializeList,
  toggleInList,
} from '../app/lib/client-lists'

describe('constants', () => {
  it('exposes the versioned storage keys and caps', () => {
    expect(FAVORITES_KEY).toBe('saf:favorites:v1')
    expect(COMPARE_KEY).toBe('saf:compare:v1')
    expect(MAX_FAVORITES).toBe(100)
    expect(MAX_COMPARE).toBe(4)
  })
})

describe('isValidSlug', () => {
  it('accepts lowercase hyphenated slugs', () => {
    expect(isValidSlug('keyboard')).toBe(true)
    expect(isValidSlug('quiet-mechanical-keyboard-2')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
  })

  it('rejects malformed slugs and non-strings', () => {
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug('Keyboard')).toBe(false)
    expect(isValidSlug('-keyboard')).toBe(false)
    expect(isValidSlug('keyboard-')).toBe(false)
    expect(isValidSlug('key--board')).toBe(false)
    expect(isValidSlug('key_board')).toBe(false)
    expect(isValidSlug('key board')).toBe(false)
    expect(isValidSlug(42)).toBe(false)
    expect(isValidSlug(null)).toBe(false)
    expect(isValidSlug(undefined)).toBe(false)
  })
})

describe('parseList', () => {
  it('returns [] for null', () => {
    expect(parseList(null, MAX_FAVORITES)).toEqual([])
  })

  it('returns [] for garbage JSON', () => {
    expect(parseList('not json', MAX_FAVORITES)).toEqual([])
    expect(parseList('{broken', MAX_FAVORITES)).toEqual([])
    expect(parseList('', MAX_FAVORITES)).toEqual([])
  })

  it('returns [] for non-array JSON', () => {
    expect(parseList('"just-a-string"', MAX_FAVORITES)).toEqual([])
    expect(parseList('{"slug":"a"}', MAX_FAVORITES)).toEqual([])
    expect(parseList('42', MAX_FAVORITES)).toEqual([])
    expect(parseList('null', MAX_FAVORITES)).toEqual([])
  })

  it('keeps valid slugs in order', () => {
    expect(parseList('["b-item","a-item","c"]', MAX_FAVORITES)).toEqual(['b-item', 'a-item', 'c'])
  })

  it('de-duplicates, preserving first occurrence order', () => {
    expect(parseList('["a","b","a","c","b"]', MAX_FAVORITES)).toEqual(['a', 'b', 'c'])
  })

  it('filters out invalid slugs and non-string entries', () => {
    expect(parseList('["ok-one","Bad Slug","also--bad",42,null,"ok-two",""]', MAX_FAVORITES)).toEqual([
      'ok-one',
      'ok-two',
    ])
  })

  it('truncates to the cap', () => {
    expect(parseList('["a","b","c","d","e"]', MAX_COMPARE)).toEqual(['a', 'b', 'c', 'd'])
    expect(parseList('["a","b"]', 1)).toEqual(['a'])
    expect(parseList('["a","b"]', 0)).toEqual([])
  })
})

describe('serializeList', () => {
  it('serializes to a JSON array string', () => {
    expect(serializeList(['a', 'b-c'])).toBe('["a","b-c"]')
    expect(serializeList([])).toBe('[]')
  })

  it('round-trips through parseList', () => {
    const slugs = ['first-product', 'second-product', 'third']
    expect(parseList(serializeList(slugs), MAX_FAVORITES)).toEqual(slugs)
    expect(parseList(serializeList([]), MAX_FAVORITES)).toEqual([])
  })
})

describe('toggleInList', () => {
  it('adds an absent slug', () => {
    const result = toggleInList(['a'], 'b', MAX_COMPARE)
    expect(result).toEqual({ list: ['a', 'b'], added: true, capped: false })
  })

  it('adds to an empty list', () => {
    expect(toggleInList([], 'a', MAX_COMPARE)).toEqual({ list: ['a'], added: true, capped: false })
  })

  it('removes a present slug, preserving the order of the rest', () => {
    const result = toggleInList(['a', 'b', 'c'], 'b', MAX_COMPARE)
    expect(result).toEqual({ list: ['a', 'c'], added: false, capped: false })
  })

  it('removes even when the list is at cap', () => {
    const full = ['a', 'b', 'c', 'd']
    const result = toggleInList(full, 'c', MAX_COMPARE)
    expect(result).toEqual({ list: ['a', 'b', 'd'], added: false, capped: false })
  })

  it('reports capped and leaves the list unchanged when adding beyond the cap', () => {
    const full = ['a', 'b', 'c', 'd']
    const result = toggleInList(full, 'e', MAX_COMPARE)
    expect(result).toEqual({ list: ['a', 'b', 'c', 'd'], added: false, capped: true })
    expect(result.list).not.toBe(full)
  })

  it('leaves the list unchanged for an invalid slug', () => {
    const result = toggleInList(['a'], 'Not A Slug', MAX_COMPARE)
    expect(result).toEqual({ list: ['a'], added: false, capped: false })
    expect(toggleInList(['a'], '', MAX_COMPARE).added).toBe(false)
  })

  it('does not mutate the input list', () => {
    const input = ['a', 'b']
    toggleInList(input, 'c', MAX_COMPARE)
    toggleInList(input, 'a', MAX_COMPARE)
    expect(input).toEqual(['a', 'b'])
  })
})
