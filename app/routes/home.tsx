import { Link } from 'react-router'
import { buildMeta } from '../lib/seo'
import {
  Card,
  CardText,
  CardTitle,
  CategoryCard,
  DisclosureBanner,
  FaqAccordion,
  LinkButton,
  SearchBar,
  SectionHeading,
} from '../components/ui/ui'
import {
  ArrowRightIcon,
  BookIcon,
  CompassIcon,
  DeskIcon,
  GiftIcon,
  ListCheckIcon,
  PlugIcon,
  ScaleIcon,
  ShieldIcon,
} from '../components/ui/icons'

export function meta() {
  return buildMeta({
    title: 'Smart Amazon Finder',
    description:
      'Discover products, compare them on published criteria, and find honest alternatives — independent product research for home office and electronics accessories.',
    path: '/',
  })
}

const steps = [
  {
    icon: <CompassIcon className="h-6 w-6" />,
    title: 'Tell us the job',
    text: 'Start with what you are trying to do and your budget — not with a brand name. The Product Finder turns that into concrete criteria.',
  },
  {
    icon: <ScaleIcon className="h-6 w-6" />,
    title: 'Compare on criteria',
    text: 'Products are compared on published, category-specific criteria — the same criteria for every product, with no paid influence on scores.',
  },
  {
    icon: <ListCheckIcon className="h-6 w-6" />,
    title: 'Check the alternatives',
    text: 'Before you buy, see the cheaper, better-fitting or simpler alternatives — each with its trade-off stated plainly.',
  },
]

const topics = [
  {
    label: 'A quieter keyboard for a shared office',
    to: '/product-finder?q=quiet+keyboard+for+a+shared+office',
  },
  {
    label: 'A USB-C hub that also charges the laptop',
    to: '/product-finder?q=usb-c+hub+that+charges+a+laptop',
  },
  { label: 'A monitor arm for a small desk', to: '/product-finder?q=monitor+arm+for+a+small+desk' },
  { label: 'A standing-desk setup on a budget', to: '/product-finder?q=standing+desk+setup+on+a+budget' },
  { label: 'Cable management that actually stays tidy', to: '/product-finder?q=cable+management' },
  { label: 'A practical gift for someone who works from home', to: '/gift-finder' },
]

const principles = [
  {
    icon: <ShieldIcon className="h-6 w-6" />,
    title: 'Independent by design',
    text: 'This is an independent research platform, not an official store. When affiliate links are introduced, they will be disclosed on every page that uses them.',
  },
  {
    icon: <ListCheckIcon className="h-6 w-6" />,
    title: 'No fabricated information',
    text: 'We never invent prices, ratings, reviews or discounts. Volatile data is only ever shown when it comes from an authorised source, with its timestamp.',
  },
  {
    icon: <BookIcon className="h-6 w-6" />,
    title: 'Explanations, not hype',
    text: 'Every recommendation must say why — which criteria it won on and where it compromises. If we cannot explain a pick, we do not make it.',
  },
]

const faqs = [
  {
    question: 'Is this an official Amazon website?',
    answer:
      'No. This is an independent product research platform. It is not affiliated with or endorsed by Amazon, and the name is a working title while the platform is in its foundation stage. Recommendations are based on published criteria, never on commissions.',
  },
  {
    question: 'Do you sell the products shown here?',
    answer:
      'No — we research and compare; we do not sell, stock or ship anything. When outbound links to retailers are introduced, they will be clearly identified on the page, as explained in our affiliate disclosure.',
  },
  {
    question: 'How will recommendations work?',
    answer:
      'Each category gets a fixed set of published criteria. Products are assessed against the same criteria, comparisons show the differences side by side, and alternatives are grouped as cheaper, better fit or simpler — with the trade-off stated in one sentence.',
  },
  {
    question: 'Why are there no products or prices yet?',
    answer:
      'The platform is in its foundation stage: the design, finders and comparison framework are being built before the catalog. We will only show prices from authorised sources, always next to the time they were observed — never invented or scraped numbers.',
  },
]

export default function Home() {
  return (
    <>
      {/* Hero — search-first (spec §3.1: promise + primary CTA; brief §4: prominent search) */}
      <section className="bg-navy-950 text-white">
        <div className="page-shell py-16 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-300">
            Independent product research
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-display">
            Find the right product, for the right reasons.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A product discovery and comparison platform for home office and electronics accessories — built on
            published criteria, honest trade-offs and zero invented data.
          </p>
          <div className="mt-8 max-w-2xl text-navy-950">
            <SearchBar large />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <LinkButton to="/product-finder" variant="accent" size="lg">
              Start the Product Finder
            </LinkButton>
            <Link
              to="/buying-guides"
              className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-base font-semibold text-white underline-offset-4 hover:underline"
            >
              Browse the buying guides <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Category entry cards (spec §3.1) */}
      <section aria-labelledby="categories-heading" className="page-shell py-14">
        <SectionHeading
          eyebrow="Start with a category"
          title="What are you setting up?"
          intro="Two focused categories to begin with — researched in depth rather than spread thin."
          titleId="categories-heading"
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <CategoryCard
            to="/product-finder?category=home-office"
            icon={<DeskIcon className="h-6 w-6" />}
            title="Home Office & Productivity"
            text="Desks, seating, monitor arms, lighting and the accessories that make a workspace comfortable for a full working day."
            topics={['Desk setup', 'Monitor arms', 'Ergonomics', 'Lighting']}
          />
          <CategoryCard
            to="/product-finder?category=electronics-accessories"
            icon={<PlugIcon className="h-6 w-6" />}
            title="Electronics Accessories"
            text="Hubs, chargers, cables and adapters — the small hardware that decides whether a setup feels effortless or frustrating."
            topics={['USB-C hubs', 'Chargers', 'Cables & adapters', 'Power']}
          />
        </div>
      </section>

      {/* How it works (spec §3.1: 3 steps) */}
      <section aria-labelledby="how-heading" className="border-y border-navy-100 bg-white">
        <div className="page-shell py-14">
          <SectionHeading
            eyebrow="How it works"
            title="Research first, brand names last"
            intro="Three steps, in the order a careful buyer actually thinks."
            titleId="how-heading"
          />
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title}>
                <Card className="h-full">
                  <span className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-800 ring-1 ring-teal-100">
                      {s.icon}
                    </span>
                    <span aria-hidden="true" className="text-3xl font-bold text-navy-100">
                      {i + 1}
                    </span>
                  </span>
                  <div className="mt-4">
                    <CardTitle>{s.title}</CardTitle>
                    <CardText>{s.text}</CardText>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Popular research topics (brief §4 — editorial topics, no products) */}
      <section aria-labelledby="topics-heading" className="page-shell py-14">
        <SectionHeading
          eyebrow="Research topics"
          title="Questions people actually ask"
          intro="Start from a real question and let the finder turn it into criteria, a budget and a shortlist."
          titleId="topics-heading"
        />
        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <li key={t.label}>
              <Link
                to={t.to}
                className="group flex min-h-11 h-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm font-medium leading-6 text-navy-900 shadow-[var(--shadow-card)] ring-1 ring-navy-100 transition hover:ring-teal-700"
              >
                {t.label}
                <span className="shrink-0 text-teal-800 transition-transform duration-200 group-hover:translate-x-0.5">
                  <ArrowRightIcon className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Comparison explanation (brief §4) */}
      <section aria-labelledby="compare-heading" className="border-y border-navy-100 bg-cream">
        <div className="page-shell grid items-center gap-8 py-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Comparisons"
              title="Side by side, on the record"
              intro="A comparison here is a criteria table, not an opinion with a table attached. The criteria are published per category, every product is measured against the same rows, and differences are highlighted instead of hidden."
              titleId="compare-heading"
            />
            <div className="mt-6">
              <LinkButton to="/compare" variant="primary">
                See how comparisons work
              </LinkButton>
            </div>
          </div>
          <ul className="space-y-3">
            {[
              {
                title: 'Published criteria',
                text: 'The rows of every comparison are fixed in advance and explained — no moving the goalposts per product.',
              },
              {
                title: 'Trade-offs in plain words',
                text: 'Cheaper usually means a compromise somewhere. Each alternative states its trade-off in one sentence.',
              },
              {
                title: 'Prices only with a timestamp',
                text: 'When prices appear, they come from authorised sources and sit next to the time they were observed.',
              },
            ].map((item) => (
              <li
                key={item.title}
                className="rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
              >
                <p className="font-semibold text-navy-950">{item.title}</p>
                <p className="mt-1.5 text-sm leading-6 text-smoke">{item.text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Buying guide discovery (brief §4; spec §3.1 shelf stays honest — guides in preparation) */}
      <section aria-labelledby="guides-heading" className="page-shell py-14">
        <SectionHeading
          eyebrow="Buying guides"
          title="Learn the category before you shop it"
          intro="Our guides explain how to choose — the specs that matter, the budget tiers, and the mistakes to avoid — before any product is mentioned."
          titleId="guides-heading"
        />
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <CategoryCard
            to="/buying-guides"
            icon={<BookIcon className="h-6 w-6" />}
            title="Home office buying guides"
            text="How to choose a desk setup that fits your space, your posture and your budget — criteria first, products second."
            topics={['How to choose', 'Specs that matter', 'Budget tiers']}
          />
          <CategoryCard
            to="/buying-guides"
            icon={<PlugIcon className="h-6 w-6" />}
            title="Electronics accessories guides"
            text="Wattage, standards and connectors explained in plain language, so a hub or charger does exactly what you expect."
            topics={['How to choose', 'Standards explained', 'Mistakes to avoid']}
          />
        </div>
      </section>

      {/* Gift finder band */}
      <section className="page-shell pb-14">
        <div className="rounded-2xl bg-navy-900 px-6 py-10 text-white shadow-[var(--shadow-card)] sm:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-teal-100">
              <GiftIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-2xl font-bold">Buying a gift?</h2>
              <p className="mt-2 max-w-xl leading-7 text-slate-300">
                The Gift Finder starts from the person and the occasion, then works within your budget — every
                suggestion comes with its reason. It is a guided questionnaire, not an AI guess.
              </p>
            </div>
            <LinkButton to="/gift-finder" variant="accent" size="lg" className="shrink-0">
              Try the Gift Finder
            </LinkButton>
          </div>
        </div>
      </section>

      {/* Trust & transparency (spec §3.1 trust strip + principles) */}
      <section aria-labelledby="trust-heading" className="border-t border-navy-100 bg-white">
        <div className="page-shell py-14">
          <SectionHeading
            eyebrow="Trust & transparency"
            title="Built to be checked, not just believed"
            titleId="trust-heading"
          />
          <div className="mt-8">
            <DisclosureBanner />
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {principles.map((p) => (
              <Card key={p.title} className="h-full shadow-none">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-50 text-navy-800 ring-1 ring-navy-100">
                  {p.icon}
                </span>
                <div className="mt-4">
                  <CardTitle>{p.title}</CardTitle>
                  <CardText>{p.text}</CardText>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ (real platform questions) */}
      <section aria-labelledby="faq-heading" className="page-shell py-14">
        <SectionHeading eyebrow="Questions" title="Before you ask" titleId="faq-heading" />
        <div className="mt-8 max-w-3xl">
          <FaqAccordion items={faqs} />
        </div>
        <p className="mt-6 text-sm text-smoke">
          Something else on your mind?{' '}
          <Link to="/contact" className="font-medium text-teal-800 underline underline-offset-2">
            Contact us
          </Link>{' '}
          or read{' '}
          <Link to="/about" className="font-medium text-teal-800 underline underline-offset-2">
            how this platform works
          </Link>
          .
        </p>
      </section>
    </>
  )
}
