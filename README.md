# Smart Amazon Finder — Application (Stage 01 Foundation)

An independent product discovery and comparison platform (United States first).
Working name only — the public brand is decided at Stage 00 gate D-01 before launch.

**Architecture of record:** the Stage 00 documents in this repository
(`PRODUCT-REQUIREMENTS.md`, `SYSTEM-ARCHITECTURE.md`, `DATABASE-DESIGN.md`,
`API-ARCHITECTURE.md`, `UX-UI-SPECIFICATION.md`, `DATA-SOURCING-AND-COMPLIANCE.md`,
`SEO-STRATEGY.md`, `SECURITY-PLAN.md`, `MONETIZATION-STRATEGY.md`,
`MASTER-ROADMAP.md`, `RISK-REGISTER.md`, `COST-AND-SCALABILITY.md`,
`ACCEPTANCE-CRITERIA.md`). They are the blueprint; this application implements them stage by stage.

> Compliance foundations (non-negotiable): no Amazon scraping, no PA-API 5
> (deprecated), no assumed Creators API access, no fabricated products,
> prices, ratings or reviews, no re-hosted Amazon images. The platform is
> designed to launch without any Amazon API data.

## Stack

- React 19 + TypeScript (strict mode)
- React Router 7 Framework Mode with SSR (`ssr: true` — required; SPA mode is not supported by the Cloudflare Vite plugin)
- Vite 7 + `@cloudflare/vite-plugin` (official Cloudflare integration)
- Tailwind CSS 4
- Cloudflare Workers (SSR + API), D1, KV, R2, Queues
- zod for server-side input validation, Vitest for tests, ESLint + Prettier

Exact versions are pinned in `package.json` / `package-lock.json`.

## Project structure

```
app/
  config/       Site + brand configuration (single source for the brand placeholder)
  data/         Navigation + the public route registry
  lib/          SEO meta builders, validation schemas
  components/   ui/ (buttons, cards, form controls) · layout/ (header, footer,
                breadcrumb, page header) · state/ (loading, empty, error, 404)
  routes/       One file per route (pages, api/health, robots.txt, sitemap.xml, catch-all 404)
  root.tsx      App shell (skip link, header, outlet, footer, error boundaries)
  entry.server.tsx  Workers streaming SSR entry (renderToReadableStream)
workers/
  app.ts        Worker entry: request handler + security headers + queue consumer stub
migrations/     Numbered D1 migrations (0001 = foundation only; catalog schema is Stage 03)
tests/          Vitest suites (seo, validation, route consistency)
```

## Getting started

Prerequisites: Node.js 22+ and npm.

```bash
npm install
npm run dev        # React Router dev server running in the Workers runtime (workerd)
```

Local development emulates D1/KV/R2/Queues automatically. Apply the local D1 migration once:

```bash
npx wrangler d1 migrations apply smart-amazon-finder-db --local
```

Check the foundation (bindings + D1 round-trip) at `http://localhost:5173/api/health`
(dev port may differ; the preview server below uses its own port).

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server in the Workers runtime |
| `npm run build` | Production build (client + SSR server bundle for Workers) |
| `npm run preview` | Build, then serve the production build locally in workerd |
| `npm run typecheck` | `wrangler types` + React Router typegen + `tsc -b` (strict) |
| `npm run lint` | ESLint over the whole project |
| `npm run test` | Vitest suites |
| `npm run check` | typecheck + lint + test + build |

## Cloudflare configuration

`wrangler.jsonc` declares: the Worker (`smart-amazon-finder`), `SITE_URL` var,
and bindings **DB** (D1), **APP_KV** (KV), **MEDIA** (R2), **JOBS** (Queues
producer + consumer). Binding IDs in the committed file are **placeholders**.

Before the first real deployment (a later, separately approved stage — do not
deploy from this foundation without owner approval):

```bash
wrangler d1 create smart-amazon-finder-db      # paste the real id into wrangler.jsonc
wrangler kv namespace create APP_KV            # paste the real id
wrangler r2 bucket create smart-amazon-finder-media
wrangler queues create smart-amazon-finder-jobs
wrangler d1 migrations apply smart-amazon-finder-db --remote
```

Validate any config change without deploying: `wrangler deploy --dry-run -c build/server/wrangler.json` (after a build).

### Secrets

Secrets are **never** committed and never live in `wrangler.jsonc`. Set them per environment:

```bash
wrangler secret put <NAME>            # production
cp .env.example .dev.vars             # local only; .dev.vars is git-ignored
```

The application currently requires no secrets (no external APIs are integrated in Stage 01).

## Environments

- **Local:** `npm run dev` / `npm run preview` (workerd + local binding emulation, state in `.wrangler/`).
- **Staging / production:** separate Wrangler environments and separate Cloudflare resources will be
  defined when deployment is approved (Stage 01 is local-only by instruction; nothing is deployed).

## Brand placeholder

The name and base URL live in exactly two places: `app/config/site.ts` and the
`SITE_URL` var in `wrangler.jsonc`. Replacing the working name with the final
brand is a config change, not a refactor.

## Stage status

Stage 01 (foundation) — see `REPORT-stage01-2026-11-08.md`. Catalog, search,
comparison, recommendations, monetization and all later modules are
deliberately **not** implemented yet; they follow the Stage 00 roadmap.
