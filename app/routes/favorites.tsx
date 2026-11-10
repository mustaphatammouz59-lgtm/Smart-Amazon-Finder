import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { buildMeta } from '../lib/seo'
import { FAVORITES_KEY, MAX_FAVORITES, loadList, saveList, subscribeLists } from '../lib/client-lists'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle, SkeletonCard } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'
import { FavoriteButton } from '../components/engagement/list-buttons'

export function meta() {
  return buildMeta({
    title: 'Your favorites',
    description:
      'Products you saved on this device. Favorites are stored only in this browser — no account, no sync.',
    path: '/favorites',
    noIndex: true,
  })
}

/** Client-rendered page: no loader data — the list lives in localStorage. */
export function loader() {
  return null
}

interface FavoriteProduct {
  slug: string
  name: string
  brand: string | null
  category: string
  categorySlug: string
  summary: string | null
}

type LoadState =
  { status: 'loading' } | { status: 'ready'; products: FavoriteProduct[]; removedCount: number }

async function fetchProduct(slug: string): Promise<FavoriteProduct | 'missing' | 'error'> {
  try {
    const res = await fetch(`/api/v1/products/${slug}`)
    if (res.status === 404) return 'missing'
    if (!res.ok) return 'error'
    const body = (await res.json()) as { data?: FavoriteProduct }
    return body.data ?? 'error'
  } catch {
    return 'error'
  }
}

export default function Favorites() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  // Keep the rendered cards in step with the list: removing a favorite via
  // its own button (or in another tab) drops the card without a reload.
  useEffect(() => {
    return subscribeLists(() => {
      const current = new Set(loadList(FAVORITES_KEY, MAX_FAVORITES))
      setState((prev) =>
        prev.status === 'ready'
          ? { ...prev, products: prev.products.filter((p) => current.has(p.slug)) }
          : prev,
      )
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const slugs = loadList(FAVORITES_KEY, MAX_FAVORITES)
    if (slugs.length === 0) {
      setState({ status: 'ready', products: [], removedCount: 0 })
      return
    }
    void (async () => {
      const results = await Promise.all(slugs.map((slug) => fetchProduct(slug)))
      if (cancelled) return
      const products: FavoriteProduct[] = []
      const keptSlugs: string[] = []
      let removedCount = 0
      results.forEach((result, i) => {
        if (result === 'missing') {
          // No longer published: exclude it, count it, and prune it below.
          removedCount += 1
        } else if (result === 'error') {
          // Transient failure: keep the slug so a later visit can retry.
          keptSlugs.push(slugs[i])
        } else {
          products.push(result)
          keptSlugs.push(slugs[i])
        }
      })
      if (removedCount > 0) saveList(FAVORITES_KEY, keptSlugs)
      setState({ status: 'ready', products, removedCount })
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Favorites' }]} />
      <div className="pt-6">
        <PageHeader
          title="Your favorites"
          intro="Saved on this device only — favorites live in this browser's local storage, with no account and no sync. Clearing site data removes them."
        />
      </div>

      {state.status === 'loading' && (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading your favorites">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {state.status === 'ready' && state.removedCount > 0 && (
        <div
          role="status"
          className="mt-8 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100"
        >
          {state.removedCount} saved products are no longer available and were removed from this list.
        </div>
      )}

      {state.status === 'ready' && state.products.length === 0 && (
        <div className="mt-8">
          <EmptyState title="No favorites yet">
            You have not saved any products yet. Use the Save button on a product or category page and it will
            appear here — on this device only.
          </EmptyState>
        </div>
      )}

      {state.status === 'ready' && state.products.length > 0 && (
        // Prices are intentionally NOT rendered on these cards: price display
        // happens on the product page, under the price policy (authorised
        // source + observed-at timestamp). This list shows identity only.
        <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {state.products.map((product) => (
            <li key={product.slug}>
              <Card className="flex h-full flex-col">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">
                  {product.category}
                </p>
                <div className="mt-2">
                  <CardTitle>
                    <Link to={`/product/${product.slug}`} className="hover:text-teal-800 hover:underline">
                      {product.name}
                    </Link>
                  </CardTitle>
                  {product.brand && <p className="mt-1 text-sm font-medium text-navy-900">{product.brand}</p>}
                  {product.summary && <CardText>{product.summary}</CardText>}
                </div>
                <div className="mt-4 flex-1" />
                <div className="flex flex-wrap items-center gap-2">
                  <FavoriteButton slug={product.slug} />
                  <Link
                    to={`/product/${product.slug}`}
                    className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
                  >
                    View product
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
