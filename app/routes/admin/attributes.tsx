import { Form, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/attributes'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import {
  createAttributeDefinition,
  deleteAttributeDefinition,
  listAttributeDefinitions,
  listCategories,
  updateAttributeDefinition,
} from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader, ConfirmButton, FlashBanner, SectionCard } from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select } from '../../components/ui/ui'
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

const VALUE_TYPES = ['number', 'text', 'bool'] as const
type ValueType = (typeof VALUE_TYPES)[number]

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'categories', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const categories = await listCategories(ctx.db)
  const url = new URL(request.url)
  const requested = Number.parseInt(url.searchParams.get('category') ?? '', 10)
  const selected = categories.find((category) => category.id === requested) ?? categories[0] ?? null
  const definitions = selected ? await listAttributeDefinitions(ctx.db, selected.id) : []
  return { categories, selected, definitions, flash: url.searchParams.get('flash') }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'categories', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const formData = await request.formData()
  const intent = str(formData, 'intent')
  const backTo = (message: string, categoryId: number | null) =>
    redirect(
      `/admin/attributes?${categoryId !== null ? `category=${categoryId}&` : ''}flash=${encodeURIComponent(message)}`,
    )

  if (intent === 'create') {
    const categoryId = optInt(formData, 'categoryId')
    const key = str(formData, 'key')
    const label = str(formData, 'label')
    const valueTypeRaw = str(formData, 'valueType')
    const errors: Record<string, string> = {}
    if (categoryId === null) errors.categoryId = 'Choose a category first.'
    if (!key) errors.key = 'Key is required.'
    if (!label) errors.label = 'Label is required.'
    if (!VALUE_TYPES.includes(valueTypeRaw as ValueType)) errors.valueType = 'Choose a value type.'
    if (Object.keys(errors).length > 0) return { errors }
    const result = await createAttributeDefinition(ctx.db, ctx.actor, categoryId as number, {
      key,
      label,
      unit: optStr(formData, 'unit'),
      valueType: valueTypeRaw as ValueType,
      isFilterable: formData.get('isFilterable') === 'on',
      isComparisonCriterion: formData.get('isComparisonCriterion') === 'on',
      sortWeight: optInt(formData, 'sortWeight') ?? 0,
    })
    if ('conflict' in result) {
      if (result.conflict === 'key') {
        return { errors: { key: 'A definition with this key already exists in this category.' } }
      }
      return { errors: { categoryId: 'The selected category does not exist.' } }
    }
    return backTo('Attribute definition created.', categoryId)
  }

  if (intent === 'update') {
    const id = optInt(formData, 'id')
    const categoryId = optInt(formData, 'categoryId')
    if (id === null) return { errors: { form: 'Missing definition id.' } }
    const label = str(formData, 'label')
    if (!label) return { errors: { label: 'Label is required.' } }
    const result = await updateAttributeDefinition(ctx.db, ctx.actor, id, {
      label,
      unit: optStr(formData, 'unit'),
      isFilterable: formData.get('isFilterable') === 'on',
      isComparisonCriterion: formData.get('isComparisonCriterion') === 'on',
      sortWeight: optInt(formData, 'sortWeight') ?? 0,
    })
    if (!result.ok) return { errors: { form: 'Definition not found.' } }
    return backTo('Attribute definition updated.', categoryId)
  }

  if (intent === 'delete') {
    const id = optInt(formData, 'id')
    const categoryId = optInt(formData, 'categoryId')
    if (id === null) return { errors: { form: 'Missing definition id.' } }
    const result = await deleteAttributeDefinition(ctx.db, ctx.actor, id)
    if (!result.ok) {
      if (result.reason === 'in_use' && result.counts) {
        return {
          errors: {
            delete: `In use by ${result.counts.specs} product spec values — those specs must be removed first.`,
          },
        }
      }
      return { errors: { form: 'Definition not found.' } }
    }
    return backTo('Attribute definition deleted.', categoryId)
  }

  return { errors: { form: 'Unknown action.' } }
}

export default function AttributesPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined
  const selected = data.selected

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Attribute definitions"
        description="Per-category spec definitions used by product specs, filters and comparisons."
      />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      {data.categories.length === 0 || !selected ? (
        <EmptyState title="No categories yet">
          Attribute definitions belong to a category. Create a category first, then define its attributes
          here.
        </EmptyState>
      ) : (
        <>
          <SectionCard title="Category">
            <form method="get" className="flex flex-wrap items-end gap-3">
              <div className="min-w-64">
                <Label htmlFor="attr-category-switch">Category</Label>
                <Select id="attr-category-switch" name="category" defaultValue={selected.id}>
                  {data.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Button type="submit" variant="secondary">
                Apply
              </Button>
            </form>
          </SectionCard>

          <SectionCard title={`New definition for ${selected.name}`}>
            <Form method="post" className="grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="intent" value="create" />
              <input type="hidden" name="categoryId" value={selected.id} />
              <div>
                <Label htmlFor="attr-key">Key</Label>
                <Input id="attr-key" name="key" required placeholder="weight_kg" />
              </div>
              <div>
                <Label htmlFor="attr-label">Label</Label>
                <Input id="attr-label" name="label" required placeholder="Weight" />
              </div>
              <div>
                <Label htmlFor="attr-unit">Unit</Label>
                <Input id="attr-unit" name="unit" placeholder="kg" />
              </div>
              <div>
                <Label htmlFor="attr-type">Value type</Label>
                <Select id="attr-type" name="valueType" defaultValue="number">
                  <option value="number">number</option>
                  <option value="text">text</option>
                  <option value="bool">bool</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="attr-weight">Sort weight</Label>
                <Input id="attr-weight" name="sortWeight" type="number" defaultValue={0} />
              </div>
              <div className="flex flex-col gap-2 pt-6">
                <label className="flex items-center gap-2 text-sm text-navy-950">
                  <input type="checkbox" name="isFilterable" className="h-4 w-4" />
                  Filterable (usable as a finder facet)
                </label>
                <label className="flex items-center gap-2 text-sm text-navy-950">
                  <input type="checkbox" name="isComparisonCriterion" className="h-4 w-4" />
                  Comparison criterion
                </label>
              </div>
              <p className="text-sm text-smoke sm:col-span-2">
                Keys and value types are fixed once created — changing them would corrupt existing spec
                values.
              </p>
              <div className="sm:col-span-2">
                <Button type="submit">Create definition</Button>
              </div>
            </Form>
          </SectionCard>

          <SectionCard title={`Definitions in ${selected.name}`}>
            {data.definitions.length === 0 ? (
              <EmptyState title="No definitions in this category">
                Create the first definition above.
              </EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-navy-100 text-navy-800">
                      <th className="py-2 pr-4 font-semibold">Key</th>
                      <th className="py-2 pr-4 font-semibold">Label</th>
                      <th className="py-2 pr-4 font-semibold">Unit</th>
                      <th className="py-2 pr-4 font-semibold">Type</th>
                      <th className="py-2 pr-4 font-semibold">Filterable</th>
                      <th className="py-2 pr-4 font-semibold">Comparison</th>
                      <th className="py-2 pr-4 font-semibold">Weight</th>
                      <th className="py-2 pr-4 font-semibold">Specs</th>
                      <th className="py-2 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.definitions.map((definition) => {
                      const inUse = definition.specs_count > 0
                      return (
                        <tr key={definition.id} className="border-b border-navy-50 align-top">
                          <td className="py-3 pr-4 font-medium text-navy-950">{definition.key}</td>
                          <td className="py-3 pr-4">{definition.label}</td>
                          <td className="py-3 pr-4 text-smoke">{definition.unit ?? '—'}</td>
                          <td className="py-3 pr-4">{definition.value_type}</td>
                          <td className="py-3 pr-4">{definition.is_filterable ? 'Yes' : 'No'}</td>
                          <td className="py-3 pr-4">{definition.is_comparison_criterion ? 'Yes' : 'No'}</td>
                          <td className="py-3 pr-4">{definition.sort_weight}</td>
                          <td className="py-3 pr-4">{definition.specs_count}</td>
                          <td className="py-3">
                            <details>
                              <summary className="cursor-pointer font-medium text-teal-800">Edit</summary>
                              <Form method="post" className="mt-3 grid min-w-64 gap-3">
                                <input type="hidden" name="intent" value="update" />
                                <input type="hidden" name="id" value={definition.id} />
                                <input type="hidden" name="categoryId" value={selected.id} />
                                <div>
                                  <Label htmlFor={`attr-${definition.id}-label`}>Label</Label>
                                  <Input
                                    id={`attr-${definition.id}-label`}
                                    name="label"
                                    required
                                    defaultValue={definition.label}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`attr-${definition.id}-unit`}>Unit</Label>
                                  <Input
                                    id={`attr-${definition.id}-unit`}
                                    name="unit"
                                    defaultValue={definition.unit ?? ''}
                                  />
                                </div>
                                <div>
                                  <Label htmlFor={`attr-${definition.id}-weight`}>Sort weight</Label>
                                  <Input
                                    id={`attr-${definition.id}-weight`}
                                    name="sortWeight"
                                    type="number"
                                    defaultValue={definition.sort_weight}
                                  />
                                </div>
                                <label className="flex items-center gap-2 text-sm text-navy-950">
                                  <input
                                    type="checkbox"
                                    name="isFilterable"
                                    defaultChecked={definition.is_filterable === 1}
                                    className="h-4 w-4"
                                  />
                                  Filterable
                                </label>
                                <label className="flex items-center gap-2 text-sm text-navy-950">
                                  <input
                                    type="checkbox"
                                    name="isComparisonCriterion"
                                    defaultChecked={definition.is_comparison_criterion === 1}
                                    className="h-4 w-4"
                                  />
                                  Comparison criterion
                                </label>
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
                                  title={`In use by ${definition.specs_count} product spec values — those specs must be removed first.`}
                                >
                                  Delete
                                </Button>
                                <p className="mt-1 text-xs text-smoke">
                                  In use by {definition.specs_count} product spec values — those specs must be
                                  removed first.
                                </p>
                              </div>
                            ) : (
                              <Form method="post" className="mt-2">
                                <input type="hidden" name="intent" value="delete" />
                                <input type="hidden" name="id" value={definition.id} />
                                <input type="hidden" name="categoryId" value={selected.id} />
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
        </>
      )}
    </div>
  )
}
