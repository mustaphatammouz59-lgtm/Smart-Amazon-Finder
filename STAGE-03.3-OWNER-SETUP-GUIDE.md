# Stage 03.3 — Owner Setup Guide (Cloudflare)

Purpose: the three things only YOU can do in your Cloudflare account before
Stage 03 can be published safely. Everything else is already prepared in
code. **Do these steps in order. Nothing here publishes or changes the live
website** — the new code is not deployed yet, so the Access application and
the DLQ will simply be waiting, unused, until publication day.

Time needed: about 10–15 minutes. All steps work from the phone browser;
take a screenshot whenever a step looks different from this guide and send
it to Muse before tapping anything you are unsure about.

---

## Step 1 — Create the dead-letter queue (2 minutes)

Why: when the code is published, the job queue's configuration names a
dead-letter queue (DLQ) for failed jobs. It must exist BEFORE the deploy,
or the deployment fails.

1. Open **dash.cloudflare.com** and sign in (your account).
2. In the left menu, open **Queues** (under "Storage & databases" /
   "Workers & Pages" area depending on layout — search "Queues" if needed).
3. Tap **Create queue** (or "+ Create").
4. Name it EXACTLY (copy this, all lowercase, with the hyphens):

   `smart-amazon-finder-dlq`

5. Leave every other setting at its default. Tap **Create**.

Done when: the Queues list shows BOTH `smart-amazon-finder-jobs` (already
there from before) and `smart-amazon-finder-dlq` (new).

> CLI alternative (if you prefer a terminal later): `npx wrangler queues create smart-amazon-finder-dlq`

---

## Step 2 — Create the Cloudflare Access application (8–10 minutes)

Why: this is the locked door in front of `/api/admin/*`. Only your email
will be allowed through it. The application code ALSO verifies the Access
token cryptographically (Stage 03.2), so there are two independent layers.

### 2a. Open Zero Trust

1. Open **one.dash.cloudflare.com** (Cloudflare Zero Trust). Sign in with
   the same account.
2. If this is your FIRST time in Zero Trust, it asks you to pick a **team
   name** and a plan: choose the **Free** plan. The team name becomes part
   of a web address like `https://YOUR-TEAM.cloudflareaccess.com` —
   **write that full address down**; it is value #1 we need in Step 3.
   (If you already have a team, find the address under
   **Settings → General → Team domain**.)

### 2b. Add the application

1. Left menu: **Access → Applications → Add an application**.
2. Choose **Self-hosted**.
3. Fill in:
   - **Application name:** `Smart Amazon Finder Admin`
   - **Application domain:**
     - Subdomain: `smart-amazon-finder`
     - Domain: `mustaphatammouz59.workers.dev`
     - Path: `api/admin/*`
4. **Session duration:** leave the default (24 hours).
5. Continue to the policy step (**Next**).

### 2c. Add the owner-only policy

1. **Policy name:** `Owner only`
2. **Action:** `Allow`
3. **Include** → **Selector:** `Emails` → **Value:** YOUR email address
   (the one you will sign in with — use the same email as your Cloudflare
   account unless you have a reason not to).
4. Do NOT add any other include rules. No "Everyone", no country rules.
5. **Next → Create / Save** the application.

Login method note: with the Free plan, Access offers **One-time PIN**
(they email you a code) by default — that is fine, nothing extra to set up.

### 2d. Copy value #2 — the AUD tag

1. Open the application you just created (**Access → Applications →
   Smart Amazon Finder Admin**).
2. On its settings/overview page, find **Application Audience (AUD) Tag** —
   a long string of letters and numbers.
3. **Write it down / copy it.** It is value #2 for Step 3.

Done when: the application exists, its domain is
`smart-amazon-finder.mustaphatammouz59.workers.dev` with path
`api/admin/*`, the only policy is "Owner only" with only your email, and
you have the AUD tag copied.

---

## Step 3 — Give Muse the two values (1 minute)

Send Muse these two values in chat:

1. **Team domain** — e.g. `https://your-team.cloudflareaccess.com`
2. **AUD tag** — the long string from Step 2d.

These are **identifiers, not secrets** (they name your Access team and
application; they grant access to nothing by themselves), so sending them
in chat is safe. Do NOT send any password, API token or recovery code —
none is ever needed.

What Muse does with them at publication time: puts them into
`wrangler.jsonc` as the Worker variables `ACCESS_TEAM_DOMAIN` and
`ACCESS_AUD`, so they deploy together with the code and cannot be lost.

> Why not set them yourself in the dashboard? You CAN (Workers & Pages →
> smart-amazon-finder → Settings → Variables and Secrets → Add:
> `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`). But this project deploys from
> its config file, and config-file deploys can overwrite dashboard-set
> variables. The config-file route is the one that cannot silently break,
> so it is the recommended route.

---

## What you do NOT need to do

- **Rate limiting:** nothing. The two rate-limit bindings
  (`SEARCH_RATE_LIMITER`, `ADMIN_RATE_LIMITER`) are declared in the
  project configuration; Cloudflare provisions them automatically when
  the code deploys. After publication you can SEE them under the Worker's
  Settings → Bindings — no action needed.
- **The main queue** (`smart-amazon-finder-jobs`): already exists.
- **D1 database, KV, R2, Worker:** all already exist with the right IDs in
  the configuration. Do not create duplicates.
- **Domain purchase:** not part of this project stage. Do not buy anything.
- **Admin account:** created on publication day only (Step P8 below) —
  creating it earlier would serve no purpose.

---

## Publication day — the runbook (for later, do NOT run now)

Executed only under your separate publication approval. "Owner" = you,
"Terminal" = an authenticated wrangler session (yours, or Muse's if you
connect one), "Muse" = the normal GitHub publication route.

| # | Action | Who |
|---|---|---|
| P0 | `npx wrangler d1 migrations list DB --remote` — record the true remote state; stop on surprises | Terminal |
| P1 | DLQ exists (Step 1 of this guide — done beforehand) | Owner ✔ |
| P2 | Access application live + `ACCESS_TEAM_DOMAIN`/`ACCESS_AUD` placed in `wrangler.jsonc` vars (Steps 2–3 — done beforehand) | Owner + Muse |
| P3 | Backup: `npx wrangler d1 export DB --remote --output backup-pre-stage03-<date>.sql`; verify contents; record `npx wrangler d1 time-travel info DB` bookmark | Terminal |
| P4 | `npx wrangler d1 migrations apply DB --remote` (applies 0001–0004 in order) | Terminal |
| P5 | Checks: `d1_migrations` shows 4 rows; table count 31; `foundation_meta` intact; live site still green on the old code | Terminal |
| P6 | Seed structure: `npx wrangler d1 execute DB --remote --file fixtures/catalog-seeds.sql` (NEVER `dev-catalog.sql`) | Terminal |
| P7 | Merge `stage-03` → `main`, upload via the Contents API route; Workers Builds auto-deploys | Muse |
| P8 | Insert the first admin row (your email, role `owner`) in `admin_users` via the D1 Console | Owner/Terminal |
| P9 | Verification: pages + health 200; `X-Robots-Tag` present; `/api/v1/search` returns 200 empty; `/api/admin/overview` stops at Access when logged out and returns 200 after your Access login; a test product create writes an audit row; no fixture data anywhere | Muse + Owner |
| P10 | Rollback if needed: redeploy previous `main` commit (code) and/or Time Travel restore to the P3 bookmark (data) | Terminal/Muse |

Read-only D1 Console checks you can run any time (D1 → smart-amazon-finder-db → Console):
`SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations';`
`SELECT * FROM d1_migrations;` (only works after P4 has run once anywhere)

---

## Safety summary

- This guide creates ONE queue and ONE Access application. It does not
  deploy code, apply migrations, or change the live website.
- Until publication day, the Access application protects paths that do
  not exist yet on the live site (they return 404 today) — creating it
  early is safe and changes nothing for visitors.
- If any screen differs from these steps, stop and send Muse a
  screenshot instead of guessing.
