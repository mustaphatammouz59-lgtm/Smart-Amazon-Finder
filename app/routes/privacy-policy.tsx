import { buildMeta } from '../lib/seo'
import { Breadcrumb, PageHeader } from '../components/layout/chrome'

export function meta() {
  return buildMeta({
    title: 'Privacy Policy',
    description: 'How this platform collects, uses and protects information — written in plain language.',
    path: '/privacy-policy',
    noIndex: true,
  })
}

export default function PrivacyPolicy() {
  return (
    <div className="page-shell pb-16">
      <Breadcrumb trail={[{ label: 'Home', to: '/' }, { label: 'Privacy Policy' }]} />
      <div className="pt-6">
        <PageHeader
          title="Privacy Policy"
          intro="Last updated: November 8, 2026. This policy describes the platform in its foundation stage and will be updated before any feature that collects more data is launched."
        />
      </div>
      <div className="prose-legal mt-8 max-w-3xl space-y-6 text-[15px] leading-7 text-navy-900/80">
        <section>
          <h2 className="text-lg font-semibold text-navy-950">What we collect today</h2>
          <p className="mt-2">
            In the foundation stage this website sets no tracking cookies and runs no advertising or affiliate
            programmes. Standard server logs (IP address, browser type, pages requested) are processed by our
            hosting provider to operate and secure the service. Forms on this site currently validate input in
            your session and do not transmit or store personal information.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">What will change, and when</h2>
          <p className="mt-2">
            Future features — user accounts, favourites, price alerts and privacy-respecting analytics — will
            collect only the data they need (for accounts: an email address and the items you save). This
            policy will be updated and dated before each such feature launches, and optional features will
            always be opt-in.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">What we never do</h2>
          <p className="mt-2">
            We never sell personal information. We never store raw IP addresses in our analytics. We never use
            fingerprinting or cross-site tracking profiles. Affiliate click records, when introduced, will
            store a salted hash instead of your IP address.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Third parties</h2>
          <p className="mt-2">
            When you follow a link to a retailer, that retailer's own privacy policy applies to anything you
            do on their site. If advertising is introduced later, the providers involved and the choices
            available to you will be listed here.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-navy-950">Your choices</h2>
          <p className="mt-2">
            When accounts exist, you will be able to export and delete your data from your account page. For
            any privacy question about the current stage, use the contact page.
          </p>
        </section>
      </div>
    </div>
  )
}
