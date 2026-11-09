import { Link, useLoaderData } from 'react-router'
import type { Route } from './+types/overview'
import { adminContext } from '../../lib/admin-page'
import { getAdminDashboard } from '../../lib/db/admin-dashboard'
import { AdminDenied, AdminHeader, FlashBanner, SectionCard, StatCard } from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'
import { LinkButton } from '../../components/ui/ui'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'overview', 'read')
  if (!ctx.ok) return { denied: ctx.status as 401 | 403, dashboard: null, flash: null as string | null }
  const url = new URL(request.url)
  const dashboard = await getAdminDashboard(ctx.db)
  return { denied: null as 401 | 403 | null, dashboard, flash: url.searchParams.get('flash') }
}

export default function AdminOverview() {
  const { denied, dashboard, flash } = useLoaderData<typeof loader>()

  if (denied || !dashboard) {
    return <AdminDenied status={denied ?? 401} />
  }

  const c = dashboard.counts

  return (
    <div>
      <AdminHeader
        title="Dashboard"
        description="Live counts from the database. Nothing here is estimated."
      />
      <FlashBanner message={flash} />

      {c.products_total === 0 ? (
        <div className="mb-6">
          <EmptyState title="No products yet">
            <p>The catalog is empty. Add your first product to get started.</p>
            <div className="mt-4">
              <LinkButton to="/admin/products/new">Add your first product</LinkButton>
            </div>
          </EmptyState>
        </div>
      ) : null}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard label="Products total" value={c.products_total} />
        <StatCard label="Published" value={c.products_published} to="/admin/products?status=published" />
        <StatCard label="Drafts" value={c.products_draft} to="/admin/products?status=draft" />
        <StatCard label="In review" value={c.products_in_review} to="/admin/products?status=in_review" />
        <StatCard label="Validation failed" value={c.validation_failed} to="/admin/validation" />
        <StatCard label="Validation pending" value={c.validation_pending} to="/admin/validation" />
        <StatCard label="Categories" value={c.categories} to="/admin/categories" />
        <StatCard label="Brands" value={c.brands} to="/admin/brands" />
        <StatCard label="Merchants" value={c.merchants} to="/admin/merchants" />
        <StatCard label="Offers" value={c.offers} to="/admin/offers" />
        <StatCard
          label="Offers with hidden prices"
          value={dashboard.offers_price_hidden}
          hint="price stored but not displayable under policy"
        />
        <StatCard label="Media" value={c.media} />
        <StatCard label="Guides" value={c.guides} to="/admin/content" />
        <StatCard label="Articles" value={c.articles} to="/admin/content" />
      </div>

      <SectionCard
        title="Source freshness"
        description="Products grouped by source, with the most recent source update."
      >
        {dashboard.freshness.length === 0 ? (
          <p className="text-sm text-smoke">No sourced records yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-smoke">
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Source
                  </th>
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Products
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Last source update
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboard.freshness.map((row) => (
                  <tr key={row.source_id} className="border-b border-navy-100 last:border-0">
                    <td className="py-2 pr-4 font-medium text-navy-950">{row.source_id}</td>
                    <td className="py-2 pr-4">{row.products}</td>
                    <td className="py-2">{row.last_source_update ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Validation failures" description="Products whose latest validation run failed.">
        {dashboard.validation_failures.length === 0 ? (
          <p className="text-sm text-smoke">No validation failures.</p>
        ) : (
          <ul className="divide-y divide-navy-100">
            {dashboard.validation_failures.map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <Link
                  to={`/admin/products/${row.id}`}
                  className="font-medium text-teal-800 underline-offset-2 hover:underline"
                >
                  {row.name}
                </Link>
                <span className="text-xs text-smoke">{row.validated_at ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Recent activity" description="Latest administrative actions from the audit log.">
        {dashboard.recent_activity.length === 0 ? (
          <p className="text-sm text-smoke">No administrative activity yet.</p>
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
                  <th scope="col" className="py-2 pr-4 font-medium">
                    Action
                  </th>
                  <th scope="col" className="py-2 font-medium">
                    Entity
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboard.recent_activity.map((row) => (
                  <tr key={row.id} className="border-b border-navy-100 last:border-0">
                    <td className="py-2 pr-4 whitespace-nowrap">{row.created_at}</td>
                    <td className="py-2 pr-4">{row.actor_email ?? '—'}</td>
                    <td className="py-2 pr-4 font-medium text-navy-950">{row.action}</td>
                    <td className="py-2">
                      {row.entity_type}
                      {row.entity_id !== null ? ` #${row.entity_id}` : ''}
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
