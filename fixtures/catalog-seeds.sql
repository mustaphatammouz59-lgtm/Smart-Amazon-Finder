-- catalog-seeds.sql — STRUCTURAL seed data (DATABASE-DESIGN.md §7): the two
-- launch category roots + their attribute dictionaries. Idempotent by natural
-- key (slug / (category_id, key)). Contains NO products and NO commercial
-- data; safe to apply in any environment after migrations.

INSERT OR IGNORE INTO categories (slug, name, description, sort_order, is_indexable) VALUES
  ('home-office', 'Home Office & Productivity', 'Desks, seating, lighting and workspace accessories.', 1, 1),
  ('electronics-accessories', 'Electronics Accessories', 'Hubs, chargers, cables and adapters.', 2, 1);

-- Home Office & Productivity attribute dictionary
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'height_adjustable', 'Height adjustable', NULL, 'bool', 1, 1, 30 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'max_load_kg', 'Maximum load', 'kg', 'number', 1, 1, 20 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'warranty_years', 'Warranty', 'years', 'number', 0, 1, 10 FROM categories WHERE slug = 'home-office';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'width_cm', 'Width', 'cm', 'number', 1, 0, 0 FROM categories WHERE slug = 'home-office';

-- Electronics Accessories attribute dictionary
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'usb_c_ports', 'USB-C ports', NULL, 'number', 1, 1, 30 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'power_delivery_w', 'Power delivery', 'W', 'number', 1, 1, 20 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'cable_length_m', 'Cable length', 'm', 'number', 1, 0, 0 FROM categories WHERE slug = 'electronics-accessories';
INSERT OR IGNORE INTO attribute_definitions (category_id, key, label, unit, value_type, is_filterable, is_comparison_criterion, sort_weight)
SELECT id, 'safety_certified', 'Safety certified', NULL, 'bool', 1, 1, 10 FROM categories WHERE slug = 'electronics-accessories';
