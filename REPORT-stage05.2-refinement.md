# Stage 05.2 — Final Taxonomy Refinement and Data Model Approval

- **Project:** Smart Amazon Finder (internal codename)
- **Date:** 2026-11-09
- **Branch:** `stage-05` (local only; base `main` @ `f719196`)
- **Mode:** LOCAL PLANNING/REFINEMENT ONLY — nothing ingested, published, pushed, merged, or deployed; no migration created or applied; production D1 untouched; global noindex unchanged.
- **Verdict: PASS WITH WARNINGS** — the revised model is complete, internally consistent, and proven against the real schema/write-path/validation/publication/indexability code. Warnings are the two demonstrated engine-enforcement gaps (FI-1, FI-2) that the ingestion stage must close or formally cover before the affected products are published, plus D-06 awaiting the owner's final word (by design — the brief for this stage was to present the texts, not apply them).

## 1. What was delivered

| Deliverable | Where | State |
|---|---|---|
| 1. Revised complete taxonomy, 15 subcategories | `TAXONOMY-stage05-proposal.md` — **Revision 2** (1,459 lines, changelog at top) | Done |
| 2. Revised attribute matrix + validation rules | Same document, §9 (matrix summary + rules VR-1…VR-6); canonical per-attribute tables in §§2–3 | Done |
| 3. Controlled vocabularies (`connector_type`, `device_type`) | Same document, §8 (+ certification vocabularies in code, §8.4) | Done |
| 4. Final proposed root descriptions (D-06) | Same document, §7 — quoted in full in §4 below | **Presented for owner review; not applied anywhere** |
| 5. Revised first-40 distribution | Same document, §6 — summarised in §5 below (47 products) | Done |
| 6. Gate-compatibility evidence | `tests/taxonomy-conformance.test.ts` (new, 10 tests) + full gate re-run (§6 below) | Done |

Owner rulings applied: the 15-subcategory structure (12 + the 3 ordered splits); D-01…D-05 and D-07…D-11 approved as specified (D-05 root aggregation; D-11 extended to the existing roots — recorded as ingestion-step data action §5.2 C of the taxonomy, **not performed**); D-03 power banks excluded; D-04 Cases & Sleeves kept; D-08 metric storage retained; D-09 idempotent seeds route. D-06 conditional → final texts presented (§4).

## 2. The five refinements as designed

**R1 — Laptop Stands (own dictionary; monitor-arm semantics removed).**
`screen_size_max_in` and `vesa_compatible` are deleted from Laptop Stands (a monitor diagonal is not a laptop size class; a laptop stand has no VESA interface — Revision 1's "record false" rule produced a column of meaningless values). New dictionary (6 rows): `max_laptop_size_in` (new, **required** — fit is the product's definition and is published by effectively every maker), `height_adjustable` (inherited, required-as-recorded), `max_load_kg` (inherited, **required** — same reasoning), `tilt_adjustable` (optional — inconsistently published; requiring it would invite photo-inference), `foldable` (new, optional), `warranty_years` (inherited, demoted to optional — accessory-class warranty publication is inconsistent). Monitor Arms keeps its Stage 05.1 table byte-for-byte. Storage: ordinary per-category `attribute_definitions` + typed `product_specs`; conformance-proven via the real write path, including a category-scoping refusal test.

**R2 — Hubs & Docking Stations (shared core + evidence-based optionals).**
Shared core retained (`usb_c_ports`, `power_delivery_w`, `usb_a_ports`, `hdmi_ports` — all required; `max_video_resolution` optional). Added, all optional unless noted: `usb_data_speed_gbps`, `ethernet_port`, `ethernet_speed_mbps` (recorded only when Ethernet present and speed published), `card_reader_sd` + `card_reader_microsd` (two bools — products routinely carry one without the other, and a combined text value would break exact-match filtering), `displayport_outputs`, `max_external_displays` (optional even for docks — makers qualify it by host OS/chipset). One genuine hubs/docks difference: `ethernet_port` is **required for Docking Stations** (docks are specified by complete published port lists, so presence/absence is evidence) and optional for Hubs. A hubs-vs-docks boundary rule (manufacturer's own positioning; ambiguity → Hubs) is §4 rule 4 of the taxonomy. No rarely-published spec was made required.

**R3 — Safety certification (structured, evidence-backed; replaces the boolean).**
The seeded `safety_certified` bool is inherited by **no** subcategory. In its place, three ordinary text spec attributes (no new table, **no migration**): `safety_certification_body` (controlled vocabulary: `UL`, `ETL`, `CSA`, `TUV`, `SGS`, `CE`, `UKCA`, `FCC`, `none`), `safety_certification_status` (`verified_certifier_database` > `verified_manufacturer_documentation` > `claimed_unverified` > `not_certified`), `safety_certification_id` (certifier file/control number where published). Required (body+status, as a recorded check — `none`/`not_certified` are honest publishable values) on B1/B2/B3/B6; optional on B4/B5 (passive products) and on the two powered Sector A categories (A2 Standing Desks, A4 Desk Lighting); absent elsewhere in Sector A (unpowered furniture/textiles have no honest listing regime — justified per category in the doc). **Derivation rule** (implemented as the pure reference module `app/lib/certification.ts`, deliberately NOT wired into any gate): certified ⟺ verified status AND body ∈ {UL, ETL, CSA, TUV, SGS}. `claimed_unverified` never counts; CE/UKCA/FCC are recorded factually but are not third-party safety listings. Evidence: cert spec rows are written with `product_specs.source_id` identifying the verification event's source record (the existing per-spec provenance column); the full `source_records.licence_json` payload awaits the Stage 06 write path (FI-4). Conformance-proven: derivation matrix unit tests + a DAL text-filter test showing only the verified product surfaces under the certified status filter while an identically-bodied `claimed_unverified` product does not.

**R4 — Power Strips vs Surge Protectors (explicit capability, no more 0-joules).**
Revision 1's "plain strip records 0" convention is **withdrawn**. New required bool `surge_protection` records the manufacturer's own product type for every B6 product; `surge_rating_joules` is **conditional**: required and > 0 iff `surge_protection = true`; **absent** (never 0, never displayed) iff false. Display/comparison rules are written into the taxonomy (a joule figure renders only for protectors; plain strips show "Surge protection: No" and no number; no copy may imply protection). Enforcement honesty: the current engine reads no spec values, so it **cannot** enforce the conditional rule today — the conformance suite demonstrates both violations (protector without rating; plain strip with a 0 rating) passing validation, pinning the gap. The fix is specified as FI-2 (code-only snapshot extension, Stage 04.4 pattern) and must land before the first B6 product is published, or B6 entries stay under manual two-person checking until it does.

**R5 — Ergonomic Supports (zero mandatory technical attributes, real floor).**
A8 keeps its 4 all-optional attributes. Usefulness is guaranteed instead by the **basic completeness floor (VR-5)**, which applies to *every* category and is derived item-by-item from what the existing system actually enforces: F1 identity (engine errors for name/slug; brand is warning-level → floor-required editorially), F2 single leaf placement (schema/DAL-enforced), F3 original summary of stated substance (engine error when empty; ≥2 original sentences editorial), F4 ≥1 recorded spec (engine error at zero) + the category's required set where one exists (editorial → FI-1), F5 ≥1 lawful destination offer or a deliberate editorial-only decision (lawfulness engine-enforced; presence warning-level → floor-required editorially), F6 evidence traceability via the existing `source_id` fields, F7 licence hygiene (expired = engine error). Conformance-proven on A8 itself: no-summary → `missing_summary` failure; zero specs → `missing_specs` failure; floor-complete product validates, publishes through the real gate, and computes indexable.

## 3. Controlled vocabularies (D-07)

- **`connector_type`** — 9 closed terms naming both ends (USB-C first where present): `USB-C to USB-C`, `USB-C to USB-A`, `USB-C to Lightning`, `USB-C to HDMI`, `USB-C to DisplayPort`, `USB-C to Ethernet`, `USB-A to USB-A`, `HDMI to HDMI`, `DisplayPort to DisplayPort`. Sized to cover every §3.5 product type in the first batch.
- **`device_type`** — 4 closed terms: `phone`, `tablet`, `laptop`, `phone-or-tablet` (the last so a genuinely universal product is not forced into a lie).
- **Extension rule (both, plus the certification vocabularies):** taxonomy-owner-only, by amending the taxonomy document (and the certification module, for R3's lists) *before* any product uses a new term; append-only — a term in use is never renamed, because stored spec values and filters reference the exact string.

## 4. D-06 — final proposed root descriptions (verbatim, for owner review)

**Home Office & Productivity:**

> "A home office earns its keep when the desk, the chair, and the light stop fighting you. This section covers the furniture and workspace accessories that shape a working day — desks and standing desks, seating, lighting, monitor arms and laptop stands, storage, and the small ergonomic pieces in between — each one recorded from manufacturer specifications, so products can be compared on the same terms."

**Electronics Accessories:**

> "The accessories around a laptop or phone decide how well the whole setup works: whether one cable can charge everything, whether a hub or dock has the ports your desk actually needs, and whether a charger is built and certified to a standard worth trusting. This section covers hubs, docking stations, chargers, cables and adapters, device stands, power strips and surge protectors, and cases — accessories only, never the devices themselves — with wattage, port, and certification figures taken from manufacturer specifications."

Both are refinements of the Revision 1 drafts (updated to name the split categories). **Neither text has been applied to any record** — local, seed, or production. On the owner's approval they are applied by the ingestion step as an UPDATE to the two seeded rows.

## 5. Revised first-batch distribution (47 products)

| Subcategory | Products | | Subcategory | Products |
|---|---|---|---|---|
| `desks` | 5 | | `usb-c-hubs` | 5 |
| `standing-desks` | 5 | | `docking-stations` | 5 |
| `office-chairs` | 5 | | `chargers-power-adapters` | 5 |
| `desk-lighting` | 5 | | `cables-adapters` | 5 |
| `monitor-arms` | 1 | | `device-stands-holders` | 1 |
| `laptop-stands` | 1 | | `power-strips-surge-protectors` | 1 |
| `desk-organization-storage` | 1 | | `cases-sleeves-protection` | 1 |
| `ergonomic-supports` | 1 | | **Total** | **47** |

Sector split A = 24 / B = 23. Eight carriers meet the ≥5 count term; the seven thin subcategories open at 1 (no leaf opens empty; the R1/R4/R5 models get real entries immediately) and stay non-indexable by rule. **Indexability consequence, stated plainly:** meeting the count term does NOT make any category indexable — the SEO §6 guide/"how to choose" term is unmet for every category until the content stage, so all 15 subcategories (and both roots, whose descendant-aggregated counts of 24/23 clear the count term) keep `is_indexable = 0`, and the global production noindex is untouched regardless.

## 6. Gate-compatibility evidence

Coordinator-run on the final Stage 05.2 tree:

| Gate | Result |
|---|---|
| `npm test` (vitest) | **454/454 passed, 34 files** — Stage 05.1 baseline 444 intact + **10 new** conformance tests |
| `npm run typecheck` | **PASS — 0 errors** |
| `npm run lint` | **PASS — clean** |
| `npm run build` | **PASS** |
| `npm run test:sweep` (workerd) | **30/30** (unchanged; the regenerated results file was reverted — timestamp churn is not part of this stage) |

The conformance suite (`tests/taxonomy-conformance.test.ts`) seeds the revised dictionaries for the six refined areas (Laptop Stands, USB-C Hubs, Docking Stations, Chargers, Power Strips, Ergonomic Supports) on the local shim and proves, through the REAL `createProduct` / `setProductSpecs` / `runProductValidation` / `transitionProductStatus` / `listProducts` / `getProductBySlug` / `productIndexability` code: dictionary row counts match the document (6/15/15/9/9/4); laptop-stand products store + validate + publish through the gate; foreign-category definitions are refused (`unknown_definition`); dock specs store with write-path type-checking (`type_mismatch` on a string speed); the certification derivation matrix behaves (claimed ≠ certified, CE/FCC ≠ listing); only the verified charger surfaces under the certified status filter; both B6 product types store distinctly with no joule row on the plain strip; an A8 floor-complete product validates, publishes, and computes indexable. **Two tests are labelled GAP and assert today's (insufficient) engine behaviour on purpose** — they pin FI-1 and FI-2 so the ingestion stage cannot mistake the gaps for enforcement.

## 7. Flagged implementation items (ingestion stage)

- **FI-1 — Required-attribute enforcement (migration, sketched, NOT created).** `ALTER TABLE attribute_definitions ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;` + mark §9.1's required keys at ingestion + extend the validation snapshot with per-definition presence. Needs its own owner-approved migration step. Until then VR-2 is editorial (runbook checklist per product).
- **FI-2 — Conditional spec rules in the engine (code-only, no migration).** Extend the validation snapshot (Stage 04.4 pattern) with spec values for conditionally ruled keys; add the VR-4 checks to `productIssues()`. Must land before the first B6 publication (or B6 stays on manual two-person checking).
- **FI-3 — `categoryIndexability` root roll-up (code-only, display-only).** Align its count term with D-05 (roots count direct children too). No gate impact.
- **FI-4 — Certification evidence payloads.** `source_records` is read-only until the Stage 06 import pipeline; VR-3b's per-spec `source_id` convention is the interim traceability mechanism.

**No migration is required by the Stage 05.2 model itself** — every structure above stores in the existing schema, as the conformance suite demonstrates. FI-1's sketch is a future enforcement upgrade, not a model dependency.

## 8. Branch and commits

Branch **`stage-05`** (local only; base `main` @ `f719196`, unmodified):

| Commit | Content |
|---|---|
| `e0bdb3fe…` (`e0bdb3f`) | (R3) `app/lib/certification.ts` + `tests/taxonomy-conformance.test.ts` |
| `f57709f…` (`f57709f`) | Taxonomy Revision 2 (`TAXONOMY-stage05-proposal.md` rewritten in place) |
| this report's commit | (report) Stage 05.2 refinement report |

Full SHAs are in the coordinator's return message / `git log`.

**Confirmation:** nothing was ingested or published; no product or category record was created in any real database (conformance fixtures exist only inside the test process on the local shim); nothing was pushed to GitHub; `main` was not merged or modified; nothing was deployed; no migration was created or applied; no production data was read or written; the global noindex and all indexing settings are unchanged; no other project was touched. The only production-code addition is the pure, unwired `app/lib/certification.ts` policy module.

## 9. Verdict

**PASS WITH WARNINGS** — the Stage 05.2 data model is final-form: 15 subcategories, 118 attribute rows, structured certification, an honest surge model, a floor that makes the lightest category publishable without invented specs, closed vocabularies, D-06 texts ready for the owner's word, and a 47-product distribution — all proven storable and validatable by the existing Stage 04.6/05.1 machinery with zero schema changes. Warnings carried into the ingestion stage: FI-1 and FI-2 are real enforcement gaps (demonstrated, not hidden) that must be closed or formally covered before the affected products publish; FI-3/FI-4 are bounded follow-ups; D-06 awaits owner review. **Product ingestion remains blocked** until the owner closes D-06 and separately authorizes the ingestion step.
