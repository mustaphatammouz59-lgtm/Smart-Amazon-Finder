import { Form, useActionData } from 'react-router'
import type { Route } from './+types/product-finder'
import { buildMeta } from '../lib/seo'
import { fieldErrorsFrom, productFinderSchema, type FieldErrors } from '../lib/validation'
import { Breadcrumb, FoundationNote, PageHeader } from '../components/layout/chrome'
import { Button, FieldError, Input, Label, Select } from '../components/ui/ui'

export function meta() {
  return buildMeta({
    title: 'Product Finder',
    description:
      'Tell us the job, your budget and what matters most — the Product Finder turns that into concrete criteria and matched products.',
    path: '/product-finder',
  })
}

interface ActionResult {
  ok: boolean
  errors?: FieldErrors
  summary?: { category: string; budget: number; priority: string }
}

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData()
  const parsed = productFinderSchema.safeParse({
    category: form.get('category'),
    budget: form.get('budget'),
    priority: form.get('priority'),
  })
  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) }
  }
  return { ok: true, summary: parsed.data }
}

const categoryLabels: Record<string, string> = {
  'home-office': 'Home Office & Productivity',
  'electronics-accessories': 'Electronics Accessories',
}
const priorityLabels: Record<string, string> = {
  value: 'Best value for money',
  performance: 'Performance first',
  durability: 'Built to last',
  design: 'Design and ergonomics',
}

export default function ProductFinder() {
  const result = useActionData<typeof action>()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Product Finder' }]} />
      <div className="pt-6">
        <PageHeader
          title="Product Finder"
          intro="Answer three questions and the finder builds your criteria profile — the same profile the comparison engine and recommendations will use."
        />
      </div>

      <Form
        method="post"
        className="mt-8 max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100"
        noValidate
      >
        <div>
          <Label htmlFor="category">What are you shopping for?</Label>
          <Select
            id="category"
            name="category"
            className="mt-2"
            defaultValue="home-office"
            aria-describedby={result?.errors?.category ? 'category-error' : undefined}
          >
            <option value="home-office">Home Office &amp; Productivity</option>
            <option value="electronics-accessories">Electronics Accessories</option>
          </Select>
          <FieldError id="category-error" message={result?.errors?.category} />
        </div>
        <div>
          <Label htmlFor="budget">Your budget (USD)</Label>
          <Input
            id="budget"
            name="budget"
            type="number"
            inputMode="numeric"
            min={10}
            max={10000}
            placeholder="e.g. 150"
            className="mt-2"
            aria-describedby={result?.errors?.budget ? 'budget-error' : undefined}
          />
          <FieldError id="budget-error" message={result?.errors?.budget} />
        </div>
        <div>
          <Label htmlFor="priority">What matters most?</Label>
          <Select
            id="priority"
            name="priority"
            className="mt-2"
            defaultValue="value"
            aria-describedby={result?.errors?.priority ? 'priority-error' : undefined}
          >
            <option value="value">Best value for money</option>
            <option value="performance">Performance first</option>
            <option value="durability">Built to last</option>
            <option value="design">Design and ergonomics</option>
          </Select>
          <FieldError id="priority-error" message={result?.errors?.priority} />
        </div>
        <Button type="submit" size="lg">
          Build my criteria profile
        </Button>
      </Form>

      {result?.ok && result.summary && (
        <div role="status" className="mt-6 max-w-xl rounded-2xl bg-teal-700/10 p-6 ring-1 ring-teal-700/30">
          <h2 className="font-semibold text-navy-950">Your criteria profile</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            <li>Category: {categoryLabels[result.summary.category]}</li>
            <li>Budget: up to ${result.summary.budget}</li>
            <li>Priority: {priorityLabels[result.summary.priority]}</li>
          </ul>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Your answers were validated on the server and nothing was stored. Product matching activates when
            the catalog launches — the profile above is exactly what it will rank against.
          </p>
        </div>
      )}

      <FoundationNote>
        The finder flow, validation and criteria profile are live. Matched product results arrive with the
        product catalog stage — no placeholder products are shown in the meantime.
      </FoundationNote>
    </div>
  )
}
