import { Form, useActionData } from 'react-router'
import type { Route } from './+types/contact'
import { buildMeta } from '../lib/seo'
import { contactSchema, fieldErrorsFrom, type FieldErrors } from '../lib/validation'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Button, FieldError, Input, Label, Textarea } from '../components/ui/ui'

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

export default function Contact() {
  const result = useActionData<typeof action>()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Contact' }]} />
      <div className="pt-6">
        <PageHeader
          title="Contact us"
          intro="Corrections matter most: if you spot an error in a specification or a guide, tell us and we will fix it and note the change."
        />
      </div>

      <div className="mt-8 max-w-xl rounded-xl bg-navy-50 p-4 text-sm leading-6 text-navy-900 ring-1 ring-navy-100">
        <strong className="font-semibold">Please note:</strong> message delivery is not active yet in this
        foundation stage — the form validates your input but does not transmit or store it. A monitored
        contact address will be published here when the site launches publicly.
      </div>

      <Form
        method="post"
        className="mt-6 max-w-xl space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-navy-100"
        noValidate
      >
        <div>
          <Label htmlFor="name">Your name</Label>
          <Input id="name" name="name" autoComplete="name" className="mt-2" />
          <FieldError id="name-error" message={result?.errors?.name} />
        </div>
        <div>
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" autoComplete="email" className="mt-2" />
          <FieldError id="email-error" message={result?.errors?.email} />
        </div>
        <div>
          <Label htmlFor="message">Message</Label>
          <Textarea id="message" name="message" rows={6} className="mt-2" />
          <FieldError id="message-error" message={result?.errors?.message} />
        </div>
        <Button type="submit" size="lg">
          Validate message
        </Button>
        {result?.ok && (
          <p role="status" className="text-sm font-medium text-teal-800">
            Your message passed validation. Delivery is not active yet (see the note above), so please do not
            treat this as sent.
          </p>
        )}
      </Form>
    </div>
  )
}
