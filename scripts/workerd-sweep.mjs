#!/usr/bin/env node
/**
 * Stage 04.2 — reproducible workerd sweep (brief §8).
 *
 * Boots the REAL Worker under `wrangler dev` (workerd) against a throwaway
 * LOCAL D1 in a temp persist directory, with a local JWKS server and an
 * ephemeral RS256 keypair minting test-only JWTs. Zero production
 * credentials, zero production services: every binding points at local
 * state, and the Cloudflare Access team domain is a 127.0.0.1 URL.
 *
 * Usage:  npm run test:sweep
 * Output: a JSON results file at tests/workerd/sweep-results.json and a
 *         human summary on stdout. Exit code is non-zero when any
 *         mandatory check fails.
 *
 * The repo's .dev.vars (local developer values) is set aside for the
 * duration of the run and restored afterwards byte-identical (rename,
 * never copied or read), so sweep configuration cannot leak into — or
 * be polluted by — the developer's local values.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { generateKeyPairSync, sign as cryptoSign } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const WORKER_PORT = 8797
const BASE = `http://127.0.0.1:${WORKER_PORT}`
const AUDIENCE = 'stage042-sweep-audience'
const RESULTS_PATH = join(ROOT, 'tests/workerd/sweep-results.json')

const results = []
function check(id, name, expected, actual, pass) {
  results.push({ id, name, expected: String(expected), actual: String(actual), pass: Boolean(pass) })
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}  (expected ${expected}, got ${actual})`)
}

/* Build first: `wrangler dev` serves the built Worker, so sweeping
 * without a fresh build would test stale code. The build is part of the
 * sweep for exactly that reason. */
console.log('Building the Worker (npm run build)…')
const build = spawnSync('npm', ['run', 'build'], { cwd: ROOT, encoding: 'utf-8', timeout: 600_000 })
if (build.status !== 0) {
  console.error(build.stdout)
  console.error(build.stderr)
  throw new Error('npm run build failed — sweep aborted.')
}

/* ---------------- ephemeral keys + local JWKS ---------------- */
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const jwk = publicKey.export({ format: 'jwk' })
jwk.kid = 'sweep-key'
jwk.alg = 'RS256'
jwk.use = 'sig'

const b64url = (buf) => Buffer.from(buf).toString('base64url')
function mint(email) {
  const now = Math.floor(Date.now() / 1000)
  const head = b64url(JSON.stringify({ alg: 'RS256', kid: 'sweep-key', typ: 'JWT' }))
  const body = b64url(
    JSON.stringify({ iss: jwksIssuer, aud: [AUDIENCE], email, sub: `sweep-${email}`, iat: now - 60, nbf: now - 60, exp: now + 3600 }),
  )
  const signature = cryptoSign('RSA-SHA256', Buffer.from(`${head}.${body}`), privateKey)
  return `${head}.${body}.${b64url(signature)}`
}

const jwksServer = createServer((req, res) => {
  if (req.url === '/cdn-cgi/access/certs') {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify({ keys: [jwk] }))
  } else {
    res.writeHead(404)
    res.end()
  }
})
await new Promise((resolve) => jwksServer.listen(0, '127.0.0.1', resolve))
const jwksIssuer = `http://127.0.0.1:${jwksServer.address().port}`

/* ---------------- local D1 seeding ---------------- */
const persistDir = mkdtempSync(join(tmpdir(), 'saf-sweep-'))
function wranglerD1(file) {
  const run = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'DB', '--local', '--persist-to', persistDir, '--file', file],
    { cwd: ROOT, encoding: 'utf-8', timeout: 120_000 },
  )
  if (run.status !== 0) {
    throw new Error(`wrangler d1 execute failed for ${file}\n${run.stdout}\n${run.stderr}`)
  }
}
for (const file of readdirSync(join(ROOT, 'migrations')).filter((f) => f.endsWith('.sql')).sort()) {
  wranglerD1(join(ROOT, 'migrations', file))
}
wranglerD1(join(ROOT, 'fixtures/catalog-seeds.sql'))
const seedPath = join(persistDir, 'sweep-seed.sql')
writeFileSync(
  seedPath,
  `INSERT INTO admin_users (email, role) VALUES
     ('sweep-owner@example.invalid', 'owner'),
     ('sweep-admin@example.invalid', 'admin'),
     ('sweep-editor@example.invalid', 'editor'),
     ('sweep-publisher@example.invalid', 'publisher'),
     ('sweep-viewer@example.invalid', 'viewer');
   INSERT INTO merchants (slug, name, base_domain) VALUES ('sweep-merchant', 'Sweep Merchant', 'merchant.example');\n`,
)
wranglerD1(seedPath)

/* ---------------- boot wrangler dev ---------------- */
const devVarsPath = join(ROOT, '.dev.vars')
const devVarsBackup = join(ROOT, '.dev.vars.sweep-backup')
if (existsSync(devVarsBackup)) {
  throw new Error('.dev.vars.sweep-backup already exists — a previous sweep did not restore it. Refusing to start.')
}
const hadDevVars = existsSync(devVarsPath)
if (hadDevVars) renameSync(devVarsPath, devVarsBackup)

// Pre-flight: refuse to test whatever a previous (crashed) run may have
// left listening — the sweep must only ever measure its own server.
{
  let occupied = false
  try {
    await fetch(`${BASE}/api/health`)
    occupied = true
  } catch {
    /* nothing serving: the port is free */
  }
  if (occupied) {
    throw new Error(`Port ${WORKER_PORT} is already serving — a previous sweep's wrangler dev is still running. Kill it first.`)
  }
}

// detached: wrangler spawns workerd children; the whole process GROUP is
// killed in the finally block (killing only the npx wrapper orphans the
// workerd server, which then silently answers the NEXT run's checks).
const dev = spawn(
  'npx',
  [
    'wrangler', 'dev',
    '--port', String(WORKER_PORT),
    '--persist-to', persistDir,
    '--var', `ACCESS_TEAM_DOMAIN:${jwksIssuer}`,
    '--var', `ACCESS_AUD:${AUDIENCE}`,
  ],
  { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true },
)
let devLog = ''
dev.stdout.on('data', (d) => (devLog += d))
dev.stderr.on('data', (d) => (devLog += d))

async function waitReady() {
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}/api/health`)
      if (res.status === 200) return true
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

/* ---------------- HTTP helpers ---------------- */
function sweepReq(path, { method = 'GET', token, json, origin } = {}) {
  const headers = {}
  if (token) headers['Cf-Access-Jwt-Assertion'] = token
  if (origin !== undefined) headers.Origin = origin
  let body
  if (json !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(json)
  }
  return fetch(`${BASE}${path}`, { method, headers, body })
}

const owner = () => mint('sweep-owner@example.invalid')
const editor = () => mint('sweep-editor@example.invalid')
const publisher = () => mint('sweep-publisher@example.invalid')

/* ---------------- the checks ---------------- */
try {
  const ready = await waitReady()
  check('boot', 'wrangler dev becomes ready', 'ready', ready ? 'ready' : 'timeout', ready)
  if (!ready) throw new Error(`wrangler dev did not become ready.\n${devLog.slice(-4000)}`)

  const health = await sweepReq('/api/health')
  check('health', 'GET /api/health', 200, health.status, health.status === 200)
  const csp = health.headers.get('content-security-policy') ?? ''
  const hsts = health.headers.get('strict-transport-security') ?? ''
  check('headers-csp', 'CSP header present (F-11)', 'present', csp ? 'present' : 'absent', csp.includes("default-src 'self'"))
  check('headers-hsts', 'HSTS header present (F-11)', 'present', hsts ? 'present' : 'absent', hsts.includes('max-age='))

  const overviewAnon = await sweepReq('/api/admin/overview')
  check('admin-anon', 'GET /api/admin/overview without token', 401, overviewAnon.status, overviewAnon.status === 401)
  const overview = await sweepReq('/api/admin/overview', { token: owner() })
  check('admin-owner', 'GET /api/admin/overview as owner', 200, overview.status, overview.status === 200)

  const adminPage = await sweepReq('/admin')
  const adminPageText = await adminPage.text()
  check(
    'admin-page-denied',
    'GET /admin without Access session renders the denied panel (F-16: HTTP 200, no data)',
    '200 + denied panel',
    `${adminPage.status} + ${/denied|sign in|unauthor/i.test(adminPageText) ? 'denied panel' : 'other'}`,
    adminPage.status === 200 && /denied|sign in|unauthor/i.test(adminPageText),
  )

  // Full product lifecycle over real HTTP.
  const created = await sweepReq('/api/admin/products', {
    method: 'POST',
    token: editor(),
    origin: BASE,
    json: { categorySlug: 'home-office', slug: 'sweep-widget', name: 'Sweep Widget', editorialSummary: 'Created by the sweep.' },
  })
  check('product-create', 'POST /api/admin/products as editor', 201, created.status, created.status === 201)
  const productId = (await created.json()).data.id

  // Specs: read a definition id from the admin product detail.
  const detail = await (await sweepReq(`/api/admin/products/${productId}`, { token: editor() })).json()
  const specRow = (detail.data.specs ?? []).find((s) => s.key === 'height_adjustable')
  const definitionId = specRow?.definition_id
  check('product-detail', 'GET admin product detail carries spec definitions', 'definition id', definitionId ?? 'missing', Number.isInteger(definitionId))

  const specs = await sweepReq(`/api/admin/products/${productId}/specs`, {
    method: 'PUT',
    token: editor(),
    origin: BASE,
    json: { specs: [{ definitionId, value: true }] },
  })
  check('product-specs', 'PUT product specs', 200, specs.status, specs.status === 200)

  const validated = await sweepReq(`/api/admin/products/${productId}/validate`, { method: 'POST', token: editor(), origin: BASE, json: {} })
  const validatedBody = await validated.json()
  check('product-validate', 'POST product validate → passed', '200/passed', `${validated.status}/${validatedBody.data?.status}`, validated.status === 200 && validatedBody.data?.status === 'passed')

  const editorPublish = await sweepReq(`/api/admin/products/${productId}/publish`, { method: 'POST', token: editor(), origin: BASE, json: {} })
  check('publish-rbac', 'editor publish attempt is refused', 403, editorPublish.status, editorPublish.status === 403)
  const published = await sweepReq(`/api/admin/products/${productId}/publish`, { method: 'POST', token: publisher(), origin: BASE, json: {} })
  check('product-publish', 'POST product publish as publisher', 200, published.status, published.status === 200)

  const pub = await sweepReq('/api/v1/products/sweep-widget')
  check('public-visible', 'GET /api/v1/products/sweep-widget (published)', 200, pub.status, pub.status === 200)

  // Stage 05.1: the new public SSR catalog pages over real HTTP, while
  // the sweep product is published (the F-01 edit below invalidates it).
  const ssrProduct = await sweepReq('/product/sweep-widget')
  const ssrProductText = await ssrProduct.text()
  check('ssr-product', 'GET /product/sweep-widget renders the published product', '200 + name', `${ssrProduct.status} + ${ssrProductText.includes('Sweep Widget') ? 'name' : 'no-name'}`, ssrProduct.status === 200 && ssrProductText.includes('Sweep Widget'))
  const ssrRobots = ssrProduct.headers.get('x-robots-tag') ?? ''
  check('ssr-product-noindex', 'product page keeps the global X-Robots-Tag noindex', 'noindex, nofollow', ssrRobots, ssrRobots.includes('noindex'))
  const ssrCategory = await sweepReq('/category/home-office')
  const ssrCategoryText = await ssrCategory.text()
  check('ssr-category', 'GET /category/home-office lists the published product', '200 + name', `${ssrCategory.status} + ${ssrCategoryText.includes('Sweep Widget') ? 'name' : 'no-name'}`, ssrCategory.status === 200 && ssrCategoryText.includes('Sweep Widget'))
  const ssrProduct404 = await sweepReq('/product/no-such-product')
  check('ssr-product-404', 'GET /product/no-such-product is 404', 404, ssrProduct404.status, ssrProduct404.status === 404)
  const ssrCategory404 = await sweepReq('/category/no-such-category')
  check('ssr-category-404', 'GET /category/no-such-category is 404', 404, ssrCategory404.status, ssrCategory404.status === 404)
  const ssrFavorites = await sweepReq('/favorites')
  check('ssr-favorites', 'GET /favorites renders', 200, ssrFavorites.status, ssrFavorites.status === 200)
  const ssrCompare = await sweepReq('/compare')
  check('ssr-compare', 'GET /compare renders', 200, ssrCompare.status, ssrCompare.status === 200)

  // F-01 over real HTTP: edit the summary away → product disappears.
  const patched = await sweepReq(`/api/admin/products/${productId}`, {
    method: 'PATCH',
    token: editor(),
    origin: BASE,
    json: { editorialSummary: '' },
  })
  check('product-patch', 'PATCH product (clear summary)', 200, patched.status, patched.status === 200)
  const pubAfter = await sweepReq('/api/v1/products/sweep-widget')
  check('f01-invisible', 'public product is 404 after invalidating edit (F-01)', 404, pubAfter.status, pubAfter.status === 404)
  const republish = await sweepReq(`/api/admin/products/${productId}/publish`, { method: 'POST', token: publisher(), origin: BASE, json: {} })
  check('f01-gate', 'republish is refused by the validation gate', 409, republish.status, republish.status === 409)

  // Cross-origin mutation is refused even with a valid token.
  const forged = await sweepReq('/api/admin/products', {
    method: 'POST',
    token: owner(),
    origin: 'https://evil.example',
    json: { categorySlug: 'home-office', slug: 'forged-widget', name: 'Forged Widget' },
  })
  check('cross-origin', 'POST with foreign Origin', 403, forged.status, forged.status === 403)

  // F-04 over real HTTP: a javascript: destination is refused at the edge.
  const badOffer = await sweepReq('/api/admin/offers', {
    method: 'POST',
    token: editor(),
    origin: BASE,
    json: { productId, merchantId: 1, destinationUrl: 'javascript:alert(1)' },
  })
  check('offer-js-url', 'POST offer with javascript: URL', 400, badOffer.status, badOffer.status === 400)

  // Media round-trip: upload a real PNG, serve it back, refuse anonymous.
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52, ...new Array(32).fill(0)])
  const form = new FormData()
  form.set('file', new File([png], 'sweep.png', { type: 'image/png' }))
  const upload = await fetch(`${BASE}/api/admin/products/${productId}/media`, {
    method: 'POST',
    headers: { 'Cf-Access-Jwt-Assertion': editor(), Origin: BASE },
    body: form,
  })
  check('media-upload', 'POST product media (PNG)', 201, upload.status, upload.status === 201)
  const mediaList = await (await sweepReq(`/api/admin/products/${productId}/media`, { token: editor() })).json()
  const mediaId = mediaList.data?.[mediaList.data.length - 1]?.id
  const content = await sweepReq(`/api/admin/media/${mediaId}/content`, { token: editor() })
  check('media-content', 'GET media content as admin', '200 image/png', `${content.status} ${content.headers.get('content-type')}`, content.status === 200 && (content.headers.get('content-type') ?? '').includes('image/png'))
  const contentAnon = await sweepReq(`/api/admin/media/${mediaId}/content`)
  check('media-content-anon', 'GET media content anonymously', 401, contentAnon.status, contentAnon.status === 401)

  const search = await sweepReq('/api/v1/search?q=widget')
  check('search', 'GET /api/v1/search', 200, search.status, search.status === 200)
} finally {
  try {
    process.kill(-dev.pid, 'SIGINT')
  } catch {
    /* group already gone */
  }
  await new Promise((r) => setTimeout(r, 1500))
  try {
    process.kill(-dev.pid, 'SIGKILL')
  } catch {
    /* group already gone */
  }
  jwksServer.close()
  if (hadDevVars) renameSync(devVarsBackup, devVarsPath)
  rmSync(persistDir, { recursive: true, force: true })
}

const failures = results.filter((r) => !r.pass).length
const summary = {
  tool: 'scripts/workerd-sweep.mjs',
  generated_at: new Date().toISOString(),
  environment: 'wrangler dev (workerd), local D1/R2/queues only, local JWKS, ephemeral keys',
  total: results.length,
  passed: results.length - failures,
  failed: failures,
  results,
}
mkdirSync(dirname(RESULTS_PATH), { recursive: true })
writeFileSync(RESULTS_PATH, `${JSON.stringify(summary, null, 2)}\n`)
console.log(`\n${summary.passed}/${summary.total} checks passed. Results: tests/workerd/sweep-results.json`)
process.exit(failures === 0 ? 0 : 1)
