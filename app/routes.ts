import { type RouteConfig, index, route } from '@react-router/dev/routes'

/**
 * Single source of truth for routing. The paths here must stay in sync
 * with `publicPaths` in app/data/navigation.ts (covered by tests) and
 * with the generated sitemap.
 */
export default [
  index('routes/home.tsx'),
  route('product-finder', 'routes/product-finder.tsx'),
  route('compare', 'routes/compare.tsx'),
  route('alternatives', 'routes/alternatives.tsx'),
  route('gift-finder', 'routes/gift-finder.tsx'),
  route('buying-guides', 'routes/buying-guides.tsx'),
  route('about', 'routes/about.tsx'),
  route('contact', 'routes/contact.tsx'),
  route('privacy-policy', 'routes/privacy-policy.tsx'),
  route('affiliate-disclosure', 'routes/affiliate-disclosure.tsx'),
  route('terms', 'routes/terms.tsx'),
  route('api/health', 'routes/api.health.tsx'),
  route('robots.txt', 'routes/robots.txt.tsx'),
  route('sitemap.xml', 'routes/sitemap.xml.tsx'),
  route('*', 'routes/not-found.tsx'),
] satisfies RouteConfig
