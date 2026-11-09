import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router'
import { env } from 'cloudflare:workers'
import type { Route } from './+types/offers'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import {
  createOffer,
  deleteOffer,
  listAdminOffers,
  listMerchants,
  listPrograms,
  queueOfferRefresh,
  updateOffer,
} from '../../lib/db/admin-commerce'
import { listAdminProducts } from '../../lib/db/admin-products'
import { runOfferValidation } from '../../lib/offer-validation'
import {
  AdminDenied,
  AdminHeader,
  ConfirmButton,
  FlashBanner,
  Pagination,
  SectionCard,
  StatusBadge,
} from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select } from '../../components/ui/ui'
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

const AVAILABILITY_STATES = ['in_stock', 'low', 'out', 'unknown'] as const
const LICENCE_STATUSES = ['restricted', 'licensed', 'owned', 'expired'] as const
const VALIDATION_STATUSES = ['pending', 'passed', 'failed'] as const

const HIDDEN_REASONS: Record<string, string> = {
  no_price: 'No price stored (link-only offer)',
  unlicensed: 'Licence does not permit display',
  unvalidated: 'Offer has not passed validation',
  stale: 'Observation is older than 24 hours',
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'offers', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const url = new URL(request.url)
  const params = url.searchParams
  const productIdRaw = Number.parseInt(params.get('productId') ?? '', 10)
  const merchantIdRaw = Number.parseInt(params.get('merchantId') ?? '', 10)
  const filters = {
    productId: params.get('productId') ?? '',
    merchantId: params.get('merchantId') ?? '',
    validation: params.get('validation') ?? '',
    licence: params.get('licence') ?? '',
    cursor: params.get('cursor'),
  }
  const offers = await listAdminOffers(ctx.db, {
    productId: Number.isNaN(productIdRaw) ? undefined : productIdRaw,
    merchantId: Number.isNaN(merchantIdRaw) ? undefined : merchantIdRaw,
    validationStatus: filters.validation || undefined,
    licenceStatus: filters.licence || undefined,
    cursor: filters.cursor,
  })
  const products = await listAdminProducts(ctx.db, { limit: 60 })
  const merchants = await listMerchants(ctx.db)
  const programs = await listPrograms(ctx.db, {})
  return {
    offers: offers.items,
    nextCursor: offers.nextCursor,
    products: products.items,
    merchants,
    programs,
    filters,
    flash: params.get('flash'),
  }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'offers', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const formData = await request.formData()
  const intent = str(formData, 'intent')

  if (intent === 'create') {
    const productId = optInt(formData, 'productId')
    const merchantId = optInt(formData, 'merchantId')
    const destinationUrl = str(formData, 'destinationUrl')
    const priceRaw = str(formData, 'currentPriceCents')
    const price = optInt(formData, 'currentPriceCents')
    const availability = str(formData, 'availabilityState')
    const errors: Record<string, string> = {}
    if (productId === null) errors.productId = 'Choose a product.'
    if (merchantId === null) errors.merchantId = 'Choose a merchant.'
    if (!destinationUrl) errors.destinationUrl = 'Destination URL is required.'
    if (priceRaw !== '' && (price === null || price < 0)) {
      errors.currentPriceCents = 'Price must be a non-negative whole number of cents.'
    }
    if (availability && !AVAILABILITY_STATES.includes(availability as (typeof AVAILABILITY_STATES)[number])) {
      errors.availabilityState = 'Choose a valid availability state.'
    }
    if (Object.keys(errors).length > 0) return { errors }
    const result = await createOffer(ctx.db, ctx.actor, {
      productId: productId as number,
      merchantId: merchantId as number,
      programId: optInt(formData, 'programId'),
      merchantItemRef: optStr(formData, 'merchantItemRef'),
      destinationUrl,
      currency: str(formData, 'currency') || 'USD',
      currentPriceCents: price,
      priceObservedAt: optStr(formData, 'priceObservedAt'),
      availabilityState: availability === '' ? null : availability,
      licenceStatus: str(formData, 'licenceStatus') || 'restricted',
    })
    if ('conflict' in result) {
      const messages: Record<string, string> = {
        duplicate: 'An offer for this product and merchant already exists.',
        unknown_product: 'The selected product does not exist.',
        unknown_merchant: 'The selected merchant does not exist.',
        unknown_program: 'The selected program does not exist.',
        unknown_variant: 'The selected variant does not exist for this product.',
        invalid_destination: 'Destination URL must be an https URL without credentials or private hosts.',
        invalid_currency: 'Currency must be a three-letter code such as USD or EUR.',
        invalid_price: 'Price must be a positive whole number of cents, or left empty.',
        invalid_observed_at: 'Price observation time must be a valid ISO 8601 or UTC datetime.',
      }
      return { errors: { form: messages[result.conflict] } }
    }
    return redirect('/admin/offers?flash=Offer created.')
  }

  if (intent === 'update') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing offer id.' } }
    const destinationUrl = str(formData, 'destinationUrl')
    const priceRaw = str(formData, 'currentPriceCents')
    const price = optInt(formData, 'currentPriceCents')
    const availability = str(formData, 'availabilityState')
    const errors: Record<string, string> = {}
    if (!destinationUrl) errors.destinationUrl = 'Destination URL is required.'
    if (priceRaw !== '' && (price === null || price < 0)) {
      errors.currentPriceCents = 'Price must be a non-negative whole number of cents.'
    }
    if (availability && !AVAILABILITY_STATES.includes(availability as (typeof AVAILABILITY_STATES)[number])) {
      errors.availabilityState = 'Choose a valid availability state.'
    }
    if (Object.keys(errors).length > 0) return { errors }
    const result = await updateOffer(ctx.db, ctx.actor, id, {
      programId: optInt(formData, 'programId'),
      merchantItemRef: optStr(formData, 'merchantItemRef'),
      destinationUrl,
      currency: str(formData, 'currency') || 'USD',
      currentPriceCents: price,
      priceObservedAt: optStr(formData, 'priceObservedAt'),
      availabilityState: availability === '' ? null : availability,
      licenceStatus: str(formData, 'licenceStatus') || 'restricted',
    })
    if (!result.ok) {
      if (result.reason === 'duplicate') {
        return { errors: { form: 'An offer for this product and merchant already exists.' } }
      }
      if (result.reason === 'unknown_program') {
        return { errors: { form: 'The selected program does not exist.' } }
      }
      if (result.reason === 'invalid_destination') {
        return { errors: { form: 'Destination URL must be an https URL without credentials or private hosts.' } }
      }
      if (result.reason === 'invalid_currency') {
        return { errors: { form: 'Currency must be a three-letter code such as USD or EUR.' } }
      }
      if (result.reason === 'invalid_price') {
        return { errors: { form: 'Price must be a positive whole number of cents, or left empty.' } }
      }
      if (result.reason === 'invalid_observed_at') {
        return { errors: { form: 'Price observation time must be a valid ISO 8601 or UTC datetime.' } }
      }
      return { errors: { form: 'Offer not found.' } }
    }
    return redirect('/admin/offers?flash=Offer updated.')
  }

  if (intent === 'validate') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing offer id.' } }
    const validation = await runOfferValidation(ctx.db, ctx.actor, id)
    if (!validation) return { errors: { form: 'Offer not found.' } }
    if (validation.persistence === 'data_changed_retry_required') {
      return {
        errors: {
          form: `Offer #${id} changed while validation was running, so the verdict was discarded. Run validation again.`,
        },
      }
    }
    return redirect(
      `/admin/offers?flash=${encodeURIComponent(`Offer #${id} validation ${validation.status} (${validation.issues.length} issues).`)}`,
    )
  }

  if (intent === 'refresh') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing offer id.' } }
    const result = await queueOfferRefresh((env as Env).JOBS, ctx.db, ctx.actor, id)
    if (!result.ok) return { errors: { form: 'Offer not found.' } }
    return redirect(
      `/admin/offers?flash=${encodeURIComponent('Refresh queued. The refresh consumer is a contract no-op until Stage 06, so data will not change yet.')}`,
    )
  }

  if (intent === 'delete') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing offer id.' } }
    const result = await deleteOffer(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use') {
        return {
          errors: {
            delete: `This offer has ${result.history} price-history records and cannot be deleted.`,
          },
        }
      }
      return { errors: { form: 'Offer not found.' } }
    }
    return redirect('/admin/offers?flash=Offer deleted.')
  }

  return { errors: { form: 'Unknown action.' } }
}

export default function OffersPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const filters = data.filters
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined
  function hrefFor(cursor: string): string {
    const params = new URLSearchParams()
    if (filters.productId) params.set('productId', filters.productId)
    if (filters.merchantId) params.set('merchantId', filters.merchantId)
    if (filters.validation) params.set('validation', filters.validation)
    if (filters.licence) params.set('licence', filters.licence)
    params.set('cursor', cursor)
    return `/admin/offers?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Offers"
        description="Merchant offers per product. Prices display publicly only when licensed, validated and fresh."
      />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      <SectionCard title="New offer">
        <Form method="post" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create" />
          <div>
            <Label htmlFor="offer-product">Product</Label>
            <Select id="offer-product" name="productId" defaultValue="">
              <option value="" disabled>
                Choose a product
              </option>
              {data.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="offer-merchant">Merchant</Label>
            <Select id="offer-merchant" name="merchantId" defaultValue="">
              <option value="" disabled>
                Choose a merchant
              </option>
              {data.merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="offer-program">Program (optional)</Label>
            <Select id="offer-program" name="programId" defaultValue="">
              <option value="">— none —</option>
              {data.programs.map((program) => (
                <option key={program.id} value={program.id}>
                  {program.name} ({program.merchant_name})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="offer-ref">Merchant item ref</Label>
            <Input id="offer-ref" name="merchantItemRef" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="offer-destination">Destination URL</Label>
            <Input id="offer-destination" name="destinationUrl" type="url" required placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="offer-currency">Currency</Label>
            <Input id="offer-currency" name="currency" defaultValue="USD" maxLength={3} />
          </div>
          <div>
            <Label htmlFor="offer-licence">Licence status</Label>
            <Select id="offer-licence" name="licenceStatus" defaultValue="restricted">
              {LICENCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="offer-price">
              Price in cents (only for licensed, API-sourced data — hand-typed prices are prohibited by
              policy; leave empty for link-only)
            </Label>
            <Input id="offer-price" name="currentPriceCents" type="number" min={0} step={1} />
          </div>
          <div>
            <Label htmlFor="offer-observed">Price observed at</Label>
            <Input id="offer-observed" name="priceObservedAt" type="datetime-local" />
          </div>
          <div>
            <Label htmlFor="offer-availability">Availability</Label>
            <Select id="offer-availability" name="availabilityState" defaultValue="">
              <option value="">— unknown —</option>
              {AVAILABILITY_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create offer</Button>
          </div>
        </Form>
      </SectionCard>

      <SectionCard title="Offers">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="filter-product">Product</Label>
            <Select id="filter-product" name="productId" defaultValue={data.filters.productId}>
              <option value="">All products</option>
              {data.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-merchant">Merchant</Label>
            <Select id="filter-merchant" name="merchantId" defaultValue={data.filters.merchantId}>
              <option value="">All merchants</option>
              {data.merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-validation">Validation</Label>
            <Select id="filter-validation" name="validation" defaultValue={data.filters.validation}>
              <option value="">All</option>
              {VALIDATION_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-licence">Licence</Label>
            <Select id="filter-licence" name="licence" defaultValue={data.filters.licence}>
              <option value="">All</option>
              {LICENCE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-4">
            <Button type="submit" variant="secondary" size="sm">
              Apply filters
            </Button>
          </div>
        </form>

        {data.offers.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No offers match">
              Adjust the filters, or create the first offer above.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Product</th>
                  <th className="py-2 pr-4 font-semibold">Merchant</th>
                  <th className="py-2 pr-4 font-semibold">Price</th>
                  <th className="py-2 pr-4 font-semibold">Validation</th>
                  <th className="py-2 pr-4 font-semibold">Licence</th>
                  <th className="py-2 pr-4 font-semibold">Availability</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.offers.map((offer) => (
                  <tr key={offer.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/products/${offer.product_id}`}
                        className="font-medium text-teal-800 underline underline-offset-2"
                      >
                        {offer.product_name}
                      </Link>
                      <span className="block text-xs text-smoke">{offer.product_slug}</span>
                      <a
                        href={offer.destination_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block max-w-56 truncate text-xs text-smoke underline underline-offset-2"
                      >
                        {offer.destination_url}
                      </a>
                    </td>
                    <td className="py-3 pr-4">{offer.merchant_name}</td>
                    <td className="py-3 pr-4">
                      {offer.price_display.visible && offer.price_display.price_cents !== null ? (
                        <>
                          <span className="font-medium text-navy-950">
                            {offer.currency} {(offer.price_display.price_cents / 100).toFixed(2)}
                          </span>
                          {offer.price_observed_at && (
                            <span className="block text-xs text-smoke">
                              Observed {offer.price_observed_at}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-smoke">
                          Hidden — {HIDDEN_REASONS[offer.price_display.reason] ?? offer.price_display.reason}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={offer.validation_status} />
                    </td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={offer.licence_status} />
                    </td>
                    <td className="py-3 pr-4 text-smoke">{offer.availability_state ?? '—'}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-2">
                        <Form method="post">
                          <input type="hidden" name="intent" value="validate" />
                          <input type="hidden" name="id" value={offer.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Validate
                          </Button>
                        </Form>
                        <Form method="post">
                          <input type="hidden" name="intent" value="refresh" />
                          <input type="hidden" name="id" value={offer.id} />
                          <Button type="submit" size="sm" variant="secondary">
                            Refresh
                          </Button>
                        </Form>
                      </div>
                      <details className="mt-2">
                        <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                        <Form method="post" className="mt-3 grid min-w-72 gap-3">
                          <input type="hidden" name="intent" value="update" />
                          <input type="hidden" name="id" value={offer.id} />
                          <div>
                            <Label htmlFor={`offer-${offer.id}-destination`}>Destination URL</Label>
                            <Input
                              id={`offer-${offer.id}-destination`}
                              name="destinationUrl"
                              type="url"
                              required
                              defaultValue={offer.destination_url}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-program`}>Program</Label>
                            <Select
                              id={`offer-${offer.id}-program`}
                              name="programId"
                              defaultValue={offer.program_id ?? ''}
                            >
                              <option value="">— none —</option>
                              {data.programs.map((program) => (
                                <option key={program.id} value={program.id}>
                                  {program.name} ({program.merchant_name})
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-ref`}>Merchant item ref</Label>
                            <Input
                              id={`offer-${offer.id}-ref`}
                              name="merchantItemRef"
                              defaultValue={offer.merchant_item_ref ?? ''}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-currency`}>Currency</Label>
                            <Input
                              id={`offer-${offer.id}-currency`}
                              name="currency"
                              defaultValue={offer.currency}
                              maxLength={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-price`}>
                              Price in cents (licensed, API-sourced data only; empty = link-only)
                            </Label>
                            <Input
                              id={`offer-${offer.id}-price`}
                              name="currentPriceCents"
                              type="number"
                              min={0}
                              step={1}
                              defaultValue={offer.current_price_cents ?? ''}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-observed`}>Price observed at</Label>
                            <Input
                              id={`offer-${offer.id}-observed`}
                              name="priceObservedAt"
                              type="datetime-local"
                              defaultValue={offer.price_observed_at?.slice(0, 16) ?? ''}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-availability`}>Availability</Label>
                            <Select
                              id={`offer-${offer.id}-availability`}
                              name="availabilityState"
                              defaultValue={offer.availability_state ?? ''}
                            >
                              <option value="">— unknown —</option>
                              {AVAILABILITY_STATES.map((state) => (
                                <option key={state} value={state}>
                                  {state}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor={`offer-${offer.id}-licence`}>Licence status</Label>
                            <Select
                              id={`offer-${offer.id}-licence`}
                              name="licenceStatus"
                              defaultValue={offer.licence_status}
                            >
                              {LICENCE_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </Select>
                          </div>
                          <Button type="submit" size="sm">
                            Save changes
                          </Button>
                        </Form>
                      </details>
                      <Form method="post" className="mt-2">
                        <input type="hidden" name="intent" value="delete" />
                        <input type="hidden" name="id" value={offer.id} />
                        <ConfirmButton label="Delete" />
                      </Form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination nextCursor={data.nextCursor} hrefFor={hrefFor} />
      </SectionCard>
    </div>
  )
}
