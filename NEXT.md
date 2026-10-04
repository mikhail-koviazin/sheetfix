# Open items

Open items only, one line plus a link. Rewritten at session close, not appended to.

- [ ] Pictures in generated test files sit 139 px too high in WeChat on iOS. Next step is one screenshot of a real, previously repaired catalog on the same phone. See `docs/viewer-vertical-shift.md`.
- [ ] The commits of 2026-10-03 are pushed but not deployed (a push deploys nothing here, the deploy is a manual `npx wrangler pages deploy public --project-name sheetfix`). They hold the openpyxl namespace fix (the live page writes malformed XML for those files), the 72 px default column and one-cell anchor support. Deploy waits for the item above, or ship the first two on their own. See `gotchas.md`, 2026-10-03.
- [ ] Pictures on `absoluteAnchor` are counted and reported, not touched. No real file with one has been seen. See `docs/decisions.md`, 2026-10-03.
