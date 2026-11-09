import { useLoaderData } from 'react-router'
import type { Route } from './+types/users'
import { adminContext } from '../../lib/admin-page'
import { listAdminUsers, listPublicUsers } from '../../lib/db/admin-system'
import { ADMIN_RBAC } from '../../lib/auth'
import { AdminDenied, AdminHeader, SectionCard, StatusBadge } from '../../components/admin/ui'
import { EmptyState } from '../../components/state/states'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'users', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const admins = await listAdminUsers(ctx.db)
  const publicUsers = await listPublicUsers(ctx.db, { limit: 60 })
  return { admins, publicUsers: publicUsers.items }
}

export default function UsersPage() {
  const data = useLoaderData<typeof loader>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const rbacRows = Object.entries(ADMIN_RBAC)

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Users"
        description="Administrator accounts, role permissions and registered users."
      />

      <SectionCard title="Administrators">
        <p className="rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100">
          Administrator accounts are provisioned through Cloudflare Access and database seeding by the owner.
          This screen is read-only by design: there is no way to elevate any account — including your own —
          from the dashboard.
        </p>
        {data.admins.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No administrator accounts">No admin_users rows exist yet.</EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 pr-4 font-semibold">Role</th>
                  <th className="py-2 pr-4 font-semibold">Access identity ref</th>
                  <th className="py-2 font-semibold">Created</th>
                </tr>
              </thead>
              <tbody>
                {data.admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4 font-medium text-navy-950">{admin.email}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={admin.role} />
                    </td>
                    <td className="py-3 pr-4 text-smoke">{admin.access_identity_ref ?? '—'}</td>
                    <td className="py-3 text-smoke">{admin.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Role permissions (RBAC)">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-navy-100 text-navy-800">
                <th className="py-2 pr-4 font-semibold">Area</th>
                <th className="py-2 pr-4 font-semibold">Read</th>
                <th className="py-2 pr-4 font-semibold">Write</th>
                <th className="py-2 font-semibold">Publish</th>
              </tr>
            </thead>
            <tbody>
              {rbacRows.map(([area, rule]) => (
                <tr key={area} className="border-b border-navy-50">
                  <td className="py-3 pr-4 font-medium text-navy-950">{area}</td>
                  <td className="py-3 pr-4">{rule.read}</td>
                  <td className="py-3 pr-4">{rule.write ?? '—'}</td>
                  <td className="py-3">{rule.publish ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Registered users">
        {data.publicUsers.length === 0 ? (
          <EmptyState title="No registered users">
            Public accounts have not launched — the mail-provider decision is still open.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Email</th>
                  <th className="py-2 pr-4 font-semibold">Verified</th>
                  <th className="py-2 pr-4 font-semibold">Created</th>
                  <th className="py-2 pr-4 font-semibold">Favorites</th>
                  <th className="py-2 pr-4 font-semibold">Alerts</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.publicUsers.map((user) => (
                  <tr key={user.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4 font-medium text-navy-950">{user.email}</td>
                    <td className="py-3 pr-4">{user.email_verified_at ? 'Yes' : 'No'}</td>
                    <td className="py-3 pr-4 text-smoke">{user.created_at}</td>
                    <td className="py-3 pr-4">{user.favorites_count}</td>
                    <td className="py-3 pr-4">{user.alerts_count}</td>
                    <td className="py-3">
                      <StatusBadge value={user.deleted_at ? 'deleted' : 'active'} />
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
