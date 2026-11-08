import { buildMeta } from '../lib/seo'
import { Breadcrumb, FoundationNote, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'

export function meta() {
  return buildMeta({
    title: 'Buying Guides',
    description:
      'Original buying guides that teach you how to choose: how a category works, which specifications matter, sensible budget tiers and the mistakes to avoid.',
    path: '/buying-guides',
  })
}

const topics = [
  {
    title: 'Home Office & Productivity',
    text: 'Desks, chairs, lighting and the accessories that make long workdays measurably better — and how to judge each one before spending.',
  },
  {
    title: 'Electronics Accessories',
    text: 'Chargers, cables, hubs and stands: the small print (wattage, standards, compatibility) that decides whether an accessory actually works with your devices.',
  },
]

export default function BuyingGuides() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Buying Guides' }]} />
      <div className="pt-6">
        <PageHeader
          title="Buying guides that teach, not push"
          intro="Every guide follows the same structure: how the category works, the specifications that matter, budget tiers, and the mistakes we see buyers make. Written by our editorial team — never copied, never padded with products."
        />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {topics.map((t) => (
          <Card key={t.title}>
            <CardTitle>{t.title}</CardTitle>
            <CardText>{t.text}</CardText>
          </Card>
        ))}
      </div>
      <div className="mt-8">
        <EmptyState title="The first guides are in preparation">
          Guides publish only when they are complete and reviewed. When they arrive, each one links directly
          to the finder and comparison tools for its category.
        </EmptyState>
      </div>
      <FoundationNote>
        Guide topics above are the launch editorial plan for the two initial verticals. Publication happens in
        the content stage — no placeholder articles are indexed before then.
      </FoundationNote>
    </div>
  )
}
