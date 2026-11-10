-- catalog-products.sql — Stage 05.4 VERIFIED PRODUCT INGESTION (LOCAL ONLY).
-- 47 genuine products researched manufacturer-first on 2026-11-09; every spec
-- value traces to the evidence register (fixtures/product-evidence-register.md)
-- and the normalized source data (fixtures/product-research.json).
-- Products enter as DRAFTS with source_id 'stage05-research'; prices are NULL
-- everywhere (no licensed prices exist — link-out model, Stage 05 brief);
-- offers start validation_status 'pending', licence_status 'restricted'
-- (link-only) and are validated by the real engine in the ingestion QA run.
-- NO affiliate parameters on any destination URL. Idempotent by slug /
-- natural keys (INSERT OR IGNORE). Requires migrations 0001-0006,
-- catalog-seeds.sql and taxonomy-seeds.sql applied first.
-- This file is NEVER applied to production in Stage 05.4.

-- ── Brands ──
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('anker', 'Anker', 'https://www.anker.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('apple', 'Apple', 'https://www.apple.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('belkin', 'Belkin', 'https://www.belkin.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('benq', 'BenQ', 'https://www.benq.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('caldigit', 'CalDigit', 'https://www.caldigit.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('comfilife', 'ComfiLife', 'https://comfilife.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('dell', 'Dell', 'https://www.dell.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('dyson', 'Dyson', 'https://www.dyson.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('ergotron', 'Ergotron', 'https://www.ergotron.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('haworth', 'Haworth', 'https://www.haworth.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('herman-miller', 'Herman Miller', 'https://www.hermanmiller.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('ikea', 'IKEA', 'https://www.ikea.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('kensington', 'Kensington', 'https://www.kensington.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('lamicall', 'Lamicall', 'https://lamicallshop.com/');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('nulaxy', 'Nulaxy', 'https://nulaxy.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('ottlite', 'OttLite', 'https://ottlite.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('plugable', 'Plugable', 'https://plugable.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('steelcase', 'Steelcase', 'https://www.steelcase.com');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('tomtoc', 'tomtoc', 'https://www.tomtoc.com/');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('tripp-lite', 'Tripp Lite', 'https://tripplite.eaton.com/');
INSERT OR IGNORE INTO brands (slug, name, website_url) VALUES ('ugreen', 'UGREEN', 'https://www.ugreen.com');

-- ── Merchants (destination hosts; no affiliate programs) ──
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('anker-com', 'anker.com', 'anker.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('apple-com', 'apple.com', 'apple.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('belkin-com', 'belkin.com', 'belkin.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('benq-com', 'benq.com', 'benq.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('brd-tripplite-com', 'brd.tripplite.com', 'brd.tripplite.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('caldigit-com', 'caldigit.com', 'caldigit.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('comfilife-com', 'comfilife.com', 'comfilife.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('dell-com', 'dell.com', 'dell.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('dyson-co-uk', 'dyson.co.uk', 'dyson.co.uk');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('eu-ugreen-com', 'eu.ugreen.com', 'eu.ugreen.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('eustore-hermanmiller-com', 'eustore.hermanmiller.com', 'eustore.hermanmiller.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ikea-cn', 'ikea.cn', 'ikea.cn');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ikea-com', 'ikea.com', 'ikea.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ikea-com-tr', 'ikea.com.tr', 'ikea.com.tr');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ikea-com-tw', 'ikea.com.tw', 'ikea.com.tw');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('in-shopping-haworth-com', 'in.shopping.haworth.com', 'in.shopping.haworth.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('kensington-com', 'kensington.com', 'kensington.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('lamicallshop-com', 'lamicallshop.com', 'lamicallshop.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('media-ergotron-com', 'media.ergotron.com', 'media.ergotron.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('nulaxy-com', 'nulaxy.com', 'nulaxy.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ottlite-com', 'ottlite.com', 'ottlite.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('plugable-com', 'plugable.com', 'plugable.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('steelcase-com', 'steelcase.com', 'steelcase.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('tomtoc-com', 'tomtoc.com', 'tomtoc.com');
INSERT OR IGNORE INTO merchants (slug, name, base_domain) VALUES ('ugreen-com', 'ugreen.com', 'ugreen.com');

-- ikea-trotten-desk-120x70 (desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-trotten-desk-120x70', 'TROTTEN desk, white, 120x70 cm', 'TROTTEN 596.219.17', 'A compact fixed-height desk with A-shaped steel legs that leave the full underside clear for a chair or storage. IKEA publishes a single assembled height of 75 cm and a 50 kg maximum load for the 120 by 70 cm top. It sits in IKEA''s office range and carries the range''s 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '70', 'ikea-trotten-desk-120x70' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-trotten-desk-120x70';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-trotten-desk-120x70' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-trotten-desk-120x70';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '50', 'ikea-trotten-desk-120x70' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-trotten-desk-120x70';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-trotten-desk-120x70' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-trotten-desk-120x70';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '120', 'ikea-trotten-desk-120x70' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-trotten-desk-120x70';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com.tr/en/product/trotten-white-120x70-cm-desk-59621917', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-trotten-desk-120x70' AND m.slug = 'ikea-com-tr'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-bekant-desk-160x80 (desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-bekant-desk-160x80', 'BEKANT desk, white, 160x80 cm', 'BEKANT 190.228.08', 'A large straight office desk sold as the fixed counterpart to the separate BEKANT sit/stand model; its top height is chosen once, when the legs are mounted at assembly. IKEA rates the 160 by 80 cm surface for 100 kg, the highest load among the fixed desks in this set. The product page states a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-bekant-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-bekant-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-bekant-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-bekant-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ikea-bekant-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-bekant-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-bekant-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-bekant-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-bekant-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-bekant-desk-160x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-bekant-desk-160x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-bekant-corner-desk-left-160x110 (desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-bekant-corner-desk-left-160x110', 'BEKANT corner desk left, white/black, 160x110 cm', 'BEKANT 090.064.08', 'A left-hand corner version of the BEKANT fixed desk, giving a deeper 110 cm return on one side for a larger work area. Like the straight BEKANT, the height is set when the legs are mounted rather than adjusted in use. IKEA publishes a 100 kg maximum load and a 10-year guarantee for it.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '110', 'ikea-bekant-corner-desk-left-160x110' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-bekant-corner-desk-left-160x110' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ikea-bekant-corner-desk-left-160x110' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-bekant-corner-desk-left-160x110' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-bekant-corner-desk-left-160x110' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/mx/en/p/bekant-corner-desk-left-white-black-s09006408/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-bekant-corner-desk-left-160x110' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-mittzon-desk-120x80 (desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-mittzon-desk-120x80', 'MITTZON desk, oak veneer/white, 120x80 cm', 'MITTZON 295.260.97', 'A 120 by 80 cm desk from IKEA''s MITTZON office system whose working height is selected during assembly. IKEA states plainly that the legs must be reassembled to change that height, which makes it a fixed desk in use rather than a sit-stand desk. It is rated for 50 kg and backed by a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-mittzon-desk-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-mittzon-desk-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-mittzon-desk-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-mittzon-desk-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '50', 'ikea-mittzon-desk-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-mittzon-desk-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-mittzon-desk-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-mittzon-desk-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '120', 'ikea-mittzon-desk-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-mittzon-desk-120x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/ee/en/p/mittzon-desk-oak-veneer-white-s29526097/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-mittzon-desk-120x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-idasen-desk-160x80 (desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-idasen-desk-160x80', 'IDÅSEN desk, brown/dark grey, 160x80 cm', 'IDÅSEN 792.810.40', 'The fixed version of IDÅSEN pairs a contoured 160 by 80 cm top with trestle-style legs whose height is set when the top is mounted. IKEA rates this version for 70 kg, notably more than several smaller fixed desks here. The product page labels it with a 10-year warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-idasen-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-idasen-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-idasen-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-idasen-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '70', 'ikea-idasen-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-idasen-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-idasen-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-idasen-desk-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-idasen-desk-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-idasen-desk-160x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/in/en/p/idasen-desk-brown-dark-grey-s79281040/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-idasen-desk-160x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-bekant-desk-sit-stand-120x80 (standing-desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-bekant-desk-sit-stand-120x80', 'BEKANT desk sit/stand, white, 120x80 cm', 'BEKANT 490.225.19', 'IKEA''s mainstream electric sit-stand desk, raising and lowering its 120 by 80 cm top at the touch of a button. The published range runs from 65 cm for sitting to 125 cm for standing, with a 70 kg maximum load. IKEA states a 10-year guarantee on the product page.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'standing-desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '125', 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_desk_height_cm' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '70', 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'motorized' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '120', 'ikea-bekant-desk-sit-stand-120x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/at/en/p/bekant-desk-sit-stand-white-s49022519/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-bekant-desk-sit-stand-120x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-idasen-desk-sit-stand-160x80 (standing-desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-idasen-desk-sit-stand-160x80', 'IDÅSEN desk sit/stand, brown/beige, 160x80 cm', 'IDÅSEN 292.809.67', 'The electric IDÅSEN offers the widest height span in this set, from 63 cm up to 127 cm, on a 160 by 80 cm contoured top. It can also be controlled through a desk-control app as well as its handle switch. IKEA publishes a 70 kg maximum load and a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'standing-desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '127', 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_desk_height_cm' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '70', 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'motorized' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-idasen-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/nz/en/p/idasen-desk-sit-stand-brown-beige-s29280967/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-idasen-desk-sit-stand-160x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-mittzon-desk-sit-stand-160x60 (standing-desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-mittzon-desk-sit-stand-160x60', 'MITTZON desk sit/stand, electric white/black, 160x60 cm', 'MITTZON 095.291.34', 'A dual-motor electric desk in IKEA''s MITTZON system, here in the shallower 160 by 60 cm configuration. It carries the highest load in this standing set at 80 kg and reaches 126 cm at the top of its range. The maker includes a cable-management tray and a hand control with two memory settings, under a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'standing-desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '60', 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '126', 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_desk_height_cm' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'motorized' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-mittzon-desk-sit-stand-160x60' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.cn/cn/en/p/mittzon-mi-te-cong-zuo-zhan-liang-yong-shi-ban-gong-zhuo-dian-dong-bai-se-hei-se-s09529134/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-mittzon-desk-sit-stand-160x60' AND m.slug = 'ikea-cn'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-rodulf-desk-sit-stand-140x80 (standing-desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-rodulf-desk-sit-stand-140x80', 'RODULF desk sit/stand, electric/white, 140x80 cm', 'RODULF 595.303.28', 'A mid-size electric sit-stand desk with a 140 by 80 cm top and a hand control offering two memory settings. IKEA publishes an electric adjustment range of 70 to 117 cm and a 70 kg maximum load. RODULF is named in IKEA''s office furniture guarantee brochure with a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'standing-desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '117', 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_desk_height_cm' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '70', 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'motorized' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '140', 'ikea-rodulf-desk-sit-stand-140x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/nl/en/p/rodulf-desk-sit-stand-electric-white-s59530328/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-rodulf-desk-sit-stand-140x80' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-trotten-desk-sit-stand-160x80 (standing-desks)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-trotten-desk-sit-stand-160x80', 'TROTTEN desk sit/stand, white, 160x80 cm', 'TROTTEN 594.296.03', 'The only manual desk in this standing set: a crank handle, which can be fitted on either side, moves the 160 by 80 cm top between sitting and standing heights. IKEA rates it for 50 kg, lower than the electric models here. It carries the TROTTEN range''s 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'standing-desks' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '80', 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '122', 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_desk_height_cm' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '50', 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'motorized' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '160', 'ikea-trotten-desk-sit-stand-160x80' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.cn/cn/en/p/trotten-desk-sit-stand-white-s59429603/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-trotten-desk-sit-stand-160x80' AND m.slug = 'ikea-cn'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- herman-miller-sayl (office-chairs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'herman-miller-sayl', 'Sayl Office Chair', 'Sayl', 'A task chair built around a frameless, suspension-style back inspired by bridge engineering, so the back flexes and supports the spine without a rigid frame. It offers pneumatic seat-height adjustment, an optional height-adjustable lumbar support, and a choice of fixed or fully adjustable arms. Herman Miller rates it for users up to 159 kg and backs it with a 12-year warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'office-chairs' AND b.slug = 'herman-miller';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'herman-miller-sayl' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_lumbar_support' WHERE p.slug = 'herman-miller-sayl';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'herman-miller-sayl' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'armrest_adjustable' WHERE p.slug = 'herman-miller-sayl';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'herman-miller-sayl' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'herman-miller-sayl';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '159', 'herman-miller-sayl' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'herman-miller-sayl';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '12', 'herman-miller-sayl' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'herman-miller-sayl';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://eustore.hermanmiller.com/products/sayl-office-chair', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'herman-miller-sayl' AND m.slug = 'eustore-hermanmiller-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- steelcase-series-1 (office-chairs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'steelcase-series-1', 'Steelcase Series 1', 'Series 1', 'Steelcase''s entry-level ergonomic work chair pairs a weight-activated or manual synchro mechanism with a seat that adjusts in both height and depth. Height-adjustable lumbar support is fitted as standard, and the standard arms move in four dimensions. It is rated for users up to 400 lb and covered by a 12-year parts-and-labor limited warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'office-chairs' AND b.slug = 'steelcase';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'steelcase-series-1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_lumbar_support' WHERE p.slug = 'steelcase-series-1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'steelcase-series-1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'armrest_adjustable' WHERE p.slug = 'steelcase-series-1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'steelcase-series-1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'steelcase-series-1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '181.4', 'steelcase-series-1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'steelcase-series-1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '12', 'steelcase-series-1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'steelcase-series-1';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.steelcase.com/products/office-chairs/steelcase-series-1/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'steelcase-series-1' AND m.slug = 'steelcase-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- haworth-zody (office-chairs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'haworth-zody', 'Zody', 'Zody', 'Haworth''s long-running ergonomic task chair is known for its pelvic and asymmetrical lumbar system, which lets the user adjust lumbar height and set support independently on the left and right sides. It adds 4D arms and a sliding seat on a standard five-star base. Haworth warrants it for people up to 145 kg, with seating covered for 12 years under its limited warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'office-chairs' AND b.slug = 'haworth';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'haworth-zody' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_lumbar_support' WHERE p.slug = 'haworth-zody';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'haworth-zody' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'armrest_adjustable' WHERE p.slug = 'haworth-zody';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'haworth-zody' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'haworth-zody';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '145', 'haworth-zody' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'haworth-zody';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '12', 'haworth-zody' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'haworth-zody';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://in.shopping.haworth.com/products/zody-ergonomic-office-chair', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'haworth-zody' AND m.slug = 'in-shopping-haworth-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-jarvfjallet (office-chairs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-jarvfjallet', 'JÄRVFJÄLLET Office Chair with Armrests', '205.218.53', 'IKEA''s higher-end ergonomic chair combines a mesh back with a shaped, height-adjustable lumbar support and a synchronised tilt mechanism that follows the sitter''s movements. The seat adjusts in height and depth, and the armrests adjust in height and width (2D). IKEA tests it for loads up to 110 kg and includes a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'office-chairs' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_lumbar_support' WHERE p.slug = 'ikea-jarvfjallet';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'armrest_adjustable' WHERE p.slug = 'ikea-jarvfjallet';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-jarvfjallet';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '110', 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-jarvfjallet';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '46', 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'seat_depth_cm' WHERE p.slug = 'ikea-jarvfjallet';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-jarvfjallet' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-jarvfjallet';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com.tw/en/products/office-workspace/office-chairs/jarvfjallet-art-20521853', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-jarvfjallet' AND m.slug = 'ikea-com-tw'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-markus (office-chairs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-markus', 'MARKUS Office Chair, Vissle Dark Gray, Medium', '502.611.51', 'A tall mesh-back office chair with an integrated headrest and a curved back that gives built-in, non-adjustable lumbar support; only the seat height is adjustable, and the armrests are fixed. Tilt tension is set manually with a knob under the seat. IKEA tests the Medium version for up to 110 kg and covers it with a 10-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'office-chairs' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-markus' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_lumbar_support' WHERE p.slug = 'ikea-markus';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ikea-markus' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'armrest_adjustable' WHERE p.slug = 'ikea-markus';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ikea-markus' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ikea-markus';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '110', 'ikea-markus' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-markus';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ikea-markus' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ikea-markus';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/th/en/p/markus-office-chair-vissle-dark-grey-50261151/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-markus' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- dyson-solarcycle-morph-desk (desk-lighting)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'dyson-solarcycle-morph-desk', 'Solarcycle Morph Desk Lamp', 'CD06', 'Dyson''s desk lamp tracks local daylight and shifts its colour temperature and brightness through the day to match, using an articulated arm that can also dock into a floor-style or ambient configuration in the Morph design. Output is rated at 850 lumens with slide-touch controls for dimming and colour temperature between 2700K and 6500K. Dyson covers its lighting range with a 5-year guarantee.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-lighting' AND b.slug = 'dyson';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'dyson-solarcycle-morph-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_color_temperature' WHERE p.slug = 'dyson-solarcycle-morph-desk';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '850', 'dyson-solarcycle-morph-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'brightness_lumens' WHERE p.slug = 'dyson-solarcycle-morph-desk';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'dyson-solarcycle-morph-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'dimmable' WHERE p.slug = 'dyson-solarcycle-morph-desk';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'dyson-solarcycle-morph-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'dyson-solarcycle-morph-desk';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.dyson.co.uk/lighting/desk-lamps/solarcycle-morph/black-black', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'dyson-solarcycle-morph-desk' AND m.slug = 'dyson-co-uk'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- benq-wit-e-reading-lamp (desk-lighting)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'benq-wit-e-reading-lamp', 'WiT e-Reading Lamp', 'AR15_D', 'BenQ''s WiT is a wide-curve desk lamp designed to light a broad desktop area evenly for reading and screen work. A rotary knob handles dimming, an auto-dimming mode reacts to ambient light, and colour temperature steps through 13 levels from 2700K to 5700K. BenQ''s own lamp comparison lists its luminous flux at 800 lm at 2700K and 900 lm at 5700K.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-lighting' AND b.slug = 'benq';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'benq-wit-e-reading-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_color_temperature' WHERE p.slug = 'benq-wit-e-reading-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '900', 'benq-wit-e-reading-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'brightness_lumens' WHERE p.slug = 'benq-wit-e-reading-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'benq-wit-e-reading-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'dimmable' WHERE p.slug = 'benq-wit-e-reading-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'benq-wit-e-reading-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'benq-wit-e-reading-lamp';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.benq.com/en-ap/lighting/e-reading-desk-lamp.html', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'benq-wit-e-reading-lamp' AND m.slug = 'benq-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- benq-screenbar (desk-lighting)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'benq-screenbar', 'ScreenBar Monitor Light Bar', 'ScreenBar', 'The original ScreenBar clips onto the top of a monitor and throws light onto the desk only, avoiding screen glare while freeing up desk space. A built-in ambient sensor provides real-time auto-dimming, brightness can also be set manually by touch, and colour temperature spans 2700K to 6500K in 8 levels. BenQ''s own comparison table rates its luminous flux at up to 320 lm depending on colour temperature.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-lighting' AND b.slug = 'benq';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'benq-screenbar' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_color_temperature' WHERE p.slug = 'benq-screenbar';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '320', 'benq-screenbar' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'brightness_lumens' WHERE p.slug = 'benq-screenbar';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'benq-screenbar' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'dimmable' WHERE p.slug = 'benq-screenbar';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'benq-screenbar' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'benq-screenbar';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.benq.com/en-ph/lighting/monitor-light.html', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'benq-screenbar' AND m.slug = 'benq-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ottlite-harmonize-led-desk-lamp (desk-lighting)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ottlite-harmonize-led-desk-lamp', 'Harmonize LED Desk Lamp', 'CS01SV9-SHPR', 'A compact OttLite desk lamp using the brand''s ClearSun LED, which is designed to reduce eyestrain by mimicking natural daylight. It offers three touch-controlled brightness settings and three colour temperature modes, with a maximum output of 440 lumens. OttLite backs its lamps with a 2-year warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-lighting' AND b.slug = 'ottlite';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ottlite-harmonize-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_color_temperature' WHERE p.slug = 'ottlite-harmonize-led-desk-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '440', 'ottlite-harmonize-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'brightness_lumens' WHERE p.slug = 'ottlite-harmonize-led-desk-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ottlite-harmonize-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'dimmable' WHERE p.slug = 'ottlite-harmonize-led-desk-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'ottlite-harmonize-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ottlite-harmonize-led-desk-lamp';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://ottlite.com/products/harmonize-led-desk-lamp', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ottlite-harmonize-led-desk-lamp' AND m.slug = 'ottlite-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ottlite-recharge-led-desk-lamp (desk-lighting)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ottlite-recharge-led-desk-lamp', 'Recharge LED Desk Lamp', 'CS59G59-SHPR', 'A cordless, rechargeable OttLite desk lamp built for portability, with a flexible neck and the brand''s ClearSun daylight-style LED. It provides three brightness settings and a maximum output of 275 lumens, so it suits travel, bedside, or temporary workspaces. Like other OttLite lamps it carries a 2-year warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-lighting' AND b.slug = 'ottlite';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '275', 'ottlite-recharge-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'brightness_lumens' WHERE p.slug = 'ottlite-recharge-led-desk-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ottlite-recharge-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'dimmable' WHERE p.slug = 'ottlite-recharge-led-desk-lamp';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'ottlite-recharge-led-desk-lamp' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ottlite-recharge-led-desk-lamp';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://ottlite.com/products/recharge-led-desk-lamp-black', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ottlite-recharge-led-desk-lamp' AND m.slug = 'ottlite-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ergotron-lx-desk-monitor-arm (monitor-arms)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ergotron-lx-desk-monitor-arm', 'LX Desk Monitor Arm', '45-241-026', 'Ergotron''s LX is a single-display desk arm built around a counterbalanced lift that lets the screen be repositioned with a light touch. It folds back toward its pole to free up desk space and ships with both desk-clamp and grommet mounting hardware. The maker rates it for typical screens up to 34 inches and backs it with a ten-year warranty.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'monitor-arms' AND b.slug = 'ergotron';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '11.3', 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '34', 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'screen_size_max_in' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'tilt_adjustable' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'vesa_compatible' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ergotron-lx-desk-monitor-arm' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'warranty_years' WHERE p.slug = 'ergotron-lx-desk-monitor-arm';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://media.ergotron.com/reserved/resources/05-056-ea-orig.pdf', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ergotron-lx-desk-monitor-arm' AND m.slug = 'media-ergotron-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- nulaxy-c3-laptop-stand (laptop-stands)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'nulaxy-c3-laptop-stand', 'C3 Fully Aluminum Detachable Laptop Stand', 'C3', 'The Nulaxy C3 is a fixed-height riser made from 5 mm aluminium alloy that lifts a laptop screen by about seven inches. Its three pieces slot together without tools and can be taken apart again for storage or travel. An open back is intended to aid airflow, and rubber pads help keep the machine steady on the stand.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'laptop-stands' AND b.slug = 'nulaxy';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'nulaxy-c3-laptop-stand' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'nulaxy-c3-laptop-stand';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '16', 'nulaxy-c3-laptop-stand' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_laptop_size_in' WHERE p.slug = 'nulaxy-c3-laptop-stand';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'nulaxy-c3-laptop-stand' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'nulaxy-c3-laptop-stand';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://nulaxy.com/products/laptop-stand/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'nulaxy-c3-laptop-stand' AND m.slug = 'nulaxy-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ikea-alex-drawer-unit (desk-organization-storage)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ikea-alex-drawer-unit', 'ALEX Drawer Unit, White, 36x70 cm', '404.735.49', 'IKEA''s ALEX is a narrow drawer unit designed to support a desk or stand alone, with a finished back so it can be placed anywhere in a room. Its five drawers come in shallower and deeper sizes, giving a mix of compartment depths within a 36 cm-wide footprint. Drawer stops keep each drawer from being pulled out too far.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'desk-organization-storage' AND b.slug = 'ikea';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '58', 'ikea-alex-drawer-unit' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'depth_cm' WHERE p.slug = 'ikea-alex-drawer-unit';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '12', 'ikea-alex-drawer-unit' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_load_kg' WHERE p.slug = 'ikea-alex-drawer-unit';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'ikea-alex-drawer-unit' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'storage_compartments' WHERE p.slug = 'ikea-alex-drawer-unit';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '36', 'ikea-alex-drawer-unit' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'width_cm' WHERE p.slug = 'ikea-alex-drawer-unit';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ikea.com/sg/en/p/alex-drawer-unit-white-40473549/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ikea-alex-drawer-unit' AND m.slug = 'ikea-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- comfilife-foot-rest (ergonomic-supports)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'comfilife-foot-rest', 'ComfiLife Foot Rest', NULL, 'The ComfiLife Foot Rest is a memory-foam cushion for use under a desk, with a detachable lower section that adds or removes two inches of height. It can be flipped over to serve as a rocker, and its cover can be removed for machine washing. A non-slip underside helps it stay in place on the floor.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'ergonomic-supports' AND b.slug = 'comfilife';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'comfilife-foot-rest' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'height_adjustable' WHERE p.slug = 'comfilife-foot-rest';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '15.2', 'comfilife-foot-rest' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'thickness_cm' WHERE p.slug = 'comfilife-foot-rest';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://comfilife.com/product/comfilife-foot-rest/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'comfilife-foot-rest' AND m.slug = 'comfilife-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- anker-341-usb-c-hub-7-in-1-a8346 (usb-c-hubs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'anker-341-usb-c-hub-7-in-1-a8346', 'Anker 341 USB-C Hub (7-in-1)', 'A8346', 'Anker''s 341 is a compact travel hub that expands one USB-C port with USB-A and USB-C data, a single HDMI output and both SD and microSD readers. It is built around pass-through charging, so a separate USB-C charger powers the laptop through the hub while the other ports stay in use.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'usb-c-hubs' AND b.slug = 'anker';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '4K@30Hz', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-341-usb-c-hub-7-in-1-a8346' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.anker.com/products/a8346', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'anker-341-usb-c-hub-7-in-1-a8346' AND m.slug = 'anker-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- anker-332-usb-c-hub-5-in-1-a8355 (usb-c-hubs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'anker-332-usb-c-hub-5-in-1-a8355', 'Anker 332 USB-C Hub (5-in-1)', 'A8355', 'The Anker 332 is the smaller sibling in Anker''s hub line, keeping only the essentials: one HDMI output, two USB-A ports and one USB-C data port. It suits a light travel kit where a single external display and basic peripherals are all that is needed, with charging passed through from a separate adapter.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'usb-c-hubs' AND b.slug = 'anker';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '4K@30Hz', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-332-usb-c-hub-5-in-1-a8355' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.anker.com/products/a8355', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'anker-332-usb-c-hub-5-in-1-a8355' AND m.slug = 'anker-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- plugable-usb-c-hub-7-in-1-usbc-7in1 (usb-c-hubs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'plugable-usb-c-hub-7-in-1-usbc-7in1', 'Plugable USB-C Hub 7-in-1', 'USBC-7IN1', 'Plugable''s 7-in-1 hub is a driver-free travel adapter with three USB-A ports, one HDMI output and twin SD and microSD readers. Its only USB-C socket is a charging pass-through, a limitation Plugable states plainly in its own FAQ. It is aimed at hot-desking and classroom fleets where no driver install is possible.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'usb-c-hubs' AND b.slug = 'plugable';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '4K 60Hz', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'plugable-usb-c-hub-7-in-1-usbc-7in1' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://plugable.com/products/usbc-7in1', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'plugable-usb-c-hub-7-in-1-usbc-7in1' AND m.slug = 'plugable-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- belkin-connect-usb-c-6-in-1-multiport-hub-avc008 (usb-c-hubs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008', 'Belkin Connect USB-C 6-in-1 Multiport Hub', 'AVC008', 'Belkin''s AVC008 is a compact multiport hub that adds the wired networking many slim hubs omit, alongside HDMI, two USB-A ports and an SD reader. Its single USB-C port handles both data and Power Delivery, keeping the body small. It is positioned for mobile work where an Ethernet jack matters as much as display output.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'usb-c-hubs' AND b.slug = 'belkin';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '4K 60Hz', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1000', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.belkin.com/in/support-article?articleNum=337063', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'belkin-connect-usb-c-6-in-1-multiport-hub-avc008' AND m.slug = 'belkin-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027 (usb-c-hubs)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027', 'UGREEN Revodok Pro 108 8-in-1 USB-C Hub', '75027', 'The Revodok Pro 108 is UGREEN''s faster travel hub, with 10Gbps USB-C and USB-A data ports, a 4K 60Hz HDMI output and SD and microSD readers that can be used at the same time. Charging is by pass-through from a separate adapter via its dedicated PD port. It targets users moving large files who do not need wired networking.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'usb-c-hubs' AND b.slug = 'ugreen';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '4K@60Hz', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ugreen.com/en-au/products/au-75027', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027' AND m.slug = 'ugreen-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- caldigit-ts4-thunderbolt-station-4 (docking-stations)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'caldigit-ts4-thunderbolt-station-4', 'CalDigit TS4 Thunderbolt Station 4', 'TS4', 'The TS4 is CalDigit''s flagship Thunderbolt 4 dock, built around port density: eighteen ports including downstream Thunderbolt, 10Gbps USB in both shapes, DisplayPort, 2.5 Gigabit Ethernet and dual UHS-II card readers. A 230W supply lets it charge a laptop at up to 98W while powering everything attached. It is a fixed-desk dock, not a travel accessory.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'docking-stations' AND b.slug = 'caldigit';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '98', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2500', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'caldigit-ts4-thunderbolt-station-4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.caldigit.com/thunderbolt-station-4/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'caldigit-ts4-thunderbolt-station-4' AND m.slug = 'caldigit-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- plugable-triple-monitor-usb-c-docking-station-ud-768pdz (docking-stations)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz', 'Plugable Triple Monitor USB-C Docking Station', 'UD-768PDZ', 'The UD-768PDZ is a USB-C dock whose Silicon Motion graphics let it run three external monitors, including on base Apple Silicon Macs that normally allow only one, at the cost of a driver install and a 1080p ceiling per screen. Around that it provides five USB-A ports, a 10Gbps USB-C port, Gigabit Ethernet and an SD reader, powered by its own 170W adapter.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'docking-stations' AND b.slug = 'plugable';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '5', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'UL', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'verified_manufacturer_documentation', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '1920x1080 @ 60Hz', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1000', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://plugable.com/products/ud-768pdz', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'plugable-triple-monitor-usb-c-docking-station-ud-768pdz' AND m.slug = 'plugable-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- belkin-connect-pro-thunderbolt-4-dock-inc006 (docking-stations)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'belkin-connect-pro-thunderbolt-4-dock-inc006', 'Belkin Connect Pro Thunderbolt 4 Dock', 'INC006', 'Belkin''s Connect Pro is a twelve-port Thunderbolt 4 dock with two native HDMI outputs, which sets it apart from docks that force display adapters onto Thunderbolt ports. It adds an SD reader, Gigabit Ethernet and a front USB-C port, and charges the host at up to 90W from its 120W supply. Belkin positions it as a single-cable workstation dock for Mac and Windows laptops.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'docking-stations' AND b.slug = 'belkin';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '90', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '4', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '8K @ 30Hz', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1000', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'belkin-connect-pro-thunderbolt-4-dock-inc006' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.belkin.com/p/pro-thunderbolt-4-dock/P-INC006.html', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'belkin-connect-pro-thunderbolt-4-dock-inc006' AND m.slug = 'belkin-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- kensington-sd5700t-thunderbolt-4-docking-station (docking-stations)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'kensington-sd5700t-thunderbolt-4-docking-station', 'Kensington SD5700T Thunderbolt 4 Dual 4K Docking Station with 90W PD', 'SD5700T (K35175NA)', 'The SD5700T is Kensington''s eleven-port Thunderbolt 4 dock, notable for holding its full 90W of laptop charging regardless of what else is connected. All video leaves via its three downstream Thunderbolt 4 ports, since there is no HDMI or DisplayPort socket. IT-oriented extras include DockWorks management software, mounting options and security slots.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'docking-stations' AND b.slug = 'kensington';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '90', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '4', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, '8K @ 60Hz', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_video_resolution' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1000', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'kensington-sd5700t-thunderbolt-4-docking-station' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.Kensington.com/en-ca/p/products/connectivity/laptop-docks-usb-accessories/sd5700t-thunderbolt-4-dual-4k-docking-station-with-90w-pd/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'kensington-sd5700t-thunderbolt-4-docking-station' AND m.slug = 'kensington-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- dell-thunderbolt-dock-wd22tb4 (docking-stations)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'dell-thunderbolt-dock-wd22tb4', 'Dell Thunderbolt Dock WD22TB4', 'WD22TB4', 'Dell''s WD22TB4 is a modular Thunderbolt 4 dock for managed business fleets: its host connection module can be swapped to upgrade the dock instead of replacing it. It offers the widest native display mix here, with two DisplayPort outputs, HDMI and a multifunction USB-C display port, and charges Dell laptops at up to 130W. There is no card reader, reflecting its IT-deployment focus.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'docking-stations' AND b.slug = 'dell';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '4', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '130', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'hdmi_ports' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '10', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_data_speed_gbps' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_port' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1000', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ethernet_speed_mbps' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_sd' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'card_reader_microsd' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'displayport_outputs' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '4', 'dell-thunderbolt-dock-wd22tb4' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_external_displays' WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.dell.com/support/manuals/en-tc/wd22tb4-dock/dell_wd22tb4_userguide/product-specifications?guid=guid-bb63fcdf-357e-408c-82f1-c7c56e8d5b4e&lang=en-us', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'dell-thunderbolt-dock-wd22tb4' AND m.slug = 'dell-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- anker-737-charger-ganprime-120w-a2148 (chargers-power-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'anker-737-charger-ganprime-120w-a2148', 'Anker 737 Charger (GaNPrime 120W)', 'A2148', 'A three-port GaNPrime wall charger built around two USB-C ports and one USB-A port, aimed at charging a laptop alongside a phone and tablet from a single outlet. Either USB-C port can deliver up to 100W on its own, while the unit shares a 120W ceiling across all connected devices.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'chargers-power-adapters' AND b.slug = 'anker';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '120', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'total_output_w' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'anker-737-charger-ganprime-120w-a2148' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'uses_gan' WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.anker.com/nz/products/a2148', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'anker-737-charger-ganprime-120w-a2148' AND m.slug = 'anker-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- anker-735-charger-nano-ii-65w-a2667 (chargers-power-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'anker-735-charger-nano-ii-65w-a2667', 'Anker 735 Charger (Nano II 65W)', 'A2667', 'A compact three-port charger using GaN II technology, with two USB-C ports and one USB-A port in a pocketable body. A single USB-C connection can supply up to 65W for a USB-C laptop, and the charger redistributes its 65W total when two or three devices are attached.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'chargers-power-adapters' AND b.slug = 'anker';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '65', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '65', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'total_output_w' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'anker-735-charger-nano-ii-65w-a2667' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'uses_gan' WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.anker.com/products/a2667', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'anker-735-charger-nano-ii-65w-a2667' AND m.slug = 'anker-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ugreen-nexode-100w-gan-charger-cd226 (chargers-power-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ugreen-nexode-100w-gan-charger-cd226', 'UGREEN Nexode 100W GaN Charger', 'CD226', 'A four-port GaN wall charger with three USB-C ports and one USB-A port, sized for a laptop plus phones and accessories. Its first two USB-C ports can each reach 100W when used alone, with the full 100W shared across ports as more devices are connected.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'chargers-power-adapters' AND b.slug = 'ugreen';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'total_output_w' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '3', 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ugreen-nexode-100w-gan-charger-cd226' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'uses_gan' WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://eu.ugreen.com/en-pl/products/ugreen-nexode-100w-usb-c-wall-charger', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ugreen-nexode-100w-gan-charger-cd226' AND m.slug = 'eu-ugreen-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- belkin-boostcharge-pro-4-port-gan-charger-108w-wch010 (chargers-power-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010', 'Belkin BoostCharge Pro 4-Port GaN Charger 108W', 'WCH010', 'A desktop-style GaN charger with two USB-C and two USB-A ports on a 2-metre power cord, designed to sit on a desk rather than hang from an outlet. It delivers up to 96W from a single USB-C port for a laptop and shares 108W in total across up to four devices using Intelligent Power Sharing.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'chargers-power-adapters' AND b.slug = 'belkin';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '96', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '108', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'total_output_w' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'uses_gan' WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.belkin.com/p/4-port-gan-charger-108w/WCH010dqWH.html', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'belkin-boostcharge-pro-4-port-gan-charger-108w-wch010' AND m.slug = 'belkin-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- anker-717-charger-140w-a2341 (chargers-power-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'anker-717-charger-140w-a2341', 'Anker 717 Charger (140W)', 'A2341', 'A single-port GaNPrime charger built for high-power USB-C laptops, delivering up to 140W through USB Power Delivery 3.1, including the 28V profile used by the 16-inch MacBook Pro. It trades multi-port flexibility for maximum single-device speed in a body notably smaller than Apple''s own 140W adapter.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'chargers-power-adapters' AND b.slug = 'anker';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '140', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'none', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'not_certified', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '140', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'total_output_w' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_a_ports' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'usb_c_ports' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'anker-717-charger-140w-a2341' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'uses_gan' WHERE p.slug = 'anker-717-charger-140w-a2341';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.anker.com/eu-en/products/a2341', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'anker-717-charger-140w-a2341' AND m.slug = 'anker-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- apple-thunderbolt-4-pro-cable-1-8m (cables-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'apple-thunderbolt-4-pro-cable-1-8m', 'Apple Thunderbolt 4 (USB-C) Pro Cable (1.8 m)', 'MW5J3AM/A', 'Apple''s 1.8-metre Thunderbolt 4 Pro cable pairs full 40Gb/s Thunderbolt and USB4 data transfer with DisplayPort video and up to 100W of charging. Its black braided jacket is designed to coil without tangling, making it a desk cable for connecting Macs to displays, docks and fast storage.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cables-adapters' AND b.slug = 'apple';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'apple-thunderbolt-4-pro-cable-1-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'braided' WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1.8', 'apple-thunderbolt-4-pro-cable-1-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'USB-C to USB-C', 'apple-thunderbolt-4-pro-cable-1-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'connector_type' WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '40', 'apple-thunderbolt-4-pro-cable-1-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'data_transfer_gbps' WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'apple-thunderbolt-4-pro-cable-1-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.apple.com/shop/product/mw5j3am/a/thunderbolt-4-usb%E2%80%91c-pro-cable-18-m', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'apple-thunderbolt-4-pro-cable-1-8m' AND m.slug = 'apple-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- caldigit-thunderbolt-4-cable-0-8m (cables-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'caldigit-thunderbolt-4-cable-0-8m', 'CalDigit Thunderbolt 4 Cable (0.8m)', 'Thunderbolt 4 Cable 0.8m', 'CalDigit''s short 0.8-metre Thunderbolt 4 cable is aimed at dock and desktop setups where excess cable is clutter. It carries up to 40Gb/s across Thunderbolt 4, Thunderbolt 3 and USB4, and supplies up to 100W of power delivery, with E-Marker chips at both ends managing safe power negotiation.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cables-adapters' AND b.slug = 'caldigit';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0.8', 'caldigit-thunderbolt-4-cable-0-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'caldigit-thunderbolt-4-cable-0-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'USB-C to USB-C', 'caldigit-thunderbolt-4-cable-0-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'connector_type' WHERE p.slug = 'caldigit-thunderbolt-4-cable-0-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '40', 'caldigit-thunderbolt-4-cable-0-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'data_transfer_gbps' WHERE p.slug = 'caldigit-thunderbolt-4-cable-0-8m';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'caldigit-thunderbolt-4-cable-0-8m' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'caldigit-thunderbolt-4-cable-0-8m';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.caldigit.com/thunderbolt-4-usb-4-cable/', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'caldigit-thunderbolt-4-cable-0-8m' AND m.slug = 'caldigit-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015 (cables-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015', 'Belkin BoostCharge USB-C to USB-C Cable 240W (1m)', 'CAB015bt1MWH', 'Belkin''s braided 240W cable is a charging-first USB-C lead built for PD 3.1 Extended Power Range devices, including high-wattage gaming laptops. In its 1-metre form it pairs that 240W ceiling with USB 2.0 data transfer, dual E-Marker chips and over-temperature protection.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cables-adapters' AND b.slug = 'belkin';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'braided' WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'USB-C to USB-C', 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'connector_type' WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0.48', 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'data_transfer_gbps' WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '240', 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.belkin.com/p/usb-c-to-usb-c-cable-240w/CAB015bt1MWH.html', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015' AND m.slug = 'belkin-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025 (cables-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025', 'Belkin BoostCharge Eco USB-C to USB-C Braided Cable 240W (1m)', 'CAB025', 'Belkin''s Eco variant wraps a 240W-capable USB-C cable in braiding made largely from recycled PET, with recycled material in the connector housings as well. The 1-metre version still covers everyday syncing over USB 2.0 while fast-charging laptops, tablets and phones at up to 240W.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cables-adapters' AND b.slug = 'belkin';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'braided' WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1', 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'USB-C to USB-C', 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'connector_type' WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0.48', 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'data_transfer_gbps' WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '240', 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.belkin.com/uk/support-article/?articleNum=337166', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025' AND m.slug = 'belkin-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- ugreen-usb-c-to-usb-c-cable-100w-2m-70427 (cables-adapters)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427', 'UGREEN USB-C to USB-C Cable 100W Braided (2m)', '70427', 'UGREEN''s 2-metre braided cable is a long-reach charging lead for USB-C laptops and phones, rated for up to 100W at 20V/5A with an E-Mark chip for safe high-current delivery. Data duties are handled at USB 2.0 speed, and the nylon braid and aluminium housings are built for frequent daily plugging and unplugging.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cables-adapters' AND b.slug = 'ugreen';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'braided' WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '2', 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'USB-C to USB-C', 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'connector_type' WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '0.48', 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'data_transfer_gbps' WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '100', 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'power_delivery_w' WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.ugreen.com/en-sg/products/sg-70427', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'ugreen-usb-c-to-usb-c-cable-100w-2m-70427' AND m.slug = 'ugreen-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- lamicall-ultra-thin-foldable-cell-phone-stand-for-desk (device-stands-holders)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk', 'Lamicall Ultra-Thin Foldable Cell Phone Stand for Desk', 'LAM-STDP03-Black', 'A slim desk stand from Lamicall that folds flat for carrying in a pocket or bag and uses a weighted metal base to stay put on the desk. Its dual-pivot design adjusts both height and viewing angle, and the maker states it works with phones and tablets between 4 and 8 inches, including phones in thick cases.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'device-stands-holders' AND b.slug = 'lamicall';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'adjustable_angle' WHERE p.slug = 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'phone-or-tablet', 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'device_type' WHERE p.slug = 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'foldable' WHERE p.slug = 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://lamicallshop.com/products/lamicall-ultra-thin-foldable-cell-phone-stand-for-desk', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'lamicall-ultra-thin-foldable-cell-phone-stand-for-desk' AND m.slug = 'lamicallshop-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- tripp-lite-protect-it-6-outlet-surge-protector-tlp606 (power-strips-surge-protectors)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606', 'Tripp Lite series Protect It! 6-Outlet Surge Protector, 6 ft. Cord, 900 Joules, Diagnostic LED, Light Gray Housing', 'TLP606', 'A six-outlet corded surge protector in Eaton''s Tripp Lite Protect It! series, intended for home or office workstations. The maker''s specification lists a 900-joule AC suppression rating, EMI/RFI filtering, a 15A resettable circuit breaker and a diagnostic LED, with one end outlet spaced for a bulky transformer.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'power-strips-surge-protectors' AND b.slug = 'tripp-lite';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '6', 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'ac_outlets' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '1.83', 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'cable_length_m' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'UL', 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_body' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'verified_manufacturer_documentation', 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'safety_certification_status' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 1, 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'surge_protection' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '900', 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'surge_rating_joules' WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://brd.tripplite.com/protect-it-6-outlet-surge-protector-6-ft-cord-790-joules-diagnostic-led~TLP606', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'tripp-lite-protect-it-6-outlet-surge-protector-tlp606' AND m.slug = 'brd-tripplite-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);

-- tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch (cases-sleeves-protection)
INSERT OR IGNORE INTO products (category_id, brand_id, slug, name, model_ref, editorial_summary, status, source_id, licence_status)
SELECT c.id, b.id, 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch', 'tomtoc 13 Inch MacBook Air/Pro Sleeve 360° Protective, Defender-A13', 'A13C2D1', 'A fitted laptop sleeve in tomtoc''s Defender-A13 line, sized for 13-inch MacBook Air and MacBook Pro models and also listed for some 13-inch Surface devices. It combines CornerArmor corner padding with a soft lining, a front pocket for chargers and accessories, and a spill-resistant recycled fabric shell with YKK zippers.', 'draft', 'stage05-research', 'owned'
FROM categories c, brands b WHERE c.slug = 'cases-sleeves-protection' AND b.slug = 'tomtoc';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'laptop', 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'device_type' WHERE p.slug = 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_bool, source_id)
SELECT p.id, d.id, 0, 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'drop_protection_rated' WHERE p.slug = 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_text, source_id)
SELECT p.id, d.id, 'recycled fabric', 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'material' WHERE p.slug = 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch';
INSERT OR IGNORE INTO product_specs (product_id, definition_id, value_number, source_id)
SELECT p.id, d.id, '13', 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch' FROM products p JOIN attribute_definitions d ON d.category_id = p.category_id AND d.key = 'max_device_size_in' WHERE p.slug = 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch';
INSERT INTO offers (product_id, merchant_id, destination_url, currency, current_price_cents, licence_status, validation_status)
SELECT p.id, m.id, 'https://www.tomtoc.com/products/360-protective-sleeve-13-inch-macbook-air-pro', 'USD', NULL, 'restricted', 'pending'
FROM products p, merchants m WHERE p.slug = 'tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch' AND m.slug = 'tomtoc-com'
AND NOT EXISTS (SELECT 1 FROM offers o WHERE o.product_id = p.id AND o.merchant_id = m.id AND o.variant_id IS NULL);
