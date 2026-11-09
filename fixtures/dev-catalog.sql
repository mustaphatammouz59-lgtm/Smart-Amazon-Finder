-- dev-catalog.sql — DEVELOPMENT FIXTURES ONLY. NOT commercial data.
-- Every product here is synthetic, named "[DEV FIXTURE] …", and carries
-- source_id='dev-fixture'. The public data-access layer EXCLUDES fixtures
-- unless the Worker variable DEV_FIXTURES='enabled' (never set in the
-- production configuration). Requires catalog-seeds.sql applied first.
-- Prices: the two offers below are deliberately (a) unlicensed and
-- (b) licensed-but-stale, so the price policy hides both — no fixture can
-- ever display a price. Idempotent by slug / natural keys.

INSERT OR IGNORE INTO brands (slug, name) VALUES ('devbrand', 'Devbrand (fixture)');

INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, editorial_summary, status, validation_status, source_id, licence_status)
SELECT c.id, b.id, 'dev-fixture-desk-riser', '[DEV FIXTURE] Adjustable Desk Riser',
  'Fixture record for development only — not a real product. A stand-in desk riser used to exercise catalog queries.',
  'published', 'passed', 'dev-fixture', 'owned'
FROM categories c, brands b WHERE c.slug = 'home-office' AND b.slug = 'devbrand';

INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, editorial_summary, status, validation_status, source_id, licence_status)
SELECT c.id, b.id, 'dev-fixture-desk-lamp', '[DEV FIXTURE] Basic Desk Lamp',
  'Fixture record for development only — not a real product. A stand-in lamp with fewer criteria than the riser.',
  'published', 'passed', 'dev-fixture', 'owned'
FROM categories c, brands b WHERE c.slug = 'home-office' AND b.slug = 'devbrand';

INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, editorial_summary, status, validation_status, source_id, licence_status)
SELECT c.id, b.id, 'dev-fixture-usb-hub', '[DEV FIXTURE] USB-C Travel Hub',
  'Fixture record for development only — not a real product. A stand-in hub used to exercise search and spec filters.',
  'published', 'passed', 'dev-fixture', 'owned'
FROM categories c, brands b WHERE c.slug = 'electronics-accessories' AND b.slug = 'devbrand';

INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, editorial_summary, status, validation_status, source_id, licence_status)
SELECT c.id, b.id, 'dev-fixture-charging-cable', '[DEV FIXTURE] Braided Charging Cable',
  'Fixture record for development only — not a real product. A stand-in cable for filter and sorting tests.',
  'published', 'passed', 'dev-fixture', 'owned'
FROM categories c, brands b WHERE c.slug = 'electronics-accessories' AND b.slug = 'devbrand';

-- Gate-test rows: must NEVER be returned by public queries.
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, status, validation_status, source_id)
SELECT c.id, b.id, 'dev-fixture-draft-product', '[DEV FIXTURE] Draft Product', 'draft', 'passed', 'dev-fixture'
FROM categories c, brands b WHERE c.slug = 'home-office' AND b.slug = 'devbrand';
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, status, validation_status, source_id)
SELECT c.id, b.id, 'dev-fixture-unvalidated-product', '[DEV FIXTURE] Unvalidated Product', 'published', 'failed', 'dev-fixture'
FROM categories c, brands b WHERE c.slug = 'home-office' AND b.slug = 'devbrand';

-- Specs (typed values against the seeded definitions)
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, value_bool)
SELECT p.id, d.id, NULL, 1 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-desk-riser' AND d.key = 'height_adjustable';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 15 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-desk-riser' AND d.key = 'max_load_kg';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 2 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-desk-riser' AND d.key = 'warranty_years';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, value_bool)
SELECT p.id, d.id, NULL, 0 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-desk-lamp' AND d.key = 'height_adjustable';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 3 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-desk-lamp' AND d.key = 'max_load_kg';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 3 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-usb-hub' AND d.key = 'usb_c_ports';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 65 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-usb-hub' AND d.key = 'power_delivery_w';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, value_bool)
SELECT p.id, d.id, NULL, 1 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-usb-hub' AND d.key = 'safety_certified';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 1 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-charging-cable' AND d.key = 'usb_c_ports';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 100 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-charging-cable' AND d.key = 'power_delivery_w';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number)
SELECT p.id, d.id, 2 FROM products p, attribute_definitions d
WHERE p.slug = 'dev-fixture-charging-cable' AND d.key = 'cable_length_m';

-- Offers that must never surface a price (policy test data)
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('devmerchant', 'Dev Merchant (fixture)', 'example.invalid');
INSERT OR IGNORE INTO offers (product_id, merchant_id, destination_url, current_price_cents, price_observed_at, licence_status, validation_status)
SELECT p.id, m.id, 'https://example.invalid/hub', 4999, datetime('now'), 'restricted', 'passed'
FROM products p, merchants m WHERE p.slug = 'dev-fixture-usb-hub' AND m.slug = 'devmerchant';
INSERT OR IGNORE INTO offers (product_id, merchant_id, destination_url, current_price_cents, price_observed_at, licence_status, validation_status)
SELECT p.id, m.id, 'https://example.invalid/cable', 1299, datetime('now', '-2 days'), 'licensed', 'passed'
FROM products p, merchants m WHERE p.slug = 'dev-fixture-charging-cable' AND m.slug = 'devmerchant';

-- Local admin for guard-path verification (development only)
INSERT OR IGNORE INTO admin_users (email, role, access_identity_ref)
VALUES ('owner@example.invalid', 'owner', 'dev-fixture');

-- Gift-finder editorial attributes (occasion / audience matching data)
INSERT OR IGNORE INTO product_attributes (product_id, key, value)
SELECT id, 'occasion', 'birthday' FROM products WHERE slug = 'dev-fixture-usb-hub';
INSERT OR IGNORE INTO product_attributes (product_id, key, value)
SELECT id, 'audience', 'colleague' FROM products WHERE slug = 'dev-fixture-usb-hub';
INSERT OR IGNORE INTO product_attributes (product_id, key, value)
SELECT id, 'occasion', 'new-home' FROM products WHERE slug = 'dev-fixture-desk-lamp';
INSERT OR IGNORE INTO product_attributes (product_id, key, value)
SELECT id, 'audience', 'partner' FROM products WHERE slug = 'dev-fixture-desk-lamp';
