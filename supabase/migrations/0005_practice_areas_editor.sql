-- 0005_practice_areas_editor.sql — make `practice_areas` editable end-to-end.
--
-- Adds two jsonb columns for structured editorial content (subtopics,
-- what-to-do checklists), then seeds the 9 practice areas with their
-- structural fields (slug/name/icon/intro). Editorial fields (body_md,
-- subtopics_json, what_to_do_json, faq_json) are intentionally left empty
-- per spec hard rules #6/#7 — the attorney fills them in via
-- /admin/content/practice-areas before flipping is_published = true.
--
-- RLS is unchanged from 0002 (public-read when published, admin all).

alter table practice_areas
  add column if not exists subtopics_json jsonb not null default '[]'::jsonb;

alter table practice_areas
  add column if not exists what_to_do_json jsonb not null default '[]'::jsonb;

-- =========================================================================
-- Seed: the 9 practice areas the public site renders. Slugs are URL-stable
-- and must match src/lib/data/practice-areas.ts exactly.
--
-- `intro_md` mirrors the static seed's `intro` so admins start with that
-- copy in the editor and can refine. `is_published` defaults to false; the
-- public page falls back to the static module until the attorney publishes.
-- =========================================================================

insert into practice_areas (
  slug, name, short_name, noun_singular, noun_plural,
  lawyer_phrase, icon, intro_md, display_order, is_published
)
values
  (
    'car-accidents',
    'Car Accidents', 'Car Accident',
    'car accident', 'car accidents',
    'car accident lawyer', 'Car',
    'Rear-end, intersection, and freeway collisions across California. We handle medical liens, property damage, and insurance pushback on your behalf.',
    10, false
  ),
  (
    'truck-accidents',
    'Truck Accidents', 'Truck Accident',
    'truck accident', 'truck accidents',
    'truck accident lawyer', 'Truck',
    'Commercial truck crashes involve federal motor-carrier rules, multiple insurers, and aggressive defense teams. We move fast to preserve evidence.',
    20, false
  ),
  (
    'motorcycle-accidents',
    'Motorcycle Accidents', 'Motorcycle Accident',
    'motorcycle accident', 'motorcycle accidents',
    'motorcycle accident lawyer', 'Bike',
    'Riders face unfair bias from insurers and juries. We push back with crash reconstruction and a clear narrative of how the collision occurred.',
    30, false
  ),
  (
    'pedestrian-accidents',
    'Pedestrian Accidents', 'Pedestrian Accident',
    'pedestrian accident', 'pedestrian accidents',
    'pedestrian accident lawyer', 'PersonStanding',
    'Crosswalk strikes, parking-lot collisions, and unsafe-roadway claims. Pedestrian injuries are typically severe — we treat the case with the urgency it deserves.',
    40, false
  ),
  (
    'bicycle-accidents',
    'Bicycle Accidents', 'Bicycle Accident',
    'bicycle accident', 'bicycle accidents',
    'bicycle accident lawyer', 'BikeIcon',
    'Door-zone crashes, hit-from-behind, and unsafe-lane-change collisions. We document the bike-specific facts insurers prefer to ignore.',
    50, false
  ),
  (
    'slip-and-fall',
    'Slip and Fall', 'Slip and Fall',
    'slip and fall', 'slip and fall accidents',
    'premises liability lawyer', 'TriangleAlert',
    'Wet floors, uneven walkways, broken stairs, and inadequate security. Premises liability cases turn on notice — we build the timeline before evidence disappears.',
    60, false
  ),
  (
    'wrongful-death',
    'Wrongful Death', 'Wrongful Death',
    'wrongful death', 'wrongful death matters',
    'wrongful death attorney', 'HeartCrack',
    'If a loved one was lost to another''s negligence, California gives surviving family members the right to seek accountability. We approach these matters with the care they require.',
    70, false
  ),
  (
    'dog-bites',
    'Dog Bites', 'Dog Bite',
    'dog bite injury', 'dog bite injuries',
    'dog bite attorney', 'Dog',
    'California is a strict-liability state for dog bites. Owners are responsible for injuries even on a first incident — we work directly with the owner''s homeowners or renters insurer.',
    80, false
  ),
  (
    'rideshare-accidents',
    'Uber & Lyft Accidents', 'Rideshare Accident',
    'rideshare accident', 'rideshare accidents',
    'rideshare accident lawyer', 'Smartphone',
    'Uber and Lyft cases involve layered insurance policies that change depending on the driver''s app status at the moment of the crash. We know how to navigate them.',
    90, false
  )
on conflict (slug) do nothing;
