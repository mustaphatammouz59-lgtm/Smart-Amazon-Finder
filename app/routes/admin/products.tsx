import { Link, useLoaderData, useSearchParams } from 'react-router'
import type { Route } from './+types/products'
import { adminContext } from '../../lib/admin-page'
import { listAdminProducts } from '../../lib/db/admin-products'
import { listBrands, listCategories } from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader, FlashBanner, Pagination, StatusBadge } from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'
import { Button, Input, Label, LinkButton, Select } from '../../components/ui/ui'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'products', 'read')
  if (!ctx.ok) {
    return {
      denied: ctx.status as 401 | 403,
      items: [] as Awaited<ReturnType<typeof listAdminProducts>>['items'],
      nextCursor: null as string | null,
      categories: [] as Awaited<ReturnType<typeof listCategories>>,
      brands: [] as Awaited<ReturnType<typeof listBrands>>,
      filters: { q: '', status: '', validation: '', category: '', brand: '' },
      flash: null as string | null,
    }
  }
  const url = new URL(request.url)
  const filters = {
    q: url.searchParams.get('q') ?? '',
    status: url.searchParams.get('status') ?? '',
    validation: url.searchParams.get('validation') ?? '',
    category: url.searchParams.get('category') ?? '',
    brand: url.searchParams.get('brand') ?? '',
  }
  const { items, nextCursor } = await listAdminProducts(ctx.db, {
    q: filters.q || undefined,
    status: filters.status || undefined,
    validationStatus: filters.validation || undefined,
    categorySlug: filters.category || undefined,
    brandSlug: filters.brand || undefined,
    cursor: url.searchParams.get('cursor'),
  })
  const categories = await listCategories(ctx.db)
  const brands = await listBrands(ctx.db)
  return {
    denied: null as 401 | 403 | null,
    items,
    nextCursor,
    categories,
    brands,
    filters,
    flash: url.searchParams.get('flash'),
  }
}

export default function AdminProducts() {
  const { denied, items, nextCursor, categories, brands, filters, flash } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()

  if (denied) {
    return <AdminDenied status={denied} />
  }

  const hasFilters = Boolean(
    filters.q || filters.status || filters.validation || filters.category || filters.brand,
  )

  function hrefFor(cursor: string): string {
    const params = new URLSearchParams(searchParams)
    params.set('cursor', cursor)
    return `/admin/products?${params.toString()}`
  }

  return (
    <div>
      <AdminHeader title="Products" description="Search and filter the catalog. Select a product to edit it.">
        <LinkButton to="/admin/products/new">Add product</LinkButton>
      </AdminHeader>
      <FlashBanner message={flash} />

      <form method="get" className="mb-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <Label htmlFor="field-q">Search</Label>
            <Input
              id="field-q"
              name="q"
              type="search"
              defaultValue={filters.q}
              placeholder="Name, slug or model"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="field-status">Status</Label>
            <Select id="field-status" name="status" defaultValue={filters.status} className="mt-1.5">
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="in_review">In review</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="field-validation">Validation</Label>
            <Select
              id="field-validation"
              name="validation"
              defaultValue={filters.validation}
              className="mt-1.5"
            >
              <option value="">All validation states</option>
              <option value="pending">Pending</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="field-category">Category</Label>
            <Select id="field-category" name="category" defaultValue={filters.category} className="mt-1.5">
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="field-brand">Brand</Label>
            <Select id="field-brand" name="brand" defaultValue={filters.brand} className="mt-1.5">
              <option value="">All brands</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">Apply filters</Button>
          {hasFilters ? (
            <Link
              to="/admin/products"
              className="text-sm font-medium text-teal-800 underline underline-offset-2"
            >
              Clear filters
            </Link>
          ) : null}
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState title={hasFilters ? 'No products match' : 'No products yet'}>
          <p>
            {hasFilters
              ? 'Try widening the filters, or clear them to see the whole catalog.'
              : 'The catalog is empty. Add your first product to get started.'}
          </p>
          {!hasFilters ? (
            <div className="mt-4">
              <LinkButton to="/admin/products/new">Add your first product</LinkButton>
            </div>
          ) : null}
        </EmptyState>
      ) : (
        <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-navy-100">
          <table className="w-full min-w-[52rem] text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-smoke">
                <th scope="col" className="px-5 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Slug
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Category
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Brand
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Validation
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Licence
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-navy-100 last:border-0">
                  <td className="px-5 py-3">
                    <Link
                      to={`/admin/products/${item.id}`}
                      className="font-medium text-teal-800 underline-offset-2 hover:underline"
                    >
                      {item.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-smoke">{item.slug}</td>
                  <td className="px-5 py-3">{item.category_name}</td>
                  <td className="px-5 py-3">{item.brand_name ?? '—'}</td>
                  <td className="px-5 py-3">
                    <StatusBadge value={item.status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge value={item.validation_status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge value={item.licence_status} />
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-smoke">{item.updated_at}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination nextCursor={nextCursor} hrefFor={hrefFor} />
    </div>
  )
}
