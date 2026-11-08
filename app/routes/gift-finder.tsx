import { Form, Link, useLoaderData } from 'react-router'
import type { Route } from './+types/gift-finder'
import { buildMeta } from '../lib/seo'
import { fieldErrorsFrom, giftFinderSchema, type FieldErrors } from '../lib/validation'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { EmptyState } from '../components/state/states'
import { Button, ErrorSummary, FieldError, Input, Label, Select } from '../components/ui/ui'
import { CheckIcon, GiftIcon } from '../components/ui/icons'
import { cn } from '../components/ui/ui'

export function meta() {
  return buildMeta({
    title: 'Gift Finder',
    description:
      'Start from the person and the occasion: the Gift Finder builds a shortlist within your budget — with a stated reason for every suggestion.',
    path: '/gift-finder',
  })
}

interface GiftResult {
  ok: boolean
  errors?: FieldErrors
  summary?: { recipient: string; occasion: string; budget: number }
}

interface LoaderData {
  prefill: { recipient: string; occasion: string; budget: string }
  result: GiftResult | null
}

/**
 * URL-state flow (UX spec §6) — a guided questionnaire, not an AI engine:
 * answers live in the page URL, are validated server-side by zod, and are
 * never stored (spec §3.7: reasons cite budget/specs/tags only).
 */
export async function loader({ request }: Route.LoaderArgs): Promise<LoaderData> {
  const params = new URL(request.url).searchParams
  const prefill = {
    recipient: params.get('recipient') ?? 'friend',
    occasion: params.get('occasion') ?? 'birthday',
    budget: params.get('budget') ?? '',
  }
  if (!params.has('submitted')) {
    return { prefill, result: null }
  }
  const parsed = giftFinderSchema.safeParse({
    recipient: params.get('recipient'),
    occasion: params.get('occasion'),
    budget: params.get('budget'),
  })
  if (!parsed.success) {
    return { prefill, result: { ok: false, errors: fieldErrorsFrom(parsed.error) } }
  }
  return { prefill, result: { ok: true, summary: parsed.data } }
}

const steps = ['Recipient', 'Occasion', 'Budget', 'Shortlist']

function Stepper({ done }: { done: boolean }) {
  return (
    <ol aria-label="Gift finder progress" className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((label, i) => {
        const isDone = done && i < 3
        const isCurrent = !done && i === 0
        return (
          <li key={label} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden="true" className="h-px w-5 bg-navy-200 sm:w-8" />}
            <span
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'inline-flex min-h-9 items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1',
                isDone
                  ? 'bg-teal-700 text-white ring-teal-700'
                  : isCurrent
                    ? 'bg-navy-900 text-white ring-navy-900'
                    : 'bg-white text-navy-900 ring-navy-200',
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold',
                  isDone || isCurrent ? 'bg-white/20' : 'bg-navy-50 text-navy-800',
                )}
              >
                {isDone ? <CheckIcon className="h-3.5 w-3.5" /> : i + 1}
              </span>
              {label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

export default function GiftFinder() {
  const { prefill, result } = useLoaderData<typeof loader>()
  const errors = result?.errors ?? {}
  const err = (name: string) => (errors[name] ? `${name}-error` : undefined)

  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Gift Finder' }]} />
      <div className="pt-6">
        <PageHeader
          title="Gift Finder"
          intro="Good gifts start with the person, not the product. Three questions — who, what occasion, what budget — and the finder builds your gift profile. It is a guided questionnaire with stated reasons, not an AI guess, and nothing about the recipient is stored."
        />
      </div>

      <div className="mt-8">
        <Stepper done={Boolean(result?.ok)} />
      </div>

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <Form
          method="get"
          noValidate
          className="space-y-6 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
        >
          <input type="hidden" name="submitted" value="1" />
          <ErrorSummary errors={errors} />
          <fieldset>
            <legend className="flex items-center gap-2 text-base font-semibold text-navy-950">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
              >
                1
              </span>
              Who is the gift for?
            </legend>
            <div className="mt-3">
              <Label htmlFor="field-recipient">Recipient</Label>
              <Select
                id="field-recipient"
                name="recipient"
                className="mt-2"
                defaultValue={prefill.recipient}
                aria-describedby={err('recipient')}
              >
                <option value="partner">Partner</option>
                <option value="parent">Parent</option>
                <option value="friend">Friend</option>
                <option value="colleague">Colleague</option>
                <option value="child">Child</option>
                <option value="other">Someone else</option>
              </Select>
              <FieldError id="recipient-error" message={errors.recipient} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="flex items-center gap-2 text-base font-semibold text-navy-950">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
              >
                2
              </span>
              What is the occasion?
            </legend>
            <div className="mt-3">
              <Label htmlFor="field-occasion">Occasion</Label>
              <Select
                id="field-occasion"
                name="occasion"
                className="mt-2"
                defaultValue={prefill.occasion}
                aria-describedby={err('occasion')}
              >
                <option value="birthday">Birthday</option>
                <option value="holiday">Holiday</option>
                <option value="thank-you">Thank you</option>
                <option value="new-home">New home</option>
                <option value="back-to-school">Back to school</option>
                <option value="other">Another occasion</option>
              </Select>
              <FieldError id="occasion-error" message={errors.occasion} />
            </div>
          </fieldset>
          <fieldset>
            <legend className="flex items-center gap-2 text-base font-semibold text-navy-950">
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
              >
                3
              </span>
              What is your budget?
            </legend>
            <div className="mt-3">
              <Label htmlFor="field-budget">Your budget (USD)</Label>
              <Input
                id="field-budget"
                name="budget"
                type="number"
                inputMode="numeric"
                min={10}
                max={5000}
                placeholder="e.g. 50"
                defaultValue={prefill.budget}
                className="mt-2"
                aria-describedby={err('budget')}
              />
              <FieldError id="budget-error" message={errors.budget} />
            </div>
          </fieldset>
          <div className="flex items-center gap-3">
            <Button type="submit" size="lg">
              Build my gift profile
            </Button>
            <Link
              to="/gift-finder"
              className="inline-flex min-h-11 items-center px-2 text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
            >
              Start over
            </Link>
          </div>
        </Form>

        <section aria-labelledby="gift-results-heading" aria-live="polite">
          <h2 id="gift-results-heading" className="flex items-center gap-2 text-xl font-bold text-navy-950">
            <GiftIcon className="h-6 w-6 text-teal-800" /> Your shortlist
          </h2>
          <div className="mt-5">
            {!result && (
              <EmptyState title="Nothing here yet">
                Answer the three questions and your gift profile appears here. When the catalog launches, this
                becomes a shortlist where every suggestion states its reason — chosen because it fits the
                person, the occasion and the budget.
              </EmptyState>
            )}
            {result && !result.ok && (
              <div role="alert" className="rounded-2xl bg-red-50 p-6 ring-1 ring-red-200">
                <p className="font-semibold text-red-900">We could not build your gift profile</p>
                <p className="mt-2 text-sm leading-6 text-red-800">
                  One or more answers need attention — they are highlighted next to the questions. Nothing was
                  stored.
                </p>
              </div>
            )}
            {result?.ok && result.summary && (
              <div role="status" className="rounded-2xl bg-teal-50 p-6 ring-1 ring-teal-100">
                <h3 className="font-semibold text-navy-950">Your gift profile is ready</h3>
                <p className="mt-2 text-sm leading-6 text-navy-900">
                  A {result.summary.occasion.replace(/-/g, ' ')} gift for your {result.summary.recipient}, up
                  to ${result.summary.budget}. When the catalog launches, this profile produces a shortlist
                  where every suggestion states its reason — budget, occasion fit and practicality, never
                  invented ratings.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
