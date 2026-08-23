# Open items

Open items only, one line plus a link. Rewritten at session close, not appended to.

- [ ] Only `twoCellAnchor` is repaired. Pictures on `oneCellAnchor` or `absoluteAnchor`
  are counted and reported, not touched. No sample file with them has been seen yet.
- [ ] Horizontal drift: in the WeChat viewer the column grid and the picture layer are
  measured with slightly different models, so a wide picture can sit a few points to the
  left of its cell. The coordinates written here match what Excel writes itself to within
  0.25 pt, so compensating for it means deliberately biasing `a:off` for one viewer.
  Needs measurements on a phone. Cosmetic.
- [ ] Nothing verifies the page automatically. The check so far was manual: run the three
  states (stale, missing, already correct) through it and compare the resulting
  `drawing1.xml` byte for byte against the Python implementation.
