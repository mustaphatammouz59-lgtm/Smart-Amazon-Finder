/**
 * Product media storage (Stage 04). Uploaded images live in the MEDIA
 * R2 bucket under a server-generated key; the product_media row stores
 * that key in url_or_key.
 *
 * Type detection is by MAGIC BYTES ONLY — the client-supplied filename
 * and Content-Type header are never trusted (a renamed executable or
 * SVG must not pass as an image).
 */

/** Hard upload cap: 5 MiB per image. */
export const MAX_MEDIA_BYTES = 5 * 1024 * 1024

export interface SniffedImage {
  type: 'jpeg' | 'png' | 'webp' | 'gif'
  ext: string
  contentType: string
}

function hasPrefix(bytes: Uint8Array, prefix: number[], offset = 0): boolean {
  if (bytes.length < offset + prefix.length) return false
  return prefix.every((b, i) => bytes[offset + i] === b)
}

export function sniffImageType(bytes: Uint8Array): SniffedImage | null {
  // JPEG: FF D8 FF
  if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return { type: 'jpeg', ext: 'jpg', contentType: 'image/jpeg' }
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { type: 'png', ext: 'png', contentType: 'image/png' }
  }
  // GIF: ASCII 'GIF8' (covers GIF87a and GIF89a)
  if (hasPrefix(bytes, [0x47, 0x49, 0x46, 0x38])) {
    return { type: 'gif', ext: 'gif', contentType: 'image/gif' }
  }
  // WebP: ASCII 'RIFF' at 0 and 'WEBP' at 8
  if (hasPrefix(bytes, [0x52, 0x49, 0x46, 0x46]) && hasPrefix(bytes, [0x57, 0x45, 0x42, 0x50], 8)) {
    return { type: 'webp', ext: 'webp', contentType: 'image/webp' }
  }
  return null
}

/** Server-generated object key; the extension comes from the sniffed type. */
export function buildMediaKey(productId: number, ext: string): string {
  return `products/${productId}/${crypto.randomUUID()}.${ext}`
}

export async function storeMedia(
  bucket: R2Bucket,
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  await bucket.put(key, bytes, { httpMetadata: { contentType } })
}
