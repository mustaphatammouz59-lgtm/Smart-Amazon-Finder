# Taxonomy Proposal — Stage 05 (Revision 2 — Stage 05.2)

- **Project:** Smart Amazon Finder (internal codename)
- **Stage / package:** Stage 05.1 Package A, revised by Stage 05.2
  (Final Taxonomy Refinement and Data Model Approval)
- **Date:** 2026-11-09 (Revision 1); Revision 2 — 2026-11-09
- **Status:** STRUCTURE APPROVED BY THE OWNER (15 subcategories,
  including the three owner-ordered splits), with the Stage 05.2
  refinements R1–R5 applied in this revision. Decisions D-01…D-11
  are approved (see §7); D-06's root descriptions are recorded in
  §7 as owner-approved final wording (Revision 3 — documentation
  only, applied nowhere).
  **This document inserts no data.** Nothing in it has been applied
  to any database, fixture, or seed file. The ingestion step
  described in §5 may only run as a separate, separately approved
  step.
- **Scope:** Exactly the two launch sectors from PRODUCT-REQUIREMENTS.md
  §3.2 — (A) Home Office & Productivity, (B) Electronics Accessories.
  Products will be entered manually through the existing admin
  dashboard. Offers are link-out only; no prices are displayed in
  this stage. Audience: US consumers.

## Changelog — Revision 2 (Stage 05.2)

1. **Three owner-ordered splits applied** (D-01 as amended by the
   owner): Desks ‖ Standing Desks, Monitor Arms ‖ Laptop Stands,
   USB-C Hubs ‖ Docking Stations are now separate subcategories.
   The tree is **15 subcategories** (8 + 7), not 12.
2. **R1 — Laptop Stands** has its own dictionary. The semantically
   wrong monitor-arm attributes (`screen_size_max_in`,
   `vesa_compatible`) are removed; `max_laptop_size_in` and
   `foldable` are introduced (§2.7).
3. **R2 — Hubs & Docking Stations** gain evidence-based optional
   attributes: Ethernet, SD/microSD readers, DisplayPort outputs,
   maximum external displays, USB data speed (§§3.2–3.3).
4. **R3 — Safety certification is now structured.** The
   `safety_certified` boolean is NOT inherited by any subcategory.
   It is replaced by an evidence-backed trio
   (`safety_certification_body`, `safety_certification_status`,
   `safety_certification_id`) with controlled vocabularies and one
   derivation rule, implemented as the reference module
   `app/lib/certification.ts` (§9, rule VR-3).
5. **R4 — Power Strips vs Surge Protectors** are distinguished by an
   explicit `surge_protection` capability attribute. The Revision 1
   "plain strip records 0 joules" convention is WITHDRAWN: a joule
   rating exists only on a surge protector (§3.7, rule VR-4).
6. **R5 — A basic completeness floor** now applies to every product
   in every category, so Ergonomic Supports (zero mandatory
   technical attributes, retained) still yields useful, honest
   pages (§9, rule VR-5).
7. **D-06 final root descriptions** are presented verbatim in §7
   for owner review (conditional approval).
8. **Distribution revised** for the 15-category tree: 47 products,
   8 carrier categories at ≥ 5 (§6).
9. **Attribute matrix + validation rules** are stated canonically
   in §9, including which rules the current validation engine
   enforces, which are editorial, and the flagged implementation
   items (FI-1…FI-4) where the engine demonstrably cannot enforce a
   rule yet. Evidence: `tests/taxonomy-conformance.test.ts`.
10. Totals changed accordingly: **118 attribute-definition rows**
    (was 87 in the owner's reviewed split draft): 36 inherited
    copies of the seeded root definitions + 82 new rows using 44
    distinct new keys.

## Changelog — Revision 3 (Stage 05.3)

1. **FI-1 + FI-2 are now engine-enforced.** Migration
   `0006_attribute_required.sql` adds `is_required` to
   `attribute_definitions` (default 0 — every existing definition,
   including the 8 seeded roots, stays optional until a future
   approved ingestion sets the flag per definition from the §9.1
   matrix). The product validation engine's snapshot now covers the
   category's definition set plus the product's spec values for it,
   guarded at commit by a SQL spec fingerprint, and enforces:
   required-attribute presence and type validity (VR-2), the
   conditional surge rules (VR-4), and certification-vocabulary /
   consistency checks (VR-3). §9.2 and §9.3 are updated to match.
2. **The two GAP tests flipped.** The Stage 05.2 conformance tests
   that pinned the VR-2 and VR-4 enforcement gaps now assert the
   enforced behaviour — the documented lifecycle of a gap-pinning
   test (see `tests/taxonomy-conformance.test.ts`, plus the new
   `tests/security/required-attributes-enforcement.test.ts` and
   `tests/routes/required-attributes-api.test.ts`).
3. **D-06 closed as wording.** The two root descriptions in §7 are
   recorded as owner-approved final wording (the Electronics
   Accessories text in its final form). Documentation only —
   applied nowhere; the ingestion step remains a separate,
   separately approved step.

---

## 1. How to read this proposal (conventions)

1. **Tree depth is one level.** Roots already exist (seeded). Every
   subcategory is a direct child of a root (`parent_id` → root id).
   No third level; the tree stays shallow so it can grow later
   without restructuring.
2. **"Inherited" is a copying instruction, not a database feature.**
   `attribute_definitions` rows belong to exactly one category
   (`UNIQUE (category_id, key)`). There is no inheritance mechanism
   in the schema. "Inherited from the root dictionary" means: *at
   ingestion, create a row with the same key, label, unit, value
   type, and flags on the subcategory*, copied from the seeded root
   definition. A product is filed under its subcategory, so its
   specs can only be recorded against definitions that exist on
   that subcategory.
3. **"Required" is a completeness rule, now backed by a schema
   column.** Since Stage 05.3 (FI-1 in §9, migration 0006) each
   definition carries an `is_required` flag, set at ingestion from
   this document's tables, and the validation engine enforces it.
   Required here means: a product in that subcategory is not
   considered *complete* (and cannot be published) until a value
   for that attribute has been recorded from a manufacturer
   source. For `bool` attributes, required means the value must
   be recorded — `false` is a valid, publishable value; a missing
   value is not.
4. **Units follow the seeds.** The seeded dictionary is metric
   (`width_cm`, `max_load_kg`, `cable_length_m`). New definitions
   keep metric units for data consistency, even though the audience
   is US (D-08: imperial conversion is a display concern only).
   Where the manufacturer's own published unit is imperial and is
   the industry norm (laptop/monitor sizes, device sizes), the
   definition is imperial (`max_laptop_size_in`,
   `screen_size_max_in`, `max_device_size_in`) — the stored value
   is the manufacturer's published figure, never a converted one.
5. **`sort_weight` rule.** Mirrors the seed pattern: comparison
   criteria carry weights 30 / 20 / 10 in the order they are listed
   in each table; non-comparison attributes carry 0. Rows inherited
   from the root dictionary keep their seeded weights unchanged.
6. **Comparison alignment.** Every `is_comparison_criterion = yes`
   row serves one of the five published criterion areas per sector
   in `app/routes/compare.tsx`. "Assembly & maintenance" (Sector A)
   is deliberately **not** modelled as a spec attribute: assembly
   effort cannot be verified from manufacturer spec sheets
   consistently, so it belongs in editorial summaries.
7. **Certification attributes.** Where a table lists
   `safety_certification_body` / `_status` / `_id`, the values come
   from the controlled vocabularies in §8 and obey rule VR-3 (§9).
   Certification is never inferred from marketing wording.
8. **Original wording.** All category descriptions in this document
   are written for this proposal, in our own words, and are drafted
   to be usable as the public intro copy required by
   SEO-STRATEGY.md §6.

---

## 2. Sector A — Home Office & Productivity

### 2.1 Root category (already seeded — no change proposed to the row)

| Field | Value |
|---|---|
| slug | `home-office` |
| name | Home Office & Productivity |
| seeded description | "Desks, seating, lighting and workspace accessories." |
| parent | none (root) |
| status | Already in `fixtures/catalog-seeds.sql`; applied in production |

The seeded one-line description is a summary, not the fuller
original intro a category page needs (UX-UI-SPECIFICATION.md §3.4,
SEO-STRATEGY.md §6). Replacing it is decision D-06 — the
owner-approved FINAL wording is in §7 (D-06); nothing
is applied in this stage.

Comparison areas served (from `app/routes/compare.tsx`): Ergonomics
& posture support · Adjustability range · Build quality & warranty ·
Footprint & desk fit · Assembly & maintenance (editorial only, §1
rule 6).

Seeded root dictionary for this sector (the inheritance pool):

| key | label | unit | type | filterable | comparison | sort_weight |
|---|---|---|---|---|---|---|
| `height_adjustable` | Height adjustable | — | bool | yes | yes | 30 |
| `max_load_kg` | Maximum load | kg | number | yes | yes | 20 |
| `warranty_years` | Warranty | years | number | no | yes | 10 |
| `width_cm` | Width | cm | number | yes | no | 0 |

### 2.2 A1 — Desks

| Field | Value |
|---|---|
| proposed slug | `desks` |
| name | Desks |
| proposed sort_order (under root) | 1 |

**Proposed public intro copy:**

> "Fixed writing and computer desks — the desks that stay at one
> height — compared on surface size, rated load, and the warranty
> behind the frame. Desks that rise and lower live in Standing
> Desks, one shelf over."

**Product types covered:** fixed writing/computer desks; compact
desks for small rooms; corner/L-shaped desks sold as a single
product with published dimensions. Height-adjustable desks of any
kind belong to A2 — the boundary is the product's defining
capability, not its marketing name.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `height_adjustable` | Height adjustable | — | bool | required | yes | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | required | yes | yes | inherited |
| `warranty_years` | Warranty | years | number | required | no | yes | inherited |
| `width_cm` | Width | cm | number | required | yes | no | inherited |
| `depth_cm` | Depth | cm | number | required | yes | no | new |

Notes: Revision 1's combined A1 also carried `max_desk_height_cm`
and `motorized`. Both moved to A2 with the split: on a fixed desk
`motorized` is false by definition of the category, and a single
fixed working height is a dimension the editorial summary states —
recording either as a spec here would be category noise, the same
defect R1 removed from Laptop Stands.

### 2.3 A2 — Standing Desks

| Field | Value |
|---|---|
| proposed slug | `standing-desks` |
| name | Standing Desks |
| proposed sort_order (under root) | 2 |

**Proposed public intro copy:**

> "Electric and hand-crank sit-stand desks, compared on the figures
> that decide a working day: height range, rated load, surface size,
> and whether the lift is motorized or manual. Where the maker
> publishes an electrical listing for the frame, it is recorded
> with its evidence — never assumed."

**Product types covered:** electric sit-stand desks (complete desk,
or frame-plus-top sold as one product); manual height-crank
standing desks.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `height_adjustable` | Height adjustable | — | bool | required | yes | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | required | yes | yes | inherited |
| `warranty_years` | Warranty | years | number | required | no | yes | inherited |
| `width_cm` | Width | cm | number | required | yes | no | inherited |
| `depth_cm` | Depth | cm | number | required | yes | no | new |
| `max_desk_height_cm` | Maximum desk height | cm | number | required | yes | yes | new |
| `motorized` | Motorized adjustment | — | bool | required | yes | yes | new |
| `safety_certification_body` | Certification body / mark | — | text | optional | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | optional | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |

Notes: `max_desk_height_cm` and `motorized` are promoted from
optional (Revision 1) to required: every sit-stand desk maker
publishes a height range, and electric-vs-crank is stated for every
model — these are the category's defining figures, and requiring
them forces no inference. `height_adjustable` is definitionally
true here but is still RECORDED from the manufacturer's
specification (§1 rule 3), never assumed. The certification trio is
OPTIONAL: many frames carry a checkable listing (e.g. a UL 962 /
ETL listing), many publish none; record the trio when a listing is
published, leave it absent when it is not.

### 2.4 A3 — Office Chairs & Ergonomic Seating

| Field | Value |
|---|---|
| proposed slug | `office-chairs` |
| name | Office Chairs & Ergonomic Seating |
| proposed sort_order (under root) | 3 |

**Proposed public intro copy:**

> "Task chairs and ergonomic chairs compared on support, not styling:
> lumbar adjustment, seat dimensions, rated capacity, and the warranty
> standing behind the mechanism. If a support claim cannot be checked
> against the manufacturer's own specification, it does not appear
> here as a specification."

**Product types covered:** office task chairs; ergonomic chairs with
adjustable lumbar support; drafting stools for standing-desk use.
Kneeling chairs are included only where the manufacturer publishes
load and dimension specifications.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `height_adjustable` | Height adjustable | — | bool | required | yes | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | required | yes | yes | inherited |
| `warranty_years` | Warranty | years | number | required | no | yes | inherited |
| `adjustable_lumbar_support` | Adjustable lumbar support | — | bool | required | yes | yes | new |
| `armrest_adjustable` | Adjustable armrests | — | bool | optional | yes | yes | new |
| `seat_depth_cm` | Seat depth | cm | number | optional | no | yes | new |

Notes: `width_cm` is deliberately **not** inherited here. On the
root dictionary it means the overall width of a desk; on a chair
the decision-relevant dimension is seat depth, and reusing the same
key with a different meaning would corrupt cross-product
comparisons. No certification trio: chairs in scope are unpowered
furniture, and no honest safety-listing regime applies to them.

### 2.5 A4 — Desk Lighting

| Field | Value |
|---|---|
| proposed slug | `desk-lighting` |
| name | Desk Lighting |
| proposed sort_order (under root) | 4 |

**Proposed public intro copy:**

> "Desk lamps and workspace light bars compared on light output and
> control: how much light they actually produce, whether brightness
> can be dimmed to the task, and whether the colour of the light can
> be shifted between warm and cool."

**Product types covered:** articulated desk lamps; clamp and
weighted-base desk lamps; monitor light bars; under-shelf workspace
lights that plug in (no hardwired fixtures).

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `warranty_years` | Warranty | years | number | required | no | yes | inherited |
| `brightness_lumens` | Brightness | lm | number | required | yes | yes | new |
| `dimmable` | Dimmable | — | bool | required | yes | yes | new |
| `adjustable_color_temperature` | Adjustable colour temperature | — | bool | optional | yes | yes | new |
| `safety_certification_body` | Certification body / mark | — | text | optional | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | optional | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |

Notes: `height_adjustable`, `max_load_kg`, and `width_cm` are **not**
inherited — none of them describes a lamp in the sense the root
dictionary gives them. Brightness is recorded in lumens as published
by the manufacturer; a lamp whose maker publishes no lumen figure
is not entered (see exclusions, §2.10). The certification trio is
OPTIONAL (R3 applied to Sector A): lamps are mains-powered and
ETL/UL listings are common and checkable, so when a maker publishes
one it is recorded with evidence; absence is left absent.

### 2.6 A5 — Monitor Arms

| Field | Value |
|---|---|
| proposed slug | `monitor-arms` |
| name | Monitor Arms |
| proposed sort_order (under root) | 5 |

**Proposed public intro copy:**

> "Single and dual monitor arms that lift a screen to a working
> height. Compared on the compatibility questions first — screen
> size, mounting standard, and rated load — because an arm that
> cannot hold your monitor safely is not a bargain at any price."

**Product types covered:** single and dual monitor arms (desk-clamp
and grommet); fixed monitor risers/shelves. Laptop stands are A6;
portable folding stands for phones and tablets belong to Sector B
(§3.6) — the boundary rule is in §4.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `height_adjustable` | Height adjustable | — | bool | required | yes | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | required | yes | yes | inherited |
| `warranty_years` | Warranty | years | number | required | no | yes | inherited |
| `screen_size_max_in` | Maximum screen size | in | number | required | yes | yes | new |
| `vesa_compatible` | VESA mount compatible | — | bool | required | yes | yes | new |
| `tilt_adjustable` | Tilt adjustable | — | bool | optional | yes | yes | new |

Notes: this table is Revision 1's A4 table, unchanged — the split
did not alter what a monitor arm is. `width_cm` is not inherited:
arm footprint varies too much in shape for a single width figure to
compare honestly.

### 2.7 A6 — Laptop Stands (R1)

| Field | Value |
|---|---|
| proposed slug | `laptop-stands` |
| name | Laptop Stands |
| proposed sort_order (under root) | 6 |

**Proposed public intro copy:**

> "Laptop stands and risers that lift a laptop screen to a working
> height, compared on the two figures that decide fit — the largest
> laptop the maker says the stand holds, and the load it is rated
> to carry — plus whether the height or the angle adjusts, and
> whether it folds away for travel."

**Product types covered:** laptop stands and risers sold for desk
ergonomics (fixed, height-adjustable, and folding/travel models
used at a desk). Monitor arms are A5; phone/tablet stands are
Sector B (§3.6).

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `max_laptop_size_in` | Maximum laptop size | in | number | required | yes | yes | new (R1) |
| `height_adjustable` | Height adjustable | — | bool | required | yes | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | required | yes | yes | inherited |
| `tilt_adjustable` | Tilt adjustable | — | bool | optional | yes | yes | new |
| `foldable` | Foldable | — | bool | optional | yes | no | new (R1) |
| `warranty_years` | Warranty | years | number | optional | no | yes | inherited |

**R1 reasoning (required/optional):** `max_laptop_size_in` and
`max_load_kg` are required because they are the product's
definition — a stand's fit and rating — and are published by
effectively every stand manufacturer ("fits laptops up to 17″",
a stated weight capacity); a stand whose maker publishes neither
is not entered. `height_adjustable` is required-as-recorded (a
fixed riser records `false`). `tilt_adjustable` and `foldable` are
optional: both are real, comparable properties, but manufacturers
state them inconsistently, and requiring them would invite
inference from photographs. `warranty_years` drops to optional
(Revision 1 required it in the combined table): laptop stands are
accessory-class products whose makers publish warranties
inconsistently, unlike desk and chair mechanisms.

**Removed with prejudice:** `screen_size_max_in` (a monitor's
diagonal is not a laptop's size class; the semantics differ and
mixing them corrupts the comparison) and `vesa_compatible` (VESA
is a monitor mounting standard; a laptop stand has no VESA
interface — Revision 1's "record it as `false`" rule produced a
column of meaningless false values).

### 2.8 A7 — Desk Organization & Storage

| Field | Value |
|---|---|
| proposed slug | `desk-organization-storage` |
| name | Desk Organization & Storage |
| proposed sort_order (under root) | 7 |

**Proposed public intro copy:**

> "Drawer units, desk shelves, trays, and organisers that give a
> workspace a place for everything on it. Compared on size and on
> how much storage they actually add — counted in drawers and
> compartments, not in marketing photographs."

**Product types covered:** under-desk drawer units; desktop shelves
and risers with storage; desk trays and organiser inserts; small
freestanding storage boxes designed for desk/workspace use.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `width_cm` | Width | cm | number | required | yes | no | inherited |
| `warranty_years` | Warranty | years | number | optional | no | yes | inherited |
| `max_load_kg` | Maximum load | kg | number | optional | yes | yes | inherited |
| `storage_compartments` | Storage compartments / drawers | — | number | required | yes | yes | new |
| `depth_cm` | Depth | cm | number | optional | yes | no | new (key first proposed in A1) |
| `stackable` | Stackable | — | bool | optional | yes | no | new |

Notes: `max_load_kg` is optional here because it is published for
shelves and drawer units but often not for small trays; where the
manufacturer publishes it, it is recorded. `height_adjustable` is
not inherited.

### 2.9 A8 — Ergonomic Supports & Footrests

| Field | Value |
|---|---|
| proposed slug | `ergonomic-supports` |
| name | Ergonomic Supports & Footrests |
| proposed sort_order (under root) | 8 |

**Proposed public intro copy:**

> "Footrests, lumbar cushions, seat cushions, and anti-fatigue mats
> for standing desks — the small pieces that decide whether a good
> desk and chair stay comfortable at hour six. Listed with plain,
> checkable specifications and no medical claims of any kind."

**Product types covered:** under-desk footrests (fixed and rocking);
lumbar support cushions; seat cushions; anti-fatigue standing mats.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `warranty_years` | Warranty | years | number | optional | no | yes | inherited |
| `height_adjustable` | Height adjustable | — | bool | optional | yes | yes | inherited |
| `adjustable_angle` | Adjustable angle | — | bool | optional | yes | yes | new |
| `thickness_cm` | Thickness | cm | number | optional | no | no | new |

Notes: this remains intentionally the lightest dictionary in the
sector — **zero mandatory technical attributes, retained with the
owner's approval (R5)**. These are low-specification products;
inventing a long spec sheet for a cushion would break the project's
no-fabricated-data rule. What keeps every page here useful and
every comparison honest is not a technical attribute but the
**basic completeness floor (rule VR-5, §9)**, which applies to this
category exactly as to every other: verified identity, an original
summary of stated substance, at least the manufacturer-published
values among the attributes above recorded (never padded), a lawful
destination offer, and a recorded evidence source. No attribute in
this subcategory encodes a health outcome.

### 2.10 Sector A — filters, sorting, exclusions

**Filters (only attributes with `is_filterable = yes` may become
filters):** brand filter (DAL-supported); subcategory chips on the
root page; per subcategory, the filterable attributes from its
table — including, new in Revision 2, the certification facets on
Standing Desks and Desk Lighting (`safety_certification_body`,
`safety_certification_status` as exact-match text filters) and the
Laptop Stands set (`max_laptop_size_in`, `height_adjustable`,
`max_load_kg`, `tilt_adjustable`, `foldable`). **No price filter**
exists while no prices are displayed. Boolean filters render as a
single "yes" toggle; number filters as minimum-value or band
inputs; text filters work only against the §8 vocabularies. The
exact facet UI is Stage 07 work; this proposal fixes eligibility.

**Sorting:** supported by the current public catalog DAL today
(`sort?: 'name' | 'newest'`): **Name (A–Z)** (default) and
**Newest**. Spec, price, and popularity sorts are not promised
(price sorting is impossible while no prices are displayed;
popularity has no lawful data source and must never be faked).

**Explicit exclusions (must NOT be ingested in this stage):**

1. **Furniture beyond the desk-and-chair scope:** sofas, beds,
   wardrobes, bookcases sold as general furniture, office suites,
   cubicles and partition systems.
2. **Built-to-order and custom-dimension desks** with no stable
   published model specification.
3. **Products making medical or therapeutic claims** (posture
   "correction", pain treatment, circulation therapy).
4. **Hardwired lighting** and any product requiring professional
   electrical installation.
5. **Counterfeit-prone designer imitations** whose load and warranty
   figures cannot be traced to an accountable manufacturer.
6. **Any product whose core specifications appear only in
   marketplace listing copy** with no manufacturer documentation
   behind them (notably: lamps with no published lumen figure,
   chairs with no published load rating, stands with no published
   size/load figures).
7. **Children's furniture and school furniture.**

---

## 3. Sector B — Electronics Accessories

### 3.1 Root category (already seeded — no change proposed to the row)

| Field | Value |
|---|---|
| slug | `electronics-accessories` |
| name | Electronics Accessories |
| seeded description | "Hubs, chargers, cables and adapters." |
| parent | none (root) |
| status | Already in `fixtures/catalog-seeds.sql`; applied in production |

Replacing the seeded description is decision D-06 — the
owner-approved FINAL wording is in §7 (D-06); nothing
is applied in this stage.

Comparison areas served (from `app/routes/compare.tsx`):
Compatibility with your devices · Power delivery & charging speed ·
Ports & standards supported · Cable & connector quality · Safety
certifications. The seeded dictionary serves the power areas
directly; Revision 2 completes "Safety certifications" honestly —
as structured, evidence-backed data (R3) instead of a bare boolean.

Seeded root dictionary for this sector (the inheritance pool):

| key | label | unit | type | filterable | comparison | sort_weight |
|---|---|---|---|---|---|---|
| `usb_c_ports` | USB-C ports | — | number | yes | yes | 30 |
| `power_delivery_w` | Power delivery | W | number | yes | yes | 20 |
| `cable_length_m` | Cable length | m | number | yes | no | 0 |
| `safety_certified` | Safety certified | — | bool | yes | yes | 10 |

`power_delivery_w` convention for the whole sector: the figure is
the manufacturer's published USB Power Delivery rating for a single
port, unless the attribute is `total_output_w` (§3.4), which is
explicitly the shared total. The two figures are never mixed in one
field.

**R3 note on the seeded pool:** `safety_certified` remains in the
root dictionary (the seeded row is untouched by this proposal) but
is **inherited by no subcategory in Revision 2**. On subcategories
it is replaced by the certification trio (§1 rule 7, §9 VR-3). The
root itself carries no products, so the seeded boolean is dormant,
not deleted.

### 3.2 B1 — USB-C Hubs (R2)

| Field | Value |
|---|---|
| proposed slug | `usb-c-hubs` |
| name | USB-C Hubs |
| proposed sort_order (under root) | 1 |

**Proposed public intro copy:**

> "USB-C multiport and travel hubs that turn one port into a
> working desk: extra USB ports, a display output, card readers,
> and pass-through charging. Compared port by port and watt by
> watt, with the pass-through charging figure always stated
> separately from what the hub itself consumes."

**Product types covered:** USB-C multiport hubs; travel hubs.
Docking stations are B2 — the boundary rule (manufacturer's own
product positioning) is in §4.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `usb_c_ports` | USB-C ports | — | number | required | yes | yes | inherited |
| `power_delivery_w` | Power delivery | W | number | required | yes | yes | inherited |
| `usb_a_ports` | USB-A ports | — | number | required | yes | yes | new |
| `hdmi_ports` | HDMI ports | — | number | required | yes | yes | new |
| `safety_certification_body` | Certification body / mark | — | text | required | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | required | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |
| `max_video_resolution` | Maximum video output | — | text | optional | no | yes | new |
| `usb_data_speed_gbps` | USB data transfer rate | Gbps | number | optional | yes | yes | new (R2) |
| `ethernet_port` | Ethernet port | — | bool | optional | yes | no | new (R2) |
| `ethernet_speed_mbps` | Ethernet speed | Mbps | number | optional | no | yes | new (R2) |
| `card_reader_sd` | SD card reader | — | bool | optional | yes | no | new (R2) |
| `card_reader_microsd` | microSD card reader | — | bool | optional | yes | no | new (R2) |
| `displayport_outputs` | DisplayPort outputs | — | number | optional | yes | yes | new (R2) |
| `max_external_displays` | Maximum external displays | — | number | optional | yes | yes | new (R2) |

Notes: port counts mean ports available to the user on the hub,
excluding the host connection — the counting rule must be stated
in the entry runbook so every hub is counted the same way.
`max_video_resolution` is text (a refresh-qualified figure as
published) because a bare number cannot express it honestly.
The R2 additions are OPTIONAL here: hub makers publish them
inconsistently, and requiring rarely-published specs would force
inference. The certification body/status pair is REQUIRED (as a
recorded check, §9 VR-3): `none` / `not_certified` are honest,
publishable values; an unexamined product is not.

### 3.3 B2 — Docking Stations (R2)

| Field | Value |
|---|---|
| proposed slug | `docking-stations` |
| name | Docking Stations |
| proposed sort_order (under root) | 2 |

**Proposed public intro copy:**

> "Docking stations that give a laptop a permanent desk — power,
> displays, Ethernet, and card readers over one cable — compared
> on the full published port list, the charging figures, and how
> many external displays the maker rates the dock to drive."

**Product types covered:** USB-C / Thunderbolt docking stations
for laptops, including compact docks, where the manufacturer
publishes complete port and power specifications.

**Attributes:** structurally identical to B1 (same 15 definitions,
same keys and flags). The difference is editorial required-status:

| key | B1 Hubs | B2 Docking Stations |
|---|---|---|
| `ethernet_port` | optional | **required** — recorded from the manufacturer's published port list: a complete published port list that includes Ethernet records `true`; one that omits it records `false`. Both are evidence, not inference. |
| all other attributes | as in §3.2 | as in §3.2 |

Notes: docks are specified by full port lists as a matter of
industry practice, which is why Ethernet presence can be required
here but not for hubs. `max_external_displays` stays OPTIONAL even
for docks: makers qualify display counts by host OS and chipset
often enough that requiring one bare number would misstate
products whose makers publish it only conditionally.
`ethernet_speed_mbps` is recorded only when `ethernet_port` is
`true` and the maker publishes the speed (1000 is typical; never
assumed).

### 3.4 B3 — Chargers & Power Adapters

| Field | Value |
|---|---|
| proposed slug | `chargers-power-adapters` |
| name | Chargers & Power Adapters |
| proposed sort_order (under root) | 3 |

**Proposed public intro copy:**

> "Wall chargers, multiport chargers, car chargers, and wireless
> charging pads compared on delivered power — per port and in
> total — and on the safety certification behind the rating. A
> wattage figure with no certification and no manufacturer behind
> it does not get listed here."

**Product types covered:** single- and multi-port USB wall
chargers; GaN chargers; USB car chargers; wireless charging pads
and stands (wireless output recorded separately, below).

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `usb_c_ports` | USB-C ports | — | number | required | yes | yes | inherited |
| `power_delivery_w` | Power delivery | W | number | required | yes | yes | inherited |
| `total_output_w` | Total output | W | number | required | yes | yes | new |
| `safety_certification_body` | Certification body / mark | — | text | required | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | required | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |
| `usb_a_ports` | USB-A ports | — | number | optional | yes | yes | new (key first proposed in B1) |
| `uses_gan` | GaN technology | — | bool | optional | yes | no | new |
| `wireless_output_w` | Wireless charging output | W | number | optional | yes | yes | new |

Notes: `total_output_w` is required because on a multiport charger
it, not the headline per-port figure, decides what two devices
plugged in at once actually receive; on a single-port charger it
equals the per-port figure. `cable_length_m` is not inherited —
most chargers in scope have no captive cable, and for the few with
a fixed cable the length belongs in the editorial summary.
Revision 1's inherited `safety_certified` boolean is replaced by
the certification trio (R3).

### 3.5 B4 — Cables & Adapters

| Field | Value |
|---|---|
| proposed slug | `cables-adapters` |
| name | Cables & Adapters |
| proposed sort_order (under root) | 4 |

**Proposed public intro copy:**

> "Charging and data cables, plus the small adapters that join
> standards together, compared on length, rated charging power, and
> rated data speed — the three figures that decide whether a cable
> is the weak link in an otherwise good setup."

**Product types covered:** USB-C to USB-C cables; USB-C to
Lightning cables (while the standard remains in the US installed
base); USB-A to USB-C cables; HDMI cables; single-purpose adapters
(USB-C to HDMI, USB-C to USB-A, USB-C to Ethernet) sold as one item.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `cable_length_m` | Cable length | m | number | required | yes | no | inherited |
| `power_delivery_w` | Power delivery | W | number | required* | yes | yes | inherited |
| `connector_type` | Connector type | — | text | required | yes | yes | new |
| `data_transfer_gbps` | Data transfer rate | Gbps | number | required* | yes | yes | new |
| `braided` | Braided jacket | — | bool | optional | yes | no | new |
| `safety_certification_body` | Certification body / mark | — | text | optional | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | optional | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |

\* For a cable, both ratings are required where the manufacturer
publishes them; a charging-only cable with no published data
rating is recorded with `data_transfer_gbps` at its published
USB 2.0 rate only if the manufacturer states it — otherwise the
product is not entered (see exclusions). For an adapter, the
rating that does not apply to its function is recorded as
0/not-applicable per the runbook rule, never guessed.
`connector_type` is a text filter and therefore uses the §8
controlled vocabulary — free-typed variants would fragment the
filter. `usb_c_ports` is not inherited: a cable has connectors,
not ports. The certification trio is OPTIONAL for cables (a
passive cable is rarely a listed product), with one hard editorial
rule (VR-3e): if certification is asserted anywhere in a product's
copy, the trio must be completed for that product. "Cable &
connector quality" is served by `braided` plus the two ratings.

### 3.6 B5 — Device Stands & Holders

| Field | Value |
|---|---|
| proposed slug | `device-stands-holders` |
| name | Device Stands & Holders |
| proposed sort_order (under root) | 5 |

**Proposed public intro copy:**

> "Folding stands and holders for phones and tablets — including
> charging stands that hold a device while it powers. Compared on
> what they fit, whether the viewing angle adjusts, and, for
> charging models, the same power and certification figures used
> everywhere else in this section."

**Product types covered:** phone stands; tablet stands; folding
travel stands; powered charging stands/docks for phones. Fixed
monitor arms and laptop risers sold for desk posture belong to
Sector A (§§2.6–2.7) — the boundary rule is in §4.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `device_type` | Device type | — | text | required | yes | no | new |
| `adjustable_angle` | Adjustable angle | — | bool | required | yes | yes | new (key first proposed in A8) |
| `foldable` | Foldable | — | bool | optional | yes | no | new |
| `usb_c_ports` | USB-C ports | — | number | optional | yes | yes | inherited |
| `power_delivery_w` | Power delivery | W | number | optional | yes | yes | inherited |
| `safety_certification_body` | Certification body / mark | — | text | optional | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | optional | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |

Notes: the power attributes and the certification trio are
optional because they apply only to charging stands; on a passive
stand they are left absent, not zero-filled. `device_type` is a
text filter and uses the §8 controlled vocabulary.

### 3.7 B6 — Power Strips & Surge Protectors (R4)

| Field | Value |
|---|---|
| proposed slug | `power-strips-surge-protectors` |
| name | Power Strips & Surge Protectors |
| proposed sort_order (under root) | 6 |

**Proposed public intro copy:**

> "Power strips and surge protectors, kept honest about which is
> which: a strip moves outlets, a protector also absorbs surges,
> and only a protector carries a joule rating here. Compared on
> outlet count, cord length, and — for protectors — the protection
> rating in joules, alongside the listing or certification that
> backs the product's safety claims. This is the category where an
> unverifiable safety claim matters most, so it is the category
> where this catalog is strictest."

**Product types covered:** surge-protecting power strips; plain
power strips from manufacturers publishing full specifications;
desktop power strips with USB charging ports; travel power strips.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `safety_certification_body` | Certification body / mark | — | text | required | yes | yes | new (R3) |
| `safety_certification_status` | Certification verification status | — | text | required | yes | yes | new (R3) |
| `safety_certification_id` | Certification identifier | — | text | optional | no | no | new (R3) |
| `cable_length_m` | Cable length | m | number | required | yes | no | inherited |
| `ac_outlets` | AC outlets | — | number | required | yes | yes | new |
| `surge_protection` | Surge protection | — | bool | required | yes | yes | new (R4) |
| `surge_rating_joules` | Surge protection rating | J | number | conditional | yes | yes | new (R4) |
| `usb_c_ports` | USB-C ports | — | number | optional | yes | yes | inherited |
| `power_delivery_w` | Power delivery | W | number | optional | yes | yes | inherited |

**R4 rules (canonical form in §9, VR-4):**

- `surge_protection` is recorded for EVERY product in this
  category: `true` = the manufacturer sells the product as a surge
  protector; `false` = a plain power strip.
- `surge_protection = true` ⇒ `surge_rating_joules` MUST be
  recorded and MUST be > 0.
- `surge_protection = false` ⇒ `surge_rating_joules` MUST be
  absent. Revision 1's "plain strip records 0" convention is
  withdrawn: a 0 in a rating column reads as a rating.
- Display and comparison: a joule figure renders only for
  protectors; for a plain strip the comparison shows "Surge
  protection: No" and no number, and no copy anywhere may describe
  a plain strip as protecting against surges.

### 3.8 B7 — Cases, Sleeves & Protection

| Field | Value |
|---|---|
| proposed slug | `cases-sleeves-protection` |
| name | Cases, Sleeves & Protection |
| proposed sort_order (under root) | 7 |

**Proposed public intro copy:**

> "Laptop sleeves, tablet cases, and phone cases chosen for fit
> first: what size of device each one actually takes, stated the
> way the manufacturer states it. Protection claims are listed
> only where the maker publishes a rating behind them."

**Product types covered:** laptop sleeves and cases; tablet cases
and folios; phone cases. Cable organiser pouches sold as device
protection/transport are included; desk cable management belongs
to Sector A (§2.8) — see §4.

**Attributes:**

| key | label | unit | type | required | filterable | comparison | origin |
|---|---|---|---|---|---|---|---|
| `device_type` | Device type | — | text | required | yes | no | new (key first proposed in B5) |
| `max_device_size_in` | Maximum device size | in | number | required | yes | yes | new |
| `drop_protection_rated` | Rated drop protection | — | bool | optional | yes | yes | new |
| `material` | Material | — | text | optional | no | no | new |

Notes: **none** of the four seeded root definitions is inherited
here — a sleeve has no ports, no power delivery, and no cable,
and no seeded key describes case safety in any sense the seed
defines. This is the correct outcome, not a gap: the root
dictionary is an electronics-power dictionary, and this
subcategory exists for fit and protection. `device_type` uses
the §8 vocabulary. `drop_protection_rated` is `true` only where
the manufacturer publishes a drop-test rating; an unrated case
records `false`, and the editorial summary may not upgrade that
into a protection claim. The owner has approved keeping this
category in the launch tree although it may remain thin and
non-indexable (D-04).

### 3.9 Sector B — filters, sorting, exclusions

**Filters (only `is_filterable = yes` attributes):** brand filter;
subcategory chips on the root page; per subcategory, the
filterable attributes from its table — including the Revision 2
certification facets (`safety_certification_body`,
`safety_certification_status` as exact-match text filters) and the
R2 facets (Ethernet, card readers, display outputs, USB data
speed). **No price filter** (no prices displayed in this stage).
Text filters (`connector_type`, `device_type`, certification
fields) work only with the controlled vocabularies in §8; without
them, those attributes ship as comparison/spec data with the
filter switched off, rather than as fragmented free-text facets.

**Sorting:** supported by the current public catalog DAL today:
**Name (A–Z)** (default) and **Newest**. Highest power delivery,
longest cable, and highest surge rating are the commercially
natural spec sorts for this sector, but none exists in the
current DAL — each would need a new whitelisted sort option in a
later stage. Price sorting is blocked by the no-price model.

**Explicit exclusions (must NOT be ingested in this stage):**

1. **The devices themselves:** phones, tablets, laptops,
   computers, monitors, TVs, and game consoles (PRD §3.2 scopes
   this sector to accessories; PRD §3.3 places laptops and
   monitors in future verticals).
2. **Portable power banks** — excluded (D-03, owner-confirmed):
   safety-critical lithium products whose capacity and
   certification claims are among the least verifiable and most
   counterfeited in the accessories market.
3. **Headphones, earbuds, and speakers** — powered devices, not
   accessories in this catalog's tier.
4. **Internal computer components** (SSDs, memory, graphics
   cards) and **gaming accessories** — future scope per PRD §3.3.
5. **No-name chargers, cables, and power strips whose wattage,
   data-rate, or safety figures appear only in marketplace copy**
   with no accountable manufacturer specification or certification
   behind them.
6. **Counterfeit-prone branded accessories** where authenticity
   and certification cannot be established from a legitimate
   source.
7. **Software, digital codes, gift cards, and extended
   warranties** — not physical catalog products.
8. **Any accessory whose compatibility can only be expressed as
   an invented device list.** Compatibility is recorded through
   the standard/connector/power attributes above, or through a
   manufacturer-published compatibility statement quoted as a
   specification source — never assembled by the editor.

---

## 4. Cross-sector and intra-sector boundary rules

Every product is filed in exactly one subcategory. These rules
decide the contested families:

1. **Stands.** A stand whose primary job is *posture at a desk*
   (monitor arms, monitor risers, laptop stands/risers) is Sector
   A, §§2.6–2.7. A stand whose primary job is *holding a phone or
   tablet*, especially a folding, portable, or charging stand, is
   Sector B, §3.6. (D-02, approved.)
2. **Cable management vs. cables.** Trays, clips, sleeves, and
   organisers that manage cables *as part of the desk* are Sector
   A, §2.8. The cables and adapters themselves are Sector B, §3.5.
   A travel cable pouch sold to protect devices in transit is
   Sector B, §3.8.
3. **Charging at the desk.** A power strip with USB ports is
   Sector B, §3.7, even though it lives on a desk — its decisive
   specifications are electrical, and it must be compared against
   other power products, not against furniture.
4. **Hubs vs. docking stations (new in Revision 2).** Follow the
   manufacturer's own product positioning: a product the maker
   names and specifies as a *docking station* (a permanent desk
   fixture with a full published port list) is B2; a product the
   maker positions as a portable/multiport *hub* is B1. Where a
   maker's positioning is genuinely ambiguous, file under B1
   (Hubs) — the less committal category — and say so in the
   editorial summary.
5. **Desks vs. standing desks.** Any desk whose working height
   adjusts (electric or crank) is A2, whatever its marketing name;
   A1 is for fixed-height desks only.

---

## 5. Mapping onto the existing seeds — what ingestion would insert

### 5.1 What already exists (no ingestion action)

- 2 root categories: `home-office`, `electronics-accessories`
  (`fixtures/catalog-seeds.sql`, applied in production).
- 8 root-level `attribute_definitions`: 4 on `home-office`
  (`height_adjustable`, `max_load_kg`, `warranty_years`, `width_cm`)
  and 4 on `electronics-accessories` (`usb_c_ports`,
  `power_delivery_w`, `cable_length_m`, `safety_certified`).
- This proposal changes **no** existing row. The two optional
  expanded root descriptions would be `UPDATE`s to the seeded
  `description` values, using the D-06 final wording (§7); they
  are not part of the insert list below.

### 5.2 What an ingestion step would INSERT after owner approval

Described as a list, deliberately **not** as an executable SQL
file. Per D-09 (approved), ingestion extends
`fixtures/catalog-seeds.sql` in the same idempotent style
(`INSERT OR IGNORE` on natural keys) so the tree is reproducible
from the repo.

**A. Category rows — 15 inserts**, each with `parent_id` set to
its root's id, `description` set to the proposed intro copy in
§§2–3, and `is_indexable = 0` at insert time (D-11):

| # | slug | parent slug | sort_order |
|---|---|---|---|
| 1 | `desks` | `home-office` | 1 |
| 2 | `standing-desks` | `home-office` | 2 |
| 3 | `office-chairs` | `home-office` | 3 |
| 4 | `desk-lighting` | `home-office` | 4 |
| 5 | `monitor-arms` | `home-office` | 5 |
| 6 | `laptop-stands` | `home-office` | 6 |
| 7 | `desk-organization-storage` | `home-office` | 7 |
| 8 | `ergonomic-supports` | `home-office` | 8 |
| 9 | `usb-c-hubs` | `electronics-accessories` | 1 |
| 10 | `docking-stations` | `electronics-accessories` | 2 |
| 11 | `chargers-power-adapters` | `electronics-accessories` | 3 |
| 12 | `cables-adapters` | `electronics-accessories` | 4 |
| 13 | `device-stands-holders` | `electronics-accessories` | 5 |
| 14 | `power-strips-surge-protectors` | `electronics-accessories` | 6 |
| 15 | `cases-sleeves-protection` | `electronics-accessories` | 7 |

**B. Attribute-definition rows — 118 inserts**, one row per
(subcategory × attribute) pair listed in the tables in §§2–3,
because definitions are per-category in the schema (§1 rule 2):

- **36 of the 118 rows copy a seeded root definition**
  ("inherited"): Sector A — A1: 4, A2: 4, A3: 3, A4: 1, A5: 3,
  A6: 3, A7: 3, A8: 2 = **23 rows**. Sector B — B1: 2, B2: 2,
  B3: 2, B4: 2, B5: 2, B6: 3, B7: 0 = **13 rows**. Each copy keeps
  the seeded key, label, unit, value type, `is_filterable`,
  `is_comparison_criterion`, and `sort_weight`.
- **82 of the 118 rows are new definitions**, using **44 distinct
  new keys** (keys are deliberately reused across subcategories —
  e.g. the certification trio appears on 8 subcategories;
  `depth_cm` in A1/A2/A7; `usb_a_ports` in B1/B2/B3;
  `device_type` in B5/B7; `adjustable_angle` in A8/B5;
  `tilt_adjustable` in A5/A6; `foldable` in A6/B5):
  Sector A new keys (18): `depth_cm`, `max_desk_height_cm`,
  `motorized`, `adjustable_lumbar_support`, `armrest_adjustable`,
  `seat_depth_cm`, `brightness_lumens`, `dimmable`,
  `adjustable_color_temperature`, `screen_size_max_in`,
  `vesa_compatible`, `tilt_adjustable`, `max_laptop_size_in`,
  `foldable`, `storage_compartments`, `stackable`,
  `adjustable_angle`, `thickness_cm`.
  Sector B new keys (23): `usb_a_ports`, `hdmi_ports`,
  `max_video_resolution`, `usb_data_speed_gbps`, `ethernet_port`,
  `ethernet_speed_mbps`, `card_reader_sd`, `card_reader_microsd`,
  `displayport_outputs`, `max_external_displays`,
  `total_output_w`, `uses_gan`, `wireless_output_w`,
  `connector_type`, `data_transfer_gbps`, `braided`,
  `device_type`, `ac_outlets`, `surge_protection`,
  `surge_rating_joules`, `max_device_size_in`,
  `drop_protection_rated`, `material`.
  Shared certification keys (3, used in both sectors):
  `safety_certification_body`, `safety_certification_status`,
  `safety_certification_id`.
  Each new row takes its label, unit, value type, and flags from
  its table in §§2–3, and its `sort_weight` from §1 rule 5.

**C. Ingestion-step data action on the roots (D-11, approved):**
in the same approved ingestion step, `UPDATE` the two seeded root
categories to `is_indexable = 0`. The roots are empty today and,
under D-11 as the owner extended it, existing empty roots remain
non-indexable until their SEO-STRATEGY §6 gate is met (count +
intro + guide/how-to). The global production `noindex` currently
overrides everything, so this is a correctness regularisation of
the stored flags, not a visibility change. It is specified here
and **not performed in this stage**.

**D. What ingestion would NOT insert:** no products, no brands,
no offers, no root-category rows, no changes to the 8 seeded
definitions, no third-level categories, and no definitions for
the excluded product types in §§2.10 / 3.9.

---

## 6. Coverage note — the ≥40-product target and the ≥5-per-category rule

**The two bars.** Stage 05 acceptance requires ≥ 40 products
across the 2 verticals passing validation (ACCEPTANCE-CRITERIA.md,
Stage 05 row). Independently, a category page is indexable only
with ≥ 5 published products **plus** original intro copy **plus**
≥ 1 guide or a completed "how to choose" block (SEO-STRATEGY.md
§6). This proposal supplies the intro-copy term for every
subcategory; the guide/how-to term is Stage 11 content work and
is *not* supplied here, so **no subcategory becomes indexable on
this proposal or on product counts alone** — every new category
keeps `is_indexable = 0` (D-11) until the full gate is met.

**Revised distribution — 47 products.** The owner-approved split
structure creates eight plausible carrier categories (the three
Revision 1 carriers per sector, with the split pairs each able to
carry their own count). The first batch concentrates on those
eight at exactly 5 each (= 40, meeting the acceptance floor on
carriers alone) and gives every remaining subcategory one verified
product, so no leaf opens empty and the R1/R4/R5 models are
exercised by real entries from the start:

| Sector | Subcategory | Planned products | Count term (≥5) |
|---|---|---|---|
| A | `desks` | 5 | met |
| A | `standing-desks` | 5 | met |
| A | `office-chairs` | 5 | met |
| A | `desk-lighting` | 5 | met |
| A | `monitor-arms` | 1 | not met — non-indexable by rule |
| A | `laptop-stands` | 1 | not met — non-indexable by rule |
| A | `desk-organization-storage` | 1 | not met — non-indexable by rule |
| A | `ergonomic-supports` | 1 | not met — non-indexable by rule |
| B | `usb-c-hubs` | 5 | met |
| B | `docking-stations` | 5 | met |
| B | `chargers-power-adapters` | 5 | met |
| B | `cables-adapters` | 5 | met |
| B | `device-stands-holders` | 1 | not met — non-indexable by rule |
| B | `power-strips-surge-protectors` | 1 | not met — non-indexable by rule |
| B | `cases-sleeves-protection` | 1 | not met — non-indexable by rule |
| **Total** | **15 subcategories** | **47** | **8 of 15 meet the count term** |

Sector split: A = 24, B = 23 (the Revision 1 "~20 per sector"
guideline rises because the splits created two additional
carriers; the ≥40 acceptance is a floor, not a cap). Root counts,
aggregating descendants per D-05: `home-office` 24,
`electronics-accessories` 23 — both clear the count term; both
still fail the guide term, so both roots also remain
non-indexable at launch.

**Risks of the thin subcategories (accepted, and managed by rule,
not by hope):**

1. **Seven subcategories open below the indexation bar.** They
   render for users but stay non-indexable until they reach ≥5
   published products *and* gain guide/how-to content. That is the
   system working as designed (SEO-STRATEGY.md §6), not a stage
   failure — acceptance only requires category pages to meet the
   gates *or* be noindexed by rule.
2. **Editorial dilution.** The standing temptation is to shave
   the carriers to 4 each so every subcategory looks fuller.
   That would leave *no* subcategory indexable on count and is
   explicitly the outcome this distribution avoids.
3. **Spec-thin categories stay spec-thin.** `ergonomic-supports`
   and `cases-sleeves-protection` have the lightest dictionaries
   by design; their comparisons will always be sparser than a
   charger's. The risk to manage is an editor padding them with
   unverifiable attributes to look richer — prohibited by the
   no-fabricated-data rule and by VR-5's "record what is
   published, never pad" clause.
4. **Growth path.** Each thin subcategory needs only 4 more
   verified products to clear the count term, and the tree accepts
   them without any structural change — the taxonomy is not the
   bottleneck; verified editorial throughput is (the roadmap's own
   Stage 05 risk). First growth priority after the initial 47:
   `laptop-stands`, `power-strips-surge-protectors`,
   `monitor-arms` (the R1/R4-refined categories), then the rest.

---

## 7. Owner decisions — status after Stage 05.2

D-01…D-11 were approved by the owner (2026-11-09), several with
the extensions recorded below. D-06's final texts are recorded
below as owner-approved final wording (Revision 3, Stage 05.3);
**nothing is applied** — the wording is documentation only until
the approved ingestion step uses it.

- **D-01 — Tree size and names. RESOLVED (owner, as amended).**
  The structure is approved WITH the three splits the owner
  ordered: Desks ‖ Standing Desks, Monitor Arms ‖ Laptop Stands,
  USB-C Hubs ‖ Docking Stations → **15 subcategories** with the
  slugs and names in §§2–3.
- **D-02 — Stand boundary. APPROVED.** Posture stands → Home
  Office (A5/A6); phone/tablet, folding, and charging stands →
  Electronics Accessories (B5). §4 rule 1. Extended by §4 rule 4
  (hubs vs. docks by manufacturer positioning).
- **D-03 — Power banks. APPROVED — excluded** from Sector B for
  this stage (§3.9 item 2).
- **D-04 — Cases & Sleeves. APPROVED — kept** in the launch tree;
  it may remain thin and non-indexable (§3.8).
- **D-05 — Root roll-up counting. APPROVED — roots aggregate.**
  Root category pages include products filed under their
  subcategories (with the one-level tree this is root + direct
  children — already the public category page's behaviour since
  Stage 05.1). Aligning `categoryIndexability`'s count term to
  the same roll-up is flagged implementation item FI-3 (§9); the
  taxonomy is consistent with the decision either way.
- **D-06 — Root intro copy. OWNER-APPROVED FINAL WORDING
  (Revision 3, Stage 05.3) — documentation only, applied
  nowhere.** The texts below are the final owner wording. The
  ingestion step (a separate, separately approved step) will
  replace the two seeded one-line root descriptions with these
  texts (an UPDATE to seeded rows, outside the §5 insert list);
  nothing in this document applies them.

  **Home Office & Productivity — final description:**

  > "A home office earns its keep when the desk, the chair, and
  > the light stop fighting you. This section covers the furniture
  > and workspace accessories that shape a working day — desks and
  > standing desks, seating, lighting, monitor arms and laptop
  > stands, storage, and the small ergonomic pieces in between —
  > each one recorded from manufacturer specifications, so
  > products can be compared on the same terms."

  **Electronics Accessories — final description:**

  > "The accessories around a laptop or phone decide how well the
  > whole setup works: whether one cable can charge everything,
  > whether a hub or dock has the ports your desk actually needs,
  > and whether a charger's safety claims are supported by
  > verifiable documentation. This section covers hubs, docking
  > stations, chargers, cables and adapters, device stands, power
  > strips and surge protectors, and cases — accessories only,
  > never the devices themselves — with wattage, port, and safety
  > information taken from manufacturer specifications and
  > verifiable evidence."
- **D-07 — Controlled vocabularies. APPROVED.** The closed lists
  for `connector_type` and `device_type` are fixed in §8, with
  the extension rule stated there.
- **D-08 — Metric data for a US audience. APPROVED.** Seeded
  metric units (cm / kg / m) remain the stored data; imperial
  conversion is display-only. Manufacturer-native imperial
  figures (device sizes) are stored as published (§1 rule 4).
- **D-09 — Ingestion mechanism. APPROVED — seeds route.**
  Ingestion extends `fixtures/catalog-seeds.sql` idempotently
  (D-09 as decided in Stage 05.2), so the approved tree and
  dictionary are reproducible code. Ingestion remains a separate,
  separately approved step — this proposal authorises nothing by
  itself.
- **D-10 — Launch distribution. SUPERSEDED by §6** (the
  owner-approved carrier structure for the split tree: 47
  products, 8 carriers at ≥5, 7 subcategories opening at 1).
- **D-11 — `is_indexable` at insert. APPROVED, as extended.**
  New subcategories insert with `is_indexable = 0` and flip
  individually only when the full SEO-STRATEGY.md §6 gate is met
  (count + intro + guide/how-to). The owner extended this to the
  existing roots: the seeded roots (currently `is_indexable = 1`
  with no products) are set to 0 in the ingestion step (§5.2 C)
  and likewise remain non-indexable until their gate is met.

---

## 8. Controlled vocabularies (D-07)

Text spec values are stored verbatim and filters match them
exactly, so these attributes work only against closed lists.
Values are stored exactly as written here.

### 8.1 `connector_type` (B4 — Cables & Adapters)

Each term names the two ends of the cable or adapter, USB-C end
first where present:

| value | means |
|---|---|
| `USB-C to USB-C` | Both ends USB-C (charging/data cables). |
| `USB-C to USB-A` | One USB-C end, one USB-A end (cable or adapter). |
| `USB-C to Lightning` | USB-C end to Lightning end (cable). |
| `USB-C to HDMI` | USB-C source to HDMI display (cable or adapter). |
| `USB-C to DisplayPort` | USB-C source to DisplayPort display (cable or adapter). |
| `USB-C to Ethernet` | USB-C to RJ45 Ethernet adapter. |
| `USB-A to USB-A` | Both ends USB-A. |
| `HDMI to HDMI` | HDMI cable, both ends HDMI. |
| `DisplayPort to DisplayPort` | DisplayPort cable, both ends DisplayPort. |

Nine terms cover every product type in §3.5's scope for the first
40+ products. A cable whose ends match no term is not entered
until the vocabulary is extended (rule in §8.3).

### 8.2 `device_type` (B5 — Device Stands, B7 — Cases & Sleeves)

| value | means |
|---|---|
| `phone` | Fits / holds phones only. |
| `tablet` | Fits / holds tablets only. |
| `laptop` | Fits laptops (sleeves and cases). |
| `phone-or-tablet` | Genuinely spans both (adjustable stands; universal-fit cases where the maker publishes one product for both). |

Four terms, sized for the first batch: B5's stands divide into
phone / tablet / both; B7's cases divide into phone / tablet /
laptop. `phone-or-tablet` exists so a genuinely universal product
is not forced into a lie in either direction.

### 8.3 Extension rule (both vocabularies, and §8.4's)

A term may be added only by the taxonomy owner (the site owner,
or an editor the owner has delegated taxonomy authority to), by
amending this section and the entry runbook **before** any
product uses the term — never ad hoc at entry time. Additions are
append-only: a term already in use is never renamed or deleted,
because stored spec values and saved filters reference the exact
string.

### 8.4 Certification vocabularies (R3 — canonical in code)

The certification vocabularies are implemented, not just
documented: `app/lib/certification.ts` exports
`CERTIFICATION_BODIES` (`UL`, `ETL`, `CSA`, `TUV`, `SGS`, `CE`,
`UKCA`, `FCC`, `none`), `CERTIFICATION_STATUSES`
(`verified_certifier_database`,
`verified_manufacturer_documentation`, `claimed_unverified`,
`not_certified`), and the derivation rule `isSafetyCertified()`.
Semantics are defined in §9 VR-3. The same §8.3 extension rule
applies: bodies/statuses change only by amending the module and
this document together.

---

## 9. Attribute matrix summary + validation rules (canonical)

### 9.1 Matrix summary

The canonical per-attribute tables are §§2–3 (key, label, unit,
type, required/optional, filterable, comparison, origin — one
place, not duplicated). Summary:

| Category | Rows | Inherited | Required keys (VR-2, engine-enforced via `is_required` since Stage 05.3) |
|---|---|---|---|
| A1 `desks` | 5 | 4 | height_adjustable, max_load_kg, warranty_years, width_cm, depth_cm |
| A2 `standing-desks` | 10 | 4 | height_adjustable, max_load_kg, warranty_years, width_cm, depth_cm, max_desk_height_cm, motorized |
| A3 `office-chairs` | 6 | 3 | height_adjustable, max_load_kg, warranty_years, adjustable_lumbar_support |
| A4 `desk-lighting` | 7 | 1 | warranty_years, brightness_lumens, dimmable |
| A5 `monitor-arms` | 6 | 3 | height_adjustable, max_load_kg, warranty_years, screen_size_max_in, vesa_compatible |
| A6 `laptop-stands` | 6 | 3 | max_laptop_size_in, height_adjustable, max_load_kg |
| A7 `desk-organization-storage` | 6 | 3 | width_cm, storage_compartments |
| A8 `ergonomic-supports` | 4 | 2 | — (none; VR-5 floor applies) |
| B1 `usb-c-hubs` | 15 | 2 | usb_c_ports, power_delivery_w, usb_a_ports, hdmi_ports, safety_certification_body, safety_certification_status |
| B2 `docking-stations` | 15 | 2 | B1 set + ethernet_port |
| B3 `chargers-power-adapters` | 9 | 2 | usb_c_ports, power_delivery_w, total_output_w, safety_certification_body, safety_certification_status |
| B4 `cables-adapters` | 8 | 2 | cable_length_m, power_delivery_w*, connector_type, data_transfer_gbps* |
| B5 `device-stands-holders` | 8 | 2 | device_type, adjustable_angle |
| B6 `power-strips-surge-protectors` | 9 | 3 | safety_certification_body, safety_certification_status, cable_length_m, ac_outlets, surge_protection (+ conditional surge_rating_joules, VR-4) |
| B7 `cases-sleeves-protection` | 4 | 0 | device_type, max_device_size_in |
| **Total** | **118** | **36** | |

### 9.2 Validation rules

**VR-1 — Enforced today (no model change needed).** The existing
product validation engine (`app/lib/product-validation.ts`) fails
a product on: name < 3 chars; malformed slug; nonexistent
category; expired product licence; missing editorial summary;
zero spec values. Warnings (never fail): missing brand, restricted
licence, zero media, zero offers. The write path
(`setProductSpecs`) additionally enforces, before any mutation:
the definition belongs to the product's own category, and the
value's JS type matches the definition's `value_type` (text ≤ 500
chars). The publish transition refuses unless
`validation_status = 'passed'`. The Stage 05.2 conformance suite
re-proves all of this against the revised dictionaries
(`tests/taxonomy-conformance.test.ts`, 10/10).

**VR-2 — Required attributes.**
Every key in §9.1's "Required keys" column must carry a value
recorded from a manufacturer source before a product is published.
**Enforcement status: ENFORCED (engine, via `is_required`).**
Since Stage 05.3 (FI-1, migration 0006), each definition carries
an `is_required` flag; the flag is set per definition at ingestion
from the §9.1 matrix. The validation engine fails a product whose
required attribute has no recorded value
(`missing_required_attribute`) or a value invalid for its declared
type (`invalid_required_attribute`) — an empty text value counts
as missing; a recorded `false` for a bool counts as present. The
two former GAP assertions in the conformance suite were flipped
to assert this enforced behaviour in Stage 05.3.

**VR-3 — Certification (R3).**
- VR-3a *Storage.* The trio is three ordinary text spec values on
  the product's category definitions — no new table, no migration.
  Categories carrying it: B1, B2, B3 (body/status required, id
  optional), B6 (same), B4, B5 (all optional; charging products
  only), A2, A4 (all optional; powered products). Categories not
  listed carry no certification attributes at all.
- VR-3b *Evidence.* The editor records `safety_certification_id`
  (the certifier's file/control number) where the manufacturer
  publishes one, and writes the certification spec rows with
  `product_specs.source_id` set to the identifier of the
  verification event's source record, so every certification value
  is traceable to its check. The status records HOW the claim was
  verified (certifier's public directory >
  manufacturer's own documentation > marketing copy); a claim
  found only in marketing/listing copy is capped at
  `claimed_unverified`. Certification is never inferred from
  marketing wording (owner rule).
- VR-3c *Derivation.* "Safety certified" (display tick, the
  comparison row, and the certified facet) is DERIVED, never
  stored: `isSafetyCertified(body, status)` in
  `app/lib/certification.ts` — true iff status ∈
  {`verified_certifier_database`,
  `verified_manufacturer_documentation`} AND body ∈ {`UL`, `ETL`,
  `CSA`, `TUV`, `SGS`}. `claimed_unverified` never counts; CE /
  UKCA / FCC are recorded factually but are not third-party safety
  listings and never satisfy the derivation alone. The legacy
  `safety_certified` boolean is not inherited by any subcategory
  (§3.1); nothing in the gates reads it.
- VR-3d *Enforcement status.* Storage and the derivation are
  implemented and conformance-tested today. Presence of the
  required body/status pair is now enforced via the FI-1
  `is_required` flags (Stage 05.3), and the engine additionally
  enforces certification consistency: body/status values must come
  from the §8.4 vocabularies, a verified status requires a
  third-party listing body, and a listing body contradicts a
  `not_certified` status. The derivation itself
  (`isSafetyCertified`) is unchanged — being uncertified remains
  an honest, publishable record, never an error by itself. The
  full evidence payload (a `source_records` row whose
  `licence_json` carries body/standard/identifier/status/check
  date) awaits the Stage 06 source write path — **FI-4**; until
  then VR-3b's `source_id` convention is the traceability
  mechanism.

**VR-4 — Surge protection (R4).** Rules as stated in §3.7
(capability bool required; rating required-and-positive iff the
capability is true; rating absent iff false; display never
implies protection for a plain strip). **Enforcement status:
ENFORCED (engine conditional checks).** Since Stage 05.3 (FI-2),
the validation snapshot (the Stage 04.4 pattern) carries the
product's spec values and `productIssues()` evaluates the
conditional rule: a protector with no rating fails
(`missing_surge_rating`), a protector with a non-positive or
type-invalid rating fails (`invalid_surge_rating`), and a plain
strip carrying any rating fails (`surge_rating_on_plain_strip`).
The former GAP assertion in the conformance suite was flipped to
assert this enforced behaviour in Stage 05.3.

**VR-5 — Basic completeness floor (R5; applies to EVERY
category).** A product is page-ready only when ALL of these hold:

| # | Floor item | Enforcing mechanism today |
|---|---|---|
| F1 | Identity: name, valid slug, brand recorded, model ref where the maker publishes one | Engine errors (name, slug); brand is engine WARNING → floor requires it editorially; model ref editorial |
| F2 | Filed under exactly one leaf subcategory | Schema FK + DAL write path (enforced) |
| F3 | Original editorial summary of stated substance (≥ 2 sentences of original copy; no copied marketing text) | Engine error when empty; substance + originality editorial (compliance doc) |
| F4 | Specifications: ≥ 1 recorded value — and, where the category defines required attributes, the full VR-2 set — each from a manufacturer source | Engine error at zero; required-set completeness engine-enforced via FI-1 (Stage 05.3) |
| F5 | ≥ 1 lawful destination offer (offer validation passed + URL-policy-valid HTTPS destination), or a deliberate editorial-only decision recorded for the product | Offer engine + URL policy (enforced for lawfulness); presence is engine WARNING → floor requires it editorially |
| F6 | Evidence traceability: the source behind the specs is recorded with the product (`products.source_id` / per-spec `source_id`; certification per VR-3b) | Fields exist (enforced as storage); the recording discipline is editorial |
| F7 | Licence hygiene: product licence not expired; restricted only with a documented reason | Engine error (expired) / warning (restricted) |

For **Ergonomic Supports (A8)** this floor is the whole quality
bar by design: zero mandatory technical attributes, but F1–F7 in
full, plus the standing rule that whichever of A8's optional
attributes the manufacturer DOES publish are recorded (record
what is published — never pad, never invent).

**VR-6 — Indexability interplay.** Nothing in this model changes
any gate. Internal indexability keeps computing exactly as Stage
05.1 left it (lawful-offer product rule; category count + intro +
guide terms). Stored `is_indexable` flags stay 0 for everything
in this tree until the full §6 gate is met (D-11). Root count
roll-up alignment for `categoryIndexability` is **FI-3**.

### 9.3 Flagged implementation items (for the ingestion stage)

- **FI-1 — Required-attribute enforcement. IMPLEMENTED in
  Stage 05.3.** Migration `0006_attribute_required.sql` adds
  `is_required INTEGER NOT NULL DEFAULT 0` to
  `attribute_definitions`; the validation snapshot carries
  per-definition presence (and type validity) for the product's
  category, guarded at commit by the spec fingerprint. Marking
  the §9.1 required keys (`is_required = 1` per definition)
  happens at ingestion, which remains a separate approved step.
- **FI-2 — Conditional spec rules in the engine** (VR-4, plus
  the VR-3 certification-consistency checks). **IMPLEMENTED in
  Stage 05.3.** The snapshot extension carries the product's spec
  values, and `productIssues()` evaluates the surge conditional
  and the certification vocabulary/consistency checks. No
  migration was needed for FI-2 itself (it rides on the FI-1
  snapshot).
- **FI-3 — `categoryIndexability` root roll-up** (D-05):
  code-only reporting alignment (count direct children for root
  categories). Display-only; no gate impact.
- **FI-4 — Certification evidence payloads**: `source_records`
  write path arrives with the Stage 06 import pipeline; VR-3b's
  per-spec `source_id` convention is the interim mechanism.

---

## 10. What this stage did NOT do

Stage 05.2 is a planning/refinement stage. It inserted no
categories, attributes, or products anywhere; edited no seed
file; created or applied no migration; touched no production
data; changed no Cloudflare setting; and left the global
`noindex` exactly as it was. The only code added is
`app/lib/certification.ts` (the pure R3 derivation rule — not
wired into any gate) and `tests/taxonomy-conformance.test.ts`
(local test fixtures only). Evidence and verdicts:
`REPORT-stage05.2-refinement.md`.

*End of proposal (Revision 2). Companion documents:
PRODUCT-REQUIREMENTS.md §3.2, UX-UI-SPECIFICATION.md §3.4,
SEO-STRATEGY.md §6, ACCEPTANCE-CRITERIA.md (Stage 05 row),
DATABASE-DESIGN.md, DATA-SOURCING-AND-COMPLIANCE.md,
fixtures/catalog-seeds.sql, app/lib/certification.ts,
tests/taxonomy-conformance.test.ts, REPORT-stage05.0-planning.md,
REPORT-stage05.1-implementation.md, REPORT-stage05.2-refinement.md.*
