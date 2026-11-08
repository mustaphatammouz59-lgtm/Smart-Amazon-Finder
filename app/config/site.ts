/**
 * Central site configuration.
 *
 * BRAND PLACEHOLDER: "Smart Amazon Finder" is the project's internal
 * working name (Stage 00, PRODUCT-REQUIREMENTS.md §10). It is NOT an
 * approved public brand. The public name is decided at gate D-01 before
 * public launch; when that happens, change it HERE and in
 * wrangler.jsonc (SITE_URL) only — every page, component and meta tag
 * reads the brand from this module.
 */
export const siteConfig = {
  name: 'Smart Amazon Finder',
  tagline: 'Find the right product, for the right reasons.',
  description:
    'An independent product discovery and comparison platform: research products, compare them on published criteria, and find honest alternatives.',
  // PLACEHOLDER base URL used for canonical/Open Graph URLs until the
  // real domain exists (domain purchase is a Stage 11 decision).
  // Keep in sync with the SITE_URL var in wrangler.jsonc.
  siteUrl: 'https://smart-amazon-finder.mustaphatammouz59.workers.dev',
  locale: 'en-US',
  defaultOgImage: '/og-default.svg',
} as const

export type SiteConfig = typeof siteConfig
