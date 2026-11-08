import { Link } from 'react-router'
import { LinkButton } from '../ui/ui'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="mx-auto w-full max-w-3xl px-4 py-16">
      <span className="sr-only">{label}</span>
      <div className="animate-pulse space-y-4" aria-hidden="true">
        <div className="h-8 w-2/3 rounded bg-navy-100" />
        <div className="h-4 w-full rounded bg-navy-100" />
        <div className="h-4 w-5/6 rounded bg-navy-100" />
        <div className="h-40 w-full rounded-2xl bg-navy-100" />
      </div>
    </div>
  )
}

export function EmptyState({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-200 bg-navy-50/60 p-6 text-center">
      <p className="font-semibold text-navy-950">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{children}</div>
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong' }: { title?: string }) {
  return (
    <div role="alert" className="rounded-2xl bg-red-50 p-6 text-center ring-1 ring-red-200">
      <p className="font-semibold text-red-900">{title}</p>
      <p className="mt-2 text-sm text-red-800">
        Please try again. If the problem continues,{' '}
        <Link className="underline" to="/contact">
          contact us
        </Link>
        .
      </p>
    </div>
  )
}

export function NotFoundState() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">404</p>
      <h1 className="mt-3 text-3xl font-bold text-navy-950">This page could not be found</h1>
      <p className="mx-auto mt-4 max-w-md text-slate-600">
        The page may have moved, or the address may be incomplete. Head back home or start with the Product
        Finder.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Back to home</LinkButton>
        <LinkButton to="/product-finder" variant="secondary">
          Open the Product Finder
        </LinkButton>
      </div>
    </div>
  )
}
