import { env } from 'cloudflare:workers'
import { Form, Link, useLoaderData } from 'react-router'
import type { Route } from './+types/category'
import { buildMeta } from '../lib/seo'
import { getCategoryBySlug, listProducts } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'
import type { ProductCard } from '../lib/db/types'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { EmptyState } from '../components/state/states'
import { Button, Card, Label, Select } from '../components/ui/ui'
import { CompareButton, FavoriteButton } from '../components/engagement/list-buttons'

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return buildMeta({
      title: 'Category Not Found',
      description: 'The category you requested could not be found.',
      path: '/category',
      noIndex: true,
    })
  }
  const { categoryDetail } = loaderData
  const name = categoryDetail.category.name
  return buildMeta({
    title: name,
    description: categoryDetail.category.description ?? `Published products in the ${name} category.`,
    path: `/category/${categoryDetail.category.slug}`,
  })
}

export async function loader({ params, request }: Route.LoaderArgs) {
  const db = (env as Env).DB as D1Database
  const includeFixtures = fixturesEnabled(env)
  const categoryDetail = await getCategoryBySlug(db, params.slug)
  if (!categoryDetail) {
    throw new Response('Not Found', { status: 404 })
  }
  const url = new URL(request.url)
  const sortParam = url.searchParams.get('sort')
  const sort: 'name' | 'newest' = sortParam === 'newest' ? 'newest' : 'name'
  const cursor = url.searchParams.get('cursor')
  const categorySlugs = [categoryDetail.category.slug, ...categoryDetail.children.map((child) => child.slug)]
  const result = await listProducts(db, {
    categorySlugs,
    sort,
    cursor,
    limit: 24,
    includeFixtures,
  })
  return {
    categoryDetail,
    items: result.items,
    nextCursor: result.nextCursor,
    sort,
  }
}

function formatCardPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function ProductGridCard({ card }: { card: ProductCard }) {
  return (
    <Card className="flex h-full flex-col">
      {card.brand && <p className="text-xs font-semibold uppercase tracking-wide text-smoke">{card.brand}</p>}
      <div className="mt-1.5">
        <Link
          to={`/product/${card.slug}`}
          className="text-lg font-semibold text-navy-950 underline-offset-2 hover:text-teal-800 hover:underline"
        >
          {card.name}
        </Link>
      </div>
      {card.summary && (
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-smoke">{card.summary}</p>
      )}
      {card.price_cents !== null && (
        <p className="mt-3 text-base font-semibold text-navy-950">{formatCardPrice(card.price_cents)}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <FavoriteButton slug={card.slug} />
        <CompareButton slug={card.slug} />
      </div>
    </Card>
  )
}

export default function CategoryPage() {
  const { categoryDetail, items, nextCursor, sort } = useLoaderData<typeof loader>()
  const { category, parent, children } = categoryDetail

  const trail: { label: string; to?: string }[] = [{ label: 'Home', to: '/' }]
  if (parent) {
    trail.push({ label: parent.name, to: `/category/${parent.slug}` })
  }
  trail.push({ label: category.name })

  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={trail} />
      <div className="pt-6">
        <PageHeader title={category.name} intro={category.description ?? undefined} />
      </div>

      {children.length > 0 && (
        <nav aria-label="Subcategories" className="mt-6">
          <ul className="flex flex-wrap gap-2">
            {children.map((child) => (
              <li key={child.slug}>
                <Link
                  to={`/category/${child.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-900 ring-1 ring-navy-200 transition-colors hover:bg-navy-50 hover:ring-teal-700"
                >
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="mt-8 flex flex-wrap items-end justify-between gap-4">
        <h2 className="text-xl font-bold text-navy-950">Products</h2>
        <Form method="get" className="flex items-end gap-2">
          <div>
            <Label htmlFor="field-sort">Sort by</Label>
            <Select id="field-sort" name="sort" defaultValue={sort} className="mt-1.5 w-44">
              <option value="name">Name</option>
              <option value="newest">Newest</option>
            </Select>
          </div>
          <Button type="submit" variant="secondary">
            Sort
          </Button>
        </Form>
      </div>

      {items.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="No published products yet in this category">
            Products appear here once they are published and have passed validation. Check back soon, or
            browse a related category.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((card) => (
            <ProductGridCard key={card.slug} card={card} />
          ))}
        </div>
      )}

      {nextCursor && (
        <div className="mt-8">
          <Link
            to={`/category/${category.slug}?cursor=${encodeURIComponent(nextCursor)}&sort=${sort}`}
            className="inline-flex min-h-11 items-center rounded-lg bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            Next page
          </Link>
        </div>
      )}
    </div>
  )
}
