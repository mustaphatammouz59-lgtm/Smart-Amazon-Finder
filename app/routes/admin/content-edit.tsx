import { useState } from 'react'
import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/content-edit'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import {
  contentChecklist,
  getContent,
  transitionContent,
  updateContent,
  type ChecklistIssue,
  type ContentDetail,
  type ContentKind,
} from '../../lib/db/admin-content'
import { listCategories, type CategoryRow } from '../../lib/db/admin-taxonomy'
import { parseBodyBlocks, type ContentBlock } from '../../lib/sanitize'
import {
  AdminDenied,
  AdminHeader,
  ConfirmButton,
  FlashBanner,
  SectionCard,
  StatusBadge,
} from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select, Textarea } from '../../components/ui/ui'

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

function kindFromSegment(segment: string | undefined): ContentKind | null {
  if (segment === 'articles') return 'article'
  if (segment === 'guides') return 'guide'
  return null
}

const TARGETS = ['in_review', 'published', 'archived', 'draft'] as const
type Target = (typeof TARGETS)[number]

export async function loader({ request, params }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'content', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const kind = kindFromSegment(params.kind)
  if (!kind) return { notFound: true as const }
  const id = Number.parseInt(params.id ?? '', 10)
  if (Number.isNaN(id)) return { notFound: true as const }
  const content = await getContent(ctx.db, kind, id)
  if (!content) return { notFound: true as const }
  const checklist = await contentChecklist(ctx.db, kind, id)
  const categories = await listCategories(ctx.db)
  let bodyBlocks: ContentBlock[] = []
  let bodyError = false
  if (content.body_blocks) {
    try {
      bodyBlocks = parseBodyBlocks(JSON.parse(content.body_blocks) as unknown)
    } catch {
      bodyBlocks = []
      bodyError = true
    }
  }
  const url = new URL(request.url)
  return {
    content,
    checklist,
    categories,
    bodyBlocks,
    bodyError,
    kind,
    segment: params.kind as string,
    flash: url.searchParams.get('flash'),
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'content', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const kind = kindFromSegment(params.kind)
  if (!kind) return { errors: { form: 'Unknown content type.' } }
  const id = Number.parseInt(params.id ?? '', 10)
  if (Number.isNaN(id)) return { errors: { form: 'Missing content id.' } }
  const formData = await request.formData()
  const intent = str(formData, 'intent')
  const editPath = `/admin/content/${params.kind}/${id}`

  if (intent === 'save') {
    const title = str(formData, 'title')
    if (!title) return { errors: { title: 'Title is required.' } }
    let blocks: ContentBlock[]
    try {
      blocks = parseBodyBlocks(JSON.parse(str(formData, 'bodyBlocks') || '[]') as unknown)
    } catch {
      return { errors: { bodyBlocks: 'The body blocks are invalid and could not be saved.' } }
    }
    const result = await updateContent(ctx.db, ctx.actor, kind, id, {
      title,
      metaTitle: optStr(formData, 'metaTitle'),
      metaDescription: optStr(formData, 'metaDescription'),
      categoryId: kind === 'guide' ? optInt(formData, 'categoryId') : undefined,
      bodyBlocks: blocks,
    })
    if (!result.ok) {
      if (result.reason === 'unknown_category') {
        return { errors: { categoryId: 'The selected category does not exist.' } }
      }
      return { errors: { form: 'Content not found.' } }
    }
    return redirect(`${editPath}?flash=Saved.`)
  }

  if (intent === 'status') {
    const target = str(formData, 'target') as Target
    if (!TARGETS.includes(target)) return { errors: { status: 'Unknown status target.' } }
    if (target === 'published') {
      const publishCtx = await adminContext(request, 'content', 'publish')
      if (!publishCtx.ok) return { denied: publishCtx.status }
    }
    const result = await transitionContent(ctx.db, ctx.actor, kind, id, target)
    if (!result.ok) {
      if (result.reason === 'checklist' && result.issues) {
        return { errors: { status: result.issues.map((issue) => issue.message).join(' ') } }
      }
      return { errors: { form: 'Content not found.' } }
    }
    return redirect(`${editPath}?flash=${encodeURIComponent(`Status changed to ${target}.`)}`)
  }

  return { errors: { form: 'Unknown action.' } }
}

const BLOCK_TYPES: Array<ContentBlock['type']> = ['heading', 'paragraph', 'list', 'disclosure', 'quote']

function emptyBlock(type: ContentBlock['type']): ContentBlock {
  if (type === 'list') return { type: 'list', items: [] }
  return { type, text: '' } as ContentBlock
}

function convertBlock(block: ContentBlock, type: ContentBlock['type']): ContentBlock {
  if (block.type === type) return block
  if (type === 'list') {
    return { type: 'list', items: block.type === 'list' ? block.items : block.text ? [block.text] : [] }
  }
  const text = block.type === 'list' ? block.items.join('\n') : block.text
  return { type, text } as ContentBlock
}

function BlocksEditor({ initialBlocks }: { initialBlocks: ContentBlock[] }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initialBlocks)

  const replace = (index: number, block: ContentBlock) =>
    setBlocks((current) => current.map((entry, i) => (i === index ? block : entry)))
  const remove = (index: number) => setBlocks((current) => current.filter((_, i) => i !== index))
  const move = (index: number, direction: -1 | 1) =>
    setBlocks((current) => {
      const target = index + direction
      if (target < 0 || target >= current.length) return current
      const next = current.slice()
      const [item] = next.splice(index, 1)
      next.splice(target, 0, item as ContentBlock)
      return next
    })

  return (
    <div className="space-y-4">
      <input type="hidden" name="bodyBlocks" value={JSON.stringify(blocks)} />
      {blocks.length === 0 && <p className="text-sm text-smoke">No blocks yet. Add the first block below.</p>}
      {blocks.map((block, index) => (
        <div key={index} className="rounded-xl ring-1 ring-navy-100">
          <div className="flex flex-wrap items-center gap-2 border-b border-navy-100 px-4 py-2">
            <Select
              aria-label={`Block ${index + 1} type`}
              value={block.type}
              onChange={(event) =>
                replace(index, convertBlock(block, event.target.value as ContentBlock['type']))
              }
              className="w-40"
            >
              {BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </Select>
            <span className="text-xs text-smoke">Block {index + 1}</span>
            <span className="ml-auto flex gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => move(index, -1)}
                disabled={index === 0}
              >
                Up
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => move(index, 1)}
                disabled={index === blocks.length - 1}
              >
                Down
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => remove(index)}>
                Remove
              </Button>
            </span>
          </div>
          <div className="p-4">
            {block.type === 'list' ? (
              <Textarea
                aria-label={`Block ${index + 1} items, one per line`}
                rows={4}
                value={block.items.join('\n')}
                onChange={(event) =>
                  replace(index, {
                    type: 'list',
                    items: event.target.value === '' ? [] : event.target.value.split('\n'),
                  })
                }
                placeholder="One item per line"
              />
            ) : (
              <Textarea
                aria-label={`Block ${index + 1} text`}
                rows={block.type === 'heading' ? 2 : 4}
                value={block.text}
                onChange={(event) =>
                  replace(index, { type: block.type, text: event.target.value } as ContentBlock)
                }
              />
            )}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        {BLOCK_TYPES.map((type) => (
          <Button
            key={type}
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setBlocks((current) => [...current, emptyBlock(type)])}
          >
            Add {type}
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={() => setBlocks((current) => [...current, emptyBlock('disclosure')])}
        >
          Add disclosure block
        </Button>
      </div>
    </div>
  )
}

interface EditorProps {
  content: ContentDetail
  checklist: { publishable: boolean; issues: ChecklistIssue[] } | null
  categories: CategoryRow[]
  bodyBlocks: ContentBlock[]
  bodyError: boolean
  kind: ContentKind
  flash: string | null
  errors?: Record<string, string>
}

function ContentEditor({
  content,
  checklist,
  categories,
  bodyBlocks,
  bodyError,
  kind,
  flash,
  errors,
}: EditorProps) {
  return (
    <div className="space-y-6">
      <AdminHeader
        title={content.title}
        description={`${kind === 'article' ? 'Article' : 'Buying guide'} · /${content.slug}`}
      />
      <p>
        <Link to="/admin/content" className="text-sm font-medium text-teal-800 underline underline-offset-2">
          ← Back to content
        </Link>{' '}
        <StatusBadge value={content.status} />
      </p>
      <FlashBanner message={flash} />
      <ErrorSummary errors={errors ?? {}} />
      {bodyError && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          The stored body could not be parsed and has been loaded as empty. Saving will replace it with the
          blocks below.
        </p>
      )}

      <SectionCard title="Edit">
        <Form method="post" className="grid gap-4">
          <input type="hidden" name="intent" value="save" />
          <div>
            <Label htmlFor="content-title">Title</Label>
            <Input id="content-title" name="title" required defaultValue={content.title} />
          </div>
          <div>
            <Label htmlFor="content-meta-title">Meta title</Label>
            <Input id="content-meta-title" name="metaTitle" defaultValue={content.meta_title ?? ''} />
          </div>
          <div>
            <Label htmlFor="content-meta-description">Meta description</Label>
            <Textarea
              id="content-meta-description"
              name="metaDescription"
              rows={2}
              defaultValue={content.meta_description ?? ''}
            />
          </div>
          {kind === 'guide' && (
            <div>
              <Label htmlFor="content-category">Category</Label>
              <Select id="content-category" name="categoryId" defaultValue={content.category_id ?? ''}>
                <option value="">— none —</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <p className="mb-2 text-sm font-medium text-navy-950">Body blocks</p>
            <BlocksEditor initialBlocks={bodyBlocks} />
          </div>
          <div>
            <Button type="submit">Save</Button>
          </div>
        </Form>
      </SectionCard>

      <SectionCard title="Publish checklist">
        {checklist === null ? (
          <p className="text-sm text-smoke">Checklist unavailable.</p>
        ) : (
          <>
            <p
              className={checklist.publishable ? 'font-semibold text-teal-800' : 'font-semibold text-red-700'}
            >
              {checklist.publishable ? 'Ready to publish' : 'Not publishable yet'}
            </p>
            {checklist.issues.length > 0 && (
              <ul className="mt-3 space-y-2 text-sm">
                {checklist.issues.map((issue) => (
                  <li key={issue.code} className="flex flex-wrap items-center gap-2">
                    <StatusBadge value={issue.severity} />
                    <span className="font-medium text-navy-900">{issue.field}</span>
                    <span className="text-smoke">{issue.message}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </SectionCard>

      <SectionCard title="Status transitions">
        <div className="flex flex-wrap gap-2">
          <Form method="post">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="target" value="in_review" />
            <Button type="submit" variant="secondary">
              Submit for review
            </Button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="target" value="published" />
            <Button type="submit">Publish</Button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="target" value="draft" />
            <Button type="submit" variant="secondary">
              Unpublish to draft
            </Button>
          </Form>
          <Form method="post">
            <input type="hidden" name="intent" value="status" />
            <input type="hidden" name="target" value="archived" />
            <ConfirmButton label="Archive" />
          </Form>
        </div>
      </SectionCard>
    </div>
  )
}

export default function ContentEditPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  if ('notFound' in data) {
    return (
      <div className="space-y-4">
        <AdminHeader title="Content not found" />
        <p className="text-sm text-smoke">
          This content item does not exist, or the address is not a valid article/guide edit page.{' '}
          <Link to="/admin/content" className="font-medium text-teal-800 underline underline-offset-2">
            Back to content
          </Link>
        </p>
      </div>
    )
  }
  const errors: Record<string, string> | undefined =
    actionData && 'errors' in actionData
      ? (actionData.errors as unknown as Record<string, string>)
      : undefined
  return (
    <ContentEditor
      content={data.content}
      checklist={data.checklist}
      categories={data.categories}
      bodyBlocks={data.bodyBlocks}
      bodyError={data.bodyError}
      kind={data.kind}
      flash={data.flash}
      errors={errors}
    />
  )
}
