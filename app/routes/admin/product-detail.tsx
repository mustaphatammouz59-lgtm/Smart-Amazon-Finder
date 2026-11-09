import { env } from 'cloudflare:workers'
import { Link, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/product-detail'
import { adminContext } from '../../lib/admin-page'
import { ApiError } from '../../lib/api'
import { assertSameOrigin } from '../../lib/origin'
import { transitionProductStatus, writeAudit } from '../../lib/db/admin'
import {
  createVariant,
  deleteVariant,
  getAdminProduct,
  setProductAttributes,
  setProductSpecs,
  updateProduct,
} from '../../lib/db/admin-products'
import { listAdminOffers } from '../../lib/db/admin-commerce'
import {
  addProductMedia,
  deleteMediaRow,
  getMediaRow,
  setPrimaryMedia,
  updateMedia,
} from '../../lib/db/admin-media'
import { listAudit } from '../../lib/db/admin-system'
import { listBrands, listCategories } from '../../lib/db/admin-taxonomy'
import { reindexProduct } from '../../lib/db/reindex'
import { MAX_MEDIA_BYTES, buildMediaKey, sniffImageType, storeMedia } from '../../lib/media'
import { productIndexability, runProductValidation, validateProduct } from '../../lib/product-validation'
import {
  AdminDenied,
  AdminHeader,
  ConfirmButton,
  FlashBanner,
  SectionCard,
  StatusBadge,
} from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'
import { Button, ErrorSummary, FieldError, Input, Label, Select, Textarea } from '../../components/ui/ui'

const reasonLabels: Record<string, string> = {
  no_price: 'no price stored',
  unlicensed: 'licence does not permit display',
  unvalidated: 'offer not validated',
  stale: 'observation older than 24h',
  displayable: '',
}

function formatPrice(cents: number, currency: string): string {
  return `${currency} ${(cents / 100).toFixed(2)}`
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'products', 'read')
  if (!ctx.ok) {
    return {
      denied: ctx.status as 401 | 403,
      notFound: false,
      detail: null,
      validation: null,
      indexability: null,
      offers: [] as Awaited<ReturnType<typeof listAdminOffers>>['items'],
      audit: [] as Awaited<ReturnType<typeof listAudit>>['items'],
      categories: [] as Awaited<ReturnType<typeof listCategories>>,
      brands: [] as Awaited<ReturnType<typeof listBrands>>,
      flash: null as string | null,
    }
  }
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return {
      denied: null as 401 | 403 | null,
      notFound: true,
      detail: null,
      validation: null,
      indexability: null,
      offers: [] as Awaited<ReturnType<typeof listAdminOffers>>['items'],
      audit: [] as Awaited<ReturnType<typeof listAudit>>['items'],
      categories: [] as Awaited<ReturnType<typeof listCategories>>,
      brands: [] as Awaited<ReturnType<typeof listBrands>>,
      flash: null as string | null,
    }
  }
  const detail = await getAdminProduct(ctx.db, id)
  if (!detail) {
    return {
      denied: null as 401 | 403 | null,
      notFound: true,
      detail: null,
      validation: null,
      indexability: null,
      offers: [] as Awaited<ReturnType<typeof listAdminOffers>>['items'],
      audit: [] as Awaited<ReturnType<typeof listAudit>>['items'],
      categories: [] as Awaited<ReturnType<typeof listCategories>>,
      brands: [] as Awaited<ReturnType<typeof listBrands>>,
      flash: null as string | null,
    }
  }
  const validation = await validateProduct(ctx.db, id)
  const indexability = await productIndexability(ctx.db, id)
  const offersResult = await listAdminOffers(ctx.db, { productId: id, limit: 60 })
  const auditResult = await listAudit(ctx.db, { entityType: 'product', entityId: id, limit: 20 })
  const categories = await listCategories(ctx.db)
  const brands = await listBrands(ctx.db)
  const url = new URL(request.url)
  return {
    denied: null as 401 | 403 | null,
    notFound: false,
    detail,
    validation,
    indexability,
    offers: offersResult.items,
    audit: auditResult.items,
    categories,
    brands,
    flash: url.searchParams.get('flash'),
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return { denied: null, errors: { form: 'Invalid product id.' } as Record<string, string> }
  }
  const formData = await request.formData()
  const intent = String(formData.get('intent') ?? '')

  const needsPublish = intent === 'status' && String(formData.get('target') ?? '') === 'published'
  const ctx = await adminContext(request, 'products', needsPublish ? 'publish' : 'write')
  if (!ctx.ok) return { denied: ctx.status as 401 | 403, errors: {} as Record<string, string> }
  try {
    assertSameOrigin(request)
  } catch (error) {
    if (error instanceof ApiError) return { denied: 403 as 401 | 403, errors: {} as Record<string, string> }
    throw error
  }
  const { db, actor } = ctx
  const back = (message: string) => redirect(`/admin/products/${id}?flash=${encodeURIComponent(message)}`)

  if (intent === 'update') {
    const name = String(formData.get('name') ?? '').trim()
    const modelRefRaw = String(formData.get('modelRef') ?? '').trim()
    const editorialRaw = String(formData.get('editorialSummary') ?? '').trim()
    const categorySlug = String(formData.get('categorySlug') ?? '')
    const brandSlugRaw = String(formData.get('brandSlug') ?? '')
    const licenceStatus = String(formData.get('licenceStatus') ?? '') as
      'owned' | 'licensed' | 'restricted' | 'expired'
    const errors: Record<string, string> = {}
    if (name.length < 3 || name.length > 160) errors.name = 'Name must be between 3 and 160 characters.'
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) errors.categorySlug = 'Category is required.'
    if (brandSlugRaw && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(brandSlugRaw))
      errors.brandSlug = 'Brand slug is invalid.'
    if (!['owned', 'licensed', 'restricted', 'expired'].includes(licenceStatus))
      errors.licenceStatus = 'Licence status is invalid.'
    if (Object.keys(errors).length > 0) return { denied: null, errors }
    const result = await updateProduct(db, actor, id, {
      name,
      modelRef: modelRefRaw === '' ? null : modelRefRaw,
      editorialSummary: editorialRaw === '' ? null : editorialRaw,
      categorySlug,
      brandSlug: brandSlugRaw === '' ? null : brandSlugRaw,
      licenceStatus,
    })
    if (!result.ok) {
      if (result.reason === 'not_found') return { denied: null, errors: { form: 'Product not found.' } }
      if (result.reason === 'unknown_category')
        return { denied: null, errors: { categorySlug: 'Unknown category.' } }
      return { denied: null, errors: { brandSlug: 'Unknown brand.' } }
    }
    return back('Product saved.')
  }

  if (intent === 'validate') {
    const result = await runProductValidation(db, actor, id)
    if (!result) return { denied: null, errors: { form: 'Product not found.' } }
    if (result.persistence === 'data_changed_retry_required') {
      return {
        denied: null,
        errors: {
          form: 'The product changed while validation was running, so the verdict was discarded. Run validation again.',
        },
      }
    }
    return back(`Validation run: ${result.status}.`)
  }

  if (intent === 'status') {
    const target = String(formData.get('target') ?? '') as 'in_review' | 'draft' | 'archived' | 'published'
    if (!['in_review', 'draft', 'archived', 'published'].includes(target)) {
      return { denied: null, errors: { status: 'Invalid status target.' } }
    }
    const result = await transitionProductStatus(db, actor, id, target)
    if (!result.ok) {
      if (result.reason === 'validation_gate') {
        return {
          denied: null,
          errors: {
            status:
              'This product cannot be published: its validation status is not "passed". Run validation and resolve every error in the checklist.',
          },
        }
      }
      return { denied: null, errors: { status: 'Product not found.' } }
    }
    if (target === 'published') {
      await reindexProduct(db, id)
      await writeAudit(db, actor, 'product.reindex', 'product', id, null, { reason: 'publish' })
      return back('Product published.')
    }
    if (target === 'archived' || target === 'draft') {
      await reindexProduct(db, id)
      await writeAudit(db, actor, 'product.reindex', 'product', id, null, { reason: 'status-change' })
    }
    if (target === 'in_review') return back('Product submitted for review.')
    if (target === 'archived') return back('Product archived.')
    return back('Product moved to draft.')
  }

  if (intent === 'specs') {
    const detail = await getAdminProduct(db, id)
    if (!detail) return { denied: null, errors: { form: 'Product not found.' } }
    const specs: Array<{ definitionId: number; value: number | string | boolean | null }> = []
    const errors: Record<string, string> = {}
    for (const def of detail.specs) {
      const raw = formData.get(`spec_${def.definition_id}`)
      const value = typeof raw === 'string' ? raw : ''
      if (def.value_type === 'number') {
        if (value === '') {
          specs.push({ definitionId: def.definition_id, value: null })
        } else {
          const num = Number(value)
          if (Number.isNaN(num)) {
            errors[`spec_${def.definition_id}`] = `"${def.label}" must be a number.`
          } else {
            specs.push({ definitionId: def.definition_id, value: num })
          }
        }
      } else if (def.value_type === 'bool') {
        if (value === '') specs.push({ definitionId: def.definition_id, value: null })
        else specs.push({ definitionId: def.definition_id, value: value === 'true' })
      } else {
        specs.push({ definitionId: def.definition_id, value: value === '' ? null : value })
      }
    }
    if (Object.keys(errors).length > 0) return { denied: null, errors }
    const result = await setProductSpecs(db, actor, id, specs)
    if (!result.ok) {
      if (result.reason === 'not_found') return { denied: null, errors: { form: 'Product not found.' } }
      return {
        denied: null,
        errors: {
          specs:
            result.reason === 'unknown_definition'
              ? `Unknown definition ${result.definitionId ?? ''} for this product category.`
              : `Value type does not match definition ${result.definitionId ?? ''}.`,
        },
      }
    }
    return back('Specifications saved.')
  }

  if (intent === 'attributes') {
    const text = String(formData.get('attributesText') ?? '')
    const attributes: Array<{ key: string; value: string }> = []
    const errors: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (trimmed === '') continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) {
        errors.attributesText = `Line "${trimmed}" is not in key=value form.`
        break
      }
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      if (!/^[a-z0-9_]{1,40}$/.test(key)) {
        errors.attributesText = `Attribute key "${key}" must be lowercase letters, numbers or underscores (max 40).`
        break
      }
      if (value.length === 0 || value.length > 200) {
        errors.attributesText = `Attribute "${key}" must have a value of 1–200 characters.`
        break
      }
      attributes.push({ key, value })
    }
    if (Object.keys(errors).length > 0) return { denied: null, errors }
    if (attributes.length > 50)
      return { denied: null, errors: { attributesText: 'At most 50 attributes are allowed.' } }
    const result = await setProductAttributes(db, actor, id, attributes)
    if (!result.ok) return { denied: null, errors: { form: 'Product not found.' } }
    return back('Attributes saved.')
  }

  if (intent === 'variant-add') {
    const variantKey = String(formData.get('variantKey') ?? '').trim()
    const label = String(formData.get('variantLabel') ?? '').trim()
    const sourceSkuRef = String(formData.get('sourceSkuRef') ?? '').trim()
    const errors: Record<string, string> = {}
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(variantKey))
      errors.variantKey = 'Variant key must be lowercase alphanumeric segments joined by hyphens.'
    if (label.length === 0 || label.length > 120)
      errors.variantLabel = 'Label is required (max 120 characters).'
    if (Object.keys(errors).length > 0) return { denied: null, errors }
    const result = await createVariant(db, actor, id, {
      variantKey,
      label,
      sourceSkuRef: sourceSkuRef === '' ? undefined : sourceSkuRef,
    })
    if ('notFound' in result) return { denied: null, errors: { form: 'Product not found.' } }
    if ('conflict' in result)
      return { denied: null, errors: { variantKey: 'A variant with this key already exists.' } }
    return back('Variant added.')
  }

  if (intent === 'variant-delete') {
    const variantId = Number(formData.get('variantId'))
    if (!Number.isInteger(variantId) || variantId <= 0)
      return { denied: null, errors: { form: 'Invalid variant.' } }
    const result = await deleteVariant(db, actor, id, variantId)
    if (!result.ok) return { denied: null, errors: { form: 'Variant not found.' } }
    return back('Variant deleted.')
  }

  if (intent === 'media-upload') {
    const file = formData.get('file')
    const altText = String(formData.get('altText') ?? '').trim()
    const licenceStatus = String(formData.get('licenceStatus') ?? 'owned')
    const expiresAtRaw = String(formData.get('expiresAt') ?? '').trim()
    if (!(file instanceof File) || file.size === 0) {
      return { denied: null, errors: { media: 'Choose an image file to upload.' } }
    }
    if (!['owned', 'licensed', 'restricted', 'expired'].includes(licenceStatus)) {
      return { denied: null, errors: { media: 'Licence status is invalid.' } }
    }
    if (altText.length > 300)
      return { denied: null, errors: { media: 'Alt text must be at most 300 characters.' } }
    if (expiresAtRaw && Number.isNaN(Date.parse(expiresAtRaw))) {
      return { denied: null, errors: { media: 'Expiry must be a valid date.' } }
    }
    if (file.size > MAX_MEDIA_BYTES) {
      return { denied: null, errors: { media: 'Image exceeds the 5 MB limit.' } }
    }
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes.length > MAX_MEDIA_BYTES) {
      return { denied: null, errors: { media: 'Image exceeds the 5 MB limit.' } }
    }
    const sniff = sniffImageType(bytes)
    if (!sniff) {
      return {
        denied: null,
        errors: {
          media: 'Only JPEG, PNG, WebP or GIF images are accepted (detected by content, not filename).',
        },
      }
    }
    const bucket = (env as Env).MEDIA as R2Bucket
    const key = buildMediaKey(id, sniff.ext)
    // Stage 04.6 (04.5-F1) ordering, same as the API route: object
    // first, then the atomic D1 row + verdict reset; a failed D1 commit
    // removes the object best-effort (an uncleanable object is an
    // unreferenced orphan, never publicly reachable).
    await storeMedia(bucket, key, bytes, sniff.contentType)
    let result: Awaited<ReturnType<typeof addProductMedia>>
    try {
      result = await addProductMedia(db, actor, id, {
        key,
        altText: altText === '' ? null : altText,
        licenceStatus,
        expiresAt: expiresAtRaw === '' ? null : expiresAtRaw,
      })
    } catch (error) {
      await bucket.delete(key).catch(() => {})
      throw error
    }
    if ('notFound' in result) {
      await bucket.delete(key)
      return { denied: null, errors: { media: 'Product not found.' } }
    }
    return back('Image uploaded.')
  }

  if (intent === 'media-update') {
    const mediaId = Number(formData.get('mediaId'))
    const altText = String(formData.get('altText') ?? '').trim()
    const licenceStatus = String(formData.get('licenceStatus') ?? '')
    const expiresAtRaw = String(formData.get('expiresAt') ?? '').trim()
    if (!Number.isInteger(mediaId) || mediaId <= 0)
      return { denied: null, errors: { media: 'Invalid media.' } }
    if (!['owned', 'licensed', 'restricted', 'expired'].includes(licenceStatus)) {
      return { denied: null, errors: { media: 'Licence status is invalid.' } }
    }
    if (altText.length > 300)
      return { denied: null, errors: { media: 'Alt text must be at most 300 characters.' } }
    if (expiresAtRaw && Number.isNaN(Date.parse(expiresAtRaw))) {
      return { denied: null, errors: { media: 'Expiry must be a valid date.' } }
    }
    const result = await updateMedia(db, actor, mediaId, {
      altText: altText === '' ? null : altText,
      licenceStatus,
      expiresAt: expiresAtRaw === '' ? null : expiresAtRaw,
    })
    if (!result.ok) return { denied: null, errors: { media: 'Media not found.' } }
    return back('Media updated.')
  }

  if (intent === 'media-primary') {
    const mediaId = Number(formData.get('mediaId'))
    if (!Number.isInteger(mediaId) || mediaId <= 0)
      return { denied: null, errors: { media: 'Invalid media.' } }
    const result = await setPrimaryMedia(db, actor, mediaId)
    if (!result.ok) return { denied: null, errors: { media: 'Media not found.' } }
    return back('Primary image updated.')
  }

  if (intent === 'media-delete') {
    const mediaId = Number(formData.get('mediaId'))
    if (!Number.isInteger(mediaId) || mediaId <= 0)
      return { denied: null, errors: { media: 'Invalid media.' } }
    const row = await getMediaRow(db, mediaId)
    if (!row) return { denied: null, errors: { media: 'Media not found.' } }
    // Stage 04.6 (04.5-F1): the D1 row + verdict reset commit first
    // (atomic inside deleteMediaRow); the R2 object is deleted after,
    // best-effort — a failure leaves an unreferenced orphan only.
    const result = await deleteMediaRow(db, actor, mediaId)
    if (!result.ok) return { denied: null, errors: { media: 'Media not found.' } }
    await (env as Env).MEDIA.delete(row.url_or_key).catch(() => {})
    return back('Media deleted.')
  }

  return { denied: null, errors: { form: 'Unknown action.' } }
}

export default function AdminProductDetail() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const errors = actionData && 'errors' in actionData ? actionData.errors : {}
  const deniedFromAction = actionData && 'denied' in actionData ? actionData.denied : null
  const effectiveDenied = data.denied ?? deniedFromAction

  if (effectiveDenied) {
    return <AdminDenied status={effectiveDenied} />
  }

  if (data.notFound || !data.detail) {
    return (
      <div>
        <AdminHeader title="Product not found" />
        <EmptyState title="Product not found">
          <p>This product does not exist, or the link is incorrect.</p>
          <div className="mt-4">
            <Link to="/admin/products" className="font-medium text-teal-800 underline underline-offset-2">
              Back to products
            </Link>
          </div>
        </EmptyState>
      </div>
    )
  }

  const { detail, validation, indexability, offers, audit, categories, brands, flash } = data
  const product = detail.product
  const attributesText = detail.attributes.map((a) => `${a.key}=${a.value}`).join('\n')

  return (
    <div>
      <AdminHeader
        title={product.name}
        description={`${product.category_name}${product.brand_name ? ` · ${product.brand_name}` : ''} · /${product.slug}`}
      >
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge value={product.status} />
          <StatusBadge value={product.validation_status} />
          <StatusBadge value={product.licence_status} />
        </div>
      </AdminHeader>
      <FlashBanner message={flash} />
      <ErrorSummary errors={errors} />

      <p className="mb-6 text-sm leading-6 text-smoke">
        {indexability
          ? indexability.indexable
            ? 'Indexable ✓ (SEO rules)'
            : `Not indexable: ${indexability.reasons.join('; ')}`
          : 'Indexability unknown.'}{' '}
        Indexability is informational; the publish gate is validation.
      </p>

      <SectionCard
        title="Publish checklist"
        description="Validation must pass before this product can be published."
      >
        {validation ? (
          validation.issues.length === 0 ? (
            <p className="text-sm text-smoke">No issues found. Checked at {validation.checkedAt}.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-smoke">
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Severity
                    </th>
                    <th scope="col" className="py-2 pr-4 font-medium">
                      Field
                    </th>
                    <th scope="col" className="py-2 font-medium">
                      Message
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {validation.issues.map((issue) => (
                    <tr
                      key={`${issue.field}-${issue.code}`}
                      className="border-b border-navy-100 last:border-0"
                    >
                      <td className="py-2 pr-4">
                        <span
                          className={
                            issue.severity === 'error'
                              ? 'inline-flex rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 ring-1 ring-red-200'
                              : 'inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200'
                          }
                        >
                          {issue.severity}
                        </span>
                      </td>
                      <td className="py-2 pr-4 font-medium text-navy-950">{issue.field}</td>
                      <td className="py-2">{issue.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          <p className="text-sm text-smoke">Validation is unavailable for this product.</p>
        )}
        <FieldError id="field-status-error" message={errors.status} />
        <div className="mt-5 flex flex-wrap items-start gap-3">
          <form method="post">
            <input type="hidden" name="intent" value="validate" />
            <Button type="submit" variant="secondary">
              Run validation
            </Button>
          </form>
          {product.status === 'draft' ? (
            <form method="post">
              <input type="hidden" name="intent" value="status" />
              <input type="hidden" name="target" value="in_review" />
              <Button type="submit" variant="secondary">
                Submit for review
              </Button>
            </form>
          ) : null}
          {product.status !== 'published' ? (
            <div>
              <form method="post">
                <input type="hidden" name="intent" value="status" />
                <input type="hidden" name="target" value="published" />
                <Button type="submit">Publish</Button>
              </form>
              {product.validation_status !== 'passed' ? (
                <p className="mt-1.5 max-w-xs text-xs leading-5 text-smoke">
                  Publishing will be refused until validation passes.
                </p>
              ) : null}
            </div>
          ) : null}
          {product.status === 'published' ? (
            <form method="post">
              <input type="hidden" name="intent" value="status" />
              <input type="hidden" name="target" value="draft" />
              <Button type="submit" variant="secondary">
                Unpublish to draft
              </Button>
            </form>
          ) : null}
          {product.status !== 'archived' ? (
            <form method="post">
              <input type="hidden" name="intent" value="status" />
              <input type="hidden" name="target" value="archived" />
              <ConfirmButton label="Archive" />
            </form>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard title="Edit details">
        <form method="post" className="max-w-2xl space-y-5">
          <input type="hidden" name="intent" value="update" />
          <div>
            <Label htmlFor="field-name">Name</Label>
            <Input
              id="field-name"
              name="name"
              required
              defaultValue={product.name}
              className="mt-1.5"
              aria-describedby={errors.name ? 'field-name-error' : undefined}
            />
            <FieldError id="field-name-error" message={errors.name} />
          </div>
          <div>
            <Label htmlFor="field-modelRef">Model reference</Label>
            <Input
              id="field-modelRef"
              name="modelRef"
              defaultValue={product.model_ref ?? ''}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="field-categorySlug">Category</Label>
            <Select
              id="field-categorySlug"
              name="categorySlug"
              defaultValue={product.category_slug}
              className="mt-1.5"
              aria-describedby={errors.categorySlug ? 'field-categorySlug-error' : undefined}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </Select>
            <FieldError id="field-categorySlug-error" message={errors.categorySlug} />
          </div>
          <div>
            <Label htmlFor="field-brandSlug">Brand</Label>
            <Select
              id="field-brandSlug"
              name="brandSlug"
              defaultValue={product.brand_slug ?? ''}
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
            <Label htmlFor="field-licenceStatus">Licence status</Label>
            <Select
              id="field-licenceStatus"
              name="licenceStatus"
              defaultValue={product.licence_status}
              className="mt-1.5"
            >
              <option value="owned">Owned</option>
              <option value="licensed">Licensed</option>
              <option value="restricted">Restricted</option>
              <option value="expired">Expired</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="field-editorialSummary">Editorial summary</Label>
            <Textarea
              id="field-editorialSummary"
              name="editorialSummary"
              rows={6}
              defaultValue={product.editorial_summary ?? ''}
              className="mt-1.5"
            />
          </div>
          <Button type="submit">Save details</Button>
        </form>
      </SectionCard>

      <SectionCard title="Specifications" description="Leave a field blank to clear its value.">
        {detail.specs.length === 0 ? (
          <p className="text-sm text-smoke">This category defines no specifications yet.</p>
        ) : (
          <form method="post" className="max-w-2xl space-y-4">
            <input type="hidden" name="intent" value="specs" />
            <FieldError id="field-specs-error" message={errors.specs} />
            {detail.specs.map((spec) => {
              const fieldId = `field-spec-${spec.definition_id}`
              const current =
                spec.value_type === 'number'
                  ? spec.value_number !== null
                    ? String(spec.value_number)
                    : ''
                  : spec.value_type === 'bool'
                    ? spec.value_bool === null
                      ? ''
                      : spec.value_bool === 1
                        ? 'true'
                        : 'false'
                    : (spec.value_text ?? '')
              return (
                <div key={spec.definition_id}>
                  <Label htmlFor={fieldId}>
                    {spec.label}
                    {spec.unit ? ` (${spec.unit})` : ''}
                  </Label>
                  {spec.value_type === 'bool' ? (
                    <Select
                      id={fieldId}
                      name={`spec_${spec.definition_id}`}
                      defaultValue={current}
                      className="mt-1.5"
                    >
                      <option value="">—</option>
                      <option value="true">True</option>
                      <option value="false">False</option>
                    </Select>
                  ) : spec.value_type === 'number' ? (
                    <Input
                      id={fieldId}
                      name={`spec_${spec.definition_id}`}
                      type="number"
                      step="any"
                      defaultValue={current}
                      className="mt-1.5"
                    />
                  ) : (
                    <Input
                      id={fieldId}
                      name={`spec_${spec.definition_id}`}
                      type="text"
                      defaultValue={current}
                      className="mt-1.5"
                    />
                  )}
                  <FieldError id={`${fieldId}-error`} message={errors[`spec_${spec.definition_id}`]} />
                </div>
              )
            })}
            <Button type="submit">Save specifications</Button>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Attributes"
        description="One attribute per line, in key=value form. Saving replaces all attributes."
      >
        <form method="post" className="max-w-2xl">
          <input type="hidden" name="intent" value="attributes" />
          <Label htmlFor="field-attributesText">Attributes</Label>
          <Textarea
            id="field-attributesText"
            name="attributesText"
            rows={8}
            defaultValue={attributesText}
            placeholder={'color=black\nmaterial=aluminium'}
            className="mt-1.5"
            aria-describedby={errors.attributesText ? 'field-attributesText-error' : undefined}
          />
          <FieldError id="field-attributesText-error" message={errors.attributesText} />
          <div className="mt-4">
            <Button type="submit">Save attributes</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Variants">
        {detail.variants.length === 0 ? (
          <p className="mb-4 text-sm text-smoke">No variants yet.</p>
        ) : (
          <div className="mb-5 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Key
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Label
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Source SKU
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {detail.variants.map((v) => (
                  <tr key={v.id} className="border-b border-navy-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-navy-950">{v.variant_key}</td>
                    <td className="py-2 pr-4">{v.label}</td>
                    <td className="py-2 pr-4">{v.source_sku_ref ?? '—'}</td>
                    <td className="py-2">
                      <form method="post">
                        <input type="hidden" name="intent" value="variant-delete" />
                        <input type="hidden" name="variantId" value={v.id} />
                        <ConfirmButton label="Delete" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <form method="post" className="grid max-w-2xl gap-4 sm:grid-cols-3">
          <input type="hidden" name="intent" value="variant-add" />
          <div>
            <Label htmlFor="field-variantKey">Variant key</Label>
            <Input
              id="field-variantKey"
              name="variantKey"
              required
              placeholder="e.g. black"
              className="mt-1.5"
              aria-describedby={errors.variantKey ? 'field-variantKey-error' : undefined}
            />
            <FieldError id="field-variantKey-error" message={errors.variantKey} />
          </div>
          <div>
            <Label htmlFor="field-variantLabel">Label</Label>
            <Input
              id="field-variantLabel"
              name="variantLabel"
              required
              className="mt-1.5"
              aria-describedby={errors.variantLabel ? 'field-variantLabel-error' : undefined}
            />
            <FieldError id="field-variantLabel-error" message={errors.variantLabel} />
          </div>
          <div>
            <Label htmlFor="field-sourceSkuRef">Source SKU (optional)</Label>
            <Input id="field-sourceSkuRef" name="sourceSkuRef" className="mt-1.5" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" variant="secondary">
              Add variant
            </Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Media" description="The first image by sort order is the primary image.">
        <FieldError id="field-media-error" message={errors.media} />
        {detail.media.length === 0 ? (
          <p className="mb-5 text-sm text-smoke">No media yet. Upload the first image below.</p>
        ) : (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {detail.media.map((m) => (
              <figure key={m.id} className="rounded-xl bg-cream p-3 ring-1 ring-navy-100">
                <img
                  src={`/api/admin/media/${m.id}/content`}
                  alt={m.alt_text ?? ''}
                  className="aspect-[4/3] w-full rounded-lg bg-white object-contain"
                />
                <figcaption className="mt-3 space-y-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge value={m.licence_status} />
                    <span className="text-xs text-smoke">Order {m.sort_order}</span>
                    {m.sort_order === 0 ? (
                      <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-900 ring-1 ring-teal-100">
                        Primary
                      </span>
                    ) : null}
                  </div>
                  {m.expires_at ? <p className="text-xs text-smoke">Expires {m.expires_at}</p> : null}
                  <form method="post" className="space-y-2">
                    <input type="hidden" name="intent" value="media-update" />
                    <input type="hidden" name="mediaId" value={m.id} />
                    <div>
                      <Label htmlFor={`field-media-alt-${m.id}`}>Alt text</Label>
                      <Input
                        id={`field-media-alt-${m.id}`}
                        name="altText"
                        defaultValue={m.alt_text ?? ''}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`field-media-licence-${m.id}`}>Licence</Label>
                      <Select
                        id={`field-media-licence-${m.id}`}
                        name="licenceStatus"
                        defaultValue={m.licence_status}
                        className="mt-1"
                      >
                        <option value="owned">Owned</option>
                        <option value="licensed">Licensed</option>
                        <option value="restricted">Restricted</option>
                        <option value="expired">Expired</option>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor={`field-media-expires-${m.id}`}>Expires at</Label>
                      <Input
                        id={`field-media-expires-${m.id}`}
                        name="expiresAt"
                        type="text"
                        defaultValue={m.expires_at ?? ''}
                        placeholder="YYYY-MM-DD"
                        className="mt-1"
                      />
                    </div>
                    <Button type="submit" size="sm" variant="secondary">
                      Save media
                    </Button>
                  </form>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {m.sort_order !== 0 ? (
                      <form method="post">
                        <input type="hidden" name="intent" value="media-primary" />
                        <input type="hidden" name="mediaId" value={m.id} />
                        <Button type="submit" size="sm" variant="ghost">
                          Set primary
                        </Button>
                      </form>
                    ) : null}
                    <form method="post">
                      <input type="hidden" name="intent" value="media-delete" />
                      <input type="hidden" name="mediaId" value={m.id} />
                      <ConfirmButton label="Delete" />
                    </form>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        )}
        <form
          method="post"
          encType="multipart/form-data"
          className="max-w-2xl space-y-4 rounded-xl bg-cream p-4 ring-1 ring-navy-100"
        >
          <input type="hidden" name="intent" value="media-upload" />
          <p className="text-sm font-semibold text-navy-950">Upload image</p>
          <div>
            <Label htmlFor="field-file">Image file</Label>
            <Input id="field-file" name="file" type="file" accept="image/*" required className="mt-1.5" />
            <p className="mt-1.5 text-xs text-smoke">JPEG/PNG/WebP/GIF, max 5 MB, detected by content.</p>
          </div>
          <div>
            <Label htmlFor="field-upload-altText">Alt text</Label>
            <Input id="field-upload-altText" name="altText" className="mt-1.5" />
          </div>
          <div>
            <Label htmlFor="field-upload-licenceStatus">Licence</Label>
            <Select
              id="field-upload-licenceStatus"
              name="licenceStatus"
              defaultValue="owned"
              className="mt-1.5"
            >
              <option value="owned">Owned</option>
              <option value="licensed">Licensed</option>
              <option value="restricted">Restricted</option>
              <option value="expired">Expired</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="field-upload-expiresAt">Expires at (optional)</Label>
            <Input
              id="field-upload-expiresAt"
              name="expiresAt"
              type="text"
              placeholder="YYYY-MM-DD"
              className="mt-1.5"
            />
          </div>
          <Button type="submit">Upload image</Button>
        </form>
      </SectionCard>

      <SectionCard title="Offers" description="Prices are shown only when the display policy allows it.">
        {offers.length === 0 ? (
          <p className="text-sm text-smoke">No offers for this product yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Merchant
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Price
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Validation
                  </th>
                </tr>
              </thead>
              <tbody>
                {offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-navy-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-navy-950">{offer.merchant_name}</td>
                    <td className="py-2 pr-4">
                      {offer.price_display.visible && offer.price_display.price_cents !== null
                        ? formatPrice(offer.price_display.price_cents, offer.currency)
                        : `Hidden — ${reasonLabels[offer.price_display.reason] ?? offer.price_display.reason}`}
                    </td>
                    <td className="py-2">
                      <StatusBadge value={offer.validation_status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-4">
          <Link
            to={`/admin/offers?productId=${product.id}`}
            className="font-medium text-teal-800 underline underline-offset-2"
          >
            Manage offers
          </Link>
        </div>
      </SectionCard>

      <SectionCard title="Audit history" description="Recent audited actions on this product.">
        {audit.length === 0 ? (
          <p className="text-sm text-smoke">No audit entries for this product yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Time
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Actor
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {audit.map((row) => (
                  <tr key={row.id} className="border-b border-navy-100 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{row.created_at}</td>
                    <td className="py-2 pr-4">{row.actor_email ?? '—'}</td>
                    <td className="py-2 font-medium text-navy-950">{row.action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
