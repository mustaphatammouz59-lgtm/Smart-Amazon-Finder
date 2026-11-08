import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'

export function meta() {
  return buildMeta({
    title: 'Terms of Use',
    description: 'The terms that govern use of this independent product research platform.',
    path: '/terms',
    noIndex: true,
  })
}

export default function Terms() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Terms of Use' }]} />
      <div className="pt-6">
        <PageHeader title="Terms of Use" intro="Last updated: November 8, 2026." />
      </div>
      <div className="mt-8 max-w-3xl space-y-6 text-[15px] leading-7 text-slate-700">
        <section>
          <h2 className="text-lg font-semibold text-navy-950">The service</h2>
          <p className="mt-2">
            This website provides independent product research, comparisons and buying guides for information
            purposes. We do not sell products, process payments or fulfil orders; purchases happen on
            third-party retailer sites under their own terms.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Accuracy</h2>
          <p className="mt-2">
            We work to keep specifications and editorial content accurate, and we correct errors when they are
            reported. Product prices and availability change constantly and are the retailer's responsibility
            at checkout; where this site displays such data in the future, it will carry the timestamp of when
            it was observed.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Acceptable use</h2>
          <p className="mt-2">
            You may browse and link to this site freely. You may not scrape the site in bulk, attempt to
            bypass rate limits or security controls, misrepresent our content as your own, or use the site to
            infringe anyone's rights.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Intellectual property</h2>
          <p className="mt-2">
            Our original content is protected by copyright. Third-party trademarks belong to their owners and
            are used only to identify products and retailers. Nothing on this site grants any right to use a
            third party's marks as your own branding.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Liability</h2>
          <p className="mt-2">
            To the extent permitted by law, we are not liable for purchase decisions made using information
            here, or for the content, pricing or fulfilment of third-party retailers. These terms will be
            reviewed by qualified legal counsel before public launch.
          </p>
        </section>
      </div>
    </div>
  )
}
