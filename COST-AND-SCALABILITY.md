# Cost and Scalability Planning — Smart Amazon Finder

Stage 00. Status: **VERIFIED** for the Cloudflare unit prices and free-tier figures (official Cloudflare Workers pricing page, read 2026-11-08 — citations by section); **IMPLEMENTED NOT VERIFIED** for the traffic scenarios built on them (labelled assumptions).
Rule honoured throughout: **no invented provider prices.** Anything not on an official pricing page is marked PENDING, not estimated.

## 1. What can be free, and for how long

At launch traffic the entire infrastructure fits Cloudflare's free tiers (verified figures in §2). The first paid step is the Workers Paid plan at a **$5/month account minimum** (official), which removes daily caps and raises included quotas by orders of magnitude. There is no architectural change at that step — it is a billing switch, which is precisely why this stack was chosen.

Deliberately excluded from costing (PENDING, owner decisions): domain registration (price depends on TLD/registrar chosen at Stage 11), transactional email provider for user accounts (provider not yet selected — plans range from free tiers upward; no price asserted), legal review fees, and the owner's time.

## 2. Verified Cloudflare figures (official Workers pricing page, 2026-11-08)

| Service | Free | Paid (Workers Paid, $5/mo account min) |
|---|---|---|
| Workers requests | 100,000/day; 10 ms CPU/invocation | 10 M/month included, then $0.30 per additional million; 30 M CPU-ms included, then $0.02 per additional million CPU-ms; static-asset requests free & unlimited |
| D1 | 5 M rows read/day; 100 k rows written/day; 5 GB total storage; 10 databases | First 25 **billion** rows read/month included, then $0.001/million; first 50 M rows written included, then $1.00/million; first 5 GB storage included, then $0.75/GB-month |
| KV | 100 k reads/day; 1 k writes/day; 1 GB stored | 10 M reads/month incl., +$0.50/M; 1 M writes incl., +$5.00/M |
| Queues | 10,000 operations/day (a delivered message ≈ 3 ops) | 1 M operations/month incl., +$0.40/M operations |
| R2 | 10 GB-month storage; 1 M Class A ops/month; 10 M Class B ops/month; egress free | Storage $0.015/GB-month beyond free; Class A $4.50/M; Class B $0.36/M; egress free |
| Workers Logs | 200 k events/day, 3-day retention | 20 M/month incl., 7-day retention |

Scale ceilings that shape design (official D1 limits page): max database size 500 MB (Free) / 10 GB (Paid); Time Travel recovery 7 days (Free) / 30 days (Paid).

## 3. Traffic scenarios

Traffic levels are **assumptions (A)** chosen to bracket the revenue model in MONETIZATION-STRATEGY.md §6 (base case ≈ 92 k sessions/month). A dynamic-request ratio (share of page views that invoke the Worker vs. static/cache) of 40% is assumed — server-rendered pages with edge caching; the rest is static assets (free/unlimited).

### Scenario L — Low traffic (pre-revenue / early launch)
- (A) 10,000 sessions/month, ~22,000 page views, ~9,000 Worker requests, catalog 200 products, daily refresh jobs.
- Fit: every meter is far inside **free** limits (Workers 100 k/day vs. ~300/day used; D1 reads dominated by search/listings — even 100× headroom).
- **Infrastructure cost: $0/month.** (Domain excluded, PENDING.)

### Scenario M — Medium traffic (revenue-target zone)
- (A) 100,000 sessions/month, ~220,000 page views, ~90,000–150,000 Worker requests/month, catalog 2,000 products, hourly offer refresh on licensed sources, ~50 k queue messages/month (≈150 k operations).
- Fit: still inside **Workers Free daily caps** on average, but daily spikes (a guide going viral) could hit the 100 k/day Worker cap and the D1 100 k writes/day during imports → this is the trigger zone for the **$5 Paid switch**. On Paid, all meters are far inside included quotas (10 M requests vs. ~0.15 M used; D1 25 B reads included vs. an estimated < 0.5 B even with sloppy queries; Queues 1 M ops vs. ~0.15 M).
- **Infrastructure cost: $0–5/month; budget $5–15/month** to absorb CPU overage on heavy SSR pages (Cloudflare's own worked example: 15 M requests at 7 ms average CPU = $8.00 total on Paid).

### Scenario H — High traffic (10× target)
- (A) 1,000,000 sessions/month, ~2.2 M page views, ~1–2 M Worker requests/month, catalog 20,000 products, search-heavy traffic.
- Fit: Paid plan comfortably; costs scale with **dynamic requests and CPU**, not page views (static/cache absorbs most). Even at 100 M requests/month, Cloudflare's official worked example totals **$45.40/month** (requests + CPU at 7 ms) — the platform's cost curve stays trivial relative to the revenue target at that scale.
- Watch items instead of raw cost: D1 rows-read economics if search queries scan (index discipline, COST risk R-10), FTS graduation triggers (SYSTEM-ARCHITECTURE.md §6.1), KV write limits for flags/sessions, queue throughput for refresh fleets.
- **Infrastructure cost: ~$5–50/month** across this whole band, computed from the official unit prices above — two orders of magnitude below the revenue being modelled, which is the point of the Cloudflare-native design.

## 4. Capacity notes per subsystem

- **D1:** the binding constraints are per-database size and rows read. The catalog at 20 k products + 13 months of price history (rollup policy in DATABASE-DESIGN.md §8) stays far under 10 GB. Search reads are index/FTS-bound by design.
- **Search:** FTS5 inside D1 handles the launch and medium scenarios; graduation triggers are defined in SYSTEM-ARCHITECTURE.md §6.1 (catalog size, p95 latency, D1 read pressure). Dedicated search, if ever needed, is a new line item to be priced from the chosen vendor's official page **at that time** — not estimated now.
- **R2:** media originals only; 10 GB free covers thousands of editorial images; egress is free, removing the classic image-bandwidth cost trap.
- **Queues:** refresh fleets are the main consumer; at 1 M included operations (~333 k delivered messages/month on Paid) the refresh cadence for a 20 k-offer catalog is sustainable at hourly granularity for priority offers and daily for the long tail.

## 5. Revenue-target arithmetic (summary)

Full model, formulas and sensitivity table: MONETIZATION-STRATEGY.md §6. Headline: under the base-case assumption set, **~92,000 sessions/month** produces ~$5,000 gross; infrastructure at that level is **$5–15/month** (Scenario M), i.e. infrastructure is < 0.5% of the target — the business constraint is audience and conversion, never hosting cost. Gross ≠ net: programme payment thresholds, possible withholding/tax treatment for the owner's situation, domain and tool costs are deducted in the owner's own accounts (PENDING owner specifics, A-01).

## 6. Cost governance

- Cloudflare usage alerts at 50% and 80% of every included quota (R-10).
- Monthly one-line cost report in the Stage 13 ritual: actual Cloudflare bill vs. scenario band; any meter trending out of band gets a named cause and fix before the next month.
- No paid service may be added without an entry in this document (name, official price source, date checked) — the "no invented prices" rule applies to our own plans too.
