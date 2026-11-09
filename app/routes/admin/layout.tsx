import { NavLink, Outlet, useLoaderData } from 'react-router'
import type { Route } from './+types/layout'
import { adminContext } from '../../lib/admin-page'
import { AdminDenied, StatusBadge } from '../../components/admin/ui'
import { cn } from '../../components/ui/ui'

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'overview', 'read')
  if (!ctx.ok) {
    return { denied: ctx.status as 401 | 403, actor: null, envLabel: '', isLocal: false }
  }
  const host = new URL(request.url).host
  const isLocal = host.includes('localhost') || host.startsWith('127.0.0.1')
  return {
    denied: null as 401 | 403 | null,
    actor: { email: ctx.actor.email, role: ctx.actor.role },
    envLabel: isLocal ? 'LOCAL DEVELOPMENT' : 'PRODUCTION',
    isLocal,
  }
}

const navItems = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/products', label: 'Products', end: false },
  { to: '/admin/validation', label: 'Validation', end: false },
  { to: '/admin/categories', label: 'Categories', end: false },
  { to: '/admin/brands', label: 'Brands', end: false },
  { to: '/admin/attributes', label: 'Attributes', end: false },
  { to: '/admin/merchants', label: 'Merchants & programs', end: false },
  { to: '/admin/offers', label: 'Offers', end: false },
  { to: '/admin/sources', label: 'Sources & staging', end: false },
  { to: '/admin/content', label: 'Content', end: false },
  { to: '/admin/audit', label: 'Audit logs', end: false },
  { to: '/admin/system', label: 'System', end: false },
  { to: '/admin/users', label: 'Users', end: false },
]

export default function AdminLayout() {
  const { denied, actor, envLabel, isLocal } = useLoaderData<typeof loader>()

  if (denied || !actor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-4">
        <AdminDenied status={denied ?? 401} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div
        role="status"
        className={cn(
          'px-4 py-2 text-center text-sm font-semibold',
          isLocal ? 'bg-amber-100 text-amber-900' : 'bg-red-700 text-white',
        )}
      >
        {isLocal
          ? 'LOCAL DEVELOPMENT — everything here affects only your local database.'
          : 'PRODUCTION — changes here are live.'}
      </div>

      <div className="lg:hidden border-b border-navy-100 bg-navy-900 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-white">Admin</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
            {envLabel}
          </span>
        </div>
        <nav aria-label="Admin" className="mt-3 flex gap-1 overflow-x-auto pb-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium',
                  isActive ? 'bg-navy-800 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-2 truncate text-xs text-slate-300">
          {actor.email} <StatusBadge value={actor.role} />
        </p>
      </div>

      <div className="flex min-h-[calc(100vh-2.5rem)]">
        <aside className="hidden w-64 shrink-0 flex-col bg-navy-900 text-white lg:flex">
          <div className="border-b border-white/10 px-5 py-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-300">Smart Amazon Finder</p>
            <p className="mt-1 text-lg font-bold">Admin</p>
          </div>
          <nav aria-label="Admin" className="flex-1 space-y-1 px-3 py-4">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'block rounded-lg px-3 py-2 text-sm font-medium',
                    isActive ? 'bg-navy-800 text-white' : 'text-slate-300 hover:bg-navy-800 hover:text-white',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-white/10 px-5 py-4">
            <p className="truncate text-sm text-white">{actor.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <StatusBadge value={actor.role} />
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white">
                {envLabel}
              </span>
            </div>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="hidden items-center justify-between gap-4 border-b border-navy-100 bg-white px-8 py-3 lg:flex">
            <p className="truncate text-sm text-smoke">{actor.email}</p>
            <div className="flex items-center gap-2">
              <StatusBadge value={actor.role} />
              <span className="rounded-full bg-cream px-2 py-0.5 text-xs font-medium text-navy-800 ring-1 ring-navy-100">
                {envLabel}
              </span>
            </div>
          </header>
          <main>
            <div className="mx-auto w-full max-w-[90rem] p-4 sm:p-8">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
