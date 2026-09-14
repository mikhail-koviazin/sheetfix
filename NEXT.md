# Open items

Open items only, one line plus a link. Rewritten at session close, not appended to.

- [ ] Only `twoCellAnchor` is repaired. Pictures on `oneCellAnchor` or `absoluteAnchor`
  are counted and reported, not touched. No sample file with them has been seen yet.
- [ ] Nothing verifies the page automatically. The check so far is manual: run real
  catalog files through the page in a browser and inspect the resulting `drawing1.xml`.
- [ ] README.md's "How it works" section still says MDW is calibrated against a file's
  own Excel-written coordinates when present. `docs/decisions.md` ("target the viewer's
  layout, not Excel's") records that this was dropped in favor of a fixed MDW=8. The
  paragraph needs rewriting to match; noticed 2026-09-14, not fixed this session.
