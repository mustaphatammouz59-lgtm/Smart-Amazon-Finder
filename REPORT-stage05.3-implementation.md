# Stage 05.3 — Server-Side Enforcement of Required Attributes & Electrical Safety (FI-1 + FI-2)

- **Project:** Smart Amazon Finder (internal codename)
- **Date:** 2026-11-09
- **Branch:** `stage-05` (local only)
- **Mode:** LOCAL DEVELOPMENT ONLY — nothing pushed, merged, deployed, or applied to production.
- **Verdict: PASS** — FI-1 and FI-2 are fully enforced server-side in the validation engine, all twelve mandated proofs are covered by tests, and every regression gate is green. Warnings and scope notes are listed in §8; none blocks.

## 1. Preflight and baseline

Executed before any edit, exactly as the brief requires:

| Check | Result |
|---|---|
| Branch | `stage-05` ✔ |
| HEAD | `191016bf6bcae1482c878de37425f28ee71bf73f` — the exact Stage 05.2 baseline ✔ |
| Working tree | Clean except the eight documented untracked reports (03.7, 04.1, 04.3, 04.5, 04.7, 04.8, 04.9, 05.0) ✔ |
| Migrations present | `0001`–`0005` only ✔ |
| Baseline suite | **454/454 tests, 34 files** ✔ |
| `main` | Untouched (not checked out, not modified) ✔ |

No discrepancy was found, so implementation proceeded. The Stage 04.6 validation/publishing implementation was identified and read before editing: `app/lib/product-validation.ts` (snapshot-token verdict persistence, Stage 04.4 NF-2), `app/lib/db/admin-products.ts` (batched spec writes + in-step verdict reset, Stage 04.6), `app/lib/db/admin.ts` (`transitionProductStatus` publish gate), `app/lib/db/admin-taxonomy.ts` (definition DAL).

## 2. Files changed and why

**Created**
- `migrations/0006_attribute_required.sql` — the FI-1 schema flag (§3).
- `tests/security/required-attributes-enforcement.test.ts` — 20 DAL/engine tests (FI-1, fingerprint guard, FI-2 surge, docks-vs-hubs, certification, migration).
- `tests/routes/required-attributes-api.test.ts` — 1 route-level end-to-end bypass test with real JWKS-minted admin JWTs.

**Modified**
- `app/lib/product-validation.ts` — snapshot extension (`attributeStates` + SQL `specFingerprint`), commit-guard extension, and the FI-1/FI-2 issue rules (§4). All Stage 04.4/04.6 behaviour (`SPEC_VALUE_CONDITION`, product-column terms, counts, audit, discard semantics) is unchanged.
- `app/lib/db/admin-taxonomy.ts` — `is_required` on `AttributeDefinitionRow`/`DEFINITION_SELECT`; `isRequired?: boolean` on the create input and the update patch (mutable like `is_filterable`; key/value_type/category remain immutable).
- `app/lib/db/admin-products.ts` — `is_required` added to `AdminProductSpecRow` and the `getAdminProduct` specs SELECT (read-side completeness).
- `app/routes/api.admin.category-attributes.ts` — create schema accepts `isRequired`.
- `app/routes/api.admin.attribute.ts` — patch schema accepts `isRequired`.
- `tests/taxonomy-conformance.test.ts` — **only** the two Stage 05.2 GAP tests flipped (see §6); `seedTaxonomy` and the other eight tests are byte-unchanged.
- `TAXONOMY-stage05-proposal.md` — Revision 3 changelog; VR-2/VR-4 marked ENFORCED, VR-3d updated, FI-1/FI-2 marked IMPLEMENTED (FI-3/FI-4 remain open); D-06 set to the owner's final wording (Electronics Accessories text replaced verbatim; documentation only, applied nowhere).

## 3. Migration 0006 — details and compatibility

```sql
ALTER TABLE attribute_definitions ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;
```

- **Forward-only, additive.** Migrations 0001–0005 were not edited. The test harness (`tests/helpers/sqlite-d1.ts`) applies every file in `migrations/` in sorted order, so 0006 flows into every test database automatically.
- **Behaviour-preserving default.** `DEFAULT 0` means every existing definition — including the 8 seeded root definitions and all test fixtures — remains optional. No row is retro-flagged, and no stored product verdict is recomputed or marked valid by the migration: enforcement happens the next time a product is validated, under the flags its category carries at that moment.
- **Legacy-data implications.** Production currently holds zero products and only the 8 seeded definitions (all defaulting to optional), so nothing in production changes behaviour when 0006 is eventually published. Code predating Stage 05.3 ignores the column entirely (rollback-safe: an older build running against a migrated database behaves exactly as before).
- **Manual action needed later (ingestion stage, separately approved):** set `is_required = 1` per definition from the Revision 2 §9.1 matrix via the admin taxonomy paths (§4) — the migration deliberately sets the flag on no definition.
- **Migration test (proof 10 in the suite):** a database built with only 0001–0005 + an existing definition row accepts 0006, the column appears, and the pre-existing row reads `is_required = 0`; a fresh full migration chain yields all seeded definitions at 0.

## 4. How FI-1 and FI-2 are enforced server-side

Enforcement lives in the one place every validation and publication path funnels through — `runProductValidation` / `validateProduct` in `app/lib/product-validation.ts` — never in a form or a route. The publish gate (`transitionProductStatus`, the conditional `UPDATE … WHERE validation_status = 'passed'`, and the publish API route's 409) is unchanged and simply consumes the stricter verdicts.

**Snapshot composition (Stage 04.4 pattern, extended — not bypassed).** `readProductInputs` now also captures, in the same read pass:
- `attributeStates` — every attribute definition of the product's own category (key, `value_type`, `is_required`) LEFT JOINed with the product's spec values for it;
- `specFingerprint` — a SQL-computed `group_concat` fingerprint of that whole definition+spec state (definition id/key/type/required flag + the three spec value columns per definition, ordered by definition id), produced by one shared SQL builder used for both the snapshot read and the commit guard so the encodings cannot drift.

`commitProductValidation`'s single conditional UPDATE gains one more re-stated term — `AND <fingerprint over products.id / products.category_id> IS ?` — so **any** mid-run change to a definition (including an `is_required` flip) or to any spec value (including a value-only change at identical spec count) discards the stale verdict with `persistence: 'data_changed_retry_required'`, exactly like the Stage 04.4 terms. Stage 04.6 write-path atomicity is untouched: spec edits still reset the verdict in the same batch, and revalidation under the new rules then fails (§6, proof 7).

**FI-1 — required attributes (VR-2).** For each definition flagged `is_required` on the product's own category, the recorded value is classified: *missing* (no value, or text that trims to empty) → error `missing_required_attribute`; *invalid* (value in the wrong column for the declared type, non-finite number, bool outside {0,1}) → error `invalid_required_attribute`. A recorded `false` for a bool is a valid value. Optional definitions are never checked. No defaults are invented anywhere.

**FI-2 — conditional rules (VR-4 + VR-3), scoped by the keys a category actually defines** (no slug hardcoding):
- **Surge (categories defining `surge_protection` + `surge_rating_joules`):** protection `true` requires a rating present (`missing_surge_rating`) and > 0 (`invalid_surge_rating` — a zero is never evidence of protection); protection `false` with any rating recorded → `surge_rating_on_plain_strip` (a plain strip must not carry surge attributes). A missing `surge_protection` itself fails via FI-1 (it is flagged required in the matrix).
- **Docks vs hubs:** `ethernet_port` enforcement is purely the per-category flag — required on `docking-stations` definitions, optional on `usb-c-hubs` — so a hub can never be failed for lacking it (proof 8).
- **Certification (categories defining the R3 keys):** recorded body/status values must belong to the controlled vocabularies (`invalid_certification_body` / `invalid_certification_status`); a *verified* status (`verified_certifier_database` / `verified_manufacturer_documentation`) without a third-party listing body (UL/ETL/CSA/TUV/SGS) → `certification_claim_unverifiable` — so CE, UKCA, FCC, `none`, or a missing body can never satisfy a verified claim; a listing body recorded together with status `not_certified` → `certification_contradictory`. Being uncertified (`none`/`not_certified`/`claimed_unverified` honestly recorded) is **not** an error — the taxonomy makes the recorded check mandatory, not certification itself — and the `isSafetyCertified` derivation in `app/lib/certification.ts` is unchanged.

**Setting the flag.** `createAttributeDefinition` / `updateAttributeDefinition` and both admin API routes accept `isRequired`, persisted and audited like the other definition flags — the future approved ingestion can now set the Revision 2 matrix without further code changes.

## 5. Proof that direct API bypass attempts fail

`tests/routes/required-attributes-api.test.ts` runs the REAL route modules with real RS256 admin tokens (local JWKS server), against a category whose definition is flagged required via the taxonomy paths:

1. Create product via `POST /api/admin/products` (editor) → 201.
2. Set specs via the product-specs route **omitting** the required attribute.
3. `POST …/validate` → persisted verdict `failed` carrying `missing_required_attribute`.
4. `POST …/publish` (publisher) → **409 CONFLICT**; the product stays unpublished.
5. Set the required spec via the same route → validate → `passed` → publish → 200.

Because enforcement is in the engine/DAL, the same verdicts result from every caller — dashboard actions, API routes, or direct DAL use; there is no alternate validate/publish path (the Stage 04.5/04.7 DAL-bypass inventories remain valid: no new write path was added).

## 6. Tests — exact counts

All runs by the coordinator on the final tree.

| Gate | Result |
|---|---|
| Full vitest suite | **475/475 passed, 36 files** |
| — baseline preservation | 454 baseline tests: all pass. The ONLY pre-existing test file modified is `tests/taxonomy-conformance.test.ts`, and within it only the two Stage 05.2 GAP tests (below) |
| — new: `tests/security/required-attributes-enforcement.test.ts` | 20/20 |
| — new: `tests/routes/required-attributes-api.test.ts` | 1/1 |
| Typecheck (`npm run typecheck`) | **0 errors** |
| ESLint (`npm run lint`) | **clean** |
| Production build (`npm run build`) | **PASS** |
| Workerd sweep (`npm run test:sweep`) | **30/30** (unchanged set; the regenerated `sweep-results.json` timestamp churn was reverted, as in Stage 05.2) |

**The twelve mandated proofs** (owner brief §5 → where each lives):
1. Missing required attribute fails → enforcement test 1 (+ flipped VR-2 GAP test).
2. Null/empty required value fails → tests 1 (absent), 2a (empty text reads as missing); bool `false` is valid → test 2b.
3. Valid required value passes that check → tests 2b, 4, 7b, 7c.
4. Optional missing does not fail → test 4.
5. Direct API cannot bypass → route test (§5).
6. Publish after failed validation blocked → tests 1, 5, route test step 4.
7. Edit removing a required attribute invalidates appropriately → enforcement test 7 (published product → spec removed via the real write path → stored verdict `pending` in-step → revalidation `failed` → publish gate refuses).
8. Plain strip cannot claim protection via missing/zero fields → tests 7c (absent rating is the only passing shape), flipped VR-4 GAP test (`surge_rating_on_plain_strip` on a recorded 0), 7a (0 on a protector is `invalid_surge_rating`).
9. Surge protector missing rating/evidence fails → flipped VR-4 (`missing_surge_rating`); missing cert pair fails via FI-1 flags (test-1 pattern on the B6-required pair).
10. Dock without `ethernet_port` fails; hub without it passes → test 8.
11. Unverified CE/FCC / `claimed_unverified` cannot satisfy verified evidence → tests 9i (CE + verified → `certification_claim_unverifiable`), 9ii (FCC + verified → same), 9iii (`claimed_unverified` is honest, derives not-certified, passes as a record), 9iv (contradiction), 9v (honest uncertified), 9vi (out-of-vocabulary body).
12. Stage 04.6 security/RBAC/gates/price-policy/invalidation intact → the untouched suites: `validation-invalidation`, `validation-concurrency`, `validation-guard-coverage`, `publication-atomicity`, `price-policy`, `access-jwt`, `authz`, route matrices — all within the 475.
Plus the migration tests (§3) and the two snapshot-fingerprint interleaves (tests 6a: mid-run `is_required` flip discards; 6b: mid-run joules 1080→0 at identical spec count discards).

**Flipped GAP tests (documented, justified modification).** Stage 05.2 wrote two tests that asserted the gaps' existence "so the ingestion stage cannot mistake the gaps for enforcement". Stage 05.3 closes exactly those gaps, so the two tests now assert enforcement: VR-2 flags the three laptop-stand required keys and expects `missing_required_attribute` failures; VR-4 expects `missing_surge_rating` and `surge_rating_on_plain_strip`. Their in-file comments record the flip and its reason. No other pre-existing test was modified, weakened, deleted, or skipped.

## 7. Confirmation — no production resource touched

Nothing was pushed to GitHub; `main` was never checked out or modified; nothing was deployed; migration 0006 exists only as a local file and was applied only inside local test databases (production D1 still runs migrations 0001–0005); no production KV/R2/Queue/Access state was read or changed; no products were inserted or published (the 47-product ingestion remains blocked); no indexing or noindex setting changed; no affiliate tags, tracking, or monetization code was added; no other project was touched.

## 8. Warnings and scope notes (non-blocking)

1. **Certification consistency scope.** The engine enforces vocabulary membership and claim consistency (§4). It deliberately does NOT require any product to *be* certified — `none`/`not_certified` are honest publishable records per Revision 2 (the recorded body+status pair is what's mandatory, via FI-1 flags). If the owner later wants verified certification as a publish condition for a specific category, that is a new rule, not a gap in this stage.
2. **B4 asterisk-requireds remain flag decisions.** Cables & Adapters' `power_delivery_w` / `data_transfer_gbps` are "required where published" in the matrix — an editorial nuance the engine cannot express conditionally; the ingestion step decides the flags product-class by product-class. No conditional was invented for them (per brief).
3. **`ethernet_speed_mbps` recording rule stays editorial** ("recorded only when Ethernet is present") — outside the brief's FI-2 enumeration; not engine-enforced.
4. **FI-3** (`categoryIndexability` root roll-up) and **FI-4** (certification evidence payloads via Stage 06 `source_records`) remain open, unchanged from Stage 05.2 — neither affects validation or publication gates.
5. **Fingerprint encoding.** The guard compares SQL-computed fingerprints (same engine both sides), avoiding JS/SQL number-format drift; text spec values containing the char(30)/char(31) separators could theoretically alias — accepted residual, consistent with the codebase's risk posture (values are editor-entered spec text, and a collision would need a compensating simultaneous change).
6. **Publication of this stage is a separate step.** Production publication (push + migration 0006 application via the armed Builds command) requires the owner's separate approval, as does the 47-product ingestion.

## 9. Commits (branch `stage-05`)

| Commit | Content |
|---|---|
| *(implementation)* | Migration 0006 + engine/DAL/route enforcement (FI-1, FI-2) |
| *(tests)* | Enforcement suites + flipped GAP tests |
| *(docs)* | Taxonomy Revision 3 + this report |

Exact SHAs are in the coordinator's return message and `git log`.

## 10. Verdict

**PASS** — FI-1 and FI-2 are fully enforced server-side: required attributes fail validation when missing, empty, or type-invalid on every validate/publish path (route-level bypass proven impossible); the surge and certification conditional rules reject missing, zero, contradictory, and unverifiable-evidence records; the Stage 04.4 snapshot guard now covers definition flags and spec values, so no stale verdict can persist over changed enforcement inputs; all 475 tests, typecheck, lint, build, and the workerd sweep pass. The 47-product ingestion remains blocked pending separate owner authorization.
