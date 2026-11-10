import { env } from 'cloudflare:workers'
import { Link, useLoaderData } from 'react-router'
import type { Route } from './+types/product'
import { buildMeta } from '../lib/seo'
import { getAlternatives, getProductBySlug } from '../lib/db/catalog'
import { fixturesEnabled } from '../lib/db/types'
import type { ProductCard, SpecValue } from '../lib/db/types'
import { Breadcrumb } from '../components/layout/chrome'
import { Card, CardText, CardTitle, DisclosureBanner, SectionHeading } from '../components/ui/ui'
import { CompareButton, FavoriteButton } from '../components/engagement/list-buttons'

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return buildMeta({
      title: 'Product Not Found',
      description: 'The product you requested could not be found.',
      path: '/product',
      noIndex: true,
    })
  }
  const { detail } = loaderData
  const name = detail.product.name
  return buildMeta({
    title: name,
    description:
      detail.product.editorial_summary ?? `Research, specifications and merchant links for the ${name}.`,
    path: `/product/${detail.product.slug}`,
  })
}

export async function loader({ params }: Route.LoaderArgs) {
  const db = (env as Env).DB as D1Database
  const includeFixtures = fixturesEnabled(env)
  const detail = await getProductBySlug(db, params.slug, includeFixtures)
  if (!detail) {
    throw new Response('Not Found', { status: 404 })
  }
  const alternatives = await getAlternatives(db, params.slug, includeFixtures)
  return { detail, alternatives }
}

function formatPrice(cents: number, currency: string): string {
  const amount = (cents / 100).toFixed(2)
  return currency === 'USD' ? `$${amount}` : `${currency} ${amount}`
}

function formatCardPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatSpecValue(spec: SpecValue): string | null {
  if (spec.value_number !== null && spec.value_number !== undefined) {
    return spec.unit ? `${spec.value_number} ${spec.unit}` : String(spec.value_number)
  }
  if (spec.value_bool !== null && spec.value_bool !== undefined) {
    return spec.value_bool === 1 ? 'Yes' : 'No'
  }
  if (spec.value_text !== null && spec.value_text !== undefined) {
    return spec.value_text
  }
  return null
}

function AlternativeCard({ card }: { card: ProductCard }) {
  return (
    <Card className="flex h-full flex-col">
      {card.brand && <p className="text-xs font-semibold uppercase tracking-wide text-smoke">{card.brand}</p>}
      <div className="mt-1.5">
        <Link
          to={`/product/${card.slug}`}
          className="text-lg font-semibold text-navy-950 underline-offset-2 hover:text-teal-800 hover:underline"
        >
          {card.name}
        </Link>
      </div>
      {card.summary && <CardText>{card.summary}</CardText>}
      {card.price_cents !== null && (
        <p className="mt-3 text-base font-semibold text-navy-950">{formatCardPrice(card.price_cents)}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
        <FavoriteButton slug={card.slug} />
        <CompareButton slug={card.slug} />
      </div>
    </Card>
  )
}

function AlternativesSection({
  title,
  titleId,
  cards,
}: {
  title: string
  titleId: string
  cards: ProductCard[]
}) {
  if (cards.length === 0) return null
  return (
    <section aria-labelledby={titleId} className="mt-12">
      <SectionHeading titleId={titleId} title={title} />
      <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <AlternativeCard key={card.slug} card={card} />
        ))}
      </div>
    </section>
  )
}

export default function ProductPage() {
  const { detail, alternatives } = useLoaderData<typeof loader>()
  const product = detail.product
  const visibleSpecs = detail.specs
    .map((spec) => ({ spec, formatted: formatSpecValue(spec) }))
    .filter((entry): entry is { spec: SpecValue; formatted: string } => entry.formatted !== null)

  return (
    <div className="page-shell pb-16">
      <Breadcrumb
        trail={[
          { label: 'Home', to: '/' },
          { label: detail.category, to: `/category/${detail.category_slug}` },
          { label: product.name },
        ]}
      />

      <header className="pt-6">
        {detail.brand && (
          <p className="text-sm font-semibold uppercase tracking-wide text-teal-800">{detail.brand}</p>
        )}
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-navy-950 sm:text-4xl">{product.name}</h1>
        {product.model_ref && <p className="mt-2 text-sm text-smoke">Model: {product.model_ref}</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <FavoriteButton slug={product.slug} />
          <CompareButton slug={product.slug} />
        </div>
      </header>

      <div className="mt-8">
        <DisclosureBanner />
      </div>

      <section aria-labelledby="overview-heading" className="mt-10 max-w-3xl">
        <SectionHeading titleId="overview-heading" title="Overview" />
        {product.editorial_summary ? (
          <p className="mt-4 text-base leading-7 text-navy-900">{product.editorial_summary}</p>
        ) : (
          <p className="mt-4 text-base leading-7 text-smoke">
            A full editorial summary for this product is being prepared. The specifications and merchant links
            below are published from the catalog record.
          </p>
        )}
      </section>

      {visibleSpecs.length > 0 && (
        <section aria-labelledby="specs-heading" className="mt-12">
          <SectionHeading titleId="specs-heading" title="Specifications" />
          <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-1 ring-navy-100">
            <table className="w-full text-left text-sm">
              <tbody className="divide-y divide-navy-100">
                {visibleSpecs.map(({ spec, formatted }) => (
                  <tr key={spec.key}>
                    <th scope="row" className="w-1/3 px-5 py-3.5 font-medium text-navy-950">
                      {spec.label}
                    </th>
                    <td className="px-5 py-3.5 text-navy-900">{formatted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {detail.attributes.length > 0 && (
        <section aria-labelledby="details-heading" className="mt-12 max-w-3xl">
          <SectionHeading titleId="details-heading" title="Details" />
          <dl className="mt-6 divide-y divide-navy-100 rounded-2xl bg-white ring-1 ring-navy-100">
            {detail.attributes.map((attr, i) => (
              <div key={`${attr.key}-${attr.value}-${i}`} className="flex gap-4 px-5 py-3.5 text-sm">
                <dt className="w-1/3 shrink-0 font-medium text-navy-950">{attr.key}</dt>
                <dd className="text-navy-900">{attr.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section aria-labelledby="offers-heading" className="mt-12">
        <SectionHeading
          titleId="offers-heading"
          title="Where to buy"
          intro="Merchant links are provided for research. Prices are shown only when an authorised, licensed price was recently observed — otherwise, check the merchant for the current price."
        />
        {detail.offers.length === 0 ? (
          <p className="mt-6 rounded-2xl border border-dashed border-navy-200 bg-white p-6 text-sm leading-6 text-smoke">
            No merchant offers are published for this product yet. Check back once offers from authorised
            sources are available.
          </p>
        ) : (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {detail.offers.map((offer, i) => (
              <li
                key={`${offer.merchant_slug}-${i}`}
                className="flex flex-col rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-navy-100"
              >
                <p className="font-semibold text-navy-950">{offer.merchant_name}</p>
                {offer.price_cents !== null && (
                  <p className="mt-2 text-lg font-bold text-navy-950">
                    {formatPrice(offer.price_cents, offer.currency)}
                    {offer.price_observed_at && (
                      <span className="ml-2 text-xs font-normal text-smoke">
                        observed {offer.price_observed_at}
                      </span>
                    )}
                  </p>
                )}
                <div className="mt-4">
                  {offer.destination_url ? (
                    <a
                      href={offer.destination_url}
                      target="_blank"
                      rel="sponsored nofollow noopener"
                      className="inline-flex min-h-11 items-center rounded-lg bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
                    >
                      View at {offer.merchant_name}
                    </a>
                  ) : (
                    <p className="text-sm text-smoke">Merchant link unavailable for this offer.</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {alternatives && (
        <>
          <AlternativesSection
            title="Cheaper alternatives"
            titleId="alt-cheaper-heading"
            cards={alternatives.cheaper}
          />
          <AlternativesSection
            title="Better fit"
            titleId="alt-better-heading"
            cards={alternatives.betterFit}
          />
          <AlternativesSection
            title="Simpler alternatives"
            titleId="alt-simpler-heading"
            cards={alternatives.simpler}
          />
        </>
      )}

      <div className="mt-12">
        <Card className="shadow-none">
          <CardTitle>{product.name}</CardTitle>
          <CardText>
            Filed under{' '}
            <Link
              to={`/category/${detail.category_slug}`}
              className="font-medium text-teal-800 underline underline-offset-2"
            >
              {detail.category}
            </Link>
            . Specifications are taken from the published catalog record.
          </CardText>
        </Card>
      </div>
    </div>
  )
}
