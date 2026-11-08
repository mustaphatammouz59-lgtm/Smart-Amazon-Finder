import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'

export function meta() {
  return buildMeta({
    title: 'Affiliate Disclosure',
    description:
      'How this platform plans to earn money, what affiliate links are, and the rules that keep recommendations independent.',
    path: '/affiliate-disclosure',
    noIndex: true,
  })
}

export default function AffiliateDisclosure() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Affiliate Disclosure' }]} />
      <div className="pt-6">
        <PageHeader title="Affiliate Disclosure" intro="Last updated: November 8, 2026." />
      </div>
      <div className="mt-8 max-w-3xl space-y-6 text-[15px] leading-7 text-navy-900/80">
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Current status</h2>
          <p className="mt-2">
            <strong>This website is not currently monetised.</strong> It contains no affiliate links, displays
            no advertising, and earns no commissions. This page exists from day one so that the rules below
            are public before any of that changes.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Planned model</h2>
          <p className="mt-2">
            The platform plans to participate in affiliate programmes, including the Amazon Services LLC
            Associates Program, and to display advertising. When a link is an affiliate link, buying through
            it may earn us a commission at no additional cost to you. When that model activates, this page and
            a disclosure notice on every page containing affiliate links will say so, including the statement:
            "As an Amazon Associate I earn from qualifying purchases."
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Independence rules</h2>
          <p className="mt-2">
            Commissions never influence scores or rankings: the recommendation system has no input for them.
            Sponsored placements, if ever introduced, will be labelled "Sponsored" and kept separate from
            editorial results. Prices and availability, when shown at all, will come only from authorised
            sources with a visible timestamp.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Trademarks</h2>
          <p className="mt-2">
            Amazon and all related marks are trademarks of Amazon.com, Inc. or its affiliates. This website is
            independent and is not affiliated with or endorsed by Amazon.
          </p>
        </section>
      </div>
    </div>
  )
}
