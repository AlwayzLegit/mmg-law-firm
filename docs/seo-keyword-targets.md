# SEO keyword targets — content roadmap

> **Source:** Semrush organic + keyword-gap analysis (US database) of two direct
> Glendale/LA personal-injury competitors — **Agemian Law Group** and
> **Hartounian** — vs. `mmg-lawfirm.com`. Pulled 2026-06. Volumes are monthly
> US searches; **KD** = keyword difficulty (lower = easier to rank); **CPC** is
> the Google Ads cost-per-click (a proxy for commercial/lead value).
>
> **How to use:** each cluster maps to an existing practice area and the
> city × practice landing page to build. A city × practice page only publishes
> once it has unique `local_angle_md` (spec hard rule #1) — these must be
> written/reviewed by the attorney. **Do not** put guarantees, "best/#1", or
> invented results in titles or copy (CRPC §7.1).

## Why this is winnable

A direct comparable (Agemian) ranks **#1 for "personal injury lawyer glendale"
(vol 720, KD 13)** and **"car accident lawyer glendale" (vol 480, KD 17)** — low
difficulty, high intent. Their winning URLs use exactly our architecture
(`/locations/glendale-ca/uber-accidents-lawyer/`). The structure is right; this
is a content-fill exercise.

---

## Tier 1 — build first (high value, attainable KD, maps to our practice areas)

| Keyword | Vol | KD | CPC | Practice area | Build as |
| --- | --- | --- | --- | --- | --- |
| los angeles truck accident lawyer | 2,900 | **19** | $157 | truck-accidents | LA × truck |
| lyft accident lawyers / lawyer for uber accident | 2,400 / 1,300 | **17 / 22** | $154 / $173 | rideshare-accidents | Glendale × rideshare, LA × rideshare |
| los angeles motorcycle accident lawyer | 2,400 | **21** | $120 | motorcycle-accidents | LA × motorcycle |
| wrongful death attorney los angeles | 1,600 | **19** | $102 | wrongful-death | LA × wrongful-death |
| neck injury lawyer | 1,600 | **10** | $122 | car-accidents (symptom intent) | blog / car-accidents section |
| los angeles car accident attorney | 3,600 | **26** | $156 | car-accidents | LA × car |
| glendale car accident lawyer | 720 | **15** | $116 | car-accidents | Glendale × car *(seeded — fill local angle + publish)* |
| personal injury lawyer glendale | 720 | **13** | $44 | (homepage / Glendale county) | optimize homepage + Glendale county page |

## Tier 2 — strong, slightly higher difficulty

| Keyword | Vol | KD | CPC | Practice area | Build as |
| --- | --- | --- | --- | --- | --- |
| los angeles car accident lawyer | 5,400 | 32 | $156 | car-accidents | LA × car |
| car accident attorney los angeles | 4,400 | 36 | $156 | car-accidents | LA × car |
| los angeles truck accident attorney | 2,400 | 21 | $157 | truck-accidents | LA × truck |
| los angeles bicycle accident lawyer | 1,300 | 34 | $240 | bicycle-accidents | LA × bicycle |
| catastrophic injury attorney los angeles | 1,300 | 27 | — | (consider a practice area / blog) | blog or new PA |
| slip and fall lawyer los angeles | 1,000 | 17–32 | $203 | slip-and-fall | LA × slip-and-fall |

## Tier 3 — fill out the matrix once Tier 1–2 ship

Glendale and LA × every core practice area, then the next-tier cities
(Burbank, Pasadena, Long Beach, Santa Monica) for the highest-CPC verticals
(rideshare, truck, motorcycle).

---

## Rideshare is the standout opportunity

Uber/Lyft terms carry **$100–200 CPC at KD 16–24**. We already have a
`rideshare-accidents` practice area, but searchers type **"Uber"/"Lyft"**, not
"rideshare" — the page title, intro, and `local_angle_md` should name Uber and
Lyft explicitly. Prioritize **Glendale × rideshare** and **LA × rideshare**.

## Spanish is validated, not speculative

The competitor ranks **#1 for "abogado de accidentes automovilísticos glendale"
(vol 210, KD 5)** — concrete evidence for activating the i18n foundation
(`src/lib/i18n/`). Spanish first (volume + very low difficulty), Armenian for
the local community. Requires attorney-reviewed translations before publish.

## Page-build queue (recommended order)

1. `/locations/los-angeles-county/los-angeles/rideshare-accidents` (Uber/Lyft)
2. `/locations/los-angeles-county/glendale/rideshare-accidents`
3. `/locations/los-angeles-county/los-angeles/truck-accidents`
4. `/locations/los-angeles-county/los-angeles/motorcycle-accidents`
5. `/locations/los-angeles-county/los-angeles/wrongful-death`
6. `/locations/los-angeles-county/glendale/car-accidents` *(seeded — fill + publish)*
7. `/locations/los-angeles-county/los-angeles/car-accidents`
8. `/locations/los-angeles-county/los-angeles/slip-and-fall`
9. `/locations/los-angeles-county/los-angeles/bicycle-accidents`

Each row in the admin at `/admin/content/location-pages` — write a genuinely
local `local_angle_md` (roads, courthouses, collision patterns, local insurance
context), then publish.
