# Open items

Open items only, one line plus a link. Rewritten at session close, not appended to.

- [ ] Since late September WeChat on iOS draws every picture 139 px too high, real catalogs included. Find out what updated, test on another iPhone model, then decide between compensating and waiting. See `docs/viewer-vertical-shift.md`.
- [ ] The commits of 2026-10-03 are pushed but not deployed (a push deploys nothing here, the deploy is a manual `npx wrangler pages deploy public --project-name sheetfix`). They hold the openpyxl namespace fix (the live page writes malformed XML for those files), the 72 px default column and one-cell anchor support. The vertical shift hits all files alike, so it no longer blocks one-cell support in particular; deploying is Mike's call. See `gotchas.md`, 2026-10-03.
- [ ] Pictures on `absoluteAnchor` are counted and reported, not touched. No real file with one has been seen. See `docs/decisions.md`, 2026-10-03.
