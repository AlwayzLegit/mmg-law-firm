-- 0030_redirect_legacy_home.sql
--
-- /home is a leftover Squarespace URL that Google still has indexed. Semrush
-- (Jul 2026) shows it ranking for the attorney's own name:
--
--   mihran ghazaryan  #15  https://www.mmg-lawfirm.com/home
--   mihran ghazaryan  #24  https://www.mmg-lawfirm.com/home
--
-- The Next app has no /home route, so it currently serves a 404 — the old
-- page's accumulated link equity is thrown away, and it splits the brand
-- query against /, /attorneys/mihran-ghazaryan, and the county pages.
--
-- 301 it to the homepage, matching the /about, /our-team, /contact-us pattern
-- already in this table. Enforced by src/proxy.ts.

insert into redirects (source_path, destination, permanent)
values ('/home', '/', true)
on conflict (source_path) do update
  set destination = excluded.destination,
      permanent   = excluded.permanent;
