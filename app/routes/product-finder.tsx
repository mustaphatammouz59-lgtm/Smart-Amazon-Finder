import { Form, Link, useLoaderData } from 'react-router'
import type { Route } from './+types/product-finder'
import { buildMeta } from '../lib/seo'
import { fieldErrorsFrom, productFinderSchema, type FieldErrors } from '../lib/validation'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { EmptyState } from '../components/state/states'
import { Button, ErrorSummary, FieldError, Input, Label, Select, SkeletonCard } from '../components/ui/ui'
import { ChevronDownIcon, ListCheckIcon, SlidersIcon } from '../components/ui/icons'

export function meta() {
  return buildMeta({
    title: 'Product Finder',
    description:
      'Tell us the job, your budget and what matters most — the Product Finder turns that into concrete criteria and matched products.',
    path: '/product-finder',
  })
}

interface FinderResult {
  ok: boolean
  errors?: FieldErrors
  summary?: { q?: string; category: string; budget: number; priority: string; sort: string }
}

interface LoaderData {
  prefill: { q: string; category: string; budget: string; priority: string; sort: string }
  result: FinderResult | null
}

/**
 * URL-state finder (UX spec §6): the form is a GET form, so a profile is a
 * shareable, back-button-safe URL. Validation runs in the loader through the
 * same zod schema the Stage 01 action used — nothing is stored server-side.
 */
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const params = new URL(request.url).searchParams
  const prefill = {
    q: params.get('q') ?? '',
    category: params.get('category') ?? 'home-office',
    budget: params.get('budget') ?? '',
    priority: params.get('priority') ?? 'value',
    sort: params.get('sort') ?? 'best-fit',
  }
  if (!params.has('submitted')) {
    return { prefill, result: null }
  }
  const parsed = productFinderSchema.safeParse({
    q: params.get('q') || undefined,
    category: params.get('category'),
    budget: params.get('budget'),
    priority: params.get('priority'),
    sort: params.get('sort') ?? undefined,
  })
  if (!parsed.success) {
    return { prefill, result: { ok: false, errors: fieldErrorsFrom(parsed.error) } }
  }
  return { prefill, result: { ok: true, summary: parsed.data } }
}

const categoryLabels: Record<string, string> = {
  'home-office': 'Home Office & Productivity',
  'electronics-accessories': 'Electronics Accessories',
}
const priorityLabels: Record<string, string> = {
  value: 'Best value for money',
  performance: 'Performance first',
  durability: 'Built to last',
  design: 'Design and ergonomics',
}
const sortLabels: Record<string, string> = {
  'best-fit': 'Best fit for my criteria',
  'price-asc': 'Lowest price first',
  'price-desc': 'Highest price first',
  durability: 'Most durable first',
}

export default function ProductFinder() {
  const { prefill, result } = useLoaderData<typeof loader>()
  const errors = result?.errors ?? {}
  const err = (name: string) => (errors[name] ? `${name}-error` : undefined)

  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Product Finder' }]} />
      <div className="pt-6">
        <PageHeader
          title="Product Finder"
          intro="Start with the job, a budget and what matters most. The finder builds a criteria profile — the same profile comparisons and recommendations will rank against. Your answers live only in this page's URL, which you can bookmark or share."
        />
      </div>

      <Form method="get" noValidate>
        <input type="hidden" name="submitted" value="1" />
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[320px_1fr]">
          {/* Criteria rail (desktop) / collapsible sheet (mobile) — spec §5 */}
          <details
            open
            className="filter-details rounded-2xl bg-white shadow-[var(--shadow-card)] ring-1 ring-navy-100 lg:sticky lg:top-32"
          >
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5 [&::-webkit-details-marker]:hidden lg:hidden">
              <span className="flex items-center gap-2 font-semibold text-navy-950">
                <SlidersIcon className="h-5 w-5 text-teal-800" /> Filters &amp; criteria
              </span>
              <ChevronDownIcon className="h-5 w-5 text-smoke" />
            </summary>
            <div className="filter-body space-y-5 px-5 pb-5 lg:pt-5">
              <p className="hidden items-center gap-2 font-semibold text-navy-950 lg:flex">
                <SlidersIcon className="h-5 w-5 text-teal-800" /> Your criteria
              </p>
              <ErrorSummary errors={errors} />
              <div>
                <Label htmlFor="field-q">What are you trying to do? (optional)</Label>
                <Input
                  id="field-q"
                  name="q"
                  type="text"
                  maxLength={120}
                  defaultValue={prefill.q}
                  placeholder="e.g. a quiet desk setup for calls"
                  className="mt-2"
                  aria-describedby={err('q')}
                />
                <FieldError id="q-error" message={errors.q} />
              </div>
              <div>
                <Label htmlFor="field-category">Category</Label>
                <Select
                  id="field-category"
                  name="category"
                  className="mt-2"
                  defaultValue={prefill.category}
                  aria-describedby={err('category')}
                >
                  <option value="home-office">Home Office &amp; Productivity</option>
                  <option value="electronics-accessories">Electronics Accessories</option>
                </Select>
                <FieldError id="category-error" message={errors.category} />
              </div>
              <div>
                <Label htmlFor="field-budget">Your budget (USD)</Label>
                <Input
                  id="field-budget"
                  name="budget"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={10000}
                  placeholder="e.g. 150"
                  defaultValue={prefill.budget}
                  className="mt-2"
                  aria-describedby={err('budget')}
                />
                <FieldError id="budget-error" message={errors.budget} />
              </div>
              <div>
                <Label htmlFor="field-priority">What matters most?</Label>
                <Select
                  id="field-priority"
                  name="priority"
                  className="mt-2"
                  defaultValue={prefill.priority}
                  aria-describedby={err('priority')}
                >
                  <option value="value">Best value for money</option>
                  <option value="performance">Performance first</option>
                  <option value="durability">Built to last</option>
                  <option value="design">Design and ergonomics</option>
                </Select>
                <FieldError id="priority-error" message={errors.priority} />
              </div>
              <div>
                <Label htmlFor="field-sort">Sort my shortlist by</Label>
                <Select
                  id="field-sort"
                  name="sort"
                  className="mt-2"
                  defaultValue={prefill.sort}
                  aria-describedby={err('sort')}
                >
                  <option value="best-fit">Best fit for my criteria</option>
                  <option value="price-asc">Lowest price first</option>
                  <option value="price-desc">Highest price first</option>
                  <option value="durability">Most durable first</option>
                </Select>
                <FieldError id="sort-error" message={errors.sort} />
                <p className="mt-1.5 text-xs leading-5 text-smoke">
                  Price sorting applies once prices from authorised sources are published.
                </p>
              </div>
              <div className="flex items-center gap-3 pt-1">
                <Button type="submit" size="lg" className="flex-1">
                  Build my profile
                </Button>
                <Link
                  to="/product-finder"
                  className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
                >
                  Clear
                </Link>
              </div>
            </div>
          </details>

          {/* Results region — states only; no fabricated products (brief §5) */}
          <section aria-labelledby="results-heading" aria-live="polite">
            <h2 id="results-heading" className="flex items-center gap-2 text-xl font-bold text-navy-950">
              <ListCheckIcon className="h-6 w-6 text-teal-800" /> Your shortlist
            </h2>

            {!result && (
              <div className="mt-5">
                <EmptyState title="No criteria yet">
                  Answer the questions in the criteria panel and your validated profile will appear here.
                  Product matching activates when the catalog launches — until then, no placeholder products
                  are shown.
                </EmptyState>
                <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
                  <SkeletonCard />
                  <SkeletonCard />
                  <SkeletonCard />
                </div>
                <p className="mt-3 text-xs text-smoke">
                  Layout preview: published product cards will occupy this space, each with its reason line.
                </p>
              </div>
            )}

            {result && !result.ok && (
              <div className="mt-5">
                <div role="alert" className="rounded-2xl bg-red-50 p-6 ring-1 ring-red-200">
                  <p className="font-semibold text-red-900">We could not build your profile</p>
                  <p className="mt-2 text-sm leading-6 text-red-800">
                    One or more answers need attention — they are highlighted in the criteria panel. Nothing
                    was stored.
                  </p>
                </div>
              </div>
            )}

            {result?.ok && result.summary && (
              <div className="mt-5 space-y-5">
                <div role="status" className="rounded-2xl bg-teal-50 p-6 ring-1 ring-teal-100">
                  <h3 className="font-semibold text-navy-950">Your criteria profile</h3>
                  <dl className="mt-3 space-y-1.5 text-sm leading-6 text-navy-900">
                    {result.summary.q && (
                      <div className="flex gap-2">
                        <dt className="font-medium">The job:</dt>
                        <dd>“{result.summary.q}”</dd>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <dt className="font-medium">Category:</dt>
                      <dd>{categoryLabels[result.summary.category]}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium">Budget:</dt>
                      <dd>up to ${result.summary.budget}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium">Priority:</dt>
                      <dd>{priorityLabels[result.summary.priority]}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="font-medium">Sorting:</dt>
                      <dd>{sortLabels[result.summary.sort]}</dd>
                    </div>
                  </dl>
                  <p className="mt-3 text-sm leading-6 text-navy-900">
                    Validated on the server; stored nowhere. Bookmark this page's address to keep the profile.
                  </p>
                </div>
                <EmptyState title="The catalog has not launched yet">
                  Your profile is ready. When products are published, your ranked shortlist will appear here —
                  every entry with the reason it matched, and a “compare these” action.
                </EmptyState>
              </div>
            )}
          </section>
        </div>
      </Form>
    </div>
  )
}
