import { buildMeta } from '../lib/seo'
import { Breadcrumb, FoundationNote, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'

export function meta() {
  return buildMeta({
    title: 'Compare Products',
    description:
      'Compare products side by side on published, category-specific criteria — the same criteria for every product, with trade-offs made visible.',
    path: '/compare',
  })
}

const criteria = [
  {
    title: 'Published criteria',
    text: 'Each category has a fixed set of comparison criteria, published before any product is scored against them. Criteria never change per product.',
  },
  {
    title: 'Real specifications',
    text: 'Comparisons are built from verified product specifications held in the catalog — never from marketing claims or copied review scores.',
  },
  {
    title: 'Trade-offs visible',
    text: 'A cheaper product that gives something up says what it gives up. The comparison highlights differences instead of hiding them.',
  },
]

export default function Compare() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Compare' }]} />
      <div className="pt-6">
        <PageHeader
          title="Compare products, honestly"
          intro="Pick two to four products in a category and see them side by side on the criteria that actually decide the purchase."
        />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {criteria.map((c) => (
          <Card key={c.title}>
            <CardTitle>{c.title}</CardTitle>
            <CardText>{c.text}</CardText>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <EmptyState title="No products selected yet">
          Product selection opens when the catalog launches. Comparisons will be shareable by link and
          printable, and every criterion will trace back to a verified specification.
        </EmptyState>
      </div>
      <FoundationNote>
        The comparison framework and criteria model are defined in the architecture. The interactive engine is
        a later stage — this page intentionally shows no sample products.
      </FoundationNote>
    </div>
  )
}
