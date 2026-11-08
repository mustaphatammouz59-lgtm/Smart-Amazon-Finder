import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'
import { Card, CardText, CardTitle, DisclosureBanner } from '../components/ui/ui'
import { BookIcon, CompassIcon, ShieldIcon, ScaleIcon } from '../components/ui/icons'

export function meta() {
  return buildMeta({
    title: 'About',
    description:
      'What this platform is, how its recommendations work, how it will be funded, and the independence rules it operates under.',
    path: '/about',
  })
}

export default function About() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'About' }]} />
      <div className="pt-6">
        <PageHeader
          title="About this platform"
          intro="An independent product discovery and comparison platform for the United States, starting with home office and electronics accessories."
        />
      </div>
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        <Card className="h-full">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <CompassIcon className="h-6 w-6" />
          </span>
          <div className="mt-4">
            <CardTitle>Our mission</CardTitle>
          </div>
          <CardText>
            Buying everyday products is harder than it should be: specifications are buried, comparisons are
            inconsistent, and too much advice is written to sell rather than to inform. We exist to make the
            research step honest and fast — clear criteria, real specifications, and trade-offs stated out
            loud.
          </CardText>
        </Card>
        <Card className="h-full">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <ScaleIcon className="h-6 w-6" />
          </span>
          <div className="mt-4">
            <CardTitle>How recommendations work</CardTitle>
          </div>
          <CardText>
            Products will be scored by a transparent, rule-based system against published category criteria.
            Every recommendation shows its reasons. No score can be bought: the scoring system has no input
            for commissions or sponsorships.
          </CardText>
        </Card>
        <Card className="h-full">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <BookIcon className="h-6 w-6" />
          </span>
          <div className="mt-4">
            <CardTitle>How the site will be funded</CardTitle>
          </div>
          <CardText>
            The planned model is affiliate commissions and advertising, both disclosed. Today the site is in
            its foundation stage: it carries no affiliate links, shows no advertising and is not monetised.
            When that changes, the disclosure pages will say so plainly.
          </CardText>
        </Card>
        <Card className="h-full">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
            <ShieldIcon className="h-6 w-6" />
          </span>
          <div className="mt-4">
            <CardTitle>Independence</CardTitle>
          </div>
          <CardText>
            This platform is independent. It is not an official Amazon website, is not affiliated with Amazon,
            and does not imply any endorsement. Product data will only ever come from authorised sources or
            our own editorial work — never from scraping and never invented.
          </CardText>
        </Card>
      </div>
      <div className="mt-8">
        <DisclosureBanner />
      </div>
      <p className="mt-6 max-w-3xl text-sm leading-6 text-smoke">
        Everything on this platform is written and reviewed by the site's editorial team. We do not publish
        fabricated expert personas or borrowed bylines — when a guide names an author, it names the team
        accountable for it.
      </p>
    </div>
  )
}
