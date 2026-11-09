import { useLoaderData } from 'react-router'
import { env } from 'cloudflare:workers'
import type { Route } from './+types/system'
import { adminContext } from '../../lib/admin-page'
import { getAnalytics, getSystemStatus } from '../../lib/db/admin-system'
import { AdminDenied, AdminHeader, SectionCard, StatCard } from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'overview', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const status = await getSystemStatus(ctx.db, env)
  const analytics = await getAnalytics(ctx.db)
  return { status, analytics }
}

const BINDING_LABELS: Array<{
  key: 'kv' | 'r2' | 'queue' | 'searchRateLimiter' | 'adminRateLimiter'
  label: string
  binding: string
}> = [
  { key: 'kv', label: 'KV', binding: 'APP_KV' },
  { key: 'r2', label: 'R2', binding: 'MEDIA' },
  { key: 'queue', label: 'Queue', binding: 'JOBS' },
  { key: 'searchRateLimiter', label: 'Search limiter', binding: 'SEARCH_RATE_LIMITER' },
  { key: 'adminRateLimiter', label: 'Admin limiter', binding: 'ADMIN_RATE_LIMITER' },
]

export default function SystemPage() {
  const data = useLoaderData<typeof loader>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const { status, analytics } = data

  return (
    <div className="space-y-6">
      <AdminHeader
        title="System status"
        description="Live binding checks and platform metadata, exactly as probed — nothing is faked."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Database (D1)"
          value={status.d1 === 'ok' ? 'Live probe OK' : status.d1}
          hint="Real SELECT 1 round-trip."
        />
        <StatCard label="Audit rows" value={status.auditTotal} hint="Append-only audit_logs total." />
        <StatCard label="Analytics rows" value={status.analyticsRows} hint="Rows in analytics_daily." />
      </div>

      <SectionCard title="Bindings">
        <p className="text-sm text-smoke">
          Binding check: {status.bindingCheck}. Presence means the binding is attached to the Worker; it does
          not prove the backing resource is healthy.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-navy-800">
                <th className="py-2 pr-4 font-semibold">Binding</th>
                <th className="py-2 pr-4 font-semibold">Name</th>
                <th className="py-2 font-semibold">State</th>
              </tr>
            </thead>
            <tbody>
              {BINDING_LABELS.map((row) => (
                <tr key={row.key} className="border-b border-navy-50">
                  <td className="py-3 pr-4 font-medium text-navy-950">{row.label}</td>
                  <td className="py-3 pr-4 text-smoke">{row.binding}</td>
                  <td className="py-3">
                    {status.bindings[row.key] ? (
                      <span className="font-medium text-teal-800">Configured</span>
                    ) : (
                      <span className="font-medium text-red-700">Missing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Foundation metadata">
        {status.foundationMeta.length === 0 ? (
          <EmptyState title="No foundation metadata">The foundation_meta table is empty.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Key</th>
                  <th className="py-2 pr-4 font-semibold">Value</th>
                  <th className="py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {status.foundationMeta.map((row) => (
                  <tr key={row.key} className="border-b border-navy-50">
                    <td className="py-3 pr-4 font-medium text-navy-950">{row.key}</td>
                    <td className="py-3 pr-4 text-smoke">{row.value}</td>
                    <td className="py-3 text-smoke">{row.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Queue">
        <p className="rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100">
          {status.queueNote}
        </p>
      </SectionCard>

      <SectionCard title="Analytics">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard label="Affiliate clicks (total)" value={analytics.clicks.total} />
          <StatCard label="Affiliate clicks (last 30 days)" value={analytics.clicks.last30Days} />
        </div>
        <div className="mt-6">
          {analytics.daily.length === 0 ? (
            <EmptyState title="No analytics rollups yet">
              The rollups job runs from Stage 13; nothing has been collected.
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-navy-100 text-navy-800">
                    <th className="py-2 pr-4 font-semibold">Day</th>
                    <th className="py-2 pr-4 font-semibold">Path</th>
                    <th className="py-2 pr-4 font-semibold">Metric</th>
                    <th className="py-2 font-semibold">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.daily.map((row, index) => (
                    <tr
                      key={`${row.day}-${row.path}-${row.metric}-${index}`}
                      className="border-b border-navy-50"
                    >
                      <td className="py-3 pr-4 text-smoke">{row.day}</td>
                      <td className="py-3 pr-4">{row.path}</td>
                      <td className="py-3 pr-4">{row.metric}</td>
                      <td className="py-3">{row.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  )
}
