import { describe, expect, it } from 'vitest'
import { buildMeta, canonicalUrl } from '../app/lib/seo'
import { siteConfig } from '../app/config/site'

describe('canonicalUrl', () => {
  it('joins base and path without double slashes', () => {
    expect(canonicalUrl('/about')).toBe(`${siteConfig.siteUrl}/about`)
    expect(canonicalUrl('about')).toBe(`${siteConfig.siteUrl}/about`)
    expect(canonicalUrl('/')).toBe(`${siteConfig.siteUrl}/`)
  })
})

describe('buildMeta', () => {
  it('emits title, description, canonical and Open Graph', () => {
    const meta = buildMeta({ title: 'About', description: 'About page.', path: '/about' })
    const title = meta.find((m) => 'title' in m)
    const canonical = meta.find((m) => 'rel' in m && m.rel === 'canonical')
    const ogTitle = meta.find((m) => 'property' in m && m.property === 'og:title')
    expect(title?.title).toContain('About')
    expect(canonical && 'href' in canonical ? canonical.href : '').toBe(`${siteConfig.siteUrl}/about`)
    expect(ogTitle).toBeTruthy()
  })

  it('adds robots noindex only when requested', () => {
    const plain = buildMeta({ title: 'A', description: 'd', path: '/a' })
    const noIdx = buildMeta({ title: 'A', description: 'd', path: '/a', noIndex: true })
    expect(plain.some((m) => 'name' in m && m.name === 'robots')).toBe(false)
    expect(noIdx.some((m) => 'name' in m && m.name === 'robots')).toBe(true)
  })

  it('never emits structured data (Stage 00 rule)', () => {
    const meta = buildMeta({ title: 'A', description: 'd', path: '/a' })
    expect(JSON.stringify(meta)).not.toContain('application/ld+json')
  })
})
