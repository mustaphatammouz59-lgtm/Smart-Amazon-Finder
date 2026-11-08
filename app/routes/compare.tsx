import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle, SectionHeading } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'
import { ListCheckIcon, ScaleIcon, ShieldIcon } from '../components/ui/icons'

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
    icon: <ListCheckIcon className="h-6 w-6" />,
    title: 'Published criteria',
    text: 'Each category has a fixed set of comparison criteria, published before any product is scored against them. Criteria never change per product.',
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: 'Real specifications',
    text: 'Comparisons are built from verified product specifications held in the catalog — never from marketing claims or copied review scores.',
  },
  {
    icon: <ScaleIcon className="h-6 w-6" />,
    title: 'Trade-offs visible',
    text: 'A cheaper product that gives something up says what it gives up. The comparison highlights differences instead of hiding them.',
  },
]

const criteriaAreas = [
  {
    category: 'Home Office & Productivity',
    rows: [
      'Ergonomics & posture support',
      'Adjustability range',
      'Build quality & warranty',
      'Footprint & desk fit',
      'Assembly & maintenance',
    ],
  },
  {
    category: 'Electronics Accessories',
    rows: [
      'Compatibility with your devices',
      'Power delivery & charging speed',
      'Ports & standards supported',
      'Cable & connector quality',
      'Safety certifications',
    ],
  },
]

export default function Compare() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Compare' }]} />
      <div className="pt-6">
        <PageHeader
          title="Compare products, honestly"
          intro="Pick two to four products in a category and see them side by side on the criteria that actually decide the purchase. On mobile, a comparison becomes one stacked panel per product with the criterion labels kept visible — never a table you have to scroll sideways."
        />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {criteria.map((c) => (
          <Card key={c.title} className="h-full">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
              {c.icon}
            </span>
            <div className="mt-4">
              <CardTitle>{c.title}</CardTitle>
              <CardText>{c.text}</CardText>
            </div>
          </Card>
        ))}
      </div>

      <section aria-labelledby="criteria-heading" className="mt-12">
        <SectionHeading
          titleId="criteria-heading"
          eyebrow="Why these criteria"
          title="The rows every comparison is judged on"
          intro="These are the criterion areas fixed for the two launch categories. When products are published, each row is scored from verified specifications — and the reasoning is shown, not just the result."
        />
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          {criteriaAreas.map((area) => (
            <div
              key={area.category}
              className="rounded-2xl bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
            >
              <h3 className="font-semibold text-navy-950">{area.category}</h3>
              <ul className="mt-4 space-y-2.5">
                {area.rows.map((row) => (
                  <li key={row} className="flex items-start gap-2.5 text-sm leading-6 text-navy-900">
                    <span className="mt-0.5 text-teal-800">
                      <ListCheckIcon className="h-4 w-4" />
                    </span>
                    {row}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8">
        <EmptyState title="No products selected yet">
          Product selection opens when the catalog launches. Comparisons will be shareable by link and
          printable, and every criterion will trace back to a verified specification. This page intentionally
          shows no sample products.
        </EmptyState>
      </div>
    </div>
  )
}
