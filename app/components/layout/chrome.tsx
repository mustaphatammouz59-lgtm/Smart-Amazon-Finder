import { useState } from 'react'
import { Link, NavLink } from 'react-router'
import { siteConfig } from '../../config/site'
import { companyNav, footerNav, legalNav, primaryNav } from '../../data/navigation'
import { cn } from '../ui/ui'

function Wordmark() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.name} — home`}>
      <span
        aria-hidden="true"
        className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-base font-bold text-white"
      >
        S
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold text-navy-950">{siteConfig.name}</span>
        <span className="block text-[11px] font-medium uppercase tracking-wide text-slate-500">
          Independent product research
        </span>
      </span>
    </Link>
  )
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-teal-700',
    isActive ? 'bg-navy-50 text-navy-950' : 'text-slate-600 hover:bg-navy-50 hover:text-navy-950',
  )

export function Header() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b border-navy-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4">
        <Wordmark />
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {primaryNav.slice(1).map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="hidden items-center gap-1 lg:flex">
          {companyNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={navLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-navy-900 ring-1 ring-navy-200 lg:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span aria-hidden="true">{open ? '✕' : '☰'}</span> Menu
        </button>
      </div>
      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-navy-100 bg-white px-4 py-3 lg:hidden"
        >
          <ul className="space-y-1">
            {[...primaryNav, ...companyNav, ...legalNav].map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={navLinkClass}
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  )
}

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-navy-100 bg-navy-950 text-slate-300">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <p className="text-base font-bold text-white">{siteConfig.name}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
            An independent product discovery and comparison platform. We research and compare products on
            published criteria so you can decide with confidence.
          </p>
          <p className="mt-4 max-w-sm text-xs leading-5 text-slate-500">
            {siteConfig.name} is not an official Amazon website and is not affiliated with or endorsed by
            Amazon. Amazon is a trademark of Amazon.com, Inc.
          </p>
        </div>
        {footerNav.map((group) => (
          <nav key={group.heading} aria-label={`Footer — ${group.heading}`}>
            <p className="text-sm font-semibold uppercase tracking-wide text-white">{group.heading}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.items.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-slate-400 transition-colors hover:text-white">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-500">
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
    <nav aria-label="Breadcrumb" className="mx-auto w-full max-w-6xl px-4 pt-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
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
      {intro && <p className="mt-4 text-base leading-7 text-slate-600">{intro}</p>}
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
