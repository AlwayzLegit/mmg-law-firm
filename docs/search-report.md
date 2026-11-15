# Search results report (OPS-37)

A weekly report of what Google shows people for mmg-lawfirm.com, read from the
Search Console API by `.github/workflows/search-report.yml` and
`scripts/search-report/report.mjs`. Copied from the Weedtip pattern (OPS-24,
weedtip `df9fdbe`) and changed for this repository.

## What it shows

Runs Monday, Wednesday and Friday at 15:37 UTC (07:37 Pacific standard time).
Monday and manual runs write the full report to the job summary; the other
runs write the alarm check only.

- Site totals: clicks, impressions, click rate and average position for the
  last 28 days against the 28 before.
- The top 20 pages by clicks, and the pages with at least 500 impressions and a
  click rate under 1 percent (seen but not clicked). These are the site's own
  addresses.
- Only when search terms are allowed (see below): the top 20 searches, the
  biggest gainers and losers, and the searches at position 5 to 20 with at
  least 50 impressions.

The numbers also go to a small JSON file kept as the workflow artifact
`search-report-latest` (90 days), so the next run can compare. It is never
committed to the repository.

## The alarm

`ALARM impressions` fails the run red when both of the 2 newest final days are
below 30 percent of their weekday baseline (the average of the same weekday in
the 4 weeks before), and that baseline is at least 100 impressions a day. A red
run with this line is an Incident. Search Console's final data is about 2 days
behind, so the alarm cannot say "today".

## Public repository rule

This repository is public. Every job summary, log line and stored artifact can
be read by anyone, and cannot be taken back. A search can hold a person's name
(the other driver, an insurer, a case) and no filter can find a name for
certain. So **no search term is printed or stored** unless the environment
value `SHOW_SEARCH_TERMS` is exactly `true`. The workflow sets it to `true`
only when the repository is private, or when the line `SHOW_TERMS_ON_PUBLIC` in
the workflow is changed to `"true"`. That line is `"false"`, and changing it is
a client matter for the owner (asked in OPS-25). If the call that reads the
repository fails, the answer is false.

With terms withheld the report says "Search terms withheld: public repository
(N searches)". Totals, counts and the page lists stay.

## Not configured

The secret `GSC_SERVICE_ACCOUNT_JSON` does not exist yet (owner step OPS-25).
Until it does, every run is green and prints one line: "Search results report:
not configured (secret GSC_SERVICE_ACCOUNT_JSON is missing)". That is not proof
that the report works.

## Which property

`GSC_DOMAIN` is `mmg-lawfirm.com`. When the repository variable `GSC_SITE_URL`
is empty, the script asks Search Console which properties the service account
can read (`GET webmasters/v3/sites`) and takes `sc-domain:mmg-lawfirm.com` if
listed, else the address property for `https://www.mmg-lawfirm.com/` or
`https://mmg-lawfirm.com/` with the most rights. If none is listed the run
fails with "the service account cannot read a property for mmg-lawfirm.com":
add the service account's address to the property in Search Console (OPS-25
step 2). Setting the repository variable `GSC_SITE_URL` overrides the search.

## Secrets and safety

- The key is read only in the step that calls Google, with the read-only scope
  `webmasters.readonly`. A failed call prints its HTTP status number and
  nothing from the response.
- Every step after the unit tests is skipped for a pull request, so the key can
  never be in a pull request run.
- The workflow does not start a production deploy: `.github/**`, `scripts/**`
  and `docs/**` are on the skip list of `cloudflare-deploy.yml` (OPS-33).

## Way back

GitHub, Actions, Search results report, Disable workflow. Or revert the merge
commit. The owner can also remove the service account from the property in
Search Console, which ends the access at once.

## Tests

`node --test scripts/search-report/report.test.mjs` (no network, no
dependency).
