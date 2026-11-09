import { Link, useLoaderData } from 'react-router'
import type { Route } from './+types/sources'
import { adminContext } from '../../lib/admin-page'
import { getSource, listSources } from '../../lib/db/admin-commerce'
import { AdminDenied, AdminHeader, Pagination, SectionCard, StatusBadge } from '../../components/admin/ui'
import { Button, Input, Label, Select } from '../../components/ui/ui'
import { EmptyState } from '../../components/state/states'

const VALIDATION_STATUSES = ['pending', 'passed', 'failed'] as const

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'sources', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const url = new URL(request.url)
  const params = url.searchParams
  const filters = {
    sourceId: params.get('sourceId') ?? '',
    validation: params.get('validation') ?? '',
    cursor: params.get('cursor'),
  }
  const list = await listSources(ctx.db, {
    sourceId: filters.sourceId || undefined,
    validationStatus: filters.validation || undefined,
    cursor: filters.cursor,
  })
  const idRaw = Number.parseInt(params.get('id') ?? '', 10)
  const detail = Number.isNaN(idRaw) ? null : await getSource(ctx.db, idRaw)
  return {
    sources: list.items,
    nextCursor: list.nextCursor,
    filters,
    detail,
    detailRequested: !Number.isNaN(idRaw),
  }
}

export default function SourcesPage() {
  const data = useLoaderData<typeof loader>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const filters = data.filters
  function hrefFor(cursor: string): string {
    const params = new URLSearchParams()
    if (filters.sourceId) params.set('sourceId', filters.sourceId)
    if (filters.validation) params.set('validation', filters.validation)
    params.set('cursor', cursor)
    return `/admin/sources?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Source records"
        description="Staged import records, shown exactly as stored. Read-only in this stage."
      />

      <SectionCard title="About this screen">
        <p className="text-sm leading-6 text-smoke">
          Staging review: import adapters land in Stage 06. Approval/rejection decisions have no storage in
          the current schema, so records are displayed read-only; normalised payloads are shown exactly as
          stored.
        </p>
      </SectionCard>

      <SectionCard title="Records">
        <form method="get" className="grid gap-3 sm:grid-cols-3">
          <div>
            <Label htmlFor="filter-source">Source ID</Label>
            <Input
              id="filter-source"
              name="sourceId"
              defaultValue={data.filters.sourceId}
              placeholder="e.g. manual-entry"
            />
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
          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm">
              Apply filters
            </Button>
          </div>
        </form>

        {data.sources.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No source records">
              Nothing has been staged yet. Import adapters land in Stage 06.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Source ID</th>
                  <th className="py-2 pr-4 font-semibold">External ref</th>
                  <th className="py-2 pr-4 font-semibold">Validation</th>
                  <th className="py-2 pr-4 font-semibold">Promoted product</th>
                  <th className="py-2 pr-4 font-semibold">Created</th>
                  <th className="py-2 font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((source) => (
                  <tr key={source.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4 font-medium text-navy-950">{source.source_id}</td>
                    <td className="py-3 pr-4 text-smoke">{source.external_ref ?? '—'}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={source.validation_status} />
                    </td>
                    <td className="py-3 pr-4">
                      {source.promoted_product_id !== null ? (
                        <Link
                          to={`/admin/products/${source.promoted_product_id}`}
                          className="text-teal-800 underline underline-offset-2"
                        >
                          Product #{source.promoted_product_id}
                        </Link>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 pr-4 text-smoke">{source.created_at}</td>
                    <td className="py-3">
                      <Link
                        to={`/admin/sources?id=${source.id}`}
                        className="font-medium text-teal-800 underline underline-offset-2"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination nextCursor={data.nextCursor} hrefFor={hrefFor} />
      </SectionCard>

      {data.detailRequested && (
        <SectionCard title="Record detail">
          {!data.detail ? (
            <EmptyState title="Record not found">The requested source record does not exist.</EmptyState>
          ) : (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-navy-800">Source ID</dt>
                  <dd className="text-smoke">{data.detail.source_id}</dd>
                </div>
                <div>
                  <dt className="font-medium text-navy-800">External ref</dt>
                  <dd className="text-smoke">{data.detail.external_ref ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-navy-800">Raw hash</dt>
                  <dd className="break-all text-smoke">{data.detail.raw_hash ?? '—'}</dd>
                </div>
                <div>
                  <dt className="font-medium text-navy-800">Validation</dt>
                  <dd>
                    <StatusBadge value={data.detail.validation_status} />
                  </dd>
                </div>
              </dl>
              <div>
                <p className="font-medium text-navy-800">Normalised payload</p>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-navy-50 p-4 text-xs leading-5 text-navy-900">
                  {data.detail.normalised_json ?? '—'}
                </pre>
              </div>
              <div>
                <p className="font-medium text-navy-800">Licence payload</p>
                <pre className="mt-2 overflow-x-auto rounded-xl bg-navy-50 p-4 text-xs leading-5 text-navy-900">
                  {data.detail.licence_json ?? '—'}
                </pre>
              </div>
            </div>
          )}
        </SectionCard>
      )}
    </div>
  )
}
