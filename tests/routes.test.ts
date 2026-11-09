import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { publicPaths } from '../app/data/navigation'

describe('route foundation consistency', () => {
  const routesSource = readFileSync(new URL('../app/routes.ts', import.meta.url), 'utf-8').replaceAll(
    "'",
    '"',
  )

  it('every public path has a registered route', () => {
    for (const p of publicPaths) {
      if (p === '/') {
        expect(routesSource).toContain('index(')
      } else {
        expect(routesSource).toContain(`route("${p.slice(1)}"`)
      }
    }
  })

  it('registers the catch-all, robots, sitemap and health routes', () => {
    expect(routesSource).toContain('route("*"')
    expect(routesSource).toContain('route("robots.txt"')
    expect(routesSource).toContain('route("sitemap.xml"')
    expect(routesSource).toContain('route("api/health"')
  })

  it('has no duplicate public paths', () => {
    expect(new Set(publicPaths).size).toBe(publicPaths.length)
  })
})
