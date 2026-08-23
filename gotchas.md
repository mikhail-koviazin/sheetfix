# Gotchas

Traps of the format, of the browsers and of the tooling, each with a date. A trap lives
as long as the tool does, which is why it is written here and not in a session note.

- 2026-08-24. Removing `a:xfrm` from a picture is not a fix, it is the opposite of one.
  Excel ignores that element, so removing it looks harmless, and the WeChat viewer on
  iOS then has no position left to draw from and shows nothing at all. Verified on a
  real file: photos disappeared from a workbook where three of them had been visible.
- 2026-08-24. Excel for Mac computes column widths with MDW=8, not the usual 7. Summed
  over ten columns, MDW=8 lands within 0.2 pt of the coordinates Excel wrote itself and
  MDW=7 is off by 110 pt. Calibrate against the file when it already carries
  coordinates.
- 2026-08-24. The same file renders correctly in WeChat on Android and shows no pictures
  on iOS, so "it works on my phone" proves nothing. Tencent's own developer forum has
  reports of iOS previews mangling picture dimensions while Android is fine.
- 2026-08-24. When copying zip entries through untouched, take the sizes and the CRC
  from the central directory rather than the local header: an entry written with a data
  descriptor (general purpose bit 3) carries zeros in its local header. Clear bit 3 in
  the entries written out, since the sizes are known before the header is written.
