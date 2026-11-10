-- taxonomy-seeds.sql — Stage 05.4 taxonomy initialization (TAXONOMY-stage05-proposal.md
-- Revision 3 = approved Revision 2 + Stage 05.3 enforcement + final D-06 wording;
-- owner authorization: Stage 05.4, LOCAL catalog initialization).
-- Contents: the 15 approved subcategories under the two seeded roots, their 118
-- attribute definitions (36 inherited copies of the root dictionaries + 82 new
-- rows), and the D-06/D-11 root regularisation (final root descriptions,
-- is_indexable = 0 on both roots and every subcategory).
-- Requires: migrations 0001-0006 + fixtures/catalog-seeds.sql applied first.
-- Idempotent by natural key (categories.slug; attribute_definitions
-- (category_id, key)): INSERT OR IGNORE everywhere; the root UPDATEs are
-- value-stable. Re-running yields identical counts and no duplicates.
-- Contains NO products. is_required flags are set EXACTLY per the taxonomy
-- §9.1 matrix (Stage 05.3, FI-1); surge_rating_joules stays flag-optional —
-- its conditional enforcement lives in the validation engine (VR-4).

-- ── Roots: D-06 final descriptions + D-11 is_indexable regularisation ──────
UPDATE categories SET description = 'A home office earns its keep when the desk, the chair, and the light stop fighting you. This section covers the furniture and workspace accessories that shape a working day — desks and standing desks, seating, lighting, monitor arms and laptop stands, storage, and the small ergonomic pieces in between — each one recorded from manufacturer specifications, so products can be compared on the same terms.', is_indexable = 0 WHERE slug = 'home-office';
UPDATE categories SET description = 'The accessories around a laptop or phone decide how well the whole setup works: whether one cable can charge everything, whether a hub or dock has the ports your desk actually needs, and whether a charger''s safety claims are supported by verifiable documentation. This section covers hubs, docking stations, chargers, cables and adapters, device stands, power strips and surge protectors, and cases — accessories only, never the devices themselves — with wattage, port, and safety information taken from manufacturer specifications and verifiable evidence.', is_indexable = 0 WHERE slug = 'electronics-accessories';

-- ── desks (Desks) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'desks', 'Desks', 'Fixed writing and computer desks — the desks that stay at one height — compared on surface size, rated load, and the warranty behind the frame. Desks that rise and lower live in Standing Desks, one shelf over.', 1, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'width_cm'
WHERE sub.slug = 'desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'depth_cm', 'Depth', 'cm', 'number', 1, 0, 0, 1 FROM categories WHERE slug = 'desks';

-- ── standing-desks (Standing Desks) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'standing-desks', 'Standing Desks', 'Electric and hand-crank sit-stand desks, compared on the figures that decide a working day: height range, rated load, surface size, and whether the lift is motorized or manual. Where the maker publishes an electrical listing for the frame, it is recorded with its evidence — never assumed.', 2, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'width_cm'
WHERE sub.slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'depth_cm', 'Depth', 'cm', 'number', 1, 0, 0, 1 FROM categories WHERE slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_desk_height_cm', 'Maximum desk height', 'cm', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'motorized', 'Motorized adjustment', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'standing-desks';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'standing-desks';

-- ── office-chairs (Office Chairs & Ergonomic Seating) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'office-chairs', 'Office Chairs & Ergonomic Seating', 'Task chairs and ergonomic chairs compared on support, not styling: lumbar adjustment, seat dimensions, rated capacity, and the warranty standing behind the mechanism. If a support claim cannot be checked against the manufacturer''s own specification, it does not appear here as a specification.', 3, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'office-chairs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'office-chairs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'office-chairs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'adjustable_lumbar_support', 'Adjustable lumbar support', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'office-chairs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'armrest_adjustable', 'Adjustable armrests', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'office-chairs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'seat_depth_cm', 'Seat depth', 'cm', 'number', 0, 1, 10, 0 FROM categories WHERE slug = 'office-chairs';

-- ── desk-lighting (Desk Lighting) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'desk-lighting', 'Desk Lighting', 'Desk lamps and workspace light bars compared on light output and control: how much light they actually produce, whether brightness can be dimmed to the task, and whether the colour of the light can be shifted between warm and cool.', 4, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'brightness_lumens', 'Brightness', 'lm', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'dimmable', 'Dimmable', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'adjustable_color_temperature', 'Adjustable colour temperature', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'desk-lighting';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'desk-lighting';

-- ── monitor-arms (Monitor Arms) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'monitor-arms', 'Monitor Arms', 'Single and dual monitor arms that lift a screen to a working height. Compared on the compatibility questions first — screen size, mounting standard, and rated load — because an arm that cannot hold your monitor safely is not a bargain at any price.', 5, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'monitor-arms';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'monitor-arms';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'monitor-arms';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'screen_size_max_in', 'Maximum screen size', 'in', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'monitor-arms';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'vesa_compatible', 'VESA mount compatible', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'monitor-arms';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'tilt_adjustable', 'Tilt adjustable', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'monitor-arms';

-- ── laptop-stands (Laptop Stands) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'laptop-stands', 'Laptop Stands', 'Laptop stands and risers that lift a laptop screen to a working height, compared on the two figures that decide fit — the largest laptop the maker says the stand holds, and the load it is rated to carry — plus whether the height or the angle adjusts, and whether it folds away for travel.', 6, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_laptop_size_in', 'Maximum laptop size', 'in', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'laptop-stands';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'laptop-stands';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'laptop-stands';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'tilt_adjustable', 'Tilt adjustable', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'laptop-stands';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'foldable', 'Foldable', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'laptop-stands';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'laptop-stands';

-- ── desk-organization-storage (Desk Organization & Storage) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'desk-organization-storage', 'Desk Organization & Storage', 'Drawer units, desk shelves, trays, and organisers that give a workspace a place for everything on it. Compared on size and on how much storage they actually add — counted in drawers and compartments, not in marketing photographs.', 7, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'width_cm'
WHERE sub.slug = 'desk-organization-storage';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'desk-organization-storage';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'max_load_kg'
WHERE sub.slug = 'desk-organization-storage';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'storage_compartments', 'Storage compartments / drawers', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'desk-organization-storage';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'depth_cm', 'Depth', 'cm', 'number', 1, 0, 0, 0 FROM categories WHERE slug = 'desk-organization-storage';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'stackable', 'Stackable', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'desk-organization-storage';

-- ── ergonomic-supports (Ergonomic Supports & Footrests) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'ergonomic-supports', 'Ergonomic Supports & Footrests', 'Footrests, lumbar cushions, seat cushions, and anti-fatigue mats for standing desks — the small pieces that decide whether a good desk and chair stay comfortable at hour six. Listed with plain, checkable specifications and no medical claims of any kind.', 8, 0 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'warranty_years'
WHERE sub.slug = 'ergonomic-supports';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'home-office'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'height_adjustable'
WHERE sub.slug = 'ergonomic-supports';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'adjustable_angle', 'Adjustable angle', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'ergonomic-supports';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'thickness_cm', 'Thickness', 'cm', 'number', 0, 0, 0, 0 FROM categories WHERE slug = 'ergonomic-supports';

-- ── usb-c-hubs (USB-C Hubs) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'usb-c-hubs', 'USB-C Hubs', 'USB-C multiport and travel hubs that turn one port into a working desk: extra USB ports, a display output, card readers, and pass-through charging. Compared port by port and watt by watt, with the pass-through charging figure always stated separately from what the hub itself consumes.', 1, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'usb_c_ports'
WHERE sub.slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'usb_a_ports', 'USB-A ports', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'hdmi_ports', 'HDMI ports', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_video_resolution', 'Maximum video output', NULL, 'text', 0, 1, 10, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'usb_data_speed_gbps', 'USB data transfer rate', 'Gbps', 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'ethernet_port', 'Ethernet port', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'ethernet_speed_mbps', 'Ethernet speed', 'Mbps', 'number', 0, 1, 10, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'card_reader_sd', 'SD card reader', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'card_reader_microsd', 'microSD card reader', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'displayport_outputs', 'DisplayPort outputs', NULL, 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'usb-c-hubs';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_external_displays', 'Maximum external displays', NULL, 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'usb-c-hubs';

-- ── docking-stations (Docking Stations) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'docking-stations', 'Docking Stations', 'Docking stations that give a laptop a permanent desk — power, displays, Ethernet, and card readers over one cable — compared on the full published port list, the charging figures, and how many external displays the maker rates the dock to drive.', 2, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'usb_c_ports'
WHERE sub.slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'usb_a_ports', 'USB-A ports', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'hdmi_ports', 'HDMI ports', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_video_resolution', 'Maximum video output', NULL, 'text', 0, 1, 10, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'usb_data_speed_gbps', 'USB data transfer rate', 'Gbps', 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'ethernet_port', 'Ethernet port', NULL, 'bool', 1, 0, 0, 1 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'ethernet_speed_mbps', 'Ethernet speed', 'Mbps', 'number', 0, 1, 10, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'card_reader_sd', 'SD card reader', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'card_reader_microsd', 'microSD card reader', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'displayport_outputs', 'DisplayPort outputs', NULL, 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'docking-stations';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_external_displays', 'Maximum external displays', NULL, 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'docking-stations';

-- ── chargers-power-adapters (Chargers & Power Adapters) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'chargers-power-adapters', 'Chargers & Power Adapters', 'Wall chargers, multiport chargers, car chargers, and wireless charging pads compared on delivered power — per port and in total — and on the safety certification behind the rating. A wattage figure with no certification and no manufacturer behind it does not get listed here.', 3, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'usb_c_ports'
WHERE sub.slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'total_output_w', 'Total output', 'W', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'usb_a_ports', 'USB-A ports', NULL, 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'uses_gan', 'GaN technology', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'chargers-power-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'wireless_output_w', 'Wireless charging output', 'W', 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'chargers-power-adapters';

-- ── cables-adapters (Cables & Adapters) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'cables-adapters', 'Cables & Adapters', 'Charging and data cables, plus the small adapters that join standards together, compared on length, rated charging power, and rated data speed — the three figures that decide whether a cable is the weak link in an otherwise good setup.', 4, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'cable_length_m'
WHERE sub.slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'connector_type', 'Connector type', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'data_transfer_gbps', 'Data transfer rate', 'Gbps', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'braided', 'Braided jacket', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'cables-adapters';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'cables-adapters';

-- ── device-stands-holders (Device Stands & Holders) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'device-stands-holders', 'Device Stands & Holders', 'Folding stands and holders for phones and tablets — including charging stands that hold a device while it powers. Compared on what they fit, whether the viewing angle adjusts, and, for charging models, the same power and certification figures used everywhere else in this section.', 5, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'device_type', 'Device type', NULL, 'text', 1, 0, 0, 1 FROM categories WHERE slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'adjustable_angle', 'Adjustable angle', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'foldable', 'Foldable', NULL, 'bool', 1, 0, 0, 0 FROM categories WHERE slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'usb_c_ports'
WHERE sub.slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 0 FROM categories WHERE slug = 'device-stands-holders';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'device-stands-holders';

-- ── power-strips-surge-protectors (Power Strips & Surge Protectors) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'power-strips-surge-protectors', 'Power Strips & Surge Protectors', 'Power strips and surge protectors, kept honest about which is which: a strip moves outlets, a protector also absorbs surges, and only a protector carries a joule rating here. Compared on outlet count, cord length, and — for protectors — the protection rating in joules, alongside the listing or certification that backs the product’s safety claims. This is the category where an unverifiable safety claim matters most, so it is the category where this catalog is strictest.', 6, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_body', 'Certification body / mark', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_status', 'Certification verification status', NULL, 'text', 1, 1, 10, 1 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'safety_certification_id', 'Certification identifier', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 1
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'cable_length_m'
WHERE sub.slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'ac_outlets', 'AC outlets', NULL, 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'surge_protection', 'Surge protection', NULL, 'bool', 1, 1, 10, 1 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'surge_rating_joules', 'Surge protection rating', 'J', 'number', 1, 1, 10, 0 FROM categories WHERE slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'usb_c_ports'
WHERE sub.slug = 'power-strips-surge-protectors';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT sub.id, d.key, d.label, d.unit, d.value_type, d.is_filterable, d.is_comparison_criterion, d.sort_weight, 0
FROM categories sub JOIN categories root ON root.slug = 'electronics-accessories'
JOIN attribute_definitions d ON d.category_id = root.id AND d.key = 'power_delivery_w'
WHERE sub.slug = 'power-strips-surge-protectors';

-- ── cases-sleeves-protection (Cases, Sleeves & Protection) ──
INSERT OR IGNORE INTO categories (parent_id, slug, name, description, sort_order, is_indexable)
SELECT id, 'cases-sleeves-protection', 'Cases, Sleeves & Protection', 'Laptop sleeves, tablet cases, and phone cases chosen for fit first: what size of device each one actually takes, stated the way the manufacturer states it. Protection claims are listed only where the maker publishes a rating behind them.', 7, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'device_type', 'Device type', NULL, 'text', 1, 0, 0, 1 FROM categories WHERE slug = 'cases-sleeves-protection';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'max_device_size_in', 'Maximum device size', 'in', 'number', 1, 1, 10, 1 FROM categories WHERE slug = 'cases-sleeves-protection';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'drop_protection_rated', 'Rated drop protection', NULL, 'bool', 1, 1, 10, 0 FROM categories WHERE slug = 'cases-sleeves-protection';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight, is_required)
SELECT id, 'material', 'Material', NULL, 'text', 0, 0, 0, 0 FROM categories WHERE slug = 'cases-sleeves-protection';
