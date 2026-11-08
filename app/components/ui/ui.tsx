import { Link } from 'react-router'
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

export function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 disabled:cursor-not-allowed disabled:opacity-60'
const buttonVariants = {
  primary: 'bg-navy-900 text-white hover:bg-navy-800',
  accent: 'bg-teal-700 text-white hover:bg-teal-800',
  secondary: 'bg-white text-navy-900 ring-1 ring-navy-200 hover:bg-navy-50',
  ghost: 'text-navy-800 hover:bg-navy-50',
}
const buttonSizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3 text-base' }

export type ButtonVariant = keyof typeof buttonVariants
export type ButtonSize = keyof typeof buttonSizes

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)} {...props} />
  )
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  className,
  children,
}: {
  to: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: ReactNode
}) {
  return (
    <Link to={to} className={cn(buttonBase, buttonVariants[variant], buttonSizes[size], className)}>
      {children}
    </Link>
  )
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100', className)}>{children}</div>
  )
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-lg font-semibold text-navy-950">{children}</h3>
}

export function CardText({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-sm leading-6 text-smoke">{children}</p>
}

const fieldBase =
  'w-full rounded-lg border border-navy-200 bg-white px-3.5 py-2.5 text-sm text-navy-950 placeholder:text-slate-400 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30'

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-navy-950">
      {children}
    </label>
  )
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-red-700">
      {message}
    </p>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldBase, props.className)} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, props.className)} />
}

/* ------------------------------------------------------------------ */
/* Stage 02 design-system additions (UX-UI-SPECIFICATION.md §5)        */
/* ------------------------------------------------------------------ */

import { useState } from 'react'
import { ChevronDownIcon, InfoIcon, SearchIcon } from './icons'

export function SectionHeading({
  eyebrow,
  title,
  intro,
  level = 2,
  titleId,
}: {
  eyebrow?: string
  title: string
  intro?: string
  level?: 2 | 3
  titleId?: string
}) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <div className="max-w-3xl">
      {eyebrow && <p className="text-xs font-bold uppercase tracking-[0.14em] text-teal-800">{eyebrow}</p>}
      <Tag id={titleId} className="mt-2 text-2xl font-bold tracking-tight text-navy-950 sm:text-3xl">
        {title}
      </Tag>
      {intro && <p className="mt-3 text-base leading-7 text-smoke">{intro}</p>}
    </div>
  )
}

/** Short independence/disclosure strip (spec §§3.1, 6). */
export function DisclosureBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl bg-teal-50 ring-1 ring-teal-100',
        compact ? 'p-3.5' : 'p-4 sm:p-5',
      )}
      role="note"
    >
      <span className="mt-0.5 text-teal-800">
        <InfoIcon className="h-5 w-5" />
      </span>
      <p className="text-sm leading-6 text-navy-900">
        <strong className="font-semibold">Independent and transparent.</strong> We are not Amazon and we do
        not sell products. When affiliate links exist on a page, they are always identified, and rankings
        follow published criteria — never commissions.{' '}
        <Link to="/affiliate-disclosure" className="font-medium text-teal-800 underline underline-offset-2">
          How we may earn
        </Link>
      </p>
    </div>
  )
}

/**
 * SearchBar — submits a GET to the Product Finder so the query lives in
 * the URL (spec §6: shareable state). The finder interprets `q`.
 */
export function SearchBar({ large = false, defaultValue = '' }: { large?: boolean; defaultValue?: string }) {
  return (
    <form method="get" action="/product-finder" role="search" className="w-full">
      <label htmlFor={large ? 'site-search-lg' : 'site-search'} className="sr-only">
        What product are you researching?
      </label>
      <div
        className={cn(
          'flex items-center gap-2 rounded-xl bg-white p-1.5 shadow-[var(--shadow-card)] ring-1 ring-navy-200 focus-within:ring-2 focus-within:ring-teal-700',
          large && 'sm:p-2',
        )}
      >
        <span className="pl-2 text-smoke">
          <SearchIcon className={large ? 'h-6 w-6' : 'h-5 w-5'} />
        </span>
        <input
          id={large ? 'site-search-lg' : 'site-search'}
          name="q"
          type="search"
          defaultValue={defaultValue}
          placeholder="What are you trying to buy? e.g. a quiet desk setup"
          className={cn(
            'min-w-0 flex-1 bg-transparent text-navy-950 placeholder:text-smoke focus:outline-none',
            large ? 'py-2.5 text-base' : 'py-1.5 text-sm',
          )}
        />
        <button
          type="submit"
          className={cn(
            'shrink-0 rounded-lg bg-navy-900 font-semibold text-white transition-colors hover:bg-navy-800',
            large ? 'px-5 py-2.5 text-base' : 'px-3.5 py-1.5 text-sm',
          )}
        >
          Find products
        </button>
      </div>
    </form>
  )
}

export function CategoryCard({
  to,
  icon,
  title,
  text,
  topics,
}: {
  to: string
  icon: ReactNode
  title: string
  text: string
  topics: string[]
}) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100 transition duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
        {icon}
      </span>
      <span className="mt-4 text-lg font-semibold text-navy-950 group-hover:text-teal-800">{title}</span>
      <span className="mt-2 flex-1 text-sm leading-6 text-smoke">{text}</span>
      <span className="mt-4 flex flex-wrap gap-1.5">
        {topics.map((t) => (
          <span key={t} className="rounded-full bg-cream px-2.5 py-1 text-xs font-medium text-navy-800">
            {t}
          </span>
        ))}
      </span>
    </Link>
  )
}

/** Accessible FAQ accordion — real <button> + region (spec §5). */
export function FaqAccordion({ items }: { items: { question: string; answer: string }[] }) {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="divide-y divide-navy-100 rounded-2xl bg-white ring-1 ring-navy-100">
      {items.map((item, i) => {
        const open = openIdx === i
        const panelId = `faq-panel-${i}`
        const buttonId = `faq-button-${i}`
        return (
          <div key={item.question}>
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => setOpenIdx(open ? null : i)}
                className="flex min-h-11 w-full items-center justify-between gap-4 px-5 py-3.5 text-left text-base font-semibold text-navy-950"
              >
                {item.question}
                <span
                  className={cn(
                    'shrink-0 text-teal-800 transition-transform duration-200',
                    open && 'rotate-180',
                  )}
                >
                  <ChevronDownIcon className="h-5 w-5" />
                </span>
              </button>
            </h3>
            {open && (
              <div id={panelId} role="region" aria-labelledby={buttonId} className="px-5 pb-5">
                <p className="text-sm leading-6 text-smoke">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/** Submit-level error summary (spec §7: errors summarised + linked). */
export function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors)
  if (entries.length === 0) return null
  return (
    <div role="alert" className="rounded-xl bg-red-50 p-4 ring-1 ring-red-200">
      <p className="text-sm font-semibold text-red-800">Please fix the following:</p>
      <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-800">
        {entries.map(([field, message]) => (
          <li key={field}>
            <a href={`#field-${field}`} className="underline underline-offset-2">
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl bg-white p-6 ring-1 ring-navy-100" aria-hidden="true">
      <div className="h-11 w-11 animate-pulse rounded-xl bg-navy-100" />
      <div className="mt-4 h-5 w-2/3 animate-pulse rounded bg-navy-100" />
      <div className="mt-3 h-4 w-full animate-pulse rounded bg-navy-100" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-navy-100" />
    </div>
  )
}
