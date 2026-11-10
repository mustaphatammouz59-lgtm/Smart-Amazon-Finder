import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { buildMeta } from '../lib/seo'
import { COMPARE_KEY, MAX_COMPARE, loadList, saveList, subscribeLists } from '../lib/client-lists'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Button, Card, CardText, CardTitle, SectionHeading, SkeletonCard } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'
import { ListCheckIcon, ScaleIcon, ShieldIcon } from '../components/ui/icons'
import { CompareButton } from '../components/engagement/list-buttons'

export function meta() {
  return buildMeta({
    title: 'Compare Products',
    description:
      'Compare products side by side on published, category-specific criteria — the same criteria for every product, with trade-offs made visible.',
    path: '/compare',
    noIndex: true,
  })
}

const criteria = [
  {
    icon: <ListCheckIcon className="h-6 w-6" />,
    title: 'Published criteria',
    text: 'Each category has a fixed set of comparison criteria, published before any product is scored against them. Criteria never change per product.',
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: 'Real specifications',
    text: 'Comparisons are built from verified product specifications held in the catalog — never from marketing claims or copied review scores.',
  },
  {
    icon: <ScaleIcon className="h-6 w-6" />,
    title: 'Trade-offs visible',
    text: 'A cheaper product that gives something up says what it gives up. The comparison highlights differences instead of hiding them.',
  },
]

const criteriaAreas = [
  {
    category: 'Home Office & Productivity',
    rows: [
      'Ergonomics & posture support',
      'Adjustability range',
      'Build quality & warranty',
      'Footprint & desk fit',
      'Assembly & maintenance',
    ],
  },
  {
    category: 'Electronics Accessories',
    rows: [
      'Compatibility with your devices',
      'Power delivery & charging speed',
      'Ports & standards supported',
      'Cable & connector quality',
      'Safety certifications',
    ],
  },
]

// ---------------------------------------------------------------------------
// Client comparison (localStorage slugs -> public catalog API)
// ---------------------------------------------------------------------------

interface CompareSpec {
  key: string
  label: string
  unit: string | null
  value: number | string | boolean | null
  isComparisonCriterion: boolean
}

interface CompareProduct {
  slug: string
  name: string
  brand: string | null
  category: string
  categorySlug: string
  summary: string | null
  specs: CompareSpec[]
}

type LoadState = { status: 'loading' } | { status: 'ready'; products: CompareProduct[]; removedCount: number }

async function fetchProduct(slug: string): Promise<CompareProduct | 'missing' | 'error'> {
  try {
    const res = await fetch(`/api/v1/products/${slug}`)
    if (res.status === 404) return 'missing'
    if (!res.ok) return 'error'
    const body = (await res.json()) as { data?: CompareProduct }
    return body.data ?? 'error'
  } catch {
    return 'error'
  }
}

function formatSpecValue(spec: CompareSpec | undefined): string {
  // NEVER invent a value: a missing spec, or a null value, is stated as such.
  if (!spec || spec.value === null || spec.value === undefined) return 'Not specified'
  if (typeof spec.value === 'boolean') return spec.value ? 'Yes' : 'No'
  if (typeof spec.value === 'number') return spec.unit ? `${spec.value} ${spec.unit}` : String(spec.value)
  return spec.value
}

/** Union of spec labels: first product's order, then new labels appended. */
function unionSpecLabels(products: CompareProduct[]): string[] {
  const labels: string[] = []
  const seen = new Set<string>()
  for (const product of products) {
    for (const spec of product.specs) {
      if (seen.has(spec.label)) continue
      seen.add(spec.label)
      labels.push(spec.label)
    }
  }
  return labels
}

function specFor(product: CompareProduct, label: string): CompareSpec | undefined {
  return product.specs.find((s) => s.label === label)
}

function ComparisonSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const requestRef = useRef(0)
  // Set while a pruning save is dispatching its change event, so the
  // subscription below does not immediately refetch what we just loaded.
  const selfNotifyRef = useRef(false)

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current
    const current = loadList(COMPARE_KEY, MAX_COMPARE)
    if (current.length === 0) {
      setState({ status: 'ready', products: [], removedCount: 0 })
      return
    }
    setState({ status: 'loading' })
    const results = await Promise.all(current.map((slug) => fetchProduct(slug)))
    if (requestRef.current !== requestId) return
    const products: CompareProduct[] = []
    const keptSlugs: string[] = []
    let removedCount = 0
    results.forEach((result, i) => {
      if (result === 'missing') {
        // No longer published: exclude it, count it, and prune it below.
        removedCount += 1
      } else if (result === 'error') {
        // Transient failure: keep the slug so a later visit can retry.
        keptSlugs.push(current[i])
      } else {
        products.push(result)
        keptSlugs.push(current[i])
      }
    })
    if (removedCount > 0) {
      selfNotifyRef.current = true
      saveList(COMPARE_KEY, keptSlugs)
      selfNotifyRef.current = false
    }
    setState({ status: 'ready', products, removedCount })
  }, [])

  useEffect(() => {
    void refresh()
    return subscribeLists(() => {
      if (selfNotifyRef.current) return
      void refresh()
    })
  }, [refresh])

  function removeFromCompare(slug: string) {
    const next = loadList(COMPARE_KEY, MAX_COMPARE).filter((s) => s !== slug)
    selfNotifyRef.current = true
    saveList(COMPARE_KEY, next)
    selfNotifyRef.current = false
    // Optimistic local update; the subscription is suppressed for our own
    // save above, so no refetch is needed for the remaining products.
    setState((prev) =>
      prev.status === 'ready' ? { ...prev, products: prev.products.filter((p) => p.slug !== slug) } : prev,
    )
  }

  if (state.status === 'loading') {
    return (
      <section aria-labelledby="comparison-heading" className="mt-10">
        <SectionHeading titleId="comparison-heading" eyebrow="Your comparison" title="Side by side" />
        <div className="mt-6 grid gap-5 sm:grid-cols-2" aria-label="Loading your comparison">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </section>
    )
  }

  const { products, removedCount } = state
  const labels = unionSpecLabels(products)

  return (
    <section aria-labelledby="comparison-heading" className="mt-10">
      <SectionHeading
        titleId="comparison-heading"
        eyebrow="Your comparison"
        title="Side by side"
        intro="Built from the verified specifications held in the catalog. A specification a product does not have is shown as “Not specified” — never filled in or guessed."
      />

      {removedCount > 0 && (
        <div
          role="status"
          className="mt-6 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100"
        >
          {removedCount} saved products are no longer available and were removed from this list.
        </div>
      )}

      {products.length < 2 && (
        <div className="mt-6">
          <EmptyState title="Add at least two products to compare">
            {products.length === 1
              ? 'You have one product in your comparison. Add at least one more from a category or product page — use the Compare button — and the side-by-side table will appear here.'
              : 'You have not added any products yet. Browse a category or open a product page and use the Compare button (up to four products), then come back here to see them side by side.'}
          </EmptyState>
          {products.length === 1 && (
            <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white p-5 ring-1 ring-navy-100">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-navy-950">
                  <Link to={`/product/${products[0].slug}`} className="hover:text-teal-800 hover:underline">
                    {products[0].name}
                  </Link>
                </p>
                {products[0].brand && <p className="text-sm text-smoke">{products[0].brand}</p>}
              </div>
              <CompareButton slug={products[0].slug} />
            </div>
          )}
        </div>
      )}

      {products.length >= 2 && (
        <>
          {/* Desktop / tablet: aligned specifications table (md and up). */}
          <div className="mt-6 hidden overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100 md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100">
                  <th scope="col" className="w-48 px-5 py-4 align-top font-semibold text-navy-950">
                    Specification
                  </th>
                  {products.map((product) => (
                    <th key={product.slug} scope="col" className="px-5 py-4 align-top">
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-semibold text-navy-950 hover:text-teal-800 hover:underline"
                      >
                        {product.name}
                      </Link>
                      {product.brand && (
                        <span className="mt-0.5 block text-xs font-medium text-smoke">{product.brand}</span>
                      )}
                      <span className="mt-3 block">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCompare(product.slug)}
                          aria-label={`Remove ${product.name} from comparison`}
                        >
                          Remove
                        </Button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100">
                {labels.map((label) => (
                  <tr key={label}>
                    <th scope="row" className="px-5 py-3.5 align-top font-medium text-navy-900">
                      {label}
                    </th>
                    {products.map((product) => (
                      <td key={product.slug} className="px-5 py-3.5 align-top text-navy-900">
                        {formatSpecValue(specFor(product, label))}
                      </td>
                    ))}
                  </tr>
                ))}
                {labels.length === 0 && (
                  <tr>
                    <td colSpan={products.length + 1} className="px-5 py-4 text-smoke">
                      No specifications are published for these products yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile: one stacked panel per product, criterion labels kept
              visible — never a sideways-scrolling table (page promise). */}
          <div className="mt-6 space-y-5 md:hidden">
            {products.map((product) => (
              <div key={product.slug} className="rounded-2xl bg-white p-5 ring-1 ring-navy-100">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy-950">
                      <Link to={`/product/${product.slug}`} className="hover:text-teal-800 hover:underline">
                        {product.name}
                      </Link>
                    </p>
                    {product.brand && <p className="mt-0.5 text-sm text-smoke">{product.brand}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromCompare(product.slug)}
                    aria-label={`Remove ${product.name} from comparison`}
                  >
                    Remove
                  </Button>
                </div>
                {labels.length > 0 ? (
                  <dl className="mt-4 divide-y divide-navy-100">
                    {labels.map((label) => (
                      <div key={label} className="flex gap-4 py-2.5 text-sm">
                        <dt className="w-2/5 shrink-0 font-medium text-navy-900">{label}</dt>
                        <dd className="flex-1 text-navy-900">{formatSpecValue(specFor(product, label))}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="mt-4 text-sm text-smoke">
                    No specifications are published for this product yet.
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default function Compare() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Compare' }]} />
      <div className="pt-6">
        <PageHeader
          title="Compare products, honestly"
          intro="Pick two to four products in a category and see them side by side on the criteria that actually decide the purchase. On mobile, a comparison becomes one stacked panel per product with the criterion labels kept visible — never a table you have to scroll sideways."
        />
      </div>

      <ComparisonSection />

      {/* Published methodology — kept below the working comparison. */}
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {criteria.map((c) => (
          <Card key={c.title} className="h-full">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
              {c.icon}
            </span>
            <div className="mt-4">
              <CardTitle>{c.title}</CardTitle>
              <CardText>{c.text}</CardText>
            </div>
          </Card>
        ))}
      </div>

      <section aria-labelledby="criteria-heading" className="mt-12">
        <SectionHeading
          titleId="criteria-heading"
          eyebrow="Why these criteria"
          title="The rows every comparison is judged on"
          intro="These are the criterion areas fixed for the two launch categories. When products are published, each row is scored from verified specifications — and the reasoning is shown, not just the result."
        />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {criteriaAreas.map((area) => (
            <div
              key={area.category}
              className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
            >
              <h3 className="font-semibold text-navy-950">{area.category}</h3>
              <ul className="mt-4 space-y-2.5">
                {area.rows.map((row) => (
                  <li key={row} className="flex items-start gap-2.5 text-sm leading-6 text-navy-900">
                    <span className="mt-0.5 text-teal-800">
                      <ListCheckIcon className="h-4 w-4" />
                    </span>
                    {row}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
