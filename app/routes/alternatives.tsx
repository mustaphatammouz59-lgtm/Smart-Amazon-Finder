import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle, SectionHeading } from '../components/ui/ui'
import { EmptyState } from '../components/state/states'
import { ArrowRightIcon, CompassIcon, ScaleIcon, ShieldIcon } from '../components/ui/icons'
import { Link } from 'react-router'

export function meta() {
  return buildMeta({
    title: 'Find Alternatives',
    description:
      'For any product, find the cheaper option, the better fit and the simpler choice — each alternative states its trade-off in plain language.',
    path: '/alternatives',
  })
}

const kinds = [
  {
    icon: <ScaleIcon className="h-6 w-6" />,
    title: 'Cheaper',
    text: 'Costs less and keeps the specifications that matter for the job — with the ones it drops named explicitly.',
    example: 'Trade-off sentence: “Gives up the extra USB-C port; keeps the same 65W charging.”',
  },
  {
    icon: <CompassIcon className="h-6 w-6" />,
    title: 'Better fit',
    text: 'Matches your actual use more closely, even when it is not cheaper. Fit beats raw specifications.',
    example: 'Trade-off sentence: “Smaller footprint for a narrow desk; less height adjustment range.”',
  },
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: 'Simpler',
    text: 'Fewer features, fewer failure modes, lower price. For many jobs the simpler product is the right product.',
    example:
      'Trade-off sentence: “No app or firmware to maintain; fixed settings instead of adjustable ones.”',
  },
]

export default function Alternatives() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Alternatives' }]} />
      <div className="pt-6">
        <PageHeader
          title="The alternative is often the answer"
          intro="The first product you find is rarely the best one for you. For every product in the catalog, we will surface three kinds of alternatives — each with its trade-off stated, never hidden."
        />
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {kinds.map((k) => (
          <Card key={k.title} className="flex h-full flex-col">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
              {k.icon}
            </span>
            <div className="mt-4 flex-1">
              <CardTitle>{k.title}</CardTitle>
              <CardText>{k.text}</CardText>
            </div>
            <p className="mt-4 rounded-lg bg-cream px-3 py-2 text-xs leading-5 text-navy-900">{k.example}</p>
          </Card>
        ))}
      </div>

      <section aria-labelledby="how-alt-heading" className="mt-12 max-w-3xl">
        <SectionHeading
          titleId="how-alt-heading"
          eyebrow="How it works"
          title="Generated from specification differences — then checked by an editor"
          intro="Alternatives are computed from the specification deltas between products in the same category, and each trade-off sentence is reviewed before publication. No product will ever be labeled an alternative for a commercial reason."
        />
        <p className="mt-5 text-base leading-7 text-smoke">
          Until the catalog launches, there is nothing honest to list here — alternatives need a real lead
          product and real specifications. In the meantime, the{' '}
          <Link to="/product-finder" className="font-medium text-teal-800 underline underline-offset-2">
            Product Finder
          </Link>{' '}
          turns your job and budget into the criteria an alternative has to beat.
        </p>
        <p className="mt-4">
          <Link
            to="/compare"
            className="inline-flex min-h-11 items-center gap-1.5 font-semibold text-teal-800 underline-offset-4 hover:underline"
          >
            See how comparisons present trade-offs <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </p>
      </section>

      <div className="mt-8">
        <EmptyState title="No lead product yet">
          Alternatives attach to a product page, so they launch together with the catalog and comparison
          stages. No sample alternatives are shown before then.
        </EmptyState>
      </div>
    </div>
  )
}
