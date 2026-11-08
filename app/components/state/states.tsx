import { Link } from 'react-router'
import { LinkButton, SearchBar } from '../ui/ui'
import { SearchIcon } from '../ui/icons'

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
    <div className="rounded-2xl border border-dashed border-navy-200 bg-white p-6 text-center sm:p-8">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-navy-50 text-navy-700 ring-1 ring-navy-100">
        <SearchIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 font-semibold text-navy-950">{title}</p>
      <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-smoke">{children}</div>
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
    <div className="page-shell py-16 text-center sm:py-20">
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-teal-800">404 — Not found</p>
      <h1 className="mx-auto mt-3 max-w-xl text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">
        This page could not be found
      </h1>
      <p className="mx-auto mt-4 max-w-md leading-7 text-smoke">
        The page may have moved, or the address may be incomplete. Try a search, or start from one of the
        popular places below.
      </p>
      <div className="mx-auto mt-8 max-w-xl text-left">
        <SearchBar large />
      </div>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton to="/">Back to home</LinkButton>
        <LinkButton to="/product-finder" variant="secondary">
          Product Finder
        </LinkButton>
        <LinkButton to="/buying-guides" variant="ghost">
          Buying Guides
        </LinkButton>
      </div>
    </div>
  )
}
