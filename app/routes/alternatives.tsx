import { buildMeta } from '../lib/seo'
import { Breadcrumb, FoundationNote, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle } from '../components/ui/ui'

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
    title: 'Cheaper',
    text: 'Costs less and keeps the specifications that matter for the job — with the ones it drops named explicitly.',
  },
  {
    title: 'Better fit',
    text: 'Matches your actual use more closely, even when it is not cheaper. Fit beats raw specifications.',
  },
  {
    title: 'Simpler',
    text: 'Fewer features, fewer failure modes, lower price. For many jobs the simpler product is the right product.',
  },
]

export default function Alternatives() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Alternatives' }]} />
      <div className="pt-6">
        <PageHeader
          title="The alternative is often the answer"
          intro="The first product you find is rarely the best one for you. For every product in the catalog, we will surface three kinds of alternatives — each with its trade-off stated, never hidden."
        />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {kinds.map((k) => (
          <Card key={k.title}>
            <CardTitle>{k.title}</CardTitle>
            <CardText>{k.text}</CardText>
          </Card>
        ))}
      </div>
      <FoundationNote>
        Alternatives are generated from specification differences in the catalog, so they launch together with
        the catalog and comparison stages. No sample alternatives are shown before then.
      </FoundationNote>
    </div>
  )
}
