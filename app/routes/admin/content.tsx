import { Form, Link, redirect, useActionData, useLoaderData } from 'react-router'
import type { Route } from './+types/content'
import { adminContext } from '../../lib/admin-page'
import { assertSameOrigin } from '../../lib/origin'
import { createContent, listContent, type ContentKind } from '../../lib/db/admin-content'
import { listCategories } from '../../lib/db/admin-taxonomy'
import { AdminDenied, AdminHeader, FlashBanner, SectionCard, StatusBadge } from '../../components/admin/ui'
import { Button, ErrorSummary, Input, Label, Select } from '../../components/ui/ui'
import { EmptyState } from '../../components/state/states'

function str(formData: FormData, name: string): string {
  const value = formData.get(name)
  return typeof value === 'string' ? value.trim() : ''
}

function optInt(formData: FormData, name: string): number | null {
  const value = str(formData, name)
  if (value === '') return null
  const parsed = Number.parseInt(value, 10)
  return Number.isNaN(parsed) ? null : parsed
}

export async function loader({ request }: Route.LoaderArgs) {
  const ctx = await adminContext(request, 'content', 'read')
  if (!ctx.ok) return { denied: ctx.status }
  const articles = await listContent(ctx.db, 'article', { limit: 60 })
  const guides = await listContent(ctx.db, 'guide', { limit: 60 })
  const categories = await listCategories(ctx.db)
  const url = new URL(request.url)
  return {
    articles: articles.items,
    guides: guides.items,
    categories,
    flash: url.searchParams.get('flash'),
  }
}

export async function action({ request }: Route.ActionArgs) {
  const ctx = await adminContext(request, 'content', 'write')
  if (!ctx.ok) return { denied: ctx.status }
  assertSameOrigin(request)
  const formData = await request.formData()
  const intent = str(formData, 'intent')
  if (intent !== 'create-article' && intent !== 'create-guide') {
    return { errors: { form: 'Unknown action.' } }
  }
  const kind: ContentKind = intent === 'create-article' ? 'article' : 'guide'
  const segment = kind === 'article' ? 'articles' : 'guides'
  const title = str(formData, 'title')
  const slug = str(formData, 'slug')
  const errors: Record<string, string> = {}
  if (!title) errors.title = 'Title is required.'
  if (!slug) errors.slug = 'Slug is required.'
  if (Object.keys(errors).length > 0) return { errors }
  const result = await createContent(ctx.db, ctx.actor, kind, {
    slug,
    title,
    categoryId: kind === 'guide' ? optInt(formData, 'categoryId') : undefined,
  })
  if ('conflict' in result) {
    if (result.conflict === 'slug') {
      return { errors: { slug: `A ${kind} with this slug already exists.` } }
    }
    return { errors: { categoryId: 'The selected category does not exist.' } }
  }
  return redirect(`/admin/content/${segment}/${result.id}`)
}

export default function ContentPage() {
  const data = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  if ('denied' in data) return <AdminDenied status={data.denied ?? 401} />
  const errors = actionData && 'errors' in actionData ? actionData.errors : undefined

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Content"
        description="Articles and buying guides. Bodies are structured blocks — never raw HTML, never typed prices."
      />
      <FlashBanner message={data.flash} />
      <ErrorSummary errors={errors ?? {}} />

      <SectionCard title="Articles">
        <Form method="post" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create-article" />
          <div>
            <Label htmlFor="article-title">Title</Label>
            <Input id="article-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="article-slug">Slug</Label>
            <Input id="article-slug" name="slug" required placeholder="how-we-test" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create article</Button>
          </div>
        </Form>

        {data.articles.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No articles yet">Create the first article above.</EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Title</th>
                  <th className="py-2 pr-4 font-semibold">Slug</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.articles.map((article) => (
                  <tr key={article.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/content/articles/${article.id}`}
                        className="font-medium text-teal-800 underline underline-offset-2"
                      >
                        {article.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-smoke">{article.slug}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={article.status} />
                    </td>
                    <td className="py-3 text-smoke">{article.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Buying guides">
        <Form method="post" className="grid gap-4 sm:grid-cols-2">
          <input type="hidden" name="intent" value="create-guide" />
          <div>
            <Label htmlFor="guide-title">Title</Label>
            <Input id="guide-title" name="title" required />
          </div>
          <div>
            <Label htmlFor="guide-slug">Slug</Label>
            <Input id="guide-slug" name="slug" required placeholder="best-desk-chairs" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="guide-category">Category (optional)</Label>
            <Select id="guide-category" name="categoryId" defaultValue="">
              <option value="">— none —</option>
              {data.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Create guide</Button>
          </div>
        </Form>

        {data.guides.length === 0 ? (
          <div className="mt-6">
            <EmptyState title="No buying guides yet">Create the first guide above.</EmptyState>
          </div>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-navy-100 text-navy-800">
                  <th className="py-2 pr-4 font-semibold">Title</th>
                  <th className="py-2 pr-4 font-semibold">Slug</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Category</th>
                  <th className="py-2 font-semibold">Updated</th>
                </tr>
              </thead>
              <tbody>
                {data.guides.map((guide) => (
                  <tr key={guide.id} className="border-b border-navy-50 align-top">
                    <td className="py-3 pr-4">
                      <Link
                        to={`/admin/content/guides/${guide.id}`}
                        className="font-medium text-teal-800 underline underline-offset-2"
                      >
                        {guide.title}
                      </Link>
                    </td>
                    <td className="py-3 pr-4 text-smoke">{guide.slug}</td>
                    <td className="py-3 pr-4">
                      <StatusBadge value={guide.status} />
                    </td>
                    <td className="py-3 pr-4 text-smoke">{guide.category_name ?? '—'}</td>
                    <td className="py-3 text-smoke">{guide.updated_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  )
}
