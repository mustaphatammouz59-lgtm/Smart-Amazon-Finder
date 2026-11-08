import { Form, useActionData } from 'react-router'
import type { Route } from './+types/contact'
import { buildMeta } from '../lib/seo'
import { contactSchema, fieldErrorsFrom, type FieldErrors } from '../lib/validation'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Button, ErrorSummary, FieldError, Input, Label, Textarea } from '../components/ui/ui'
import { AlertIcon, CheckIcon, ListCheckIcon } from '../components/ui/icons'

export function meta() {
  return buildMeta({
    title: 'Contact',
    description:
      'Contact the editorial team: corrections, product suggestions and questions about how the platform works.',
    path: '/contact',
  })
}

interface ActionResult {
  ok: boolean
  errors?: FieldErrors
}

export async function action({ request }: Route.ActionArgs): Promise<ActionResult> {
  const form = await request.formData()
  const parsed = contactSchema.safeParse({
    name: form.get('name'),
    email: form.get('email'),
    message: form.get('message'),
  })
  if (!parsed.success) {
    return { ok: false, errors: fieldErrorsFrom(parsed.error) }
  }
  // Foundation stage: validation only. Delivery activates with the
  // project's mail setup in a later stage; nothing is stored or sent.
  return { ok: true }
}

const topics = [
  {
    title: 'Corrections',
    text: 'A wrong specification, a broken link, an unclear explanation — corrections are our favourite kind of message and are fixed first.',
  },
  {
    title: 'Product & guide suggestions',
    text: 'A category we should research, or a question a guide should answer. Suggestions inform the editorial plan; they never buy placement.',
  },
  {
    title: 'Questions about the platform',
    text: 'How scoring works, how the site will be funded, what data we hold (today: none from this form).',
  },
]

export default function Contact() {
  const result = useActionData<typeof action>()
  const errors = result?.errors ?? {}
  const err = (name: string) => (errors[name] ? `${name}-error` : undefined)

  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <div className="pt-6">
        <PageHeader
          title="Contact us"
          intro="Corrections matter most: if you spot an error in a specification or a guide, tell us and we will fix it and note the change."
        />
      </div>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div>
          <div
            role="note"
            className="flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200"
          >
            <span className="mt-0.5 shrink-0">
              <AlertIcon className="h-5 w-5" />
            </span>
            <p>
              <strong className="font-semibold">Please note:</strong> message delivery is not active yet in
              this foundation stage — the form validates your input but does not transmit or store it. A
              monitored contact address will be published here when the site launches publicly.
            </p>
          </div>

          <Form
            method="post"
            className="mt-6 space-y-6 rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
            noValidate
          >
            <ErrorSummary errors={errors} />
            <div>
              <Label htmlFor="field-name">Your name</Label>
              <Input
                id="field-name"
                name="name"
                autoComplete="name"
                className="mt-2"
                aria-describedby={err('name')}
              />
              <FieldError id="name-error" message={errors.name} />
            </div>
            <div>
              <Label htmlFor="field-email">Email address</Label>
              <Input
                id="field-email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-2"
                aria-describedby={err('email')}
              />
              <FieldError id="email-error" message={errors.email} />
            </div>
            <div>
              <Label htmlFor="field-message">Message</Label>
              <Textarea
                id="field-message"
                name="message"
                rows={6}
                className="mt-2"
                aria-describedby={err('message')}
              />
              <FieldError id="message-error" message={errors.message} />
            </div>
            <Button type="submit" size="lg">
              Validate message
            </Button>
            {result?.ok && (
              <p role="status" className="flex items-start gap-2 text-sm font-medium leading-6 text-teal-800">
                <CheckIcon className="mt-0.5 h-4 w-4 shrink-0" />
                Your message passed validation. Delivery is not active yet (see the note above), so please do
                not treat this as sent.
              </p>
            )}
          </Form>
        </div>

        <aside
          aria-labelledby="topics-heading"
          className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
        >
          <h2 id="topics-heading" className="flex items-center gap-2 font-semibold text-navy-950">
            <ListCheckIcon className="h-5 w-5 text-teal-800" /> What to write about
          </h2>
          <ul className="mt-4 space-y-4">
            {topics.map((t) => (
              <li key={t.title}>
                <p className="text-sm font-semibold text-navy-950">{t.title}</p>
                <p className="mt-1 text-sm leading-6 text-smoke">{t.text}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
