/**
 * Editorial content model + sanitizer (Stage 04).
 *
 * Stored content is structured blocks, never raw HTML (SECURITY-PLAN §5 /
 * API-ARCHITECTURE §10): the CMS persists `ContentBlock[]` as JSON, and the
 * public renderer is expected to render blocks as data. React escapes text
 * at render, so block text is inert by construction; stripping tags on
 * save (sanitizeBlocks) is defence in depth against stored XSS if any
 * future renderer ever treats stored content as HTML.
 */

export type ContentBlock =
  | { type: 'heading'; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'disclosure'; text: string }
  | { type: 'quote'; text: string }

const MAX_BLOCKS = 200
const MAX_BLOCK_TEXT_CHARS = 20000
const MAX_LIST_ITEMS = 100
const MAX_LIST_ITEM_CHARS = 500
const MAX_TYPED_PRICE_MATCHES = 10

/**
 * Matches a well-formed tag (or HTML comment): `<`, an optional `/`, a tag
 * NAME, then anything up to the closing `>`. A lone `<` that does not start
 * a tag — "supports < 10 kg loads", "made with <3" — is text, not markup.
 */
const TAG_SHAPE = /<!--[\s\S]*?-->|<\/?[a-zA-Z][a-zA-Z0-9-]*(?:\s[^<>]*)?\/?>/g

/** Bidi embedding/override/isolate controls and directional marks. */
const BIDI_CONTROLS = /[\u202A-\u202E\u2066-\u2069\u200E\u200F\u061C]/g

function safeCodePoint(cp: number): string {
  if (!Number.isFinite(cp) || cp <= 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return ''
  return String.fromCodePoint(cp)
}

/**
 * Decode entities exactly once. `&amp;` is decoded LAST within the pass so
 * `&amp;lt;` becomes the text `&lt;` — it is never decoded a second time
 * into a live `<`.
 */
function decodeEntities(input: string): string {
  return input
    .replace(/&#x([0-9a-fA-F]{1,6});/g, (_m, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d{1,7});/g, (_m, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
}

/**
 * Remove every HTML tag, decode entities, and normalise line endings.
 *
 * Stage 04.2 (audit F-09/F-10): the ORDER and the tag shape both changed.
 * Entities are decoded BEFORE stripping, so entity-encoded markup
 * (`&lt;img onerror=…&gt;`) is decoded and then stripped as markup
 * instead of being stored as a literal markup string. And only
 * well-formed tags are stripped, so legitimate text containing a lone
 * `<` survives intact. Double-encoded input still decodes exactly once
 * (`&amp;lt;` → the inert text `&lt;`). Bidi control characters are
 * removed (F-17 minors) — stored editorial text has no legitimate use
 * for directional overrides.
 */
export function stripHtml(input: string): string {
  const decoded = decodeEntities(input)
  const withoutTags = decoded.replace(TAG_SHAPE, '')
  const withoutBidi = withoutTags.replace(BIDI_CONTROLS, '')
  return withoutBidi.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function invalidBlocks(): Error {
  return new Error('invalid body blocks')
}

/**
 * Validate an already-JSON-parsed value as a ContentBlock[]. Anything that
 * is not an array of known block types with string fields inside the caps
 * throws `Error('invalid body blocks')`. Unknown extra fields on a block
 * are dropped (the returned blocks are normalised copies).
 */
function textField(record: Record<string, unknown>): string {
  const text = record.text
  if (typeof text !== 'string' || text.length > MAX_BLOCK_TEXT_CHARS) throw invalidBlocks()
  return text
}

export function parseBodyBlocks(raw: unknown): ContentBlock[] {
  if (!Array.isArray(raw) || raw.length > MAX_BLOCKS) throw invalidBlocks()
  const blocks: ContentBlock[] = []
  for (const entry of raw) {
    if (typeof entry !== 'object' || entry === null) throw invalidBlocks()
    const record = entry as Record<string, unknown>
    const type = record.type
    if (type === 'heading') {
      blocks.push({ type: 'heading', text: textField(record) })
    } else if (type === 'paragraph') {
      blocks.push({ type: 'paragraph', text: textField(record) })
    } else if (type === 'disclosure') {
      blocks.push({ type: 'disclosure', text: textField(record) })
    } else if (type === 'quote') {
      blocks.push({ type: 'quote', text: textField(record) })
    } else if (type === 'list') {
      const items = record.items
      if (!Array.isArray(items) || items.length > MAX_LIST_ITEMS) throw invalidBlocks()
      const clean: string[] = []
      for (const item of items) {
        if (typeof item !== 'string' || item.length > MAX_LIST_ITEM_CHARS) throw invalidBlocks()
        clean.push(item)
      }
      blocks.push({ type: 'list', items: clean })
    } else {
      throw invalidBlocks()
    }
  }
  return blocks
}

/** Apply stripHtml to every text/items string in the block list. */
export function sanitizeBlocks(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.map((block) => {
    switch (block.type) {
      case 'list':
        return { type: 'list' as const, items: block.items.map((item) => stripHtml(item)) }
      case 'heading':
        return { type: 'heading' as const, text: stripHtml(block.text) }
      case 'paragraph':
        return { type: 'paragraph' as const, text: stripHtml(block.text) }
      case 'disclosure':
        return { type: 'disclosure' as const, text: stripHtml(block.text) }
      case 'quote':
        return { type: 'quote' as const, text: stripHtml(block.text) }
    }
  })
}

/** Flatten blocks to plain text (checklist scans, excerpts, search). */
export function blocksToText(blocks: ContentBlock[]): string {
  return blocks.map((block) => (block.type === 'list' ? block.items.join('\n') : block.text)).join('\n')
}

/**
 * Find typed-out currency amounts in editorial text. Editorial content
 * must never carry typed prices (prices come only from licensed offer
 * data), so the publish checklist treats any match as an error.
 */
export function findTypedPrices(text: string): string[] {
  const matches = text.match(/(?:[$£€]\s?\d[\d,]*(?:\.\d{2})?|\b\d[\d,]*(?:\.\d{2})?\s?(?:USD|EUR|GBP)\b)/g)
  return matches ? matches.slice(0, MAX_TYPED_PRICE_MATCHES) : []
}

/** True when a non-empty affiliate-disclosure block is present. */
export function hasDisclosure(blocks: ContentBlock[]): boolean {
  return blocks.some((block) => block.type === 'disclosure' && block.text.trim().length > 0)
}
