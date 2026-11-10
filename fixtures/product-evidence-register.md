# Product Source & Evidence Register — Stage 05.4

Generated 2026-11-09 from manufacturer-first web research (research files
normalized in `fixtures/product-research.json`; ingestion SQL in
`fixtures/catalog-products.sql`). Every spec value below traces to the cited
manufacturer source. Retailer pages, where present, are supplements only.
Prices: none recorded anywhere (no licensed prices exist). Certification
statuses follow VR-3: `verified_manufacturer_documentation` only where the
manufacturer's own documentation states the body/mark;
`claimed_unverified` is capped at marketing/retailer wording;
`not_certified`/`none` is the honest record when nothing is published.
Unit conversions are arithmetic only (in→cm ×2.54, lb→kg ÷2.20462,
ft→m ×0.3048) and the original published figure is noted.


## desks (5/5)

### TROTTEN desk, white, 120x70 cm — `ikea-trotten-desk-120x70`
- Brand: IKEA · Model ref: TROTTEN 596.219.17
- Destination: https://www.ikea.com.tr/en/product/trotten-white-120x70-cm-desk-59621917
- Summary (original editorial): A compact fixed-height desk with A-shaped steel legs that leave the full underside clear for a chair or storage. IKEA publishes a single assembled height of 75 cm and a 50 kg maximum load for the 120 by 70 cm top. It sits in IKEA's office range and carries the range's 10-year guarantee.
- Specs recorded: `depth_cm` = 70; `height_adjustable` = false; `max_load_kg` = 50; `warranty_years` = 10; `width_cm` = 120
- Evidence:
  - https://www.ikea.com.tr/en/product/trotten-white-120x70-cm-desk-59621917?component=complementary — covers: width_cm, depth_cm, max_load_kg, warranty_years, height_adjustable — Manufacturer page opened: Measurements list Width 120 cm, Depth 70 cm, Height 75 cm (single fixed height, product positioned as 'desk', not sit/stand), Max. load 50 kg; page states '10 year guarantee'.
- All sources consulted: https://www.ikea.com.tr/en/product/trotten-white-120x70-cm-desk-59621917?component=complementary · https://www.ikea.com.tw/en/products/office-workspace/office-desks-and-tables/trotten-spr-39621918 · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf

### BEKANT desk, white, 160x80 cm — `ikea-bekant-desk-160x80`
- Brand: IKEA · Model ref: BEKANT 190.228.08
- Destination: https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/
- Summary (original editorial): A large straight office desk sold as the fixed counterpart to the separate BEKANT sit/stand model; its top height is chosen once, when the legs are mounted at assembly. IKEA rates the 160 by 80 cm surface for 100 kg, the highest load among the fixed desks in this set. The product page states a 10-year guarantee.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = false; `max_load_kg` = 100; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/ — covers: warranty_years, height_adjustable — Manufacturer page opened: states '10 year guarantee'; description says the top is mounted at a height that suits you because legs are adjustable between 65-85 cm at assembly. Maker positions this as 'desk' and sells height adjustment in use only as the separate 'BEKANT desk sit/stand', so height_adjustable is false.
  - https://www.ikea.com/in/en/p/bekant-desk-white-s09222563/ — covers: width_cm, depth_cm, max_load_kg — Manufacturer page indexed content: Measurements Length 160 cm, Depth 80 cm, Max. load 100 kg. IKEA's 'Length' (long side) is recorded as width_cm and 'Depth' as depth_cm.
- All sources consulted: https://www.ikea.com/ie/en/p/bekant-desk-white-s19022808/ · https://www.ikea.com/in/en/p/bekant-desk-white-s09222563/ · https://www.ikea.cn/cn/en/p/bekant-desk-linoleum-blue-white-s89282765/

### BEKANT corner desk left, white/black, 160x110 cm — `ikea-bekant-corner-desk-left-160x110`
- Brand: IKEA · Model ref: BEKANT 090.064.08
- Destination: https://www.ikea.com/mx/en/p/bekant-corner-desk-left-white-black-s09006408/
- Summary (original editorial): A left-hand corner version of the BEKANT fixed desk, giving a deeper 110 cm return on one side for a larger work area. Like the straight BEKANT, the height is set when the legs are mounted rather than adjusted in use. IKEA publishes a 100 kg maximum load and a 10-year guarantee for it.
- Specs recorded: `depth_cm` = 110; `height_adjustable` = false; `max_load_kg` = 100; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.com/mx/en/p/bekant-corner-desk-left-white-black-s09006408/ — covers: width_cm, depth_cm, max_load_kg — Manufacturer page indexed content for article 090.064.08: Measurements Length 160 cm, Depth 110 cm, Max. height 85 cm, Max. load 100 kg. 'Length' recorded as width_cm, 'Depth' as depth_cm.
  - https://www.ikea.com.tr/en/p09006408 — covers: warranty_years, height_adjustable — Manufacturer page opened for the same article: states '10 year guarantee' and that the top is mounted at a chosen height, legs adjustable between 65-85 cm at assembly; positioned as 'corner desk left', distinct from the separate sit/stand version, so height_adjustable is false.
- All sources consulted: https://www.ikea.com/mx/en/p/bekant-corner-desk-left-white-black-s09006408/ · https://www.ikea.com.tr/en/p09006408

### MITTZON desk, oak veneer/white, 120x80 cm — `ikea-mittzon-desk-120x80`
- Brand: IKEA · Model ref: MITTZON 295.260.97
- Destination: https://www.ikea.com/ee/en/p/mittzon-desk-oak-veneer-white-s29526097/
- Summary (original editorial): A 120 by 80 cm desk from IKEA's MITTZON office system whose working height is selected during assembly. IKEA states plainly that the legs must be reassembled to change that height, which makes it a fixed desk in use rather than a sit-stand desk. It is rated for 50 kg and backed by a 10-year guarantee.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = false; `max_load_kg` = 50; `warranty_years` = 10; `width_cm` = 120
- Evidence:
  - https://www.ikea.com/ee/en/p/mittzon-desk-oak-veneer-white-s29526097/ — covers: warranty_years, height_adjustable, width_cm, depth_cm, max_load_kg — Manufacturer page opened: 'Backed by a 10-year guarantee' and 'possibility to set the right height during assembly'; description states 'Reassembly of legs required to change the desk height', supporting height_adjustable false. Indexed Measurements for the same page: Max. load 50 kg, Width 120 cm, Depth 80 cm.
  - https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf — covers: warranty_years — Manufacturer guarantee brochure opened: 10-year guarantee covering defects in material, workmanship and function, listing 'MITTZON desks, tables' among covered products.
- All sources consulted: https://www.ikea.com/ee/en/p/mittzon-desk-oak-veneer-white-s29526097/ · https://www.ikea.com/be/en/p/mittzon-desk-walnut-veneer-black-s89526099/ · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf

### IDÅSEN desk, brown/dark grey, 160x80 cm — `ikea-idasen-desk-160x80`
- Brand: IKEA · Model ref: IDÅSEN 792.810.40
- Destination: https://www.ikea.com/in/en/p/idasen-desk-brown-dark-grey-s79281040/
- Summary (original editorial): The fixed version of IDÅSEN pairs a contoured 160 by 80 cm top with trestle-style legs whose height is set when the top is mounted. IKEA rates this version for 70 kg, notably more than several smaller fixed desks here. The product page labels it with a 10-year warranty.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = false; `max_load_kg` = 70; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.com/in/en/p/idasen-desk-brown-dark-grey-s79281040/ — covers: warranty_years, height_adjustable, width_cm, depth_cm, max_load_kg — Manufacturer page opened: shows '10 year warranty'; description says the top is mounted at a height that suits you since legs are adjustable between 62 and 76 cm at assembly (maker sells adjustment in use only as 'IDÅSEN desk sit/stand'). Indexed Measurements for the same page: Length 160 cm, Width 80 cm, Max. load 70 kg; 'Length' recorded as width_cm, 'Width' (short side) as depth_cm.
- All sources consulted: https://www.ikea.com/in/en/p/idasen-desk-brown-dark-grey-s79281040/ · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf


## standing-desks (5/5)

### BEKANT desk sit/stand, white, 120x80 cm — `ikea-bekant-desk-sit-stand-120x80`
- Brand: IKEA · Model ref: BEKANT 490.225.19
- Destination: https://www.ikea.com/at/en/p/bekant-desk-sit-stand-white-s49022519/
- Summary (original editorial): IKEA's mainstream electric sit-stand desk, raising and lowering its 120 by 80 cm top at the touch of a button. The published range runs from 65 cm for sitting to 125 cm for standing, with a 70 kg maximum load. IKEA states a 10-year guarantee on the product page.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = true; `max_desk_height_cm` = 125; `max_load_kg` = 70; `motorized` = true; `warranty_years` = 10; `width_cm` = 120
- Evidence:
  - https://www.ikea.com/at/en/p/bekant-desk-sit-stand-white-s49022519/ — covers: warranty_years, height_adjustable, max_desk_height_cm, motorized — Manufacturer page opened: '10 year guarantee'; description states height is adjusted electrically from 65 to 125 cm, and the electric sit/stand underframe raises and lowers the desk at the touch of a button, supporting motorized true and max_desk_height_cm 125.
  - https://www.ikea.cn/cn/en/p/bekant-desk-sit-stand-white-s49386411/ — covers: width_cm, depth_cm, max_load_kg, max_desk_height_cm — Manufacturer page indexed content for the same 120x80 white configuration: Length 120 cm, Width 80 cm, Min. height 65 cm, Max. height 125 cm, Max. load 70 kg. 'Length' recorded as width_cm, 'Width' (short side) as depth_cm.
- All sources consulted: https://www.ikea.com/at/en/p/bekant-desk-sit-stand-white-s49022519/ · https://www.ikea.com/be/en/p/bekant-desk-sit-stand-white-s49022519/ · https://www.ikea.cn/cn/en/p/bekant-desk-sit-stand-white-s49386411/

### IDÅSEN desk sit/stand, brown/beige, 160x80 cm — `ikea-idasen-desk-sit-stand-160x80`
- Brand: IKEA · Model ref: IDÅSEN 292.809.67
- Destination: https://www.ikea.com/nz/en/p/idasen-desk-sit-stand-brown-beige-s29280967/
- Summary (original editorial): The electric IDÅSEN offers the widest height span in this set, from 63 cm up to 127 cm, on a 160 by 80 cm contoured top. It can also be controlled through a desk-control app as well as its handle switch. IKEA publishes a 70 kg maximum load and a 10-year guarantee.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = true; `max_desk_height_cm` = 127; `max_load_kg` = 70; `motorized` = true; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.com/nz/en/p/idasen-desk-sit-stand-brown-beige-s29280967/ — covers: warranty_years, height_adjustable, max_desk_height_cm — Manufacturer page opened: '10 year guarantee'; description states the height adjusts between 63 and 127 cm, so the maximum of the published range is 127 cm.
  - https://www.ikea.cn/cn/en/p/idasen-desk-sit-stand-brown-beige-s59280975/ — covers: width_cm, depth_cm, max_load_kg, motorized — Manufacturer page indexed content: Product dimensions Length 160 cm, Width 80 cm, Min. height 63 cm, Max. height 127 cm, Max. load 70 kg; components list the electric sit/stand underframe ('underframe sit/stand f table tp, el') and app control, supporting motorized true. 'Length' recorded as width_cm, 'Width' as depth_cm.
- All sources consulted: https://www.ikea.com/nz/en/p/idasen-desk-sit-stand-brown-beige-s29280967/ · https://www.ikea.cn/cn/en/p/idasen-desk-sit-stand-brown-beige-s59280975/ · https://www.ikea.cn/cn/en/p/idasen-desk-sit-stand-brown-dark-grey-s29281014/

### MITTZON desk sit/stand, electric white/black, 160x60 cm — `ikea-mittzon-desk-sit-stand-160x60`
- Brand: IKEA · Model ref: MITTZON 095.291.34
- Destination: https://www.ikea.cn/cn/en/p/mittzon-mi-te-cong-zuo-zhan-liang-yong-shi-ban-gong-zhuo-dian-dong-bai-se-hei-se-s09529134/
- Summary (original editorial): A dual-motor electric desk in IKEA's MITTZON system, here in the shallower 160 by 60 cm configuration. It carries the highest load in this standing set at 80 kg and reaches 126 cm at the top of its range. The maker includes a cable-management tray and a hand control with two memory settings, under a 10-year guarantee.
- Specs recorded: `depth_cm` = 60; `height_adjustable` = true; `max_desk_height_cm` = 126; `max_load_kg` = 80; `motorized` = true; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.cn/cn/en/p/mittzon-mi-te-cong-zuo-zhan-liang-yong-shi-ban-gong-zhuo-dian-dong-bai-se-hei-se-s09529134/ — covers: warranty_years, motorized, height_adjustable, width_cm, depth_cm, max_load_kg, max_desk_height_cm — Manufacturer page opened: states '10-year guarantee', 'Dual-motor desk' and an electric sit/stand hand control with 2 memory settings. Indexed Product dimensions for the same page (160x60 configuration): Width 160 cm, Depth 60 cm, Max. load 80 kg, Max. height 126 cm, Min. height 62 cm.
- All sources consulted: https://www.ikea.cn/cn/en/p/mittzon-mi-te-cong-zuo-zhan-liang-yong-shi-ban-gong-zhuo-dian-dong-bai-se-hei-se-s09529134/ · https://www.ikea.com.tw/en/products/office-workspace/office-desks-and-tables/mittzon-spr-99527734 · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf

### RODULF desk sit/stand, electric/white, 140x80 cm — `ikea-rodulf-desk-sit-stand-140x80`
- Brand: IKEA · Model ref: RODULF 595.303.28
- Destination: https://www.ikea.com/nl/en/p/rodulf-desk-sit-stand-electric-white-s59530328/
- Summary (original editorial): A mid-size electric sit-stand desk with a 140 by 80 cm top and a hand control offering two memory settings. IKEA publishes an electric adjustment range of 70 to 117 cm and a 70 kg maximum load. RODULF is named in IKEA's office furniture guarantee brochure with a 10-year guarantee.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = true; `max_desk_height_cm` = 117; `max_load_kg` = 70; `motorized` = true; `warranty_years` = 10; `width_cm` = 140
- Evidence:
  - https://www.ikea.com/cz/en/p/rodulf-desk-sit-stand-electric-white-s59530328/ — covers: width_cm, depth_cm, max_load_kg, max_desk_height_cm, motorized, height_adjustable — Manufacturer page indexed content for article 595.303.28: 'Electric height adjustment from 70-117 cm', dual-motor description, Measurements Length 140 cm, Width 80 cm, Min. height 70 cm, Max. height 117 cm, Max. load 70 kg. 'Length' recorded as width_cm, 'Width' as depth_cm.
  - https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf — covers: warranty_years — Manufacturer guarantee brochure opened: 10-year guarantee listing 'RODULF desk' among the covered office products.
- All sources consulted: https://www.ikea.com/cz/en/p/rodulf-desk-sit-stand-electric-white-s59530328/?page-title=~RODULF~%20Desk%20sit%2Fstand&page-url=https://www.ikea.com/cz/en/p/rodulf-desk-sit-stand-electric-white-s59530328/ · https://www.ikea.com/nl/en/p/rodulf-desk-sit-stand-electric-white-s59530328/ · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf

### TROTTEN desk sit/stand, white, 160x80 cm — `ikea-trotten-desk-sit-stand-160x80`
- Brand: IKEA · Model ref: TROTTEN 594.296.03
- Destination: https://www.ikea.cn/cn/en/p/trotten-desk-sit-stand-white-s59429603/
- Summary (original editorial): The only manual desk in this standing set: a crank handle, which can be fitted on either side, moves the 160 by 80 cm top between sitting and standing heights. IKEA rates it for 50 kg, lower than the electric models here. It carries the TROTTEN range's 10-year guarantee.
- Specs recorded: `depth_cm` = 80; `height_adjustable` = true; `max_desk_height_cm` = 122; `max_load_kg` = 50; `motorized` = false; `warranty_years` = 10; `width_cm` = 160
- Evidence:
  - https://www.ikea.cn/cn/en/p/trotten-desk-sit-stand-white-s59429603/ — covers: warranty_years, height_adjustable, motorized, width_cm, depth_cm, max_load_kg, max_desk_height_cm — Manufacturer page opened: states '10 year guarantee'; text says height is adjusted between 70 and 120 cm 'by just cranking the handle' (manual, so motorized false); Product dimensions list Width 160 cm, Depth 80 cm, Max. height 122 cm, Min. height 72 cm, Max. load 50 kg. max_desk_height_cm uses the page's published assembled Max. height of 122 cm.
- All sources consulted: https://www.ikea.cn/cn/en/p/trotten-desk-sit-stand-white-s59429603/ · https://www.ikea.com/ee/en/files/pdf/5e/b8/5eb89fb6/office_furniture_guarantee_brochure_a5.pdf


## office-chairs (5/5)

### Sayl Office Chair — `herman-miller-sayl`
- Brand: Herman Miller · Model ref: Sayl
- Destination: https://eustore.hermanmiller.com/products/sayl-office-chair
- Summary (original editorial): A task chair built around a frameless, suspension-style back inspired by bridge engineering, so the back flexes and supports the spine without a rigid frame. It offers pneumatic seat-height adjustment, an optional height-adjustable lumbar support, and a choice of fixed or fully adjustable arms. Herman Miller rates it for users up to 159 kg and backs it with a 12-year warranty.
- Specs recorded: `adjustable_lumbar_support` = true; `armrest_adjustable` = true; `height_adjustable` = true; `max_load_kg` = 159; `warranty_years` = 12
- Evidence:
  - https://eustore.hermanmiller.com/products/sayl-office-chair?variant=56420164862331 — covers: max_load_kg, warranty_years, height_adjustable, adjustable_lumbar_support, armrest_adjustable — Manufacturer store product page states 'Max Capacity 159 kg' and 'This product has a 12-year warranty'; seat height range 419-559 mm confirms height adjustment. Features list includes 'Optional Height Adjustable Lumbar Support' (a factory-fitted integrated option, not a loose add-on pillow; the standard back has PostureFit sacral support) and the configurator offers 'Fixed or Fully Adjustable Arms' — armrest_adjustable recorded for the fully adjustable arms configuration.
- All sources consulted: https://eustore.hermanmiller.com/products/sayl-office-chair?variant=56420164862331

### Steelcase Series 1 — `steelcase-series-1`
- Brand: Steelcase · Model ref: Series 1
- Destination: https://www.steelcase.com/products/office-chairs/steelcase-series-1/
- Summary (original editorial): Steelcase's entry-level ergonomic work chair pairs a weight-activated or manual synchro mechanism with a seat that adjusts in both height and depth. Height-adjustable lumbar support is fitted as standard, and the standard arms move in four dimensions. It is rated for users up to 400 lb and covered by a 12-year parts-and-labor limited warranty.
- Specs recorded: `adjustable_lumbar_support` = true; `armrest_adjustable` = true; `height_adjustable` = true; `max_load_kg` = 181.4; `warranty_years` = 12
- Evidence:
  - https://www.steelcase.com/products/office-chairs/steelcase-series-1/?drawer_main=documents&drawer_sub=product-literature — covers: max_load_kg, warranty_years, adjustable_lumbar_support, height_adjustable, armrest_adjustable — Manufacturer product page states the chair supports users 'up to 400 lbs' (original figure in lb; 400 / 2.20462 = 181.4 kg), is 'backed by the Steelcase Limited Lifetime warranty - 12 years, multi-shift, 24/7 parts and labor' (limited warranty), 'Adjustable lumbar is standard', the 'Seat is height- and depth-adjustable', and 'Standard 4-dimensional arm support adjusts to preferred height, width, depth, and pivot'.
  - https://www.steelcase.com/eu-en/products/office-chairs/steelcase-series-1/ — covers: adjustable_lumbar_support, armrest_adjustable, height_adjustable — Manufacturer EU product page corroborates: 'Height-adjustable lumbar support comes as standard', 'Standard 4-dimensional arm support adjusts to preferred height, width, depth, and pivot', and 'Seat is height- and depth-adjustable'.
- All sources consulted: https://www.steelcase.com/products/office-chairs/steelcase-series-1/?drawer_main=documents&drawer_sub=product-literature · https://www.steelcase.com/eu-en/products/office-chairs/steelcase-series-1/

### Zody — `haworth-zody`
- Brand: Haworth · Model ref: Zody
- Destination: https://in.shopping.haworth.com/products/zody-ergonomic-office-chair
- Summary (original editorial): Haworth's long-running ergonomic task chair is known for its pelvic and asymmetrical lumbar system, which lets the user adjust lumbar height and set support independently on the left and right sides. It adds 4D arms and a sliding seat on a standard five-star base. Haworth warrants it for people up to 145 kg, with seating covered for 12 years under its limited warranty.
- Specs recorded: `adjustable_lumbar_support` = true; `armrest_adjustable` = true; `height_adjustable` = true; `max_load_kg` = 145; `warranty_years` = 12
- Evidence:
  - https://in.shopping.haworth.com/products/zody-ergonomic-office-chair — covers: max_load_kg, height_adjustable, adjustable_lumbar_support, armrest_adjustable — Haworth's own webshop product page states 'Warrantied for people up to 145 Kg' (maker's rated capacity), 'Seat height adjusts from 412 mm to 544 mm', 'Lumbar support adjusts up and down' (and independently left/right via the PAL system), and '4D adjustable arms'.
  - https://www.haworth.com/na/en/design-resources/warranty.html — covers: warranty_years — Haworth North America Limited Warranty (effective April 1, 2026) lists 'Twelve (12) Years' coverage for Haworth branded seating products; warranty is limited.
- All sources consulted: https://in.shopping.haworth.com/products/zody-ergonomic-office-chair · https://www.haworth.com/na/en/design-resources/warranty.html

### JÄRVFJÄLLET Office Chair with Armrests — `ikea-jarvfjallet`
- Brand: IKEA · Model ref: 205.218.53
- Destination: https://www.ikea.com.tw/en/products/office-workspace/office-chairs/jarvfjallet-art-20521853
- Summary (original editorial): IKEA's higher-end ergonomic chair combines a mesh back with a shaped, height-adjustable lumbar support and a synchronised tilt mechanism that follows the sitter's movements. The seat adjusts in height and depth, and the armrests adjust in height and width (2D). IKEA tests it for loads up to 110 kg and includes a 10-year guarantee.
- Specs recorded: `adjustable_lumbar_support` = true; `armrest_adjustable` = true; `height_adjustable` = true; `max_load_kg` = 110; `seat_depth_cm` = 46; `warranty_years` = 10
- Evidence:
  - https://www.ikea.com.tw/en/products/office-workspace/office-chairs/jarvfjallet-art-20521853 — covers: height_adjustable, adjustable_lumbar_support, armrest_adjustable, warranty_years, max_load_kg, seat_depth_cm — IKEA product page (article 205.218.53, Grann white) lists under Ergonomics: 'Adjustable seat height, Adjustable seat depth, Adjustable lumbar support, 2D adjustable armrests', states '10 year guarantee', and its measurement table gives 'Tested for: 110 kg', 'Seat depth: 46 cm', 'Min. seat height: 45 cm', 'Max. seat height: 56 cm'.
  - https://www.ikea.com/ie/en/p/jaervfjaellet-office-chair-with-armrests-glose-black-20510642/ — covers: adjustable_lumbar_support, warranty_years, max_load_kg — IKEA Ireland page for the same chair (Glose black, article 205.106.42) corroborates: 'well-shaped backrest with adjustable lumbar support', '10 year guarantee', 'Tested for: 110 kg'.
- All sources consulted: https://www.ikea.com.tw/en/products/office-workspace/office-chairs/jarvfjallet-art-20521853 · https://www.ikea.com/ie/en/p/jaervfjaellet-office-chair-with-armrests-glose-black-20510642/

### MARKUS Office Chair, Vissle Dark Gray, Medium — `ikea-markus`
- Brand: IKEA · Model ref: 502.611.51
- Destination: https://www.ikea.com/th/en/p/markus-office-chair-vissle-dark-grey-50261151/
- Summary (original editorial): A tall mesh-back office chair with an integrated headrest and a curved back that gives built-in, non-adjustable lumbar support; only the seat height is adjustable, and the armrests are fixed. Tilt tension is set manually with a knob under the seat. IKEA tests the Medium version for up to 110 kg and covers it with a 10-year guarantee.
- Specs recorded: `adjustable_lumbar_support` = false; `armrest_adjustable` = false; `height_adjustable` = true; `max_load_kg` = 110; `warranty_years` = 10
- Evidence:
  - https://www.ikea.com/th/en/p/markus-office-chair-vissle-dark-grey-50261151/ — covers: max_load_kg, warranty_years, adjustable_lumbar_support, armrest_adjustable — IKEA product page (Medium, article 502.611.51) states 'Tested for: 110 kg' and '10 year guarantee', and describes 'built-in lumbar support' — a fixed, integrated support with no adjustment offered, so adjustable_lumbar_support is false. The maker's details name no armrest adjustment (fixed armrests), so armrest_adjustable is false. Note: figures are for the Medium article 502.611.51; the Large variant is tested for a higher load and was not mixed in.
  - http://ikea.com/ph/en/p/markus-office-chair-vissle-dark-gray-50261151/ — covers: height_adjustable, warranty_years — IKEA Philippines page for the same article states '10-year Warranty' and lists 'Adjustable seat height. Manual tilt tension.' as the chair's adjustments — seat height is the only height adjustment claimed by the maker.
- All sources consulted: https://www.ikea.com/th/en/p/markus-office-chair-vissle-dark-grey-50261151/ · http://ikea.com/ph/en/p/markus-office-chair-vissle-dark-gray-50261151/


## desk-lighting (5/5)

### Solarcycle Morph Desk Lamp — `dyson-solarcycle-morph-desk`
- Brand: Dyson · Model ref: CD06
- Destination: https://www.dyson.co.uk/lighting/desk-lamps/solarcycle-morph/black-black
- Summary (original editorial): Dyson's desk lamp tracks local daylight and shifts its colour temperature and brightness through the day to match, using an articulated arm that can also dock into a floor-style or ambient configuration in the Morph design. Output is rated at 850 lumens with slide-touch controls for dimming and colour temperature between 2700K and 6500K. Dyson covers its lighting range with a 5-year guarantee.
- Specs recorded: `adjustable_color_temperature` = true; `brightness_lumens` = 850; `dimmable` = true; `warranty_years` = 5
- Evidence:
  - https://www.dyson.co.uk/lighting/desk-lamps/solarcycle-morph/black-black — covers: brightness_lumens, dimmable, adjustable_color_temperature — Manufacturer product page states 'Light output 850 lm', colour temperature 2700-6500 K, and 'Dimming and colour temperature controls' via slide touch controls (rated power 11.2 W).
  - https://www.dyson.com.au/footer-primary-links/guarantee-terms — covers: warranty_years — Dyson's guarantee terms page states 'All Dyson lighting and hand dryers come with a 5-year Dyson Guarantee.' (The product page's generic '2-5 year warranty' line is ambiguous, so the guarantee-terms figure is used.)
- All sources consulted: https://www.dyson.co.uk/lighting/desk-lamps/solarcycle-morph/black-black · https://www.dyson.com.au/footer-primary-links/guarantee-terms

### WiT e-Reading Lamp — `benq-wit-e-reading-lamp`
- Brand: BenQ · Model ref: AR15_D
- Destination: https://www.benq.com/en-ap/lighting/e-reading-desk-lamp.html
- Summary (original editorial): BenQ's WiT is a wide-curve desk lamp designed to light a broad desktop area evenly for reading and screen work. A rotary knob handles dimming, an auto-dimming mode reacts to ambient light, and colour temperature steps through 13 levels from 2700K to 5700K. BenQ's own lamp comparison lists its luminous flux at 800 lm at 2700K and 900 lm at 5700K.
- Specs recorded: `adjustable_color_temperature` = true; `brightness_lumens` = 900; `dimmable` = true; `warranty_years` = 1
- Evidence:
  - https://g5-staging64.benq.com/en-me/lamps.html — covers: brightness_lumens, adjustable_color_temperature — BenQ's own lamp comparison table (benq.com subdomain) lists the WiT Eye-Care Desk Lamp's Luminous Flux as '2700K: 800 lm / 5700K: 900 lm' and colour temperature 2700K-5700K; brightness_lumens records the maximum published figure (900 lm). Note: BenQ's current regional spec page for this lamp publishes only center illuminance (1600 lux) and no lumens, so the lumen figure is taken from BenQ's own comparison table.
  - https://www.benq.com/en-ap/lighting/e-reading-desk-lamp.html — covers: dimmable, adjustable_color_temperature — Manufacturer product page describes the 'Dimming Knob', 'Auto Dimming Mode', and '2700K-5700K 13 Levels Color Temperature' with paper/screen reading modes.
  - https://www.benq.com/en-sg/support/registration-warranty/warranty-information/lamp.html — covers: warranty_years — BenQ Singapore warranty information page table: 'Lamps and ScreenBar model/type | All models | 12 months' — a 1-year manufacturer warranty for the lamp line.
- All sources consulted: https://g5-staging64.benq.com/en-me/lamps.html · https://www.benq.com/en-ap/lighting/e-reading-desk-lamp.html · https://www.benq.com/en-sg/support/registration-warranty/warranty-information/lamp.html

### ScreenBar Monitor Light Bar — `benq-screenbar`
- Brand: BenQ · Model ref: ScreenBar
- Destination: https://www.benq.com/en-ph/lighting/monitor-light.html
- Summary (original editorial): The original ScreenBar clips onto the top of a monitor and throws light onto the desk only, avoiding screen glare while freeing up desk space. A built-in ambient sensor provides real-time auto-dimming, brightness can also be set manually by touch, and colour temperature spans 2700K to 6500K in 8 levels. BenQ's own comparison table rates its luminous flux at up to 320 lm depending on colour temperature.
- Specs recorded: `adjustable_color_temperature` = true; `brightness_lumens` = 320; `dimmable` = true; `warranty_years` = 1
- Evidence:
  - https://g5-staging64.benq.com/en-me/lamps.html — covers: brightness_lumens, adjustable_color_temperature — BenQ's own lamp comparison table (benq.com subdomain) lists ScreenBar Luminous Flux as '2700K: 220~300 lm / 6500K: 230~320 lm' and colour temperature 2700K-6500K; brightness_lumens records the maximum of the manufacturer's published range (320 lm). Higher lumen figures seen on retailer/ICEcat sheets (e.g. 930) are not manufacturer-published and conflict with this table (apparent lux confusion), so they were not used.
  - https://www.benq.com/en-ph/lighting/monitor-light.html — covers: dimmable, adjustable_color_temperature — BenQ ScreenBar series page lists the original ScreenBar with 'Color Temperature 2700K - 6500K 8 Levels' and 'Real-time Auto-Dimming, Auto Dimming Mode', confirming both dimming and adjustable colour temperature.
  - https://www.benq.com/en-sg/support/registration-warranty/warranty-information/lamp.html — covers: warranty_years — BenQ Singapore warranty information page explicitly covers ScreenBar: 'Lamps and ScreenBar model/type | All models | 12 months' — a 1-year manufacturer warranty.
- All sources consulted: https://g5-staging64.benq.com/en-me/lamps.html · https://www.benq.com/en-ph/lighting/monitor-light.html · https://www.benq.com/en-sg/support/registration-warranty/warranty-information/lamp.html

### Harmonize LED Desk Lamp — `ottlite-harmonize-led-desk-lamp`
- Brand: OttLite · Model ref: CS01SV9-SHPR
- Destination: https://ottlite.com/products/harmonize-led-desk-lamp
- Summary (original editorial): A compact OttLite desk lamp using the brand's ClearSun LED, which is designed to reduce eyestrain by mimicking natural daylight. It offers three touch-controlled brightness settings and three colour temperature modes, with a maximum output of 440 lumens. OttLite backs its lamps with a 2-year warranty.
- Specs recorded: `adjustable_color_temperature` = true; `brightness_lumens` = 440; `dimmable` = true; `warranty_years` = 2
- Evidence:
  - https://ottlite.com/products/harmonize-led-desk-lamp — covers: brightness_lumens, dimmable, adjustable_color_temperature, warranty_years — Manufacturer product page (model CS01SV9-SHPR) states 'Maximum lumen output of 440', '3 brightness settings' with touch controls (dimmable), '3 color temperature modes', and '2 Year Warranty' on all lamps.
  - https://www.ottlite.com/warranty — covers: warranty_years — OttLite warranty page confirms '2 years from date of purchase: OttLite lamps and accessories (excluding batteries)'.
- All sources consulted: https://ottlite.com/products/harmonize-led-desk-lamp · https://www.ottlite.com/warranty

### Recharge LED Desk Lamp — `ottlite-recharge-led-desk-lamp`
- Brand: OttLite · Model ref: CS59G59-SHPR
- Destination: https://ottlite.com/products/recharge-led-desk-lamp-black
- Summary (original editorial): A cordless, rechargeable OttLite desk lamp built for portability, with a flexible neck and the brand's ClearSun daylight-style LED. It provides three brightness settings and a maximum output of 275 lumens, so it suits travel, bedside, or temporary workspaces. Like other OttLite lamps it carries a 2-year warranty.
- Specs recorded: `brightness_lumens` = 275; `dimmable` = true; `warranty_years` = 2
- Evidence:
  - https://ottlite.com/products/recharge-led-desk-lamp-black — covers: brightness_lumens, dimmable, warranty_years — Manufacturer product page (black variant, model CS59G59-SHPR) states 'Maximum lumen output of 275', 'Three brightness settings' (dimmable), and '2 Year Warranty' on all lamps. The page lists no colour-temperature modes (single ClearSun output), so adjustable_color_temperature is omitted rather than claimed.
  - https://www.ottlite.com/warranty — covers: warranty_years — OttLite warranty page confirms '2 years from date of purchase: OttLite lamps and accessories (excluding batteries)'.
- All sources consulted: https://ottlite.com/products/recharge-led-desk-lamp-black · https://www.ottlite.com/warranty


## monitor-arms (1/1)

### LX Desk Monitor Arm — `ergotron-lx-desk-monitor-arm`
- Brand: Ergotron · Model ref: 45-241-026
- Destination: https://media.ergotron.com/reserved/resources/05-056-ea-orig.pdf
- Summary (original editorial): Ergotron's LX is a single-display desk arm built around a counterbalanced lift that lets the screen be repositioned with a light touch. It folds back toward its pole to free up desk space and ships with both desk-clamp and grommet mounting hardware. The maker rates it for typical screens up to 34 inches and backs it with a ten-year warranty.
- Specs recorded: `height_adjustable` = true; `max_load_kg` = 11.3; `screen_size_max_in` = 34; `tilt_adjustable` = true; `vesa_compatible` = true; `warranty_years` = 10
- Evidence:
  - https://media.ergotron.com/reserved/resources/05-056-ea-orig.pdf — covers: height_adjustable, max_load_kg, warranty_years, screen_size_max_in, vesa_compatible, tilt_adjustable — Official Ergotron LX datasheet (c) 2024 Ergotron, Inc., rev. 08.09.2024, hosted on media.ergotron.com. States: Typical LCD Size <= 34 in; Weight Capacity 7-25 lbs (3.2-11.3 kg) - max_load_kg 11.3 taken from maker's own kg figure (25 lb / 2.20462 = 11.3 kg); Lift 13 in (33 cm) so height_adjustable=true; Tilt 75 degrees so tilt_adjustable=true; VESA FDMI MIS-D, 100/75, C (100 x 100 mm & 75 x 75 mm) so vesa_compatible=true; Warranty 10 years. Part numbers listed include 45-241-026 (polished aluminum/black, 2-piece desk clamp).
- All sources consulted: https://media.ergotron.com/reserved/resources/05-056-ea-orig.pdf · https://www.ergodirect.com/16106-ergotron-45-241-026-lx-desk-mount-lcd-arm.html


## laptop-stands (1/1)

### C3 Fully Aluminum Detachable Laptop Stand — `nulaxy-c3-laptop-stand`
- Brand: Nulaxy · Model ref: C3
- Destination: https://nulaxy.com/products/laptop-stand/
- Summary (original editorial): The Nulaxy C3 is a fixed-height riser made from 5 mm aluminium alloy that lifts a laptop screen by about seven inches. Its three pieces slot together without tools and can be taken apart again for storage or travel. An open back is intended to aid airflow, and rubber pads help keep the machine steady on the stand.
- Specs recorded: `height_adjustable` = false; `max_laptop_size_in` = 16; `max_load_kg` = 10
- Evidence:
  - https://nulaxy.com/products/laptop-stand/ — covers: max_laptop_size_in, height_adjustable, max_load_kg — Manufacturer product page (nulaxy.com), opened directly. States compatibility with all laptops from 10-16 inches, so max_laptop_size_in=16. States the stand is able to support a laptop weighing up to 22 lbs (10 kg) - maker publishes 10 kg directly (22 / 2.20462 = 10.0 kg), so max_load_kg=10. Describes a fixed ergonomic riser that elevates the screen to 7 inches with a detachable 3-part construction and no height-adjustment mechanism, so height_adjustable=false is recorded honestly for a fixed riser.
- All sources consulted: https://nulaxy.com/products/laptop-stand/


## desk-organization-storage (1/1)

### ALEX Drawer Unit, White, 36x70 cm — `ikea-alex-drawer-unit`
- Brand: IKEA · Model ref: 404.735.49
- Destination: https://www.ikea.com/sg/en/p/alex-drawer-unit-white-40473549/
- Summary (original editorial): IKEA's ALEX is a narrow drawer unit designed to support a desk or stand alone, with a finished back so it can be placed anywhere in a room. Its five drawers come in shallower and deeper sizes, giving a mix of compartment depths within a 36 cm-wide footprint. Drawer stops keep each drawer from being pulled out too far.
- Specs recorded: `depth_cm` = 58; `max_load_kg` = 12; `storage_compartments` = 5; `width_cm` = 36
- Evidence:
  - https://www.ikea.com/sg/en/p/alex-drawer-unit-white-40473549/ — covers: storage_compartments — IKEA's own product page for ALEX Drawer unit, white, 36x70 cm, article number 404.735.49, opened directly. The page's product imagery descriptions on ikea.com describe the unit as having five drawers ('five-drawer' unit), so storage_compartments=5 (number of drawers as presented by the maker). Page also confirms product name and article number.
  - https://www.ikea.com.tw/en/products/home-workspace/storage-for-home-office/alex-art-40473549?pr_rd_page=2 — covers: width_cm, depth_cm, max_load_kg — IKEA Taiwan official product page for the same article (404.735.49), opened directly; its Product measurements table states verbatim: Max. load 12 kg; Width 36 cm; Depth 58 cm; Height 70 cm; Depth of drawer (inside) 52 cm; Max. load/drawer 4 kg. The same measurements block (Width 36 cm, Depth 58 cm, Max. load 12 kg) appears consistently across IKEA country sites for this article family (e.g. 004.735.46 / 604.735.48 variants).
- All sources consulted: https://www.ikea.com/sg/en/p/alex-drawer-unit-white-40473549/ · https://www.ikea.com.tw/en/products/home-workspace/storage-for-home-office/alex-art-40473549?pr_rd_page=2


## ergonomic-supports (1/1)

### ComfiLife Foot Rest — `comfilife-foot-rest`
- Brand: ComfiLife · Model ref: — (not published by maker) · Note: Maker does not publish a model reference on its product page; a retailer listing code exists but is not carried as manufacturer data.
- Destination: https://comfilife.com/product/comfilife-foot-rest/
- Summary (original editorial): The ComfiLife Foot Rest is a memory-foam cushion for use under a desk, with a detachable lower section that adds or removes two inches of height. It can be flipped over to serve as a rocker, and its cover can be removed for machine washing. A non-slip underside helps it stay in place on the floor.
- Specs recorded: `height_adjustable` = true; `thickness_cm` = 15.2
- Evidence:
  - https://comfilife.com/product/comfilife-foot-rest/ — covers: height_adjustable, thickness_cm — Manufacturer product page (comfilife.com), opened directly. Product is described as 'Foam with Adjustable Height and Washable Cover' and the page states 'Simply add or remove 2 inches easily with the detachable bottom', so height_adjustable=true. Item Dimensions (LxWxH) are published as 17.5 x 12 x 6 inches; the 6-inch height is the cushion thickness, converted 6 x 2.54 = 15.2 cm, so thickness_cm=15.2. No warranty years or adjustable-angle figure is published on the maker page, so none is recorded.
  - https://www.desertcart.sc/products/295619830-comfilife-foot-rest-under-desk-for-office-use-adjustable-height.md — covers: model_ref — Retailer technical listing used as supplement only, for the model reference: lists Item model number 38D, manufacturer ComfiLife, and product dimensions 44.45 x 30.48 x 15.24 cm, corroborating the maker's 6-inch (15.2 cm) thickness. All recorded specs themselves come from the manufacturer's own page above.
- All sources consulted: https://comfilife.com/product/comfilife-foot-rest/ · https://www.desertcart.sc/products/295619830-comfilife-foot-rest-under-desk-for-office-use-adjustable-height.md


## usb-c-hubs (5/5)

### Anker 341 USB-C Hub (7-in-1) — `anker-341-usb-c-hub-7-in-1-a8346`
- Brand: Anker · Model ref: A8346
- Destination: https://www.anker.com/products/a8346
- Summary (original editorial): Anker's 341 is a compact travel hub that expands one USB-C port with USB-A and USB-C data, a single HDMI output and both SD and microSD readers. It is built around pass-through charging, so a separate USB-C charger powers the laptop through the hub while the other ports stay in use.
- Specs recorded: `usb_c_ports` = 1; `power_delivery_w` = 100; `usb_a_ports` = 2; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "4K@30Hz"; `usb_data_speed_gbps` = 5; `ethernet_port` = false; `card_reader_sd` = true; `card_reader_microsd` = true; `displayport_outputs` = 0; `max_external_displays` = 1
- Evidence:
  - https://www.anker.com/products/a8346 — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, card_reader_sd, card_reader_microsd — Maker lists 2 USB-A data ports, 1 USB-C data port, 1 USB-C PD charging port, 1 HDMI, SD and microSD slots. usb_c_ports=1 counts only the USB-C data port; the separate PD-only charging port is excluded per the counting rule. PD: maker headlines up to 100W pass-through (minus 15W for hub operation; FAQ states 85W reaches the laptop) - recorded value is the published 100W pass-through rating. Data up to 5 Gbps. No safety listing is stated on the maker page, hence none/not_certified.
- All sources consulted: https://www.anker.com/products/a8346

### Anker 332 USB-C Hub (5-in-1) — `anker-332-usb-c-hub-5-in-1-a8355`
- Brand: Anker · Model ref: A8355
- Destination: https://www.anker.com/products/a8355
- Summary (original editorial): The Anker 332 is the smaller sibling in Anker's hub line, keeping only the essentials: one HDMI output, two USB-A ports and one USB-C data port. It suits a light travel kit where a single external display and basic peripherals are all that is needed, with charging passed through from a separate adapter.
- Specs recorded: `usb_c_ports` = 1; `power_delivery_w` = 100; `usb_a_ports` = 2; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "4K@30Hz"; `usb_data_speed_gbps` = 5; `ethernet_port` = false; `card_reader_sd` = false; `card_reader_microsd` = false; `displayport_outputs` = 0; `max_external_displays` = 1
- Evidence:
  - https://www.anker.com/products/a8355 — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps — Maker describes 5-in-1 connectivity as a 4K HDMI port, a 5 Gbps USB-C data port, two 5 Gbps USB-A ports and a 100W PD-IN port. usb_c_ports=1 counts only the data port; the PD-IN port is a charging input and is excluded. Recorded PD is the published 100W PD-IN rating (maker elsewhere states up to 85W reaches the host). The complete maker port list contains no Ethernet or card reader, hence false for those fields. No safety listing stated on the maker page.
- All sources consulted: https://www.anker.com/products/a8355

### Plugable USB-C Hub 7-in-1 — `plugable-usb-c-hub-7-in-1-usbc-7in1`
- Brand: Plugable · Model ref: USBC-7IN1
- Destination: https://plugable.com/products/usbc-7in1
- Summary (original editorial): Plugable's 7-in-1 hub is a driver-free travel adapter with three USB-A ports, one HDMI output and twin SD and microSD readers. Its only USB-C socket is a charging pass-through, a limitation Plugable states plainly in its own FAQ. It is aimed at hot-desking and classroom fleets where no driver install is possible.
- Specs recorded: `usb_c_ports` = 0; `power_delivery_w` = 100; `usb_a_ports` = 3; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "4K 60Hz"; `usb_data_speed_gbps` = 5; `ethernet_port` = false; `card_reader_sd` = true; `card_reader_microsd` = true; `displayport_outputs` = 0; `max_external_displays` = 1
- Evidence:
  - https://plugable.com/products/usbc-7in1 — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, card_reader_sd, card_reader_microsd, max_video_resolution — Maker technical specifications: three USB-A 3.0 ports at 5Gbps, one HDMI output up to 3840x2160 at 60Hz, SD and microSD readers, and USB-C PD pass-through with up to 100W input (up to 92W to host). Maker FAQ states the USB-C port is for PD pass-through charging only and does not support data, so usb_c_ports=0 per the counting rule. The maker's comparison table on the same page marks this model with no Ethernet port. No safety listing stated on the maker page.
- All sources consulted: https://plugable.com/products/usbc-7in1

### Belkin Connect USB-C 6-in-1 Multiport Hub — `belkin-connect-usb-c-6-in-1-multiport-hub-avc008`
- Brand: Belkin · Model ref: AVC008
- Destination: https://www.belkin.com/in/support-article?articleNum=337063
- Summary (original editorial): Belkin's AVC008 is a compact multiport hub that adds the wired networking many slim hubs omit, alongside HDMI, two USB-A ports and an SD reader. Its single USB-C port handles both data and Power Delivery, keeping the body small. It is positioned for mobile work where an Ethernet jack matters as much as display output.
- Specs recorded: `usb_c_ports` = 1; `power_delivery_w` = 100; `usb_a_ports` = 2; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "4K 60Hz"; `usb_data_speed_gbps` = 5; `ethernet_port` = true; `ethernet_speed_mbps` = 1000; `card_reader_sd` = true; `card_reader_microsd` = false; `displayport_outputs` = 0; `max_external_displays` = 1
- Evidence:
  - https://www.belkin.com/in/support-article?articleNum=337063 — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, ethernet_port, ethernet_speed_mbps, card_reader_sd — Belkin official support specifications list: one 4K HDMI 1.4 port, two USB-A 3.0 ports, one Gigabit Ethernet port, one SD 3.0 card reader and one USB-C Data & Power Delivery 3.0 port, with PD passthrough at 100W and 5 Gbps bandwidth; the same page states the HDMI port supports up to 4K at 60Hz. usb_c_ports=1 because the single USB-C port is explicitly a data port as well as PD, not a PD-only input. No microSD reader appears in the complete list, hence false. No safety listing stated on this maker page.
- All sources consulted: https://www.belkin.com/in/support-article?articleNum=337063

### UGREEN Revodok Pro 108 8-in-1 USB-C Hub — `ugreen-revodok-pro-108-8-in-1-usb-c-hub-75027`
- Brand: UGREEN · Model ref: 75027
- Destination: https://www.ugreen.com/en-au/products/au-75027
- Summary (original editorial): The Revodok Pro 108 is UGREEN's faster travel hub, with 10Gbps USB-C and USB-A data ports, a 4K 60Hz HDMI output and SD and microSD readers that can be used at the same time. Charging is by pass-through from a separate adapter via its dedicated PD port. It targets users moving large files who do not need wired networking.
- Specs recorded: `usb_c_ports` = 2; `power_delivery_w` = 100; `usb_a_ports` = 2; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "4K@60Hz"; `usb_data_speed_gbps` = 10; `ethernet_port` = false; `card_reader_sd` = true; `card_reader_microsd` = true; `displayport_outputs` = 0; `max_external_displays` = 1
- Evidence:
  - https://www.ugreen.com/en-au/products/au-75027 — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, card_reader_sd, card_reader_microsd — Maker key features list 8-in-1 connectivity as a 4K@60Hz HDMI port, 2x 10Gbps USB-C data ports, 2x USB-A data ports, SD and microSD card readers and a 100W USB-C PD port; SKU 75027 in the maker specs table. usb_c_ports=2 counts the two data ports only; the separate PD port is excluded. Recorded PD is the published 100W PD port rating (maker states up to 85W pass-through reaches the laptop). The complete maker list contains no Ethernet port, hence false. No safety listing stated on the maker page.
- All sources consulted: https://www.ugreen.com/en-au/products/au-75027


## docking-stations (5/5)

### CalDigit TS4 Thunderbolt Station 4 — `caldigit-ts4-thunderbolt-station-4`
- Brand: CalDigit · Model ref: TS4
- Destination: https://www.caldigit.com/thunderbolt-station-4/
- Summary (original editorial): The TS4 is CalDigit's flagship Thunderbolt 4 dock, built around port density: eighteen ports including downstream Thunderbolt, 10Gbps USB in both shapes, DisplayPort, 2.5 Gigabit Ethernet and dual UHS-II card readers. A 230W supply lets it charge a laptop at up to 98W while powering everything attached. It is a fixed-desk dock, not a travel accessory.
- Specs recorded: `usb_c_ports` = 5; `power_delivery_w` = 98; `usb_a_ports` = 5; `hdmi_ports` = 0; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `usb_data_speed_gbps` = 10; `ethernet_port` = true; `ethernet_speed_mbps` = 2500; `card_reader_sd` = true; `card_reader_microsd` = true; `displayport_outputs` = 1; `max_external_displays` = 2
- Evidence:
  - https://www.caldigit.com/thunderbolt-station-4/ — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, ethernet_port, ethernet_speed_mbps, card_reader_sd, card_reader_microsd, displayport_outputs — Maker interface list: 3x Thunderbolt 4 (40Gb/s), 3x USB-C (10Gb/s), 5x USB-A (10Gb/s), 1x DisplayPort 1.4, SD 4.0 UHS-II, microSD 4.0 UHS-II, 1x 2.5 Gigabit Ethernet and audio ports; power delivery to host up to 98W. Counting basis: usb_c_ports=5 = the 3 USB-C data ports plus the 2 downstream Thunderbolt 4 ports (USB-C form factor, usable for peripherals/data); the third Thunderbolt 4 port is the host uplink and is excluded. The complete interface list contains no HDMI socket, hence hdmi_ports=0. No safety listing stated on the maker page.
- All sources consulted: https://www.caldigit.com/thunderbolt-station-4/

### Plugable Triple Monitor USB-C Docking Station — `plugable-triple-monitor-usb-c-docking-station-ud-768pdz`
- Brand: Plugable · Model ref: UD-768PDZ
- Destination: https://plugable.com/products/ud-768pdz
- Summary (original editorial): The UD-768PDZ is a USB-C dock whose Silicon Motion graphics let it run three external monitors, including on base Apple Silicon Macs that normally allow only one, at the cost of a driver install and a 1080p ceiling per screen. Around that it provides five USB-A ports, a 10Gbps USB-C port, Gigabit Ethernet and an SD reader, powered by its own 170W adapter.
- Specs recorded: `usb_c_ports` = 1; `power_delivery_w` = 100; `usb_a_ports` = 5; `hdmi_ports` = 3; `safety_certification_body` = "UL"; `safety_certification_status` = "verified_manufacturer_documentation"; `max_video_resolution` = "1920x1080 @ 60Hz"; `usb_data_speed_gbps` = 10; `ethernet_port` = true; `ethernet_speed_mbps` = 1000; `card_reader_sd` = true; `card_reader_microsd` = false; `displayport_outputs` = 0; `max_external_displays` = 3
- Evidence:
  - https://plugable.com/products/ud-768pdz — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, usb_data_speed_gbps, ethernet_port, card_reader_sd, max_video_resolution, max_external_displays, safety_certification_body — Maker specifications: 4x rear USB-A 3.0 (5Gbps), 1x front USB-A 3.2 Gen 2 (10Gbps), 1x front USB-C 3.2 Gen 2 (10Gbps) with 20W charging, 3x HDMI outputs each up to 1920x1080 @ 60Hz, Gigabit Ethernet (1000BASE-T), SD UHS-II card reader, and USB-C to host at 100W; the rear host USB-C port is excluded from usb_c_ports. The card reader table lists SD/SDHC/SDXC/MMC only, hence card_reader_microsd=false. Certification: the maker's own Power table on this page states the included power supply is 'UL 60950-1 Certified' - recorded as UL / verified_manufacturer_documentation on that basis; no certification file number is published.
- All sources consulted: https://plugable.com/products/ud-768pdz

### Belkin Connect Pro Thunderbolt 4 Dock — `belkin-connect-pro-thunderbolt-4-dock-inc006`
- Brand: Belkin · Model ref: INC006
- Destination: https://www.belkin.com/p/pro-thunderbolt-4-dock/P-INC006.html
- Summary (original editorial): Belkin's Connect Pro is a twelve-port Thunderbolt 4 dock with two native HDMI outputs, which sets it apart from docks that force display adapters onto Thunderbolt ports. It adds an SD reader, Gigabit Ethernet and a front USB-C port, and charges the host at up to 90W from its 120W supply. Belkin positions it as a single-cable workstation dock for Mac and Windows laptops.
- Specs recorded: `usb_c_ports` = 2; `power_delivery_w` = 90; `usb_a_ports` = 4; `hdmi_ports` = 2; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "8K @ 30Hz"; `usb_data_speed_gbps` = 10; `ethernet_port` = true; `ethernet_speed_mbps` = 1000; `card_reader_sd` = true; `card_reader_microsd` = false; `displayport_outputs` = 0; `max_external_displays` = 3
- Evidence:
  - https://www.belkin.com/p/pro-thunderbolt-4-dock/P-INC006.html — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, ethernet_port, card_reader_sd, max_video_resolution, max_external_displays — Maker product page: 12 ports include SD card reader, audio in/out, USB-C 3.1 Gen 2 port with PD 3.0, 2x Thunderbolt 4 ports, 2x HDMI 2.0 ports, Gigabit Ethernet, 2x USB-A 3.1 and 2x USB-A 2.0 ports; power delivery up to 90W; up to 8K @ 30Hz single display and triple display support for compatible laptops. Counting basis: usb_c_ports=2 = the USB-C 3.1 Gen 2 data port plus the one downstream Thunderbolt 4 port; the second Thunderbolt 4 port is the host uplink and is excluded. USB-C Gen 2 implies 10Gbps USB data (Thunderbolt link is 40Gbps). No microSD reader in the complete list, hence false. 'Thunderbolt 4 certified' on the page is an Intel technology certification, not a listed safety body, hence none/not_certified.
  - https://www.belkin.com/vn/support-article/?articleNum=318757 — covers: usb_a_ports, hdmi_ports, ethernet_port, power_delivery_w — Belkin official support FAQ for INC006 confirms the port split (front USB-C 3.1 Gen 2; rear two USB-A 3.1 and two USB-A 2.0; rear Thunderbolt 4 video port and two HDMI 2.0), a Gigabit Ethernet port and up to 90W laptop charging.
- All sources consulted: https://www.belkin.com/p/pro-thunderbolt-4-dock/P-INC006.html · https://www.belkin.com/vn/support-article/?articleNum=318757

### Kensington SD5700T Thunderbolt 4 Dual 4K Docking Station with 90W PD — `kensington-sd5700t-thunderbolt-4-docking-station`
- Brand: Kensington · Model ref: SD5700T (K35175NA)
- Destination: https://www.Kensington.com/en-ca/p/products/connectivity/laptop-docks-usb-accessories/sd5700t-thunderbolt-4-dual-4k-docking-station-with-90w-pd/
- Summary (original editorial): The SD5700T is Kensington's eleven-port Thunderbolt 4 dock, notable for holding its full 90W of laptop charging regardless of what else is connected. All video leaves via its three downstream Thunderbolt 4 ports, since there is no HDMI or DisplayPort socket. IT-oriented extras include DockWorks management software, mounting options and security slots.
- Specs recorded: `usb_c_ports` = 3; `power_delivery_w` = 90; `usb_a_ports` = 4; `hdmi_ports` = 0; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `max_video_resolution` = "8K @ 60Hz"; `usb_data_speed_gbps` = 10; `ethernet_port` = true; `ethernet_speed_mbps` = 1000; `card_reader_sd` = true; `card_reader_microsd` = false; `displayport_outputs` = 0; `max_external_displays` = 2
- Evidence:
  - https://www.Kensington.com/en-ca/p/products/connectivity/laptop-docks-usb-accessories/sd5700t-thunderbolt-4-dual-4k-docking-station-with-90w-pd/ — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, ethernet_port, card_reader_sd, max_video_resolution, max_external_displays — Maker page: 11 ports comprising four Thunderbolt 4 ports (1 upstream host and 3 downstream, per the maker's specifications section), four USB-A ports (one front USB 2.0 charging port and three rear USB 3.2 Gen2 at 10Gbps), one Gigabit Ethernet port, one audio combo jack and one UHS-II SD 4.0 card reader; PD 3.0 at 90W of laptop charging; monitors supported: 2; maximum resolution field states Single 8K @ 60Hz or Dual 4K @ 60Hz via the Thunderbolt 4 ports. usb_c_ports=3 counts only the downstream Thunderbolt 4 ports; the upstream host port is excluded. No HDMI or DisplayPort socket and no microSD reader appear in the complete maker list, hence 0/false. No safety listing stated on the maker page.
- All sources consulted: https://www.Kensington.com/en-ca/p/products/connectivity/laptop-docks-usb-accessories/sd5700t-thunderbolt-4-dual-4k-docking-station-with-90w-pd/

### Dell Thunderbolt Dock WD22TB4 — `dell-thunderbolt-dock-wd22tb4`
- Brand: Dell · Model ref: WD22TB4
- Destination: https://www.dell.com/support/manuals/en-tc/wd22tb4-dock/dell_wd22tb4_userguide/product-specifications?guid=guid-bb63fcdf-357e-408c-82f1-c7c56e8d5b4e&lang=en-us
- Summary (original editorial): Dell's WD22TB4 is a modular Thunderbolt 4 dock for managed business fleets: its host connection module can be swapped to upgrade the dock instead of replacing it. It offers the widest native display mix here, with two DisplayPort outputs, HDMI and a multifunction USB-C display port, and charges Dell laptops at up to 130W. There is no card reader, reflecting its IT-deployment focus.
- Specs recorded: `usb_c_ports` = 4; `power_delivery_w` = 130; `usb_a_ports` = 3; `hdmi_ports` = 1; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `usb_data_speed_gbps` = 10; `ethernet_port` = true; `ethernet_speed_mbps` = 1000; `card_reader_sd` = false; `card_reader_microsd` = false; `displayport_outputs` = 2; `max_external_displays` = 4
- Evidence:
  - https://www.dell.com/support/manuals/en-tc/wd22tb4-dock/dell_wd22tb4_userguide/product-specifications?guid=guid-bb63fcdf-357e-408c-82f1-c7c56e8d5b4e&lang=en-us — covers: usb_c_ports, usb_a_ports, hdmi_ports, power_delivery_w, ethernet_port, displayport_outputs, max_external_displays — Dell official user guide specifications: USB Type-C ports are 1x USB 3.2 Gen2 Type-C, 2x Type-C with Thunderbolt 4 and 1x USB 3.2 Gen2 Type-C with DisplayPort 1.4 Alt Mode (= 4 downstream USB-C ports; the host connection is the dock's attached cable module and is not in this list); USB Type-A ports 2x USB 3.2 Gen1 plus 1x Gen1 with PowerShare (=3); video ports include 2x DisplayPort 1.4 and 1x HDMI 2.0; external displays supported up to 4; network is Gigabit Ethernet. Power delivery is stated as 130W to Dell systems and 90W to non-Dell systems with the 180W adapter - the recorded 130W is Dell's headline published rating, with the 90W non-Dell figure noted here. The complete specification list contains no SD or microSD reader, hence false for both. No safety listing stated in the maker specifications.
- All sources consulted: https://www.dell.com/support/manuals/en-tc/wd22tb4-dock/dell_wd22tb4_userguide/product-specifications?guid=guid-bb63fcdf-357e-408c-82f1-c7c56e8d5b4e&lang=en-us


## chargers-power-adapters (5/5)

### Anker 737 Charger (GaNPrime 120W) — `anker-737-charger-ganprime-120w-a2148`
- Brand: Anker · Model ref: A2148
- Destination: https://www.anker.com/nz/products/a2148
- Summary (original editorial): A three-port GaNPrime wall charger built around two USB-C ports and one USB-A port, aimed at charging a laptop alongside a phone and tablet from a single outlet. Either USB-C port can deliver up to 100W on its own, while the unit shares a 120W ceiling across all connected devices.
- Specs recorded: `power_delivery_w` = 100; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `total_output_w` = 120; `usb_a_ports` = 1; `usb_c_ports` = 2; `uses_gan` = true
- Evidence:
  - https://www.anker.com/nz/products/a2148 — covers: usb_c_ports, usb_a_ports, power_delivery_w, total_output_w, uses_gan — Manufacturer Specs section states Output 120W Max, 2 USB-C Ports, 1 USB-A Port, one-port charging USB-C 1/USB-C 2: 100W Max, and lists Anker GaNPrime GaN Technology.
  - https://service.anker.com/product-description/a085g000004xGpZAAU?ref=Home_Page — covers: power_delivery_w, total_output_w, safety_certification_body, safety_certification_status — Anker service page confirms Total Output 120W Max and single-port USB-C output 20V/5A (100W Max). No UL, ETL, CSA, TUV, SGS, CE, UKCA or FCC safety certification for the charger is stated on the manufacturer product or service pages opened, so certification is recorded as none/not_certified.
- All sources consulted: https://www.anker.com/nz/products/a2148 · https://service.anker.com/product-description/a085g000004xGpZAAU?ref=Home_Page

### Anker 735 Charger (Nano II 65W) — `anker-735-charger-nano-ii-65w-a2667`
- Brand: Anker · Model ref: A2667
- Destination: https://www.anker.com/products/a2667
- Summary (original editorial): A compact three-port charger using GaN II technology, with two USB-C ports and one USB-A port in a pocketable body. A single USB-C connection can supply up to 65W for a USB-C laptop, and the charger redistributes its 65W total when two or three devices are attached.
- Specs recorded: `power_delivery_w` = 65; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `total_output_w` = 65; `usb_a_ports` = 1; `usb_c_ports` = 2; `uses_gan` = true
- Evidence:
  - https://www.anker.com/products/a2667 — covers: usb_c_ports, usb_a_ports, power_delivery_w, total_output_w — Manufacturer Specs state Single Port Output USB-C 1 (65W Max) / USB-C 2 (65W Max) / USB-A (22.5W Max), with dual- and triple-port splits that stay within the charger's 65W rating given in the product name; the page describes GaN II technology in the product copy (full text seen on the CA variant of the same page).
  - https://www.anker.com/products/a2667 — covers: safety_certification_body, safety_certification_status — No safety-certification body from the controlled vocabulary is stated on the manufacturer product page opened, so certification is recorded as none/not_certified.
- All sources consulted: https://www.anker.com/products/a2667

### UGREEN Nexode 100W GaN Charger — `ugreen-nexode-100w-gan-charger-cd226`
- Brand: UGREEN · Model ref: CD226
- Destination: https://eu.ugreen.com/en-pl/products/ugreen-nexode-100w-usb-c-wall-charger
- Summary (original editorial): A four-port GaN wall charger with three USB-C ports and one USB-A port, sized for a laptop plus phones and accessories. Its first two USB-C ports can each reach 100W when used alone, with the full 100W shared across ports as more devices are connected.
- Specs recorded: `power_delivery_w` = 100; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `total_output_w` = 100; `usb_a_ports` = 1; `usb_c_ports` = 3; `uses_gan` = true
- Evidence:
  - https://eu.ugreen.com/en-pl/products/ugreen-nexode-100w-usb-c-wall-charger — covers: usb_c_ports, usb_a_ports, power_delivery_w, total_output_w, uses_gan — Manufacturer spec table (SKU 40747, the CD226 charger) states USB-C1/C2 output up to 100W Max with PD 3.0/PPS, USB-C3 and USB-A at 22.5W max, Wattage 100 watts, 4 total USB ports; the comparison table on the same page confirms 3 x USB-C + 1 x USB-A and GaN positioning in the product title.
  - https://eu.ugreen.com/en-pl/products/ugreen-nexode-100w-usb-c-wall-charger — covers: safety_certification_body, safety_certification_status — The page lists fire-protection class UL94-V0, which is a material flammability rating and not a UL/ETL safety certification of the charger; no certification body from the controlled vocabulary is claimed for the charger itself, so certification is recorded as none/not_certified.
- All sources consulted: https://eu.ugreen.com/en-pl/products/ugreen-nexode-100w-usb-c-wall-charger

### Belkin BoostCharge Pro 4-Port GaN Charger 108W — `belkin-boostcharge-pro-4-port-gan-charger-108w-wch010`
- Brand: Belkin · Model ref: WCH010
- Destination: https://www.belkin.com/p/4-port-gan-charger-108w/WCH010dqWH.html
- Summary (original editorial): A desktop-style GaN charger with two USB-C and two USB-A ports on a 2-metre power cord, designed to sit on a desk rather than hang from an outlet. It delivers up to 96W from a single USB-C port for a laptop and shares 108W in total across up to four devices using Intelligent Power Sharing.
- Specs recorded: `power_delivery_w` = 96; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `total_output_w` = 108; `usb_a_ports` = 2; `usb_c_ports` = 2; `uses_gan` = true
- Evidence:
  - https://www.belkin.com/p/4-port-gan-charger-108w/P-WCH010.html — covers: usb_c_ports, usb_a_ports, total_output_w, uses_gan — Manufacturer product page states 2x USB-C and 2x USB-A ports, 108W of total power output, integrated GaN technology and USB-C PD 3.0.
  - https://www.belkin.com/tw/en/support-article/?articleNum=318949 — covers: power_delivery_w, total_output_w, safety_certification_body, safety_certification_status — Belkin's official FAQ for WCH010 states total power output 108W and single USB-C port output up to 20.5V/4.7A (96.35W), published by Belkin as up to 96W per port. The FAQ's only certification mention is MFi, which is not in the controlled body vocabulary, and no UL/ETL/CSA/TUV/SGS/CE/UKCA/FCC safety certification is stated, so certification is recorded as none/not_certified.
- All sources consulted: https://www.belkin.com/p/4-port-gan-charger-108w/WCH010dqWH.html · https://www.belkin.com/tw/en/support-article/?articleNum=318949

### Anker 717 Charger (140W) — `anker-717-charger-140w-a2341`
- Brand: Anker · Model ref: A2341
- Destination: https://www.anker.com/eu-en/products/a2341
- Summary (original editorial): A single-port GaNPrime charger built for high-power USB-C laptops, delivering up to 140W through USB Power Delivery 3.1, including the 28V profile used by the 16-inch MacBook Pro. It trades multi-port flexibility for maximum single-device speed in a body notably smaller than Apple's own 140W adapter.
- Specs recorded: `power_delivery_w` = 140; `safety_certification_body` = "none"; `safety_certification_status` = "not_certified"; `total_output_w` = 140; `usb_a_ports` = 0; `usb_c_ports` = 1; `uses_gan` = true
- Evidence:
  - https://service.anker.com/product-description/a085g000004zRHiAAM/anker-717-charger-140w?ref=Home_Page — covers: power_delivery_w, total_output_w, usb_c_ports — Anker service page for A2341 lists a single output specification set, 5V/9V/15V/20V/28V up to 5A (140W Max), with PD and PPS charging technology, consistent with the single USB-C port design; the linked A2341 user manual describes achieving max power from a single port.
  - https://www.anker.com/eu-en/products/a2341 — covers: uses_gan, safety_certification_body, safety_certification_status — Manufacturer product page presents the 717 as a GaNPrime-series charger with a 140W max output and Power Delivery 3.1 compatibility. No safety-certification body from the controlled vocabulary is stated on the manufacturer pages opened, so certification is recorded as none/not_certified.
- All sources consulted: https://www.anker.com/eu-en/products/a2341 · https://service.anker.com/product-description/a085g000004zRHiAAM/anker-717-charger-140w?ref=Home_Page


## cables-adapters (5/5)

### Apple Thunderbolt 4 (USB-C) Pro Cable (1.8 m) — `apple-thunderbolt-4-pro-cable-1-8m`
- Brand: Apple · Model ref: MW5J3AM/A
- Destination: https://www.apple.com/shop/product/mw5j3am/a/thunderbolt-4-usb%E2%80%91c-pro-cable-18-m
- Summary (original editorial): Apple's 1.8-metre Thunderbolt 4 Pro cable pairs full 40Gb/s Thunderbolt and USB4 data transfer with DisplayPort video and up to 100W of charging. Its black braided jacket is designed to coil without tangling, making it a desk cable for connecting Macs to displays, docks and fast storage.
- Specs recorded: `braided` = true; `cable_length_m` = 1.8; `connector_type` = "USB-C to USB-C"; `data_transfer_gbps` = 40; `power_delivery_w` = 100
- Evidence:
  - https://www.apple.com/shop/product/mw5j3am/a/thunderbolt-4-usb%E2%80%91c-pro-cable-18-m — covers: cable_length_m, power_delivery_w, data_transfer_gbps, braided, connector_type — Apple's product page overview states this 1.8-meter cable features a black braided design, supports Thunderbolt 3, Thunderbolt 4 and USB 4 data transfer up to 40Gb/s, and charging up to 100W; it is a USB-C to USB-C cable.
- All sources consulted: https://www.apple.com/shop/product/mw5j3am/a/thunderbolt-4-usb%E2%80%91c-pro-cable-18-m

### CalDigit Thunderbolt 4 Cable (0.8m) — `caldigit-thunderbolt-4-cable-0-8m`
- Brand: CalDigit · Model ref: Thunderbolt 4 Cable 0.8m
- Destination: https://www.caldigit.com/thunderbolt-4-usb-4-cable/
- Summary (original editorial): CalDigit's short 0.8-metre Thunderbolt 4 cable is aimed at dock and desktop setups where excess cable is clutter. It carries up to 40Gb/s across Thunderbolt 4, Thunderbolt 3 and USB4, and supplies up to 100W of power delivery, with E-Marker chips at both ends managing safe power negotiation.
- Specs recorded: `cable_length_m` = 0.8; `connector_type` = "USB-C to USB-C"; `data_transfer_gbps` = 40; `power_delivery_w` = 100
- Evidence:
  - https://www.caldigit.com/thunderbolt-4-usb-4-cable/ — covers: cable_length_m, power_delivery_w, data_transfer_gbps, connector_type — Manufacturer page's Technical Specifications table lists the 0.8m variant with Max. Performance 40Gb/s and Power Delivery Ability 100 Watts (20 Volts @ 5 Amps), for use with USB-C devices over a USB-C connector.
- All sources consulted: https://www.caldigit.com/thunderbolt-4-usb-4-cable/

### Belkin BoostCharge USB-C to USB-C Cable 240W (1m) — `belkin-boostcharge-usb-c-to-usb-c-cable-240w-1m-cab015`
- Brand: Belkin · Model ref: CAB015bt1MWH
- Destination: https://www.belkin.com/p/usb-c-to-usb-c-cable-240w/CAB015bt1MWH.html
- Summary (original editorial): Belkin's braided 240W cable is a charging-first USB-C lead built for PD 3.1 Extended Power Range devices, including high-wattage gaming laptops. In its 1-metre form it pairs that 240W ceiling with USB 2.0 data transfer, dual E-Marker chips and over-temperature protection.
- Specs recorded: `braided` = true; `cable_length_m` = 1; `connector_type` = "USB-C to USB-C"; `data_transfer_gbps` = 0.48; `power_delivery_w` = 240
- Evidence:
  - https://www.belkin.com/au/support-article/?articleNum=335763 — covers: cable_length_m, power_delivery_w, data_transfer_gbps, braided, connector_type — Belkin's official CAB015 page states support for up to 240W Power Delivery fast charging, high-speed data transfers up to 480 Mbps on the USB 2.0 standard, a nylon braided design, and variants CAB015bt1MWH/CAB015bt1MBK at 3.3 ft / 1 m. The cable is USB-IF certified per Belkin, but USB-IF is outside the safety-certification body vocabulary, so no certification trio is recorded.
- All sources consulted: https://www.belkin.com/p/usb-c-to-usb-c-cable-240w/CAB015bt1MWH.html · https://www.belkin.com/au/support-article/?articleNum=335763

### Belkin BoostCharge Eco USB-C to USB-C Braided Cable 240W (1m) — `belkin-boostcharge-eco-usb-c-to-usb-c-cable-240w-1m-cab025`
- Brand: Belkin · Model ref: CAB025
- Destination: https://www.belkin.com/uk/support-article/?articleNum=337166
- Summary (original editorial): Belkin's Eco variant wraps a 240W-capable USB-C cable in braiding made largely from recycled PET, with recycled material in the connector housings as well. The 1-metre version still covers everyday syncing over USB 2.0 while fast-charging laptops, tablets and phones at up to 240W.
- Specs recorded: `braided` = true; `cable_length_m` = 1; `connector_type` = "USB-C to USB-C"; `data_transfer_gbps` = 0.48; `power_delivery_w` = 240
- Evidence:
  - https://www.belkin.com/uk/support-article/?articleNum=337166 — covers: cable_length_m, power_delivery_w, braided — Belkin's official CAB025 page states 240W Power Delivery, a 95% PCR PET braided exterior, and available lengths including 3.28 ft / 1M.
  - https://www.belkin.com/uk/support-article/?articleNum=337162 — covers: data_transfer_gbps, connector_type, power_delivery_w — Belkin's official CAB025 FAQ confirms a USB-C to USB-C connector, maximum power up to 240W (48V/5A), and USB 2.0 data transfer speeds up to 480 Mbps. It also states the cable is USB-IF certified; USB-IF is outside the safety-certification body vocabulary, so no certification trio is recorded.
- All sources consulted: https://www.belkin.com/uk/support-article/?articleNum=337166 · https://www.belkin.com/uk/support-article/?articleNum=337162

### UGREEN USB-C to USB-C Cable 100W Braided (2m) — `ugreen-usb-c-to-usb-c-cable-100w-2m-70427`
- Brand: UGREEN · Model ref: 70427
- Destination: https://www.ugreen.com/en-sg/products/sg-70427
- Summary (original editorial): UGREEN's 2-metre braided cable is a long-reach charging lead for USB-C laptops and phones, rated for up to 100W at 20V/5A with an E-Mark chip for safe high-current delivery. Data duties are handled at USB 2.0 speed, and the nylon braid and aluminium housings are built for frequent daily plugging and unplugging.
- Specs recorded: `braided` = true; `cable_length_m` = 2; `connector_type` = "USB-C to USB-C"; `data_transfer_gbps` = 0.48; `power_delivery_w` = 100
- Evidence:
  - https://www.ugreen.com/en-sg/products/sg-70427 — covers: cable_length_m, power_delivery_w, data_transfer_gbps, braided, connector_type — Manufacturer page titled 'UGREEN Cable USB-C 100W 2M Braided' (SKU sg-70427) states Max 100W Power Delivery at 20V 5A, transfer speed up to 480Mbps (USB 2.0), a durable nylon braided cable, and a Specs table with Data transfer rate 480 Megabits Per Second and Male-to-Male USB Type C connectors.
- All sources consulted: https://www.ugreen.com/en-sg/products/sg-70427


## device-stands-holders (1/1)

### Lamicall Ultra-Thin Foldable Cell Phone Stand for Desk — `lamicall-ultra-thin-foldable-cell-phone-stand-for-desk`
- Brand: Lamicall · Model ref: LAM-STDP03-Black
- Destination: https://lamicallshop.com/products/lamicall-ultra-thin-foldable-cell-phone-stand-for-desk
- Summary (original editorial): A slim desk stand from Lamicall that folds flat for carrying in a pocket or bag and uses a weighted metal base to stay put on the desk. Its dual-pivot design adjusts both height and viewing angle, and the maker states it works with phones and tablets between 4 and 8 inches, including phones in thick cases.
- Specs recorded: `adjustable_angle` = true; `device_type` = "phone-or-tablet"; `foldable` = true
- Evidence:
  - https://lamicallshop.com/products/lamicall-ultra-thin-foldable-cell-phone-stand-for-desk — covers: device_type, adjustable_angle, foldable, model_ref — Manufacturer's own product page (Model Number: LAM-STDP03-Black). Device type: page states 'Universal desk cell phone stand works for tablets and phones between 4-8 inches' and lists iPad mini among compatible devices, so device_type is phone-or-tablet. Adjustable angle: 'Height & Angle Adjustable - ... it allows you to adjust the back plate up to 180 degrees and the base up to 90 degrees, while the height extends up to 4.3 inches.' Foldable: product is named 'Foldable' and the page describes it as '40% thinner than previous model when folded'. Non-charging stand, so no USB-C, power-delivery or charging-certification specs apply.
- All sources consulted: https://lamicallshop.com/products/lamicall-ultra-thin-foldable-cell-phone-stand-for-desk


## power-strips-surge-protectors (1/1)

### Tripp Lite series Protect It! 6-Outlet Surge Protector, 6 ft. Cord, 900 Joules, Diagnostic LED, Light Gray Housing — `tripp-lite-protect-it-6-outlet-surge-protector-tlp606`
- Brand: Tripp Lite · Model ref: TLP606
- Destination: https://brd.tripplite.com/protect-it-6-outlet-surge-protector-6-ft-cord-790-joules-diagnostic-led~TLP606
- Summary (original editorial): A six-outlet corded surge protector in Eaton's Tripp Lite Protect It! series, intended for home or office workstations. The maker's specification lists a 900-joule AC suppression rating, EMI/RFI filtering, a 15A resettable circuit breaker and a diagnostic LED, with one end outlet spaced for a bulky transformer.
- Specs recorded: `ac_outlets` = 6; `cable_length_m` = 1.83; `safety_certification_body` = "UL"; `safety_certification_status` = "verified_manufacturer_documentation"; `surge_protection` = true; `surge_rating_joules` = 900
- Evidence:
  - https://brd.tripplite.com/protect-it-6-outlet-surge-protector-6-ft-cord-790-joules-diagnostic-led~TLP606 — covers: surge_rating_joules, ac_outlets, cable_length_m, safety_certification_body, safety_certification_status, model_ref — Eaton / Tripp Lite manufacturer's product page for Part Number TLP606 (URL slug retains an older '790 joules' string, but the current page content and specification table state 900 joules throughout). Surge rating: '900-joule surge protection rating' and Specifications 'AC Suppression Joule Rating | 900'. Outlets: '6 NEMA 5-15R outlets' and Output Receptacles '(6) 5-15R'. Cord: Specifications 'Input Cord Length (ft.) | 6' — converted 6 ft x 0.3048 = 1.8288 m, recorded as 1.83 m (maker prose also describes it as a 'six-foot (1.8-meter) AC power cord'). Certification: Specifications 'Product Certifications | ... UL 1363; UL 1449; UL Listed; cUL Listed' and 'Conforms to current UL 1449 5th Edition safety standards' — body UL, status verified_manufacturer_documentation because the listing is stated in the manufacturer's own specification; no certifier file number is published on the page, so no certification ID is included. No USB ports are listed for this model, so usb_c_ports and power_delivery_w are omitted.
  - https://tripplite.eaton.com/support/tlp606 — covers: surge_rating_joules, ac_outlets, cable_length_m, safety_certification_body — Corroborating Eaton Tripp Lite page for Catalog Number TLP606: 'surge suppression rating of 900 joules', 'The 6 Foot cord', 'Total Outlets | 6', 'AC Suppression Joule Rating | 900', 'Cord Length | 6 Foot', and Certifications 'UL Listed, cUL Listed, UL 1449, CSA Std. C22.2'.
- All sources consulted: https://brd.tripplite.com/protect-it-6-outlet-surge-protector-6-ft-cord-790-joules-diagnostic-led~TLP606 · https://tripplite.eaton.com/support/tlp606


## cases-sleeves-protection (1/1)

### tomtoc 13 Inch MacBook Air/Pro Sleeve 360° Protective, Defender-A13 — `tomtoc-defender-a13-360-protective-laptop-sleeve-13-inch`
- Brand: tomtoc · Model ref: A13C2D1
- Destination: https://www.tomtoc.com/products/360-protective-sleeve-13-inch-macbook-air-pro
- Summary (original editorial): A fitted laptop sleeve in tomtoc's Defender-A13 line, sized for 13-inch MacBook Air and MacBook Pro models and also listed for some 13-inch Surface devices. It combines CornerArmor corner padding with a soft lining, a front pocket for chargers and accessories, and a spill-resistant recycled fabric shell with YKK zippers.
- Specs recorded: `device_type` = "laptop"; `drop_protection_rated` = false; `material` = "recycled fabric"; `max_device_size_in` = 13
- Evidence:
  - https://www.tomtoc.com/products/360-protective-sleeve-13-inch-macbook-air-pro — covers: device_type, max_device_size_in, material, drop_protection_rated, model_ref — Manufacturer's own product page, SKU: A13C2D1, Name: 'Defender-A13 Laptop Sleeve for 13 inch MacBook Air/Pro'. Size/fit: 'Size: 13-inch for New MacBook Air & Pro' and 'Perfectly Compatible With: 13-inch MacBook Air ... 13-inch MacBook Pro ...', so device_type is laptop and max_device_size_in is 13. Material: page states 'Spill-resistant recycled fabric with PFAS-free treatment', recorded as recycled fabric in the maker's own wording (the page does not name a specific fibre such as polyester for this model). Drop rating: the page says 'Military-Grade CornerArmor Protection' and 'Military-Standard drop-tested protection' but publishes no specific drop-test standard number or drop height on the page, so per the brief's rule drop_protection_rated is false.
- All sources consulted: https://www.tomtoc.com/products/360-protective-sleeve-13-inch-macbook-air-pro


## Rejected candidates (27)

- **IKEA MALM desk, white, 140x65 cm (602.141.59)** (g1): Dimensions and max load verified on the manufacturer page (Width 140 cm, Depth 65 cm, Max. load 50 kg), but no warranty/guarantee years are published on the maker product page and MALM does not appear in IKEA's office furniture guarantee brochure, so warranty_years could not be verified from the manufacturer.
- **IKEA MICKE desk, 105x50 cm** (g1): Dimensions and max load are published by the maker (105 cm, 50 cm, 50 kg), but no warranty/guarantee years could be found in manufacturer documentation for MICKE, so the candidate fails the warranty evidence rule.
- **IKEA LAGKAPTEN / ADILS desk, white, 140x60 cm (594.171.53)** (g1): Manufacturer page verifies Length 140 cm, Width 60 cm and Max. load 50 kg, but no warranty/guarantee years are published by the maker for this product line, so warranty_years is unverifiable.
- **IKEA TOMMARYD table, white, 130x70 cm** (g1): Covered by the 10-year office guarantee brochure and dimensions are published (Length 130 cm, Width 70 cm), but the manufacturer product page publishes no maximum load, so the required max_load_kg could not be verified.
- **Sauder Affirm 60 x 36 Bowfront Executive Desk, Hudson Elm (427428)** (g1): Manufacturer page publishes overall dimensions and a 5-year limited warranty, but no maximum load figure was found in the manufacturer documentation consulted, so max_load_kg is unverifiable from the maker.
- **FlexiSpot E7 / E7 Pro** (g1): Sold as a frame with multiple desktop sizes, so there is no single manufacturer-published width/depth for one complete desk configuration in the static product copy; published load figures also conflict across maker documents consulted (355 lb on product pages versus a 160 kg table in the manual). Rejected for ambiguous required specs rather than choosing one figure arbitrarily.
- **IKEA UTESPELARE gaming desk** (g1): Excluded per the brief's scope note (gaming desk, avoid); not researched as a candidate.
- **BenQ PianoLight** (g2): BenQ's own lamp comparison table lists its Luminous Flux as 'NA' — the manufacturer publishes no lumen figure, so the required manufacturer-published brightness_lumens cannot be evidenced.
- **BenQ MindDuo 2** (g2): The current model's manufacturer spec page publishes only Center Illuminance (1400 lux) and no luminous flux in lumens; lux-only evidence fails the category rule. (Lumen figures exist only for the earlier MindDuo generation in a legacy comparison table with conflicting colour-temperature ranges, so generations were not conflated.)
- **IKEA desk lamps (e.g. NÄVLINGE, HÅRTE)** (g2): IKEA publishes luminous flux for these lamps (e.g. 220 lm / 150 lm), but no manufacturer-published warranty period in years — the HÅRTE page states only that quality assurance follows IKEA's quality policy — so required warranty_years cannot be evidenced.
- **TaoTronics desk lamps (e.g. TT-DL11, TT-DL27)** (g2): Lumen and warranty figures were found only on retailer listings and third-party manual mirrors; no verifiable product/spec page on the manufacturer's own site (taotronics.com) could be opened, so required specs are not traceable to manufacturer evidence.
- **OttLite Perform LED Clamp Lamp (CS49602C-SHPR)** (g2): The ottlite.com product page publishes brightness levels, colour modes, and the 2-year warranty but no lumen output figure, so manufacturer-published brightness_lumens cannot be evidenced.
- **BenQ ScreenBar lumen figures from ICEcat/retailer spec sheets (e.g. 930 lm)** (g2): Not manufacturer-published and inconsistent with BenQ's own comparison table (220-320 lm depending on colour temperature); the 930 figure matches the bar's published center illuminance in lux, i.e. an apparent lux/lumen mix-up. Rejected as an evidence source; the accepted ScreenBar entry uses BenQ's own table only.
- **Rain Design mStand (raindesigninc.com/products/mstand)** (g3): Manufacturer page opened directly publishes only Width 10 in, Height 5.9 in, Depth 7.5 in and Weight 3 lb. It states no rated maximum load anywhere and gives no numeric maximum laptop size (only 'Fits all MacBooks and compatible with most notebooks'; an FAQ notes a 16-inch MacBook Pro sits on it). Required max_load_kg (and a maker-stated max_laptop_size_in) cannot be verified, so rejected as briefed.
- **Lamicall Adjustable Laptop Stand (model LN09)** (g3): No rated maximum load could be found in the manufacturer/retailer materials reviewed for this model (compatibility 10-17.3 in and adjustable height/angle are stated, but no load capacity is published), so required max_load_kg cannot be verified. Rejected.
- **Humanscale FM300 Foot Machine footrest** (g3): A current manufacturer product page on humanscale.com could not be retrieved, and warranty figures conflict across secondary sources (15-year limited vs limited lifetime), with the model also renamed FR300 in current listings. Specs could not be verified cleanly from the maker's own current page, so not accepted; ComfiLife Foot Rest was used instead with height/thickness verified on comfilife.com.
- **Everlasting Comfort Foot Rest for Under Desk** (g3): No manufacturer product page publishing dimensions could be retrieved (dimensions appear only in retailer listings and manual mirrors), so thickness could not be traced to the maker's own page. Not accepted.
- **UGREEN Revodok (generic, no model)** (g4): No single model or SKU exists under the generic name - UGREEN sells multiple Revodok variants with different port counts and speeds, so required specs could not be tied to one product. Substituted with the specific Revodok Pro 108, SKU 75027, whose maker page publishes a complete port list.
- **Anker 777 Thunderbolt Docking Station** (g4): Not opened or verified against Anker's own product page during this research run, so it was excluded rather than recorded without primary manufacturer evidence. Substituted with the Dell WD22TB4, verified from Dell's official user guide specifications.
- **Plugable USBC-7IN1E (7-in-1 Hub with Ethernet)** (g4): Verified on Plugable's site but it is a near-duplicate Ethernet variant of the already-selected USBC-7IN1 hub; not counted as a separate product to keep the five hubs distinct.
- **Anker 643 USB-C to USB-C Cable (Flow, Silicone) — A8552/3** (g5): Manufacturer product page (anker.com/products/a8552) was opened in full: it publishes 100W charging and 3 ft / 0.9 m and 6 ft / 1.8 m lengths but publishes NO data transfer rate anywhere on the page. Per the brief, a cable whose maker publishes no data rate must be rejected.
- **Anker 765 USB-C to USB-C Cable (240W candidate) — A8866** (g5): Manufacturer product page opened (anker.com/au/products/a8866) currently lists the 765 as a 140W Nylon cable, conflicting with the 240W candidate naming, and publishes NO data transfer rate and no length specification in the page body. Required data_transfer_gbps is therefore unverifiable from the primary source, so the candidate was rejected rather than sourced from retailer listings that claim 480 Mbps.
- **UGREEN Adjustable Aluminum Phone Holder (SKU 80708, ca.ugreen.com)** (g6): Not selected, not unverifiable: UGREEN's Canada store page does state adjustable angle and foldable, but the Lamicall manufacturer's page was verified first and states phone-and-tablet compatibility more explicitly ('works for tablets and phones between 4-8 inches'), giving a cleaner controlled-vocabulary device_type. Other UGREEN results found were regional reseller/distributor domains (ugreen.com.pk, ugreenindia.com), which are not the maker's own global product page.
- **APC SurgeArrest and Belkin SurgePlus surge protectors** (g6): Not pursued: fallback candidates only. The Tripp Lite TLP606 manufacturer specification on Eaton's site verified every required field (UL 1449 listing, 900 joules, 6 outlets, 6 ft cord) on the first pick, so no second surge protector was needed.
- **tomtoc Essence-A35 Protective Sleeve for 13-inch MacBook Air (SKU A35C2D1)** (g6): Considered and verified on tomtoc.com (13-inch size; material stated as '400D Ripstop polyester'), but not selected: the Defender-A13 is the briefed '360 Protective Laptop Sleeve' candidate and its own manufacturer page verified all required specs, so the Essence-A35 was not needed.
- **Mosiso laptop sleeve** (g6): Not pursued: fallback candidate with weaker documentation per the brief. tomtoc's manufacturer page verified the required laptop-sleeve specs (device_type laptop, 13-inch maximum fit) on the first pick, so Mosiso was not needed.
- **OMOTON phone/tablet stand** (g6): Not pursued: fallback candidate only. The Lamicall manufacturer's own page verified device_type and adjustable_angle on the first pick, so OMOTON was not needed.
