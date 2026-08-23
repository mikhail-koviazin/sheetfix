# Open items

Open items only, one line plus a link. Rewritten at session close, not appended to.

- [ ] Only `twoCellAnchor` is repaired. Pictures on `oneCellAnchor` or `absoluteAnchor`
  are counted and reported, not touched. No sample file with them has been seen yet.
- [ ] Not deployed. The live page at sheetfix.koviazin.dev still has the first version,
  without the grid offset correction. Deploy after the alignment is confirmed on a phone.
- [ ] Nothing verifies the page automatically. The check so far was manual: run the three
  states (stale, missing, already correct) through it and compare the resulting
  `drawing1.xml` byte for byte against the Python implementation.
