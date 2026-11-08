import { siteConfig } from '../config/site'

export interface PageMetaInput {
  title: string
  description: string
  path: string
  /** Foundation and legal pages stay out of the index until launch (SEO-STRATEGY.md §6). */
  noIndex?: boolean
}

export function canonicalUrl(path: string): string {
  const base = siteConfig.siteUrl.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

/** Build the standard meta descriptor set for a page. No structured data is emitted (Stage 00 rule). */
export function buildMeta({ title, description, path, noIndex = false }: PageMetaInput) {
  const canonical = canonicalUrl(path)
  const fullTitle =
    path === '/' ? `${siteConfig.name} — ${siteConfig.tagline}` : `${title} | ${siteConfig.name}`
  return [
    { title: fullTitle },
    { name: 'description', content: description },
    { tagName: 'link', rel: 'canonical', href: canonical },
    ...(noIndex ? [{ name: 'robots', content: 'noindex, follow' }] : []),
    { property: 'og:type', content: 'website' },
    { property: 'og:site_name', content: siteConfig.name },
    { property: 'og:title', content: fullTitle },
    { property: 'og:description', content: description },
    { property: 'og:url', content: canonical },
    { property: 'og:image', content: canonicalUrl(siteConfig.defaultOgImage) },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: fullTitle },
    { name: 'twitter:description', content: description },
  ]
}
