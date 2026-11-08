import { Form, useActionData } from 'react-router'
import type { Route } from './+types/gift-finder'
import { buildMeta } from '../lib/seo'
import { fieldErrorsFrom, giftFinderSchema, type FieldErrors } from '../lib/validation'
import { Breadcrumb, FoundationNote, PageHeader } from '../components/layout/chrome'
import { Button, FieldError, Input, Label, Select } from '../components/ui/ui'

export function meta() {
  return buildMeta({
    title: 'Gift Finder',
    description:
      'Start from the person and the occasion: the Gift Finder builds a shortlist within your budget — with a stated reason for every suggestion.',
    path: '/gift-finder',
  })
}

interface ActionResult {
  ok: boolean
  errors?: FieldErrors
  summary?: { recipient: string; occasion: string; budget: number }
}

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData()
  const parsed = giftFinderSchema.safeParse({
    recipient: form.get('recipient'),
    occasion: form.get('occasion'),
    budget: form.get('budget'),
  })
  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) }
  }
  return { ok: true, summary: parsed.data }
}

export default function GiftFinder() {
  const result = useActionData<typeof action>()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Gift Finder' }]} />
      <div className="pt-6">
        <PageHeader
          title="Gift Finder"
          intro="Good gifts start with the person, not the product. Tell us who it is for, the occasion and your budget — no account needed, and nothing about the recipient is stored."
        />
      </div>

      <Form
        method="post"
        className="mt-8 max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100"
        noValidate
      >
        <div>
          <Label htmlFor="recipient">Who is the gift for?</Label>
          <Select id="recipient" name="recipient" className="mt-2" defaultValue="friend">
            <option value="partner">Partner</option>
            <option value="parent">Parent</option>
            <option value="friend">Friend</option>
            <option value="colleague">Colleague</option>
            <option value="child">Child</option>
            <option value="other">Someone else</option>
          </Select>
          <FieldError id="recipient-error" message={result?.errors?.recipient} />
        </div>
        <div>
          <Label htmlFor="occasion">What is the occasion?</Label>
          <Select id="occasion" name="occasion" className="mt-2" defaultValue="birthday">
            <option value="birthday">Birthday</option>
            <option value="holiday">Holiday</option>
            <option value="thank-you">Thank you</option>
            <option value="new-home">New home</option>
            <option value="back-to-school">Back to school</option>
            <option value="other">Another occasion</option>
          </Select>
          <FieldError id="occasion-error" message={result?.errors?.occasion} />
        </div>
        <div>
          <Label htmlFor="budget">Your budget (USD)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min={10}
            max={5000}
            placeholder="e.g. 50"
            className="mt-2"
          />
          <FieldError id="budget-error" message={result?.errors?.budget} />
        </div>
        <Button type="submit" size="lg">
          Build my gift profile
        </Button>
      </Form>

      {result?.ok && result.summary && (
        <div role="status" className="mt-6 max-w-xl rounded-2xl bg-teal-700/10 p-6 ring-1 ring-teal-700/30">
          <h2 className="font-semibold text-navy-950">Your gift profile is ready</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">
            A {result.summary.occasion.replace(/-/g, ' ')} gift for your {result.summary.recipient}, up to $
            {result.summary.budget}. When the catalog launches, this profile produces a shortlist where every
            suggestion states its reason.
          </p>
        </div>
      )}

      <FoundationNote>
        The gift profile flow and its server-side validation are live. Shortlists arrive with the catalog
        stage.
      </FoundationNote>
    </div>
  )
}
