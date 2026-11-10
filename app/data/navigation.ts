export interface NavItem {
  label: string
  to: string
}

export const primaryNav: NavItem[] = [
  { label: 'Home', to: '/' },
  { label: 'Product Finder', to: '/product-finder' },
  { label: 'Compare', to: '/compare' },
  { label: 'Alternatives', to: '/alternatives' },
  { label: 'Gift Finder', to: '/gift-finder' },
  { label: 'Buying Guides', to: '/buying-guides' },
  { label: 'Favorites', to: '/favorites' },
]

export const companyNav: NavItem[] = [
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
]

export const legalNav: NavItem[] = [
  { label: 'Privacy Policy', to: '/privacy-policy' },
  { label: 'Affiliate Disclosure', to: '/affiliate-disclosure' },
  { label: 'Terms of Use', to: '/terms' },
]

export const footerNav: { heading: string; items: NavItem[] }[] = [
  { heading: 'Explore', items: primaryNav.slice(1) },
  { heading: 'Company', items: companyNav },
  { heading: 'Legal', items: legalNav },
]

/** Every public HTML route in the Stage 01 foundation. Kept in sync with app/routes.ts (tested). */
export const publicPaths: string[] = [
  '/',
  '/product-finder',
  '/compare',
  '/alternatives',
  '/gift-finder',
  '/buying-guides',
  '/about',
  '/contact',
  '/privacy-policy',
  '/affiliate-disclosure',
  '/terms',
]
