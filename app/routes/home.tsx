import { Link } from 'react-router'
import { buildMeta } from '../lib/seo'
import { Card, CardText, CardTitle, LinkButton } from '../components/ui/ui'

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
    title: '1. Tell us the job',
    text: 'Start with what you are trying to do and your budget — not with a brand name. The Product Finder turns that into concrete criteria.',
  },
  {
    title: '2. Compare on criteria',
    text: 'Products are compared on published, category-specific criteria — the same criteria for every product, with no paid influence on scores.',
  },
  {
    title: '3. Check the alternatives',
    text: 'Before you buy, see the cheaper, better-fitting or simpler alternatives — each with its trade-off stated plainly.',
  },
]

const principles = [
  {
    title: 'Independent by design',
    text: 'This is an independent research platform, not an official store. When affiliate links are introduced, they will be disclosed on every page that uses them.',
  },
  {
    title: 'No fabricated information',
    text: 'We never invent prices, ratings, reviews or discounts. Volatile data is only ever shown when it comes from an authorised source, with its timestamp.',
  },
  {
    title: 'Explanations, not hype',
    text: 'Every recommendation must say why — which criteria it won on and where it compromises. If we cannot explain a pick, we do not make it.',
  },
]

export default function Home() {
  return (
    <>
      <section className="bg-navy-950 text-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:py-20">
          <p className="text-sm font-semibold uppercase tracking-widest text-teal-300">
            Independent product research
          </p>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Find the right product, for the right reasons.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
            A product discovery and comparison platform for home office and electronics accessories — built on
            published criteria, honest trade-offs and zero invented data.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton to="/product-finder" variant="accent" size="lg">
              Start the Product Finder
            </LinkButton>
            <LinkButton to="/buying-guides" variant="secondary" size="lg">
              Read the buying guides
            </LinkButton>
          </div>
        </div>
      </section>

      <section aria-labelledby="how-heading" className="mx-auto w-full max-w-6xl px-4 py-14">
        <h2 id="how-heading" className="text-2xl font-bold text-navy-950">
          How it will work
        </h2>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.title}>
              <CardTitle>{s.title}</CardTitle>
              <CardText>{s.text}</CardText>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="principles-heading" className="border-y border-navy-100 bg-white">
        <div className="mx-auto w-full max-w-6xl px-4 py-14">
          <h2 id="principles-heading" className="text-2xl font-bold text-navy-950">
            Our editorial principles
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {principles.map((p) => (
              <Card key={p.title} className="shadow-none ring-navy-100">
                <CardTitle>{p.title}</CardTitle>
                <CardText>{p.text}</CardText>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-14">
        <div className="rounded-2xl bg-navy-900 px-6 py-10 text-white sm:px-10">
          <h2 className="text-2xl font-bold">Buying a gift?</h2>
          <p className="mt-3 max-w-xl text-slate-300">
            The Gift Finder starts from the person and the occasion, then works within your budget — every
            suggestion comes with its reason.
          </p>
          <div className="mt-6">
            <LinkButton to="/gift-finder" variant="accent">
              Try the Gift Finder
            </LinkButton>
          </div>
          <p className="mt-6 text-sm text-slate-400">
            New here? Read{' '}
            <Link to="/about" className="underline hover:text-white">
              how this platform works
            </Link>{' '}
            and our{' '}
            <Link to="/affiliate-disclosure" className="underline hover:text-white">
              affiliate disclosure
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}
