import { Form, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/categories'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
  type CategoryRow,
} from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader, ConfirmButton, FlashBanner, SectionCard } from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select, Textarea } from '../../components/ui/ui'
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

function inUseMessage(counts: {
  products: number
  children: number
  definitions: number
  guides: number
}): string {
  const parts: string[] = []
  if (counts.products > 0) parts.push(`${counts.products} products`)
  if (counts.children > 0) parts.push(`${counts.children} child categories`)
  if (counts.definitions > 0) parts.push(`${counts.definitions} attribute definitions`)
  if (counts.guides > 0) parts.push(`${counts.guides} buying guides`)
  return `In use: ${parts.join(', ')}`
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'categories', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const rows = await listCategories(ctx.db)
  const byParent = new Map<number | null, CategoryRow[]>()
  for (const row of rows) {
    const siblings = byParent.get(row.parent_id) ?? []
    siblings.push(row)
    byParent.set(row.parent_id, siblings)
  }
  const byOrder = (a: CategoryRow, b: CategoryRow) =>
    a.sort_order - b.sort_order || a.name.localeCompare(b.name)
  const ordered: Array<CategoryRow & { depth: number }> = []
  const walk = (parentId: number | null, depth: number) => {
    for (const child of (byParent.get(parentId) ?? []).slice().sort(byOrder)) {
      ordered.push({ ...child, depth })
      walk(child.id, depth + 1)
    }
  }
  walk(null, 0)
  const placed = new Set(ordered.map((row) => row.id))
  for (const row of rows) {
    if (!placed.has(row.id)) ordered.push({ ...row, depth: 0 })
  }
  const url = new URL(request.url)
  return { categories: ordered, all: rows, flash: url.searchParams.get('flash') }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'categories', 'write')
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
    const result = await createCategory(ctx.db, ctx.actor, {
      slug,
      name,
      description: optStr(formData, 'description'),
      parentId: optInt(formData, 'parentId'),
      sortOrder: optInt(formData, 'sortOrder') ?? 0,
      isIndexable: formData.get('isIndexable') === 'on',
    })
    if ('conflict' in result) {
      if (result.conflict === 'slug') return { errors: { slug: 'A category with this slug already exists.' } }
      return { errors: { parentId: 'The selected parent category does not exist.' } }
    }
    return redirect('/admin/categories?flash=Category created.')
  }

  if (intent === 'update') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing category id.' } }
    const name = str(formData, 'name')
    if (!name) return { errors: { name: 'Name is required.' } }
    const result = await updateCategory(ctx.db, ctx.actor, id, {
      name,
      description: optStr(formData, 'description'),
      parentId: optInt(formData, 'parentId'),
      sortOrder: optInt(formData, 'sortOrder') ?? 0,
      isIndexable: formData.get('isIndexable') === 'on',
    })
    if (!result.ok) {
      if (result.reason === 'cycle') return { errors: { parentId: 'That parent would create a cycle.' } }
      if (result.reason === 'unknown_parent')
        return { errors: { parentId: 'The selected parent category does not exist.' } }
      return { errors: { form: 'Category not found.' } }
    }
    return redirect('/admin/categories?flash=Category updated.')
  }

  if (intent === 'delete') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing category id.' } }
    const result = await deleteCategory(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use' && result.counts) {
        return {
          errors: {
            delete: `${inUseMessage({
              products: result.counts.products,
              children: result.counts.children,
              definitions: result.counts.definitions,
              guides: result.counts.guides,
            })} — reassign or remove those first.`,
          },
        }
      }
      return { errors: { form: 'Category not found.' } }
    }
    return redirect('/admin/categories?flash=Category deleted.')
  }

  return { errors: { form: 'Unknown action.' } }
}

export default function CategoriesPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined

  return (
    <div className="space-y-6">
      <AdminHeader title="Categories" description="Category tree, ordering and indexability." />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      <SectionCard title="New category">
        <Form method="post" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create" />
          <div>
            <Label htmlFor="cat-slug">Slug</Label>
            <Input id="cat-slug" name="slug" required placeholder="home-office" />
          </div>
          <div>
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" name="name" required placeholder="Home Office" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="cat-description">Description</Label>
            <Textarea id="cat-description" name="description" rows={2} />
          </div>
          <div>
            <Label htmlFor="cat-parent">Parent category</Label>
            <Select id="cat-parent" name="parentId" defaultValue="">
              <option value="">— none —</option>
              {data.all.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="cat-sort">Sort order</Label>
            <Input id="cat-sort" name="sortOrder" type="number" defaultValue={0} />
          </div>
          <label className="flex items-center gap-2 text-sm text-navy-950">
            <input type="checkbox" name="isIndexable" defaultChecked className="h-4 w-4" />
            Indexable (include in sitemap and search indexes)
          </label>
          <div className="sm:col-span-2">
            <Button type="submit">Create category</Button>
          </div>
        </Form>
      </SectionCard>

      <SectionCard title="All categories">
        {data.categories.length === 0 ? (
          <EmptyState title="No categories yet">
            Create the first category above. Products, attribute definitions and guides attach to categories.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Slug</th>
                  <th className="py-2 pr-4 font-semibold">Parent</th>
                  <th className="py-2 pr-4 font-semibold">Products</th>
                  <th className="py-2 pr-4 font-semibold">Children</th>
                  <th className="py-2 pr-4 font-semibold">Definitions</th>
                  <th className="py-2 pr-4 font-semibold">Guides</th>
                  <th className="py-2 pr-4 font-semibold">Indexable</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.categories.map((category) => {
                  const counts = {
                    products: category.products_count,
                    children: category.children_count,
                    definitions: category.definitions_count,
                    guides: category.guides_count,
                  }
                  const total = counts.products + counts.children + counts.definitions + counts.guides
                  const inUse = total > 0
                  return (
                    <tr key={category.id} className="border-b border-navy-50 align-top">
                      <td className="py-3 pr-4 font-medium text-navy-950">
                        <span style={{ paddingLeft: `${category.depth * 1.25}rem` }}>
                          {category.depth > 0 ? '↳ ' : ''}
                          {category.name}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-smoke">{category.slug}</td>
                      <td className="py-3 pr-4 text-smoke">{category.parent_slug ?? '—'}</td>
                      <td className="py-3 pr-4">{category.products_count}</td>
                      <td className="py-3 pr-4">{category.children_count}</td>
                      <td className="py-3 pr-4">{category.definitions_count}</td>
                      <td className="py-3 pr-4">{category.guides_count}</td>
                      <td className="py-3 pr-4">{category.is_indexable ? 'Yes' : 'No'}</td>
                      <td className="py-3">
                        <details>
                          <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                          <Form method="post" className="mt-3 grid min-w-64 gap-3">
                            <input type="hidden" name="intent" value="update" />
                            <input type="hidden" name="id" value={category.id} />
                            <div>
                              <Label htmlFor={`cat-${category.id}-name`}>Name</Label>
                              <Input
                                id={`cat-${category.id}-name`}
                                name="name"
                                required
                                defaultValue={category.name}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`cat-${category.id}-description`}>Description</Label>
                              <Textarea
                                id={`cat-${category.id}-description`}
                                name="description"
                                rows={2}
                                defaultValue={category.description ?? ''}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`cat-${category.id}-parent`}>Parent category</Label>
                              <Select
                                id={`cat-${category.id}-parent`}
                                name="parentId"
                                defaultValue={category.parent_id ?? ''}
                              >
                                <option value="">— none —</option>
                                {data.all
                                  .filter((other) => other.id !== category.id)
                                  .map((other) => (
                                    <option key={other.id} value={other.id}>
                                      {other.name}
                                    </option>
                                  ))}
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`cat-${category.id}-sort`}>Sort order</Label>
                              <Input
                                id={`cat-${category.id}-sort`}
                                name="sortOrder"
                                type="number"
                                defaultValue={category.sort_order}
                              />
                            </div>
                            <label className="flex items-center gap-2 text-sm text-navy-950">
                              <input
                                type="checkbox"
                                name="isIndexable"
                                defaultChecked={category.is_indexable === 1}
                                className="h-4 w-4"
                              />
                              Indexable
                            </label>
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
                              title={`${inUseMessage(counts)} — reassign or remove those first.`}
                            >
                              Delete
                            </Button>
                            <p className="mt-1 text-xs text-smoke">
                              {inUseMessage(counts)} — reassign or remove those first.
                            </p>
                          </div>
                        ) : (
                          <Form method="post" className="mt-2">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={category.id} />
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
