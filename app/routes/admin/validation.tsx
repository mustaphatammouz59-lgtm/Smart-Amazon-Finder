import { Link, redirect, useLoaderData } from 'react-router'
import type { Route } from './+types/validation'
import { adminContext } from '../../lib/admin-page'
import { ApiError } from '../../lib/api'
import { assertSameOrigin } from '../../lib/origin'
import { listAdminProducts } from '../../lib/db/admin-products'
import { runProductValidation, validateProduct } from '../../lib/product-validation'
import { AdminDenied, AdminHeader, FlashBanner, SectionCard } from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'
import { Button } from '../../components/ui/ui'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'products', 'read')
  if (!ctx.ok) {
    return {
      denied: ctx.status as 401 | 403,
      failed: [] as Awaited<ReturnType<typeof listAdminProducts>>['items'],
      pending: [] as Awaited<ReturnType<typeof listAdminProducts>>['items'],
      issuesById: {} as Record<number, Array<{ field: string; code: string; message: string }>>,
      flash: null as string | null,
    }
  }
  const failedResult = await listAdminProducts(ctx.db, { validationStatus: 'failed', limit: 60 })
  const pendingResult = await listAdminProducts(ctx.db, { validationStatus: 'pending', limit: 60 })
  const issuesById: Record<number, Array<{ field: string; code: string; message: string }>> = {}
  for (const item of failedResult.items) {
    const validation = await validateProduct(ctx.db, item.id)
    issuesById[item.id] = (validation?.issues ?? [])
      .filter((issue) => issue.severity === 'error')
      .map((issue) => ({ field: issue.field, code: issue.code, message: issue.message }))
  }
  const url = new URL(request.url)
  return {
    denied: null as 401 | 403 | null,
    failed: failedResult.items,
    pending: pendingResult.items,
    issuesById,
    flash: url.searchParams.get('flash'),
  }
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
  const intent = String(formData.get('intent') ?? '')
  if (intent !== 'validate') return { denied: null, errors: { form: 'Unknown action.' } }
  const productId = Number(formData.get('productId'))
  if (!Number.isInteger(productId) || productId <= 0) {
    return { denied: null, errors: { form: 'Invalid product.' } }
  }
  const result = await runProductValidation(ctx.db, ctx.actor, productId)
  if (!result) return { denied: null, errors: { form: 'Product not found.' } }
  const flash =
    result.persistence === 'data_changed_retry_required'
      ? `Product #${productId} changed while validation was running, so the verdict was discarded. Run validation again.`
      : `Validation run for product #${productId}: ${result.status}.`
  return redirect(`/admin/validation?flash=${encodeURIComponent(flash)}`)
}

export default function AdminValidation() {
  const { denied, failed, pending, issuesById, flash } = useLoaderData<typeof loader>()

  if (denied) {
    return <AdminDenied status={denied} />
  }

  return (
    <div>
      <AdminHeader
        title="Validation"
        description="Products that failed validation or have not been validated yet."
      />
      <FlashBanner message={flash} />

      <SectionCard
        title="What validation checks"
        description="A product can only be published when validation passes. Errors block publishing; warnings do not."
      >
        <ul className="list-inside list-disc space-y-1.5 text-sm leading-6 text-navy-900">
          <li>Name is at least 3 characters long.</li>
          <li>Slug is lowercase alphanumeric segments joined by hyphens.</li>
          <li>Category exists.</li>
          <li>Licence status is not expired.</li>
          <li>Editorial summary is present.</li>
          <li>At least one specification has a value.</li>
        </ul>
      </SectionCard>

      <SectionCard
        title={`Failed (${failed.length})`}
        description="Each error below must be resolved, then validation must be run again."
      >
        {failed.length === 0 ? (
          <EmptyState title="No failed products">
            <p>Every validated product currently passes. Nothing to fix here.</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Product
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Errors
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {failed.map((item) => (
                  <tr key={item.id} className="border-b border-navy-100 last:border-0 align-top">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/products/${item.id}`}
                        className="font-medium text-teal-800 underline-offset-2 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-smoke">{item.slug}</p>
                    </td>
                    <td className="py-3 pr-4">
                      {(issuesById[item.id] ?? []).length === 0 ? (
                        <span className="text-smoke">—</span>
                      ) : (
                        <ul className="list-inside list-disc space-y-1">
                          {(issuesById[item.id] ?? []).map((issue) => (
                            <li key={`${issue.field}-${issue.code}`}>
                              <span className="font-medium text-navy-950">{issue.field}:</span>{' '}
                              {issue.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="py-3">
                      <form method="post">
                        <input type="hidden" name="intent" value="validate" />
                        <input type="hidden" name="productId" value={item.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Run validation
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={`Pending (${pending.length})`}
        description="These products have never passed validation — usually because validation has not been run yet."
      >
        {pending.length === 0 ? (
          <EmptyState title="No pending products">
            <p>There are no products waiting for a first validation run.</p>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Product
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Status
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pending.map((item) => (
                  <tr key={item.id} className="border-b border-navy-100 last:border-0">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/products/${item.id}`}
                        className="font-medium text-teal-800 underline-offset-2 hover:underline"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-0.5 text-xs text-smoke">{item.slug}</p>
                    </td>
                    <td className="py-3 pr-4 text-smoke">{item.status.replaceAll('_', ' ')}</td>
                    <td className="py-3">
                      <form method="post">
                        <input type="hidden" name="intent" value="validate" />
                        <input type="hidden" name="productId" value={item.id} />
                        <Button type="submit" size="sm" variant="secondary">
                          Run validation
                        </Button>
                      </form>
                    </td>
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
