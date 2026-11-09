import { useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Card, cn } from '../ui/ui'

export function AdminDenied({ status }: { status: 401 | 403 }) {
  if (status === 401) {
    return (
      <Card className="mx-auto max-w-lg">
        <h1 className="text-xl font-bold text-navy-950">Admin sign-in required</h1>
        <p className="mt-3 text-sm leading-6 text-smoke">
          This area is protected by Cloudflare Access. In production the Access sign-in happens at the edge
          before the page loads, so seeing this message means no valid Access session reached the app. There
          is deliberately no separate password form — sign in through Cloudflare Access and try again.
        </p>
      </Card>
    )
  }
  return (
    <Card className="mx-auto max-w-lg">
      <h1 className="text-xl font-bold text-navy-950">Not authorized</h1>
      <p className="mt-3 text-sm leading-6 text-smoke">
        Your admin role does not permit access to this area. Roles are assigned by the owner. If you believe
        you should have access, contact the owner to update your role.
      </p>
    </Card>
  )
}

export function AdminHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">Admin</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-smoke">{description}</p> : null}
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  )
}

export function StatCard({
  label,
  value,
  hint,
  to,
}: {
  label: string
  value: number | string
  hint?: string
  to?: string
}) {
  const inner = (
    <>
      <p className="text-sm font-medium text-smoke">{label}</p>
      <p className="mt-1 text-3xl font-bold tracking-tight text-navy-950">{value}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-smoke">{hint}</p> : null}
    </>
  )
  if (to) {
    return (
      <Link
        to={to}
        className="block rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100 transition hover:ring-teal-700"
      >
        {inner}
      </Link>
    )
  }
  return <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-navy-100">{inner}</div>
}

const badgeTones: Record<string, string> = {
  passed: 'bg-teal-50 text-teal-900 ring-1 ring-teal-100',
  published: 'bg-teal-50 text-teal-900 ring-1 ring-teal-100',
  active: 'bg-teal-50 text-teal-900 ring-1 ring-teal-100',
  owned: 'bg-teal-50 text-teal-900 ring-1 ring-teal-100',
  draft: 'bg-cream text-smoke ring-1 ring-navy-100',
  pending: 'bg-cream text-smoke ring-1 ring-navy-100',
  inactive: 'bg-cream text-smoke ring-1 ring-navy-100',
  in_review: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  licensed: 'bg-amber-50 text-amber-800 ring-1 ring-amber-200',
  failed: 'bg-red-50 text-red-800 ring-1 ring-red-200',
  expired: 'bg-red-50 text-red-800 ring-1 ring-red-200',
  suspended: 'bg-red-50 text-red-800 ring-1 ring-red-200',
  archived: 'bg-navy-50 text-navy-800 ring-1 ring-navy-100',
  restricted: 'bg-navy-50 text-navy-800 ring-1 ring-navy-100',
}

export function StatusBadge({ value }: { value: string }) {
  const tone = badgeTones[value] ?? 'bg-cream text-smoke ring-1 ring-navy-100'
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', tone)}>
      {value.replaceAll('_', ' ')}
    </span>
  )
}

export function FlashBanner({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <div
      role="status"
      className="mb-6 rounded-xl bg-teal-50 px-4 py-3 text-sm text-teal-900 ring-1 ring-teal-100"
    >
      {message}
    </div>
  )
}

export function SectionCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <Card className="mb-6">
      <h2 className="text-lg font-semibold text-navy-950">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-smoke">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  )
}

export function Pagination({
  nextCursor,
  hrefFor,
}: {
  nextCursor: string | null
  hrefFor: (cursor: string) => string
}) {
  if (!nextCursor) return null
  return (
    <div className="mt-6 flex flex-col items-start gap-2">
      <Link
        to={hrefFor(nextCursor)}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
      >
        Next page →
      </Link>
      <p className="text-xs text-smoke">Cursor pagination — use your browser Back to return.</p>
    </div>
  )
}

export function ConfirmButton({ label, className }: { label: string; className?: string }) {
  const [armed, setArmed] = useState(false)
  return (
    <button
      type={armed ? 'submit' : 'button'}
      onClick={() => setArmed(true)}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60',
        armed
          ? 'bg-red-700 text-white hover:bg-red-800'
          : 'bg-white text-red-800 ring-1 ring-red-200 hover:bg-red-50',
        className,
      )}
    >
      {armed ? 'Click again to confirm' : label}
    </button>
  )
}
