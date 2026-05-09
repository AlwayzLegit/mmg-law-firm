-- 0003_seed_geo.sql — initial seed for geography and practice areas.
--
-- All 58 California counties are inserted with is_published=false so the
-- schema is ready before the firm decides which counties to invest in
-- editorially. Tier 1 cities (per spec §5.4) are inserted as priority and
-- published. Practice areas are inserted but left unpublished until the
-- attorney-reviewed body content is in place.

-- =========================================================================
-- Counties (58)
-- =========================================================================

insert into counties (slug, name, short_name, fips, seat, region, is_published) values
  ('alameda-county',         'Alameda County',         'Alameda',         '06001', 'Oakland',           'Bay Area',           false),
  ('alpine-county',          'Alpine County',          'Alpine',          '06003', 'Markleeville',      'Sierra Nevada',      false),
  ('amador-county',          'Amador County',          'Amador',          '06005', 'Jackson',           'Sierra Nevada',      false),
  ('butte-county',           'Butte County',           'Butte',           '06007', 'Oroville',          'Northern California', false),
  ('calaveras-county',       'Calaveras County',       'Calaveras',       '06009', 'San Andreas',       'Sierra Nevada',      false),
  ('colusa-county',          'Colusa County',          'Colusa',          '06011', 'Colusa',            'Northern California', false),
  ('contra-costa-county',    'Contra Costa County',    'Contra Costa',    '06013', 'Martinez',          'Bay Area',           false),
  ('del-norte-county',       'Del Norte County',       'Del Norte',       '06015', 'Crescent City',     'Northern California', false),
  ('el-dorado-county',       'El Dorado County',       'El Dorado',       '06017', 'Placerville',       'Sierra Nevada',      false),
  ('fresno-county',          'Fresno County',          'Fresno',          '06019', 'Fresno',            'Central Valley',     false),
  ('glenn-county',           'Glenn County',           'Glenn',           '06021', 'Willows',           'Northern California', false),
  ('humboldt-county',        'Humboldt County',        'Humboldt',        '06023', 'Eureka',            'Northern California', false),
  ('imperial-county',        'Imperial County',        'Imperial',        '06025', 'El Centro',         'Southern California', false),
  ('inyo-county',            'Inyo County',            'Inyo',            '06027', 'Independence',      'Eastern California', false),
  ('kern-county',            'Kern County',            'Kern',            '06029', 'Bakersfield',       'Central Valley',     false),
  ('kings-county',           'Kings County',           'Kings',           '06031', 'Hanford',           'Central Valley',     false),
  ('lake-county',            'Lake County',            'Lake',            '06033', 'Lakeport',          'Northern California', false),
  ('lassen-county',          'Lassen County',          'Lassen',          '06035', 'Susanville',        'Northern California', false),
  ('los-angeles-county',     'Los Angeles County',     'Los Angeles',     '06037', 'Los Angeles',       'Southern California', false),
  ('madera-county',          'Madera County',          'Madera',          '06039', 'Madera',            'Central Valley',     false),
  ('marin-county',           'Marin County',           'Marin',           '06041', 'San Rafael',        'Bay Area',           false),
  ('mariposa-county',        'Mariposa County',        'Mariposa',        '06043', 'Mariposa',          'Sierra Nevada',      false),
  ('mendocino-county',       'Mendocino County',       'Mendocino',       '06045', 'Ukiah',             'Northern California', false),
  ('merced-county',          'Merced County',          'Merced',          '06047', 'Merced',            'Central Valley',     false),
  ('modoc-county',           'Modoc County',           'Modoc',           '06049', 'Alturas',           'Northern California', false),
  ('mono-county',            'Mono County',            'Mono',            '06051', 'Bridgeport',        'Eastern California', false),
  ('monterey-county',        'Monterey County',        'Monterey',        '06053', 'Salinas',           'Central Coast',      false),
  ('napa-county',            'Napa County',            'Napa',            '06055', 'Napa',              'Bay Area',           false),
  ('nevada-county',          'Nevada County',          'Nevada',          '06057', 'Nevada City',       'Sierra Nevada',      false),
  ('orange-county',          'Orange County',          'Orange',          '06059', 'Santa Ana',         'Southern California', false),
  ('placer-county',          'Placer County',          'Placer',          '06061', 'Auburn',            'Sierra Nevada',      false),
  ('plumas-county',          'Plumas County',          'Plumas',          '06063', 'Quincy',            'Sierra Nevada',      false),
  ('riverside-county',       'Riverside County',       'Riverside',       '06065', 'Riverside',         'Southern California', false),
  ('sacramento-county',      'Sacramento County',      'Sacramento',      '06067', 'Sacramento',        'Sacramento Valley',  false),
  ('san-benito-county',      'San Benito County',      'San Benito',      '06069', 'Hollister',         'Central Coast',      false),
  ('san-bernardino-county',  'San Bernardino County',  'San Bernardino',  '06071', 'San Bernardino',    'Southern California', false),
  ('san-diego-county',       'San Diego County',       'San Diego',       '06073', 'San Diego',         'Southern California', false),
  ('san-francisco-county',   'San Francisco County',   'San Francisco',   '06075', 'San Francisco',     'Bay Area',           false),
  ('san-joaquin-county',     'San Joaquin County',     'San Joaquin',     '06077', 'Stockton',          'Central Valley',     false),
  ('san-luis-obispo-county', 'San Luis Obispo County', 'San Luis Obispo', '06079', 'San Luis Obispo',   'Central Coast',      false),
  ('san-mateo-county',       'San Mateo County',       'San Mateo',       '06081', 'Redwood City',      'Bay Area',           false),
  ('santa-barbara-county',   'Santa Barbara County',   'Santa Barbara',   '06083', 'Santa Barbara',     'Central Coast',      false),
  ('santa-clara-county',     'Santa Clara County',     'Santa Clara',     '06085', 'San Jose',          'Bay Area',           false),
  ('santa-cruz-county',      'Santa Cruz County',      'Santa Cruz',      '06087', 'Santa Cruz',        'Central Coast',      false),
  ('shasta-county',          'Shasta County',          'Shasta',          '06089', 'Redding',           'Northern California', false),
  ('sierra-county',          'Sierra County',          'Sierra',          '06091', 'Downieville',       'Sierra Nevada',      false),
  ('siskiyou-county',        'Siskiyou County',        'Siskiyou',        '06093', 'Yreka',             'Northern California', false),
  ('solano-county',          'Solano County',          'Solano',          '06095', 'Fairfield',         'Bay Area',           false),
  ('sonoma-county',          'Sonoma County',          'Sonoma',          '06097', 'Santa Rosa',        'Bay Area',           false),
  ('stanislaus-county',      'Stanislaus County',      'Stanislaus',      '06099', 'Modesto',           'Central Valley',     false),
  ('sutter-county',          'Sutter County',          'Sutter',          '06101', 'Yuba City',         'Sacramento Valley',  false),
  ('tehama-county',          'Tehama County',          'Tehama',          '06103', 'Red Bluff',         'Northern California', false),
  ('trinity-county',         'Trinity County',         'Trinity',         '06105', 'Weaverville',       'Northern California', false),
  ('tulare-county',          'Tulare County',          'Tulare',          '06107', 'Visalia',           'Central Valley',     false),
  ('tuolumne-county',        'Tuolumne County',        'Tuolumne',        '06109', 'Sonora',            'Sierra Nevada',      false),
  ('ventura-county',         'Ventura County',         'Ventura',         '06111', 'Ventura',           'Southern California', false),
  ('yolo-county',            'Yolo County',            'Yolo',            '06113', 'Woodland',          'Sacramento Valley',  false),
  ('yuba-county',            'Yuba County',            'Yuba',            '06115', 'Marysville',        'Sacramento Valley',  false)
on conflict (slug) do nothing;

-- Publish the counties Tier-1 cities live in. The remaining 50 are kept
-- unpublished until the firm has invested editorial work in them.
update counties
set is_published = true
where slug in (
  'los-angeles-county',
  'orange-county',
  'riverside-county',
  'san-bernardino-county',
  'san-diego-county',
  'kern-county',
  'fresno-county',
  'sacramento-county',
  'san-francisco-county',
  'santa-clara-county',
  'alameda-county'
);

-- =========================================================================
-- Tier 1 cities (priority cities from spec §5.4) — published.
-- =========================================================================

insert into cities (county_id, slug, name, is_priority, is_published)
select c.id, v.slug, v.name, true, true
from (values
  ('los-angeles-county',      'glendale',         'Glendale'),
  ('los-angeles-county',      'los-angeles',      'Los Angeles'),
  ('los-angeles-county',      'burbank',          'Burbank'),
  ('los-angeles-county',      'pasadena',         'Pasadena'),
  ('los-angeles-county',      'long-beach',       'Long Beach'),
  ('los-angeles-county',      'santa-monica',     'Santa Monica'),
  ('los-angeles-county',      'beverly-hills',    'Beverly Hills'),
  ('orange-county',           'anaheim',          'Anaheim'),
  ('orange-county',           'santa-ana',        'Santa Ana'),
  ('orange-county',           'irvine',           'Irvine'),
  ('riverside-county',        'riverside',        'Riverside'),
  ('san-bernardino-county',   'san-bernardino',   'San Bernardino'),
  ('san-diego-county',        'san-diego',        'San Diego'),
  ('kern-county',             'bakersfield',      'Bakersfield'),
  ('fresno-county',           'fresno',           'Fresno'),
  ('sacramento-county',       'sacramento',       'Sacramento'),
  ('san-francisco-county',    'san-francisco',    'San Francisco'),
  ('santa-clara-county',      'san-jose',         'San Jose'),
  ('alameda-county',          'oakland',          'Oakland')
) as v(county_slug, slug, name)
join counties c on c.slug = v.county_slug
on conflict (county_id, slug) do nothing;

-- =========================================================================
-- Practice areas — kept unpublished. Group C's static seed is canonical
-- until attorney-reviewed body_md is written and pasted in.
-- =========================================================================

insert into practice_areas
  (slug, name, short_name, noun_singular, noun_plural, lawyer_phrase, icon, display_order, is_published)
values
  ('car-accidents',        'Car Accidents',         'Car Accident',        'car accident',        'car accidents',        'car accident lawyer',        'Car',           10, false),
  ('truck-accidents',      'Truck Accidents',       'Truck Accident',      'truck accident',      'truck accidents',      'truck accident lawyer',      'Truck',         20, false),
  ('motorcycle-accidents', 'Motorcycle Accidents',  'Motorcycle Accident', 'motorcycle accident', 'motorcycle accidents', 'motorcycle accident lawyer', 'Bike',          30, false),
  ('pedestrian-accidents', 'Pedestrian Accidents',  'Pedestrian Accident', 'pedestrian accident', 'pedestrian accidents', 'pedestrian accident lawyer', 'PersonStanding', 40, false),
  ('bicycle-accidents',    'Bicycle Accidents',     'Bicycle Accident',    'bicycle accident',    'bicycle accidents',    'bicycle accident lawyer',    'BikeIcon',      50, false),
  ('slip-and-fall',        'Slip and Fall',         'Slip and Fall',       'slip and fall',       'slip and fall accidents','premises liability lawyer',  'TriangleAlert', 60, false),
  ('wrongful-death',       'Wrongful Death',        'Wrongful Death',      'wrongful death',      'wrongful death matters','wrongful death attorney',     'HeartCrack',    70, false),
  ('dog-bites',            'Dog Bites',             'Dog Bite',            'dog bite injury',     'dog bite injuries',    'dog bite attorney',          'Dog',           80, false),
  ('rideshare-accidents',  'Uber & Lyft Accidents', 'Rideshare Accident',  'rideshare accident',  'rideshare accidents',  'rideshare accident lawyer',  'Smartphone',    90, false)
on conflict (slug) do nothing;
