import { redirect, useActionData, useLoaderData } from 'react-router'
import { z } from 'zod'
import type { Route } from './+types/product-new'
import { adminContext } from '../../lib/admin-page'
import { ApiError } from '../../lib/api'
import { assertSameOrigin } from '../../lib/origin'
import { createProduct } from '../../lib/db/admin'
import { listBrands, listCategories } from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader } from '../../components/admin/ui'
import { Button, ErrorSummary, FieldError, Input, Label, Select, Textarea } from '../../components/ui/ui'

const createSchema = z.object({
  categorySlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Category is required.'),
  brandSlug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric segments joined by hyphens.'),
  name: z.string().trim().min(3, 'Name must be at least 3 characters.').max(160),
  modelRef: z.string().trim().max(120).optional(),
  editorialSummary: z.string().trim().max(2000).optional(),
})

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'products', 'write')
  if (!ctx.ok) {
    return {
      denied: ctx.status as 401 | 403,
      categories: [] as Awaited<ReturnType<typeof listCategories>>,
      brands: [] as Awaited<ReturnType<typeof listBrands>>,
    }
  }
  const categories = await listCategories(ctx.db)
  const brands = await listBrands(ctx.db)
  return { denied: null as 401 | 403 | null, categories, brands }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'products', 'write')
  if (!ctx.ok) return { denied: ctx.status as 401 | 403, errors: {} as Record<string, string> }
  try {
    assertSameOrigin(request)
  } catch (error) {
    if (error instanceof ApiError) return { denied: 403 as 401 | 403, errors: {} as Record<string, string> }
    throw error
  }
  const formData = await request.formData()
  const raw: Record<string, string | undefined> = {
    categorySlug: String(formData.get('categorySlug') ?? '') || undefined,
    brandSlug: String(formData.get('brandSlug') ?? '') || undefined,
    slug: String(formData.get('slug') ?? ''),
    name: String(formData.get('name') ?? ''),
    modelRef: String(formData.get('modelRef') ?? '') || undefined,
    editorialSummary: String(formData.get('editorialSummary') ?? '') || undefined,
  }
  const parsed = createSchema.safeParse(raw)
  if (!parsed.success) {
    const errors: Record<string, string> = {}
    for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? 'form')] = issue.message
    return { denied: null, errors }
  }
  const result = await createProduct(ctx.db, ctx.actor, parsed.data)
  if ('conflict' in result) {
    return {
      denied: null,
      errors: { slug: 'A product with this slug already exists, or the category/brand is unknown.' },
    }
  }
  return redirect(
    `/admin/products/${result.id}?flash=${encodeURIComponent('Product created as a draft. Complete its specs, then run validation.')}`,
  )
}

export default function AdminProductNew() {
  const { denied, categories, brands } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const errors = actionData && 'errors' in actionData ? actionData.errors : {}
  const deniedFromAction = actionData && 'denied' in actionData ? actionData.denied : null
  const effectiveDenied = denied ?? deniedFromAction

  if (effectiveDenied) {
    return <AdminDenied status={effectiveDenied} />
  }

  return (
    <div>
      <AdminHeader
        title="Add product"
        description="Creates a draft product. Complete its specs and media, then run validation before publishing."
      />

      <form method="post" className="max-w-2xl rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100">
        <ErrorSummary errors={errors} />
        <div className="mt-2 space-y-5">
          <div>
            <Label htmlFor="field-name">Name</Label>
            <Input
              id="field-name"
              name="name"
              required
              minLength={3}
              maxLength={160}
              className="mt-1.5"
              aria-describedby={errors.name ? 'field-name-error' : undefined}
            />
            <FieldError id="field-name-error" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="field-slug">Slug</Label>
            <Input
              id="field-slug"
              name="slug"
              required
              placeholder="e.g. quiet-mechanical-keyboard"
              className="mt-1.5"
              aria-describedby={errors.slug ? 'field-slug-error' : undefined}
            />
            <p className="mt-1.5 text-xs text-smoke">
              Lowercase letters, numbers and hyphens. Used in the public URL — cannot be changed later by
              editing the name.
            </p>
            <FieldError id="field-slug-error" message={errors.slug} />
          </div>
          <div>
            <Label htmlFor="field-categorySlug">Category</Label>
            <Select
              id="field-categorySlug"
              name="categorySlug"
              required
              defaultValue=""
              className="mt-1.5"
              aria-describedby={errors.categorySlug ? 'field-categorySlug-error' : undefined}
            >
              <option value="" disabled>
                Choose a category
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError id="field-categorySlug-error" message={errors.categorySlug} />
          </div>
          <div>
            <Label htmlFor="field-brandSlug">Brand (optional)</Label>
            <Select
              id="field-brandSlug"
              name="brandSlug"
              defaultValue=""
              className="mt-1.5"
              aria-describedby={errors.brandSlug ? 'field-brandSlug-error' : undefined}
            >
              <option value="">No brand</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>
                  {b.name}
                </option>
              ))}
            </Select>
            <FieldError id="field-brandSlug-error" message={errors.brandSlug} />
          </div>
          <div>
            <Label htmlFor="field-modelRef">Model reference (optional)</Label>
            <Input
              id="field-modelRef"
              name="modelRef"
              maxLength={120}
              className="mt-1.5"
              aria-describedby={errors.modelRef ? 'field-modelRef-error' : undefined}
            />
            <FieldError id="field-modelRef-error" message={errors.modelRef} />
          </div>
          <div>
            <Label htmlFor="field-editorialSummary">Editorial summary (optional)</Label>
            <Textarea
              id="field-editorialSummary"
              name="editorialSummary"
              rows={5}
              maxLength={2000}
              className="mt-1.5"
              aria-describedby={errors.editorialSummary ? 'field-editorialSummary-error' : undefined}
            />
            <FieldError id="field-editorialSummary-error" message={errors.editorialSummary} />
          </div>
        </div>
        <div className="mt-6">
          <Button type="submit">Create draft product</Button>
        </div>
      </form>
    </div>
  )
}
