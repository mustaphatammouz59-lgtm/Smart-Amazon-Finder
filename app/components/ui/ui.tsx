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
  return <p className="mt-2 text-sm leading-6 text-slate-600">{children}</p>
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
