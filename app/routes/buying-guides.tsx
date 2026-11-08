import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { CategoryCard, DisclosureBanner, SectionHeading } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'
import { BookIcon, DeskIcon, PlugIcon } from '../components/ui/icons'

export function meta() {
  return buildMeta({
    title: 'Buying Guides',
    description:
      'Original buying guides that teach you how to choose: how a category works, which specifications matter, sensible budget tiers and the mistakes to avoid.',
    path: '/buying-guides',
  })
}

const guideStructure = ['How to choose', 'Specs that matter', 'Budget tiers', 'Mistakes to avoid', 'FAQ']

const groups = [
  {
    icon: <DeskIcon className="h-6 w-6" />,
    title: 'Home Office & Productivity',
    text: 'Desks, chairs, lighting and the accessories that make long workdays measurably better — and how to judge each one before spending.',
    to: '/buying-guides',
    topics: ['Setting up a desk that fits', 'Chairs & posture basics', 'Lighting for video calls'],
  },
  {
    icon: <PlugIcon className="h-6 w-6" />,
    title: 'Electronics Accessories',
    text: 'Chargers, cables, hubs and stands: the small print (wattage, standards, compatibility) that decides whether an accessory actually works with your devices.',
    to: '/buying-guides',
    topics: ['USB-C, explained plainly', 'Charging wattage, decoded', 'Hubs vs. docks'],
  },
]

export default function BuyingGuides() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Buying Guides' }]} />
      <div className="pt-6">
        <PageHeader
          title="Buying guides that teach, not push"
          intro="Every guide follows the same structure and is written by our editorial team — never copied, never padded with products. Products are mentioned only inside the criteria context that explains them."
        />
      </div>

      <div className="mt-8">
        <DisclosureBanner compact />
      </div>

      <section aria-labelledby="structure-heading" className="mt-10">
        <SectionHeading
          titleId="structure-heading"
          eyebrow="Inside every guide"
          title="One structure, every time"
          intro="So you always know where the reasoning lives — and where the products are allowed to appear."
        />
        <ol className="mt-6 flex flex-wrap gap-2.5">
          {guideStructure.map((step, i) => (
            <li
              key={step}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-navy-900 ring-1 ring-navy-100"
            >
              <span
                aria-hidden="true"
                className="flex h-6 w-6 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white"
              >
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-smoke">
          Each guide also carries a “last reviewed” date and is credited to the editorial team — no fabricated
          experts, no borrowed bylines.
        </p>
      </section>

      <section aria-labelledby="groups-heading" className="mt-12">
        <SectionHeading
          titleId="groups-heading"
          eyebrow="Guides by category"
          title="The two launch categories"
          intro="Guide topics below are the editorial plan for the launch verticals. Each topic becomes a full guide only when it is complete and reviewed."
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {groups.map((g) => (
            <CategoryCard
              key={g.title}
              to={g.to}
              icon={g.icon}
              title={g.title}
              text={g.text}
              topics={g.topics}
            />
          ))}
        </div>
      </section>

      <div className="mt-8">
        <EmptyState title="The first guides are in preparation">
          Guides publish only when they are complete and reviewed. When they arrive, each one links directly
          to the finder and comparison tools for its category, and this page becomes the grouped index.
        </EmptyState>
      </div>

      <p className="mt-8 flex items-start gap-2 text-sm leading-6 text-smoke">
        <span className="mt-0.5 text-teal-800">
          <BookIcon className="h-4 w-4" />
        </span>
        Looking for a recommendation right now? The finders work today — they build your criteria profile even
        before the catalog opens.
      </p>
    </div>
  )
}
