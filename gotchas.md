# Gotchas

Traps of the format, of the browsers and of the tooling, each with a date. A trap lives
as long as the tool does, which is why it is written here and not in a session note.

- 2026-08-24. Removing `a:xfrm` from a picture is not a fix, it is the opposite of one.
  Excel ignores that element, so removing it looks harmless, and the WeChat viewer on
  iOS then has no position left to draw from and shows nothing at all. Verified on a
  real file: photos disappeared from a workbook where three of them had been visible.
- 2026-08-24. Excel for Mac computes column widths with MDW=8, not the usual 7. Summed
  over ten columns, MDW=8 lands within 0.2 pt of the coordinates Excel wrote itself and
  MDW=7 is off by 110 pt. Do not calibrate against the file's own coordinates, though:
  the viewer uses 8 whatever the font, see the two entries on the viewer's grid below.
- 2026-08-24. The same file renders correctly in WeChat on Android and shows no pictures
  on iOS, so "it works on my phone" proves nothing. Tencent's own developer forum has
  reports of iOS previews mangling picture dimensions while Android is fine.
- 2026-08-24. When copying zip entries through untouched, take the sizes and the CRC
  from the central directory rather than the local header: an entry written with a data
  descriptor (general purpose bit 3) carries zeros in its local header. Clear bit 3 in
  the entries written out, since the sizes are known before the header is written.
- 2026-08-24. The viewer draws the sheet grid about 12 sheet pixels (27 screen pixels) to the right of where Excel computes it, and draws the picture layer without that shift, so pictures sit left of their cell and wide ones spill into the neighbouring column. Measured from three iPhone screenshots, one of them a file whose coordinates Excel itself wrote, so it is a property of the viewer and not an error in the arithmetic.
- 2026-08-24. The viewer ignores the workbook font when it lays out columns: files with Calibri 11 and with Aptos Narrow 12 produce pixel identical grid lines even though Excel renders those workbooks at different widths. So MDW is fixed at 8 and never calibrated from what Excel wrote. The first version calibrated, and on a file this page had already fixed the calibration tripped over the grid offset and picked MDW=11, which meant a second pass made the file worse.
- 2026-08-24. A file whose coordinates are already correct is returned untouched rather than rewritten. The page can reproduce the anchors but not the author's intent, and a generator that deliberately positioned its pictures for this viewer would have that work undone.
- 2026-09-14. A row that visually holds several product photos side by side does not
  share one anchor between them. Checked against two real catalogs (one with four
  photos in a row, one with two): each photo already has its own `from`/`to` slot, not
  overlapping the next one by more than a couple of EMU. So fitting a picture inside its
  own anchor box needs no logic to avoid colliding with its neighbours; the file already
  drew that boundary.
- 2026-10-03. openpyxl does not declare the `a` namespace on the root of a drawing. It uses the default namespace for `wsDr` and repeats `xmlns:a="..."` on every element that needs it (`a:blip`, `a:stretch`, `a:prstGeom`). An `a:xfrm` pasted into such a file without its own `xmlns:a` makes the XML malformed: lxml, and openpyxl with it, refuses to load the workbook, and a strict reader like Excel can be expected to do the same. The page did exactly that until this date for any openpyxl file with a `twoCellAnchor`; it went unnoticed because the result was only ever read back with regular expressions. Found by loading the output with lxml, and now guarded by a namespace check on every test output.
- 2026-10-03. `ws.add_image(img, 'B2')` in openpyxl writes a `oneCellAnchor`, not a `twoCellAnchor`. So the most common generated file, the one with no absolute coordinates at all, is a one-cell file. A sample is three lines of Python; there is no need to wait for one to turn up.
- 2026-10-03. Relationship attributes come in any order and targets in two forms. Excel writes `Id` first and a relative target (`../media/image1.png`), openpyxl writes `Id` last and a path from the package root (`/xl/media/image1.png`). A pattern that expects `Id` before `Target` silently finds nothing, and the fit option then reports every picture as unreadable.
- 2026-10-03. An existing `a:xfrm` can carry attributes (`rot`, `flipH`, `flipV`) or be empty (`<a:xfrm/>`). Looking for the literal `<a:xfrm>` misses both and adds a second element next to the first. Replace the contents and keep the attributes.
- 2026-10-03. A sheet with no `defaultColWidth` does not have 8.43-character columns in pixel terms. The default is `baseColWidth` digits (8 unless stated) plus 5 px of padding, rounded up to a multiple of 8 px: 64 px at MDW=7, 72 px at MDW=8. The viewer draws 72 (161 screen px at 2.25 per sheet pixel on an openpyxl file). Feeding 8.43 through the ordinary width formula gives 67 and puts every picture 5 px left per default column before it.
- 2026-10-04. "Confirmed on a phone" in a commit or a note says nothing about which file and which axis. The 2026-09-14 confirmation was one file and the horizontal position only, and was read a month later as covering vertical alignment of another catalog, which cost a wrong conclusion. Write down the file and the axis when recording a phone check, and check the transcript before building on one.
- 2026-10-03. A screenshot of the WeChat viewer taken while the page is pulled down past its top edge shows the table lower than it rests. That looked like "the repaired file pushes the table down" and cost one round of wrong conclusions. Measure pictures against the table's own top line, never against the screen.
- 2026-10-03. In October the viewer draws pictures about 139 sheet px (313 screen px) too high, whatever the anchor type, picture size or row layout, in generated files and in a real catalog alike. In September a different real file was off by about 11 px. Whether the viewer changed or the files differ is open; see `docs/viewer-vertical-shift.md`.
