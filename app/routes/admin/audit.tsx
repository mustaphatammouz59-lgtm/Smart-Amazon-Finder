import { Link, useLoaderData } from 'react-router'
import type { Route } from './+types/audit'
import { adminContext } from '../../lib/admin-page'
import { listAudit } from '../../lib/db/admin-system'
import { AdminDenied, AdminHeader, Pagination, SectionCard } from '../../components/admin/ui'
import { Button, Input, Label } from '../../components/ui/ui'
import { EmptyState } from '../../components/state/states'

const KNOWN_ENTITY_TYPES = [
  'product',
  'category',
  'brand',
  'attribute_definition',
  'merchant',
  'affiliate_program',
  'offer',
  'article',
  'guide',
  'product_media',
]

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'audit', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const url = new URL(request.url)
  const params = url.searchParams
  const actorRaw = Number.parseInt(params.get('actorId') ?? '', 10)
  const filters = {
    entityType: params.get('entityType') ?? '',
    action: params.get('action') ?? '',
    actorId: params.get('actorId') ?? '',
    cursor: params.get('cursor'),
  }
  const audit = await listAudit(ctx.db, {
    entityType: filters.entityType || undefined,
    action: filters.action || undefined,
    actorId: Number.isNaN(actorRaw) ? undefined : actorRaw,
    cursor: filters.cursor,
  })
  return { entries: audit.items, nextCursor: audit.nextCursor, filters }
}

export default function AuditPage() {
  const data = useLoaderData<typeof loader>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const filters = data.filters
  function hrefFor(cursor: string): string {
    const params = new URLSearchParams()
    if (filters.entityType) params.set('entityType', filters.entityType)
    if (filters.action) params.set('action', filters.action)
    if (filters.actorId) params.set('actorId', filters.actorId)
    params.set('cursor', cursor)
    return `/admin/audit?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <AdminHeader title="Audit log" description="Every admin mutation, in order." />
      <p className="rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100">
        Audit logs are append-only. No interface exists to modify or delete them.
      </p>

      <SectionCard title="Entries">
        <form method="get" className="grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="filter-entity-type">Entity type</Label>
            <Input
              id="filter-entity-type"
              name="entityType"
              list="audit-entity-types"
              defaultValue={data.filters.entityType}
              placeholder="product"
            />
            <datalist id="audit-entity-types">
              {KNOWN_ENTITY_TYPES.map((type) => (
                <option key={type} value={type} />
              ))}
            </datalist>
          </div>
          <div>
            <Label htmlFor="filter-action">Action</Label>
            <Input
              id="filter-action"
              name="action"
              defaultValue={data.filters.action}
              placeholder="product.update"
            />
          </div>
          <div>
            <Label htmlFor="filter-actor">Actor admin ID</Label>
            <Input id="filter-actor" name="actorId" type="number" defaultValue={data.filters.actorId} />
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Apply filters
            </Button>
          </div>
        </form>

        {data.entries.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No audit entries match">
              Try different filters — or no admin mutations have been recorded yet.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Time</th>
                  <th className="py-2 pr-4 font-semibold">Actor</th>
                  <th className="py-2 pr-4 font-semibold">Action</th>
                  <th className="py-2 pr-4 font-semibold">Entity type</th>
                  <th className="py-2 pr-4 font-semibold">Entity ID</th>
                  <th className="py-2 font-semibold">Before / after</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr key={entry.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4 whitespace-nowrap text-smoke">{entry.created_at}</td>
                    <td className="py-3 pr-4">{entry.actor_email ?? `#${entry.actor_admin_id}`}</td>
                    <td className="py-3 pr-4 font-medium text-navy-950">{entry.action}</td>
                    <td className="py-3 pr-4">{entry.entity_type}</td>
                    <td className="py-3 pr-4">
                      {entry.entity_id === null ? (
                        '—'
                      ) : entry.entity_type === 'product' ? (
                        <Link
                          to={`/admin/products/${entry.entity_id}`}
                          className="text-teal-800 underline underline-offset-2"
                        >
                          {entry.entity_id}
                        </Link>
                      ) : (
                        entry.entity_id
                      )}
                    </td>
                    <td className="py-3">
                      {entry.before_json === null && entry.after_json === null ? (
                        '—'
                      ) : (
                        <details>
                          <summary className="cursor-pointer font-medium text-teal-800">View</summary>
                          <div className="mt-2 min-w-72 space-y-2">
                            <div>
                              <p className="text-xs font-semibold text-navy-800">Before</p>
                              <pre className="mt-1 overflow-x-auto rounded-lg bg-navy-50 p-3 text-xs leading-5 text-navy-900">
                                {entry.before_json ?? '—'}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-navy-800">After</p>
                              <pre className="mt-1 overflow-x-auto rounded-lg bg-navy-50 p-3 text-xs leading-5 text-navy-900">
                                {entry.after_json ?? '—'}
                              </pre>
                            </div>
                          </div>
                        </details>
                      )}
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
