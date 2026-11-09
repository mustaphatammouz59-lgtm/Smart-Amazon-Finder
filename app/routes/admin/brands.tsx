import { Form, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/brands'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import { createBrand, deleteBrand, listBrands, updateBrand } from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader, ConfirmButton, FlashBanner, SectionCard } from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label } from '../../components/ui/ui'
import { EmptyState } from '../../components/state/states'

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function optStr(formData: FormData, name: string): string | null {
  const value = str(formData, name)
  return value === '' ? null : value
}

function optInt(formData: FormData, name: string): number | null {
  const value = str(formData, name)
  if (value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'brands', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const brands = await listBrands(ctx.db)
  const url = new URL(request.url)
  return { brands, flash: url.searchParams.get('flash') }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'brands', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const formData = await request.formData()
  const intent = str(formData, 'intent')

  if (intent === 'create') {
    const slug = str(formData, 'slug')
    const name = str(formData, 'name')
    const errors: Record<string, string> = {}
    if (!slug) errors.slug = 'Slug is required.'
    if (!name) errors.name = 'Name is required.'
    if (Object.keys(errors).length > 0) return { errors }
    const result = await createBrand(ctx.db, ctx.actor, {
      slug,
      name,
      websiteUrl: optStr(formData, 'websiteUrl'),
    })
    if ('conflict' in result) return { errors: { slug: 'A brand with this slug already exists.' } }
    return redirect('/admin/brands?flash=Brand created.')
  }

  if (intent === 'update') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing brand id.' } }
    const name = str(formData, 'name')
    if (!name) return { errors: { name: 'Name is required.' } }
    const result = await updateBrand(ctx.db, ctx.actor, id, {
      name,
      websiteUrl: optStr(formData, 'websiteUrl'),
    })
    if (!result.ok) return { errors: { form: 'Brand not found.' } }
    return redirect('/admin/brands?flash=Brand updated.')
  }

  if (intent === 'delete') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing brand id.' } }
    const result = await deleteBrand(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use' && result.counts) {
        return {
          errors: {
            delete: `In use by ${result.counts.products} products — reassign those products first.`,
          },
        }
      }
      return { errors: { form: 'Brand not found.' } }
    }
    return redirect('/admin/brands?flash=Brand deleted.')
  }

  return { errors: { form: 'Unknown action.' } }
}

export default function BrandsPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined

  return (
    <div className="space-y-6">
      <AdminHeader title="Brands" description="Brand directory. Slugs are fixed once created." />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      <SectionCard title="New brand">
        <Form method="post" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create" />
          <div>
            <Label htmlFor="brand-slug">Slug</Label>
            <Input id="brand-slug" name="slug" required placeholder="acme" />
          </div>
          <div>
            <Label htmlFor="brand-name">Name</Label>
            <Input id="brand-name" name="name" required placeholder="Acme" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="brand-website">Website URL</Label>
            <Input id="brand-website" name="websiteUrl" type="url" placeholder="https://example.com" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create brand</Button>
          </div>
        </Form>
      </SectionCard>

      <SectionCard title="All brands">
        {data.brands.length === 0 ? (
          <EmptyState title="No brands yet">Create the first brand above.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Slug</th>
                  <th className="py-2 pr-4 font-semibold">Website</th>
                  <th className="py-2 pr-4 font-semibold">Products</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.brands.map((brand) => {
                  const inUse = brand.products_count > 0
                  return (
                    <tr key={brand.id} className="border-b border-navy-50 align-top">
                      <td className="py-3 pr-4 font-medium text-navy-950">{brand.name}</td>
                      <td className="py-3 pr-4 text-smoke">{brand.slug}</td>
                      <td className="py-3 pr-4 text-smoke">
                        {brand.website_url ? (
                          <a
                            href={brand.website_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-teal-800 underline underline-offset-2"
                          >
                            {brand.website_url}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4">{brand.products_count}</td>
                      <td className="py-3">
                        <details>
                          <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                          <Form method="post" className="mt-3 grid min-w-64 gap-3">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id" value={brand.id} />
                            <div>
                              <Label htmlFor={`brand-${brand.id}-name`}>Name</Label>
                              <Input
                                id={`brand-${brand.id}-name`}
                                name="name"
                                required
                                defaultValue={brand.name}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`brand-${brand.id}-website`}>Website URL</Label>
                              <Input
                                id={`brand-${brand.id}-website`}
                                name="websiteUrl"
                                type="url"
                                defaultValue={brand.website_url ?? ''}
                              />
                            </div>
                            <Button type="submit" size="sm">
                              Save changes
                            </Button>
                          </Form>
                        </details>
                        {inUse ? (
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled
                              title={`In use by ${brand.products_count} products — reassign those products first.`}
                            >
                              Delete
                            </Button>
                            <p className="mt-1 text-xs text-smoke">
                              In use by {brand.products_count} products — reassign those products first.
                            </p>
                          </div>
                        ) : (
                          <Form method="post" className="mt-2">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={brand.id} />
                            <ConfirmButton label="Delete" />
                          </Form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
