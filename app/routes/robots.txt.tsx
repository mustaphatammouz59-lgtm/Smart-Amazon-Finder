import { siteConfig } from '../config/site'

/**
 * robots.txt (SEO-STRATEGY.md §4). During the foundation stage the whole
 * site is disallowed: there is no public launch yet, so nothing should
 * be indexed. At launch this flips to the launch ruleset in the SEO
 * strategy (allow public, disallow /admin, /api, /account, /compare/).
 */
export function loader() {
  const body = [
    'User-agent: *',
    'Disallow: /',
    '',
    `# Foundation stage — indexing opens at public launch.`,
    `Sitemap: ${siteConfig.siteUrl}/sitemap.xml`,
    '',
  ].join('\n')
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  })
}
