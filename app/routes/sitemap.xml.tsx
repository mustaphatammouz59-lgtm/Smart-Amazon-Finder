import { siteConfig } from '../config/site'
import { publicPaths } from '../data/navigation'

/**
 * Sitemap infrastructure (SEO-STRATEGY.md §4). Lists only the public,
 * canonical foundation routes. In the foundation stage every page is
 * noindex by policy, so the sitemap is generated for infrastructure
 * verification; per-record sitemaps arrive with the catalog stages and
 * will only ever list validated, published records.
 */
export function loader() {
  const urls = publicPaths
    .map((p) => `  <url>\n    <loc>${siteConfig.siteUrl}${p === '/' ? '/' : p}</loc>\n  </url>`)
    .join('\n')
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
