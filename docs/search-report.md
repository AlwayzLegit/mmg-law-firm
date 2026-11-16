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

## Sign-in without a key (OPS-82)

There is no key and no secret. On main only, the step "Sign in to Google
without a key" asks Google for a short-lived read-only token
(`webmasters.readonly`, 10 minutes) through workload identity: the workflow's
own GitHub sign-in, acting as the Crew's read-only account. That account's
address is the repository variable `GSC_SERVICE_ACCOUNT`; it is not written in
any file. Google itself refuses every ref but `refs/heads/main`, so a pull
request or another branch can never get a token, and no credentials file is
written. The report prints `sign-in: workload identity` when it used the token.
The pattern is Weedtip's OPS-80 (f03226d).

### Why it waits while the repository is public

GitHub prints the inputs of a `uses:` step in the job log and does not mask a
repository variable, so on this public repository the account's address would
be readable by anyone, for good. So the sign-in step runs only when the
repository is private (the same `private` read the search terms check makes),
and until then every run is green and prints one line:

`Search results report: waiting (public repository: the keyless sign-in starts once the repository is private, OPS-52)`

Two other fixed waiting lines exist: the repository variable
`GSC_SERVICE_ACCOUNT` is not set (OPS-25), and "no sign-in token: the keyless
sign-in runs on main only" (a manual run on another branch). Waiting is not
proof that the report works. A sign-in that Google refuses, or a token that
Search Console refuses (HTTP 401 or 403), is a red run.

When OPS-52 makes the repository private, the next run signs in by itself with
no change. If the owner ever says the address may appear in public logs, the
condition `steps.terms.outputs.private == 'true'` is one line to drop.

## Which property

`GSC_DOMAIN` is `mmg-lawfirm.com`. The read-only account must be added as a
user of the Search Console property (permission Restricted): owner step OPS-25.
Until it is, the run is green and prints "Search results report: the read-only
account cannot read a property for mmg-lawfirm.com yet (owner step OPS-25)" and
writes no file. When the repository variable `GSC_SITE_URL` is empty, the script
asks Search Console which properties the account can read
(`GET webmasters/v3/sites`) and takes `sc-domain:mmg-lawfirm.com` if listed,
else the address property for `https://www.mmg-lawfirm.com/` or
`https://mmg-lawfirm.com/` with the most rights. `GSC_SITE_URL` overrides the
search, and is used only when the account can read it.

## Secrets and safety

- The token is read only in the step that calls Google, with the read-only
  scope `webmasters.readonly`. A failed call prints its HTTP status number and
  nothing from the response. Neither the token nor the account's address is
  printed.
- `id-token: write` is asked for inside the job only, never at workflow level.
- Every step after the unit tests is skipped for a pull request, so the token
  can never be in a pull request run.
- The workflow does not start a production deploy: `.github/**`, `scripts/**`
  and `docs/**` are on the skip list of `cloudflare-deploy.yml` (OPS-33).

## Way back

GitHub, Actions, Search results report, Disable workflow. Or revert the merge
commit (the report then waits for a key again; nothing in Google needs
undoing). The owner can also remove the read-only account from the property in
Search Console, which ends the access at once.

## Tests

`node --test scripts/search-report/report.test.mjs` (no network, no
dependency).
