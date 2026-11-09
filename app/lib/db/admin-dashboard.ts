import { applyPricePolicy } from './offers'

/**
 * Admin dashboard aggregate (Stage 04). All figures are live counts from
 * D1 — nothing is estimated. offers_price_hidden is computed by running
 * every priced offer through the same price policy the public API uses
 * (db/offers.ts), so the dashboard can never disagree with the storefront
 * about what is displayable.
 */

interface OfferPolicyRow {
  merchant_slug: string
  merchant_name: string
  destination_url: string
  currency: string
  current_price_cents: number | null
  price_observed_at: string | null
  availability_state: string | null
  licence_status: string
  validation_status: string
}

export interface AdminDashboard {
  counts: {
    products_total: number
    products_draft: number
    products_in_review: number
    products_published: number
    products_archived: number
    validation_pending: number
    validation_passed: number
    validation_failed: number
    categories: number
    brands: number
    merchants: number
    offers: number
    media: number
    guides: number
    articles: number
    admin_users: number
  }
  offers_price_hidden: number
  freshness: Array<{ source_id: string; products: number; last_source_update: string | null }>
  validation_failures: Array<{ id: number; slug: string; name: string; validated_at: string | null }>
  recent_activity: Array<{
    id: number
    actor_email: string | null
    action: string
    entity_type: string
    entity_id: number | null
    created_at: string
  }>
}

export async function getAdminDashboard(db: D1Database): Promise<AdminDashboard> {
  const counts = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0
  const catalogCounts = {
    products_total: await counts('SELECT COUNT(*) AS n FROM products'),
    products_draft: await counts("SELECT COUNT(*) AS n FROM products WHERE status = 'draft'"),
    products_in_review: await counts("SELECT COUNT(*) AS n FROM products WHERE status = 'in_review'"),
    products_published: await counts("SELECT COUNT(*) AS n FROM products WHERE status = 'published'"),
    products_archived: await counts("SELECT COUNT(*) AS n FROM products WHERE status = 'archived'"),
    validation_pending: await counts(
      "SELECT COUNT(*) AS n FROM products WHERE validation_status = 'pending'",
    ),
    validation_passed: await counts(
      "SELECT COUNT(*) AS n FROM products WHERE validation_status = 'passed'",
    ),
    validation_failed: await counts(
      "SELECT COUNT(*) AS n FROM products WHERE validation_status = 'failed'",
    ),
    categories: await counts('SELECT COUNT(*) AS n FROM categories'),
    brands: await counts('SELECT COUNT(*) AS n FROM brands'),
    merchants: await counts('SELECT COUNT(*) AS n FROM merchants'),
    offers: await counts('SELECT COUNT(*) AS n FROM offers'),
    media: await counts('SELECT COUNT(*) AS n FROM product_media'),
    guides: await counts('SELECT COUNT(*) AS n FROM buying_guides'),
    articles: await counts('SELECT COUNT(*) AS n FROM articles'),
    admin_users: await counts('SELECT COUNT(*) AS n FROM admin_users'),
  }

  const { results: offerRows } = await db
    .prepare(
      `SELECT m.slug AS merchant_slug, m.name AS merchant_name, o.destination_url, o.currency,
              o.current_price_cents, o.price_observed_at, o.availability_state,
              o.licence_status, o.validation_status
         FROM offers o JOIN merchants m ON m.id = o.merchant_id
        WHERE o.current_price_cents IS NOT NULL`,
    )
    .all<OfferPolicyRow>()
  const offersPriceHidden = offerRows.filter((r) => applyPricePolicy(r).price_cents === null).length

  const { results: freshness } = await db
    .prepare(
      `SELECT source_id, COUNT(*) AS products, MAX(source_updated_at) AS last_source_update
         FROM products GROUP BY source_id ORDER BY source_id`,
    )
    .all<{ source_id: string; products: number; last_source_update: string | null }>()

  const { results: validationFailures } = await db
    .prepare(
      `SELECT id, slug, name, validated_at FROM products
        WHERE validation_status = 'failed' ORDER BY updated_at DESC LIMIT 10`,
    )
    .all<{ id: number; slug: string; name: string; validated_at: string | null }>()

  const { results: recentActivity } = await db
    .prepare(
      `SELECT a.id, u.email AS actor_email, a.action, a.entity_type, a.entity_id, a.created_at
         FROM audit_logs a
         LEFT JOIN admin_users u ON u.id = a.actor_admin_id
        ORDER BY a.id DESC LIMIT 10`,
    )
    .all<AdminDashboard['recent_activity'][number]>()

  return {
    counts: catalogCounts,
    offers_price_hidden: offersPriceHidden,
    freshness,
    validation_failures: validationFailures,
    recent_activity: recentActivity,
  }
}
