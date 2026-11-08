import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { siteConfig } from '../../config/site'
import { companyNav, footerNav, legalNav, primaryNav } from '../../data/navigation'
import { cn, SearchBar } from '../ui/ui'
import { CloseIcon, MenuIcon, ShieldIcon } from '../ui/icons'

function Wordmark() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${siteConfig.name} — home`}>
      <span
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-navy-900 text-base font-bold text-white"
      >
        S
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-navy-950">{siteConfig.name}</span>
        <span className="block text-[11px] font-medium uppercase tracking-wide text-smoke">
          Independent product research
        </span>
      </span>
    </Link>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-navy-50 text-navy-950' : 'text-navy-800 hover:bg-navy-50 hover:text-navy-950',
  )

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="page-shell">
        <div className="flex min-h-16 items-center gap-3 py-2 sm:gap-5">
          <Wordmark />
          <div className="hidden min-w-0 flex-1 md:block">
            <SearchBar />
          </div>
          <button
            type="button"
            className="ml-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-navy-900 ring-1 ring-navy-200 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <CloseIcon className="h-5 w-5" /> : <MenuIcon className="h-5 w-5" />} Menu
          </button>
        </div>
        <nav aria-label="Sections" className="hidden items-center gap-0.5 pb-2 lg:flex">
          {[...primaryNav.slice(1), ...companyNav].map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-navy-100 bg-white lg:hidden">
          <div className="page-shell py-4">
            <div className="md:hidden">
              <SearchBar />
            </div>
            <nav aria-label="Mobile" className="mt-2">
              <ul className="divide-y divide-navy-100">
                {[...primaryNav, ...companyNav].map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          'flex min-h-11 items-center py-2 text-base font-medium',
                          isActive ? 'text-teal-800' : 'text-navy-900',
                        )
                      }
                      end={item.to === '/'}
                    >
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-smoke">Legal</p>
              <ul className="mt-1 flex flex-wrap gap-x-4">
                {legalNav.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className="inline-flex min-h-11 items-center text-sm text-navy-800 underline-offset-2 hover:underline"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="bg-navy-950 text-slate-300">
      <div className="border-b border-white/10">
        <div className="page-shell flex flex-col gap-3 py-6 sm:flex-row sm:items-center">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-teal-100">
            <ShieldIcon className="h-5 w-5" />
          </span>
          <p className="text-sm leading-6 text-slate-300">
            <strong className="font-semibold text-white">Independent by design.</strong> Rankings follow
            published criteria, never commissions. If a page ever contains affiliate links, they are
            identified on that page and explained in our{' '}
            <Link to="/affiliate-disclosure" className="text-teal-100 underline underline-offset-2">
              affiliate disclosure
            </Link>
            .
          </p>
        </div>
      </div>
      <div className="page-shell grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="text-base font-bold text-white">{siteConfig.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            An independent product discovery and comparison platform. We research and compare products on
            published criteria so you can decide with confidence.
          </p>
          <p className="mt-4 max-w-sm text-xs leading-5 text-slate-400">
            {siteConfig.name} is not an official Amazon website and is not affiliated with or endorsed by
            Amazon. Amazon is a trademark of Amazon.com, Inc.
          </p>
        </div>
        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={`Footer — ${group.heading}`}>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">{group.heading}</p>
            <ul className="mt-4 space-y-1 text-sm">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex min-h-11 items-center text-slate-400 transition-colors hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="page-shell flex flex-wrap items-center justify-between gap-3 py-5 text-xs text-slate-400">
          <p>
            © {year} {siteConfig.name}. All rights reserved.
          </p>
          <p>Recommendations are based on published criteria — never on commissions.</p>
        </div>
      </div>
    </footer>
  )
}

export function Breadcrumb({ trail }: { trail: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="page-shell pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-smoke">
        {trail.map((item, i) => {
          const last = i === trail.length - 1
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {item.to && !last ? (
                <Link to={item.to} className="hover:text-navy-900 hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={last ? 'page' : undefined}
                  className={last ? 'font-medium text-navy-950' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function PageHeader({ title, intro }: { title: string; intro?: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">{title}</h1>
      {intro && <p className="mt-4 text-base leading-7 text-smoke">{intro}</p>}
    </div>
  )
}

export function FoundationNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-8 rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100">
      <strong className="font-semibold">Foundation stage:</strong> {children}
    </div>
  )
}
