import { Form, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/merchants'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import {
  buildSampleLink,
  createMerchant,
  createProgram,
  deleteMerchant,
  deleteProgram,
  listMerchants,
  listPrograms,
  updateMerchant,
  updateProgram,
} from '../../lib/db/admin-commerce'
import {
  AdminDenied,
  AdminHeader,
  ConfirmButton,
  FlashBanner,
  SectionCard,
  StatusBadge,
} from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select, Textarea } from '../../components/ui/ui'
import { EmptyState } from '../../components/state/states'

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function optStr(formData: FormData, name: string): string | null {
  const value = str(formData, name)
  return value === '' ? null : value
}

function optInt(formData: FormData, name: string): number | null {
  const value = str(formData, name)
  if (value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

const PROGRAM_STATUSES = ['inactive', 'active', 'suspended'] as const

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'programs', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const merchants = await listMerchants(ctx.db)
  const programs = await listPrograms(ctx.db, {})
  const url = new URL(request.url)
  return { merchants, programs, flash: url.searchParams.get('flash') }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'programs', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const formData = await request.formData()
  const intent = str(formData, 'intent')

  if (intent === 'create-merchant') {
    const slug = str(formData, 'slug')
    const name = str(formData, 'name')
    const baseDomain = str(formData, 'baseDomain')
    const errors: Record<string, string> = {}
    if (!slug) errors.slug = 'Slug is required.'
    if (!name) errors.name = 'Name is required.'
    if (!baseDomain) errors.baseDomain = 'Base domain is required.'
    if (Object.keys(errors).length > 0) return { errors }
    const result = await createMerchant(ctx.db, ctx.actor, { slug, name, baseDomain })
    if ('conflict' in result) return { errors: { slug: 'A merchant with this slug already exists.' } }
    return redirect('/admin/merchants?flash=Merchant created.')
  }

  if (intent === 'update-merchant') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing merchant id.' } }
    const name = str(formData, 'name')
    const baseDomain = str(formData, 'baseDomain')
    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Name is required.'
    if (!baseDomain) errors.baseDomain = 'Base domain is required.'
    if (Object.keys(errors).length > 0) return { errors }
    const result = await updateMerchant(ctx.db, ctx.actor, id, { name, baseDomain })
    if (!result.ok) return { errors: { form: 'Merchant not found.' } }
    return redirect('/admin/merchants?flash=Merchant updated.')
  }

  if (intent === 'delete-merchant') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing merchant id.' } }
    const result = await deleteMerchant(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use') {
        return {
          errors: {
            delete: `In use: ${result.programs_count} programs, ${result.offers_count} offers — remove those first.`,
          },
        }
      }
      return { errors: { form: 'Merchant not found.' } }
    }
    return redirect('/admin/merchants?flash=Merchant deleted.')
  }

  if (intent === 'create-program') {
    const merchantId = optInt(formData, 'merchantId')
    const name = str(formData, 'name')
    const linkTemplate = str(formData, 'linkTemplate')
    const status = str(formData, 'status')
    const errors: Record<string, string> = {}
    if (merchantId === null) errors.merchantId = 'Choose a merchant.'
    if (!name) errors.name = 'Name is required.'
    if (!linkTemplate) errors.linkTemplate = 'Link template is required.'
    if (!PROGRAM_STATUSES.includes(status as (typeof PROGRAM_STATUSES)[number])) {
      errors.status = 'Choose a valid status.'
    }
    if (Object.keys(errors).length > 0) return { errors }
    const result = await createProgram(ctx.db, ctx.actor, {
      merchantId: merchantId as number,
      name,
      linkTemplate,
      trackingParam: optStr(formData, 'trackingParam'),
      termsUrl: optStr(formData, 'termsUrl'),
      status,
      termsCheckedAt: optStr(formData, 'termsCheckedAt'),
      notes: optStr(formData, 'notes'),
    })
    if ('conflict' in result) return { errors: { merchantId: 'The selected merchant does not exist.' } }
    return redirect('/admin/merchants?flash=Program created.')
  }

  if (intent === 'update-program') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing program id.' } }
    const name = str(formData, 'name')
    const linkTemplate = str(formData, 'linkTemplate')
    const status = str(formData, 'status')
    const errors: Record<string, string> = {}
    if (!name) errors.name = 'Name is required.'
    if (!linkTemplate) errors.linkTemplate = 'Link template is required.'
    if (!PROGRAM_STATUSES.includes(status as (typeof PROGRAM_STATUSES)[number])) {
      errors.status = 'Choose a valid status.'
    }
    if (Object.keys(errors).length > 0) return { errors }
    const result = await updateProgram(ctx.db, ctx.actor, id, {
      name,
      linkTemplate,
      trackingParam: optStr(formData, 'trackingParam'),
      termsUrl: optStr(formData, 'termsUrl'),
      status,
      termsCheckedAt: optStr(formData, 'termsCheckedAt'),
      notes: optStr(formData, 'notes'),
    })
    if (!result.ok) return { errors: { form: 'Program not found.' } }
    return redirect('/admin/merchants?flash=Program updated.')
  }

  if (intent === 'delete-program') {
    const id = optInt(formData, 'id')
    if (id === null) return { errors: { form: 'Missing program id.' } }
    const result = await deleteProgram(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use') {
        return {
          errors: { delete: `In use by ${result.offers_count} offers — remove those offers first.` },
        }
      }
      return { errors: { form: 'Program not found.' } }
    }
    return redirect('/admin/merchants?flash=Program deleted.')
  }

  if (intent === 'test-link') {
    const programId = optInt(formData, 'programId')
    const destination = str(formData, 'destination') || 'https://example.invalid/product'
    if (programId === null) return { errors: { form: 'Missing program id.' } }
    const programs = await listPrograms(ctx.db, {})
    const program = programs.find((entry) => entry.id === programId)
    if (!program) return { errors: { form: 'Program not found.' } }
    const sample = buildSampleLink(program, destination)
    if (sample.ok) return { sample: { programId, url: sample.url } }
    return { sample: { programId, reason: sample.reason } }
  }

  return { errors: { form: 'Unknown action.' } }
}

export default function MerchantsPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined
  const sample = actionData && 'sample' in actionData ? actionData.sample : undefined

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Merchants & programs"
        description="Merchants and their affiliate programs, exactly as recorded — nothing is invented or auto-activated."
      />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      <SectionCard title="Merchants">
        <Form method="post" className="grid gap-4 sm:grid-cols-3">
          <input type="hidden" name="intent" value="create-merchant" />
          <div>
            <Label htmlFor="merchant-slug">Slug</Label>
            <Input id="merchant-slug" name="slug" required placeholder="amazon" />
          </div>
          <div>
            <Label htmlFor="merchant-name">Name</Label>
            <Input id="merchant-name" name="name" required placeholder="Amazon" />
          </div>
          <div>
            <Label htmlFor="merchant-domain">Base domain</Label>
            <Input id="merchant-domain" name="baseDomain" required placeholder="www.amazon.com" />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit">Create merchant</Button>
          </div>
        </Form>

        {data.merchants.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No merchants yet">Create the first merchant above.</EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Name</th>
                  <th className="py-2 pr-4 font-semibold">Slug</th>
                  <th className="py-2 pr-4 font-semibold">Base domain</th>
                  <th className="py-2 pr-4 font-semibold">Programs</th>
                  <th className="py-2 pr-4 font-semibold">Offers</th>
                  <th className="py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.merchants.map((merchant) => {
                  const inUse = merchant.programs_count > 0 || merchant.offers_count > 0
                  return (
                    <tr key={merchant.id} className="border-b border-navy-50 align-top">
                      <td className="py-3 pr-4 font-medium text-navy-950">{merchant.name}</td>
                      <td className="py-3 pr-4 text-smoke">{merchant.slug}</td>
                      <td className="py-3 pr-4 text-smoke">{merchant.base_domain}</td>
                      <td className="py-3 pr-4">{merchant.programs_count}</td>
                      <td className="py-3 pr-4">{merchant.offers_count}</td>
                      <td className="py-3">
                        <details>
                          <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                          <Form method="post" className="mt-3 grid min-w-64 gap-3">
                            <input type="hidden" name="intent" value="update-merchant" />
                            <input type="hidden" name="id" value={merchant.id} />
                            <div>
                              <Label htmlFor={`merchant-${merchant.id}-name`}>Name</Label>
                              <Input
                                id={`merchant-${merchant.id}-name`}
                                name="name"
                                required
                                defaultValue={merchant.name}
                              />
                            </div>
                            <div>
                              <Label htmlFor={`merchant-${merchant.id}-domain`}>Base domain</Label>
                              <Input
                                id={`merchant-${merchant.id}-domain`}
                                name="baseDomain"
                                required
                                defaultValue={merchant.base_domain}
                              />
                            </div>
                            <Button type="submit" size="sm">
                              Save changes
                            </Button>
                          </Form>
                        </details>
                        {inUse ? (
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              disabled
                              title={`In use: ${merchant.programs_count} programs, ${merchant.offers_count} offers — remove those first.`}
                            >
                              Delete
                            </Button>
                            <p className="mt-1 text-xs text-smoke">
                              In use: {merchant.programs_count} programs, {merchant.offers_count} offers —
                              remove those first.
                            </p>
                          </div>
                        ) : (
                          <Form method="post" className="mt-2">
                            <input type="hidden" name="intent" value="delete-merchant" />
                            <input type="hidden" name="id" value={merchant.id} />
                            <ConfirmButton label="Delete" />
                          </Form>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Affiliate programs">
        <p className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900 ring-1 ring-amber-200">
          Changing a link template or status is a high-severity audited change. Programs are never activated
          automatically; status here is a record, and outbound links are only produced by the affiliate
          module.
        </p>

        <Form method="post" className="mt-6 grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create-program" />
          <div>
            <Label htmlFor="program-merchant">Merchant</Label>
            <Select id="program-merchant" name="merchantId" defaultValue="">
              <option value="" disabled>
                Choose a merchant
              </option>
              {data.merchants.map((merchant) => (
                <option key={merchant.id} value={merchant.id}>
                  {merchant.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="program-name">Name</Label>
            <Input id="program-name" name="name" required placeholder="Amazon Associates US" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="program-template">Link template</Label>
            <Textarea
              id="program-template"
              name="linkTemplate"
              required
              rows={2}
              placeholder="https://www.amazon.com/dp/{destination}"
            />
          </div>
          <div>
            <Label htmlFor="program-tracking">Tracking param</Label>
            <Input id="program-tracking" name="trackingParam" placeholder="tag=example-20" />
          </div>
          <div>
            <Label htmlFor="program-terms">Terms URL</Label>
            <Input id="program-terms" name="termsUrl" type="url" placeholder="https://…" />
          </div>
          <div>
            <Label htmlFor="program-status">Status</Label>
            <Select id="program-status" name="status" defaultValue="inactive">
              <option value="inactive">inactive</option>
              <option value="active">active</option>
              <option value="suspended">suspended</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="program-checked">Terms checked at</Label>
            <Input id="program-checked" name="termsCheckedAt" type="date" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="program-notes">Notes</Label>
            <Textarea id="program-notes" name="notes" rows={2} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create program</Button>
          </div>
        </Form>

        {data.programs.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No programs yet">Create the first program above.</EmptyState>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {data.programs.map((program) => {
              const inUse = program.offers_count > 0
              const programSample = sample && sample.programId === program.id ? sample : undefined
              return (
                <div key={program.id} className="rounded-xl ring-1 ring-navy-100">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <p className="font-semibold text-navy-950">{program.name}</p>
                    <StatusBadge value={program.status} />
                    <span className="text-sm text-smoke">
                      {program.merchant_name} · {program.offers_count} offers
                    </span>
                  </div>
                  <dl className="grid gap-2 px-4 pb-4 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="font-medium text-navy-800">Link template</dt>
                      <dd className="break-all text-smoke">{program.link_template}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-navy-800">Tracking param</dt>
                      <dd className="text-smoke">{program.tracking_param ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-navy-800">Terms URL</dt>
                      <dd className="text-smoke">{program.terms_url ?? '—'}</dd>
                    </div>
                    <div>
                      <dt className="font-medium text-navy-800">Terms checked at</dt>
                      <dd className="text-smoke">{program.terms_checked_at ?? '—'}</dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="font-medium text-navy-800">Notes</dt>
                      <dd className="text-smoke">{program.notes ?? '—'}</dd>
                    </div>
                  </dl>
                  <div className="flex flex-wrap gap-6 px-4 pb-4">
                    <details>
                      <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                      <Form method="post" className="mt-3 grid min-w-72 gap-3">
                        <input type="hidden" name="intent" value="update-program" />
                        <input type="hidden" name="id" value={program.id} />
                        <div>
                          <Label htmlFor={`program-${program.id}-name`}>Name</Label>
                          <Input
                            id={`program-${program.id}-name`}
                            name="name"
                            required
                            defaultValue={program.name}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-template`}>Link template</Label>
                          <Textarea
                            id={`program-${program.id}-template`}
                            name="linkTemplate"
                            required
                            rows={2}
                            defaultValue={program.link_template}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-tracking`}>Tracking param</Label>
                          <Input
                            id={`program-${program.id}-tracking`}
                            name="trackingParam"
                            defaultValue={program.tracking_param ?? ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-terms`}>Terms URL</Label>
                          <Input
                            id={`program-${program.id}-terms`}
                            name="termsUrl"
                            type="url"
                            defaultValue={program.terms_url ?? ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-status`}>Status</Label>
                          <Select
                            id={`program-${program.id}-status`}
                            name="status"
                            defaultValue={program.status}
                          >
                            <option value="inactive">inactive</option>
                            <option value="active">active</option>
                            <option value="suspended">suspended</option>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-checked`}>Terms checked at</Label>
                          <Input
                            id={`program-${program.id}-checked`}
                            name="termsCheckedAt"
                            type="date"
                            defaultValue={program.terms_checked_at?.slice(0, 10) ?? ''}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`program-${program.id}-notes`}>Notes</Label>
                          <Textarea
                            id={`program-${program.id}-notes`}
                            name="notes"
                            rows={2}
                            defaultValue={program.notes ?? ''}
                          />
                        </div>
                        <Button type="submit" size="sm">
                          Save changes
                        </Button>
                      </Form>
                    </details>
                    <div>
                      {inUse ? (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled
                            title={`In use by ${program.offers_count} offers — remove those offers first.`}
                          >
                            Delete
                          </Button>
                          <p className="mt-1 text-xs text-smoke">
                            In use by {program.offers_count} offers — remove those offers first.
                          </p>
                        </>
                      ) : (
                        <Form method="post">
                          <input type="hidden" name="intent" value="delete-program" />
                          <input type="hidden" name="id" value={program.id} />
                          <ConfirmButton label="Delete" />
                        </Form>
                      )}
                    </div>
                  </div>
                  <div className="border-t border-navy-100 px-4 py-4">
                    <Form method="post" className="flex flex-wrap items-end gap-3">
                      <input type="hidden" name="intent" value="test-link" />
                      <input type="hidden" name="programId" value={program.id} />
                      <div className="min-w-64 flex-1">
                        <Label htmlFor={`program-${program.id}-destination`}>Test destination</Label>
                        <Input
                          id={`program-${program.id}-destination`}
                          name="destination"
                          type="url"
                          defaultValue="https://example.invalid/product"
                        />
                      </div>
                      <Button type="submit" size="sm" variant="secondary">
                        Build sample link
                      </Button>
                    </Form>
                    {programSample && (
                      <div className="mt-3 text-sm">
                        {programSample.url ? (
                          <p className="break-all text-navy-900">
                            Sample link:{' '}
                            <a
                              href={programSample.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-teal-800 underline underline-offset-2"
                            >
                              {programSample.url}
                            </a>
                          </p>
                        ) : (
                          <p role="alert" className="text-red-700">
                            {programSample.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
