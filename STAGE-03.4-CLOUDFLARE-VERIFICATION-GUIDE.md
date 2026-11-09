# Stage 03.4 — Cloudflare Verification Guide (Owner-Assisted)

Purpose: find out the TRUE current state of the production D1 database
before any publication. Everything in Part A is **read-only** — you only
look, you never type anything that changes data. Muse has no access to
your Cloudflare account; your screenshots are how Muse "sees" the
results, and Muse verifies them against the project records.

**Golden rule for the D1 Console: run ONLY the exact queries printed in
this guide.** The console can also modify data — never paste anything
else into it, and if a query shows an error, screenshot it instead of
retrying with changes.

---

## Part A — Dashboard checks (phone is fine)

### Check 1 — Queues (30 seconds; confirms the DLQ again)

1. dash.cloudflare.com → **Queues**.
2. Confirm BOTH are listed: `smart-amazon-finder-jobs` and
   `smart-amazon-finder-dlq`.
📸 **Screenshot S1:** the queues list.

### Check 2 — Access application (1 minute; confirms Step 03.3 held)

1. one.dash.cloudflare.com → **Access → Applications**.
2. Confirm `Smart Amazon Finder Admin` is listed with policy
   **Owner only**.
3. Open it and confirm the destination path shows `api/admin/*`.
📸 **Screenshot S2:** the applications list (the open-app view only if
anything looks different from `api/admin/*`).

### Check 3 — D1 database state (the important one, ~3 minutes)

1. dash.cloudflare.com → **Workers & Pages → D1** (or "Storage &
   databases → D1").
2. Open **smart-amazon-finder-db**.
3. **Overview tab:** note what it shows for size / table count.
📸 **Screenshot S3:** the D1 overview.
4. Open the **Console** tab. Run this query EXACTLY (tap Run):

```sql
SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name;
```

📸 **Screenshot S4:** the FULL result list (scroll if needed — every row
matters).

5. Run this query EXACTLY:

```sql
SELECT name FROM sqlite_master WHERE type='table' AND name='d1_migrations';
```

- If the result is **empty** → no migration tracking table exists; that
  means migrations were never applied via wrangler. STOP here, skip
  query 6.
- If it returns one row (`d1_migrations`) → run query 6.
📸 **Screenshot S5:** this result either way.

6. ONLY if query 5 returned a row, run:

```sql
SELECT id, name, applied_at FROM d1_migrations ORDER BY id;
```

📸 **Screenshot S6:** the full result.

**How Muse will read your screenshots** (for your understanding):
- *No tables at all* → the database is empty: the expected state per the
  project records (Workers Builds never runs migrations; the health
  check needs no tables).
- *Only `foundation_meta`* → migration 0001 was applied at some point.
- *`d1_migrations` with names listed* → exactly those migrations are in;
  publication then applies only the remaining ones.
None of these is "wrong" — publication planning just needs the truth.

### Check 4 — D1 Time Travel info (1 minute)

1. Still inside **smart-amazon-finder-db**, open **Settings** (look for a
   "Time Travel" section/item if your layout shows one).
2. Note what it says about restore points / retention. **Do NOT start a
   restore.**
📸 **Screenshot S7:** the Time Travel / settings info shown.

---

## Part B — The safest backup for the ACTUAL current state

The right backup depends on what Check 3 finds — which is why the checks
come first:

- **If the database is empty (expected):** there is no data to lose. The
  "backup" is the **state record**: screenshots S3–S6 + this guide's
  results, kept with the project. Before migrations are applied on
  publication day, take the Time Travel bookmark (CLI, Part C) anyway —
  it costs nothing and pins the empty state.
- **If tables/data exist:** publication day must FIRST run the full
  export (CLI, Part C) BEFORE any migration is applied, and the export
  file's contents must be verified (non-empty, contains CREATE TABLE
  statements) before proceeding. This ordering matters: once migration
  0004 (the search index) is applied, the one-command whole-database
  export no longer works on D1 (proven in Stage 03.1) — afterwards,
  backups are the per-table procedure in DATABASE-DESIGN §9.
- **The dashboard cannot produce a full SQL export.** Viewing and SELECT
  queries: yes. Export file: CLI only (Part C).
- Time Travel is the second layer: it can restore the database to a
  point in time, independent of export files.

---

## Part C — Wrangler CLI command pack (for a computer, when available)

Muse cannot run these — there is no authenticated Cloudflare session on
Muse's machine, and none should be created there. If you use a computer,
you sign in yourself with `npx wrangler login` (a browser window opens;
**never share the result, a token, or any code with anyone, including
Muse**).

### READ-ONLY — safe to run any time

```bash
npx wrangler whoami
npx wrangler d1 list
npx wrangler d1 info DB
npx wrangler d1 migrations list DB --remote
npx wrangler d1 execute DB --remote --command "SELECT name FROM sqlite_master WHERE type IN ('table','view') ORDER BY name;"
npx wrangler d1 time-travel info DB
npx wrangler queues list
```

(`DB` is the binding name from the project configuration; wrangler
resolves it to smart-amazon-finder-db. `d1 migrations list` shows both
applied and pending migrations — the single most informative command.)

### MUTATIONS — publication day ONLY, under a publication approval

```bash
# Backup first (valid only BEFORE migration 0004 is applied):
npx wrangler d1 export DB --remote --output backup-pre-stage03.sql
# Apply migrations 0001–0004 in order:
npx wrangler d1 migrations apply DB --remote
# Structural seeds only (NEVER fixtures/dev-catalog.sql):
npx wrangler d1 execute DB --remote --file fixtures/catalog-seeds.sql
```

Do NOT run anything in this second block during verification.

---

## Part D — Dashboard vs CLI: who can do what

| Check / action | Dashboard | CLI |
|---|---|---|
| Queues exist (jobs + DLQ) | ✔ list view | ✔ `queues list` |
| Access app + policy correct | ✔ Zero Trust UI | — (UI only, practically) |
| D1 table list / migration history | ✔ Console SELECTs | ✔ `execute --command` / `migrations list` |
| D1 size / metrics | ✔ Overview | ✔ `d1 info` |
| Time Travel bookmark info | ✔ view (Settings) | ✔ `time-travel info` |
| Full SQL export (backup file) | ✘ not available | ✔ `d1 export` |
| Apply migrations | ✘ | ✔ `migrations apply` |
| Restore (Time Travel) | (do not use now) | ✔ `time-travel restore` |

---

## Part E — Screenshots: what to share and what to redact

**Safe to share as-is:** queue names; D1 table names and counts;
migration file names; the Access application name, destination and
policy name; database size figures; error messages from the console.

**Cover or crop out before sending, if visible:**
- Payment card numbers (Billing screens — none of these checks open
  Billing, so if you land there, you took a wrong turn: go back).
- Any value labelled **API Token**, **API Key**, **Global API Key**, or a
  password/verification code. NONE of the checks in this guide display
  one; if a screen shows one, do not screenshot it — tell Muse the
  screen's title instead.
- Your account email appears in some menus; it is already known to Muse
  (it is the Owner-only policy email), so it needs no redaction here.

**Never type into any chat:** passwords, API tokens, one-time codes.
Nothing in this verification ever requires one.

---

## Owner actions (this stage)

1. Run Check 1 → send **S1**.
2. Run Check 2 → send **S2**.
3. Run Check 3 queries in order → send **S3, S4, S5** (and **S6** only if
   query 5 found the `d1_migrations` table).
4. Run Check 4 → send **S7**.
5. Run NOTHING from Part C's mutation block; change nothing anywhere.

When the screenshots arrive, Muse records the verified remote state,
updates the publication runbook if the state differs from expectations,
and reports back. Publication still needs its own separate approval.
