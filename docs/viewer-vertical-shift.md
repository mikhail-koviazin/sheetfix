# Pictures drawn 139 px too high in WeChat on iOS

Open investigation, started 2026-10-03. Cause narrowed down on 2026-10-04 (see the result below), fix not decided. Read this before touching one-cell anchors or the vertical coordinate.

## What was seen

Workbooks generated with openpyxl and repaired by the page were opened in WeChat on an iPhone (1290 px wide screenshots, 2.25 screen px per sheet pixel). The pictures show up, at the right size and in the right column, and every one of them is drawn 139.1 sheet px (313 screen px) above the place its coordinates name. The first picture ends up above the table, beyond the top of the page: it is only visible while the page is pulled down past its top edge.

The shift was measured in ten screenshots as `table top + y - picture top`, so the amount of pull does not enter into it. It came out as 138.7 to 139.1 in every one.

| File | What it varies | Shift, sheet px |
|---|---|---|
| openpyxl sample, repaired | baseline: one-cell anchors, header 15 pt, rows 90 pt | 138.7 to 139.1 |
| t1 | two-cell anchors written by openpyxl | 138.7 |
| t2 | one-cell anchors, drawing rewritten the way Excel writes it (xdr prefix, namespaces on the root) | 139.1 |
| t3 | picture heights 60, 110, 80 px | 139.1 |
| e1 | header row 40 pt | 139.1 |
| e2 | data rows 60 pt | 139.1 |
| e3 | two empty rows between header and data | 139.1 |
| e4 | five picture rows instead of three | 139.1 |

So the shift depends on nothing that was varied: not the anchor type, not the shape of the drawing XML, not the picture sizes, not the row heights, not the number of rows, not where the first picture sits.

## What it rules out

It is not a one-cell anchor problem. A two-cell anchor in the same kind of file is shifted by the same amount.

It is not an error in the row arithmetic. The pictures are spaced exactly as the rows are, and the row lines on screen sit where the model puts them.

## The reading so far, unconfirmed

At rest, with the page not pulled, the table starts just under WeChat's grey title bar (table top at 318 screen px, bar ending near 292) and the origin of the picture layer works out to about 5 screen px from the top of the screen, behind the status bar. That is what one would get if the viewer lays the table out below the bar and positions pictures from the very top of the screen: 313 screen px is close to status bar plus title bar on this phone.

This would also explain the horizontal 12 px grid offset recorded on 2026-08-24 as the same thing seen sideways: a margin that applies to the table and not to the pictures.

If that reading is right, the shift is a property of the viewer and of the phone model, and no value written into the file corrects it reliably.

What contradicts it: on 2026-08-24 and 2026-09-14 real catalogs were checked on a phone and the vertical position was right with no correction at all (`gotchas.md`, entries of those dates). Either the viewer changed since, or real files differ from the generated ones in something not yet varied.

## Result, 2026-10-04: the viewer changed, not the files

A real catalog repaired by the page on 2026-09-16 was opened on the same iPhone. Its drawing carries exactly the coordinates of the file that was confirmed aligned on a phone on 2026-09-14 (same anchors, same `a:xfrm`, byte for byte in the drawing). Now its pictures sit in the header row instead of the row below it.

Measured on the bottom edge of each picture's own content (the tops are cut off by the top of the page), against the table's top line: 141.1, 140.3 and 141.5 sheet px too high. That is the same shift as in the generated files, within the 2 px by which the viewer's header row differs from the file (it draws a 67.9 pt row 96 px tall instead of 90.5).

So coordinates that were right in September are wrong in October. Nothing in the page or in the files explains it; the viewer, or whatever hosts it, now draws the picture layer about 313 screen px higher relative to the table than it did.

The reading above gains weight: the table is laid out below WeChat's bars and the pictures from the top of the screen, as if the web view started extending under the bars while only the table respects the inset. A matching observation sideways: the table's left line is drawn 24 screen px (about 11 sheet px) from the screen edge, close to the 12 px horizontal grid offset measured in August. Both may be the same effect, an inset applied to the table and not to the pictures. Unconfirmed.

## Next step

- Find out what changed between 2026-09-14 and 2026-10-03: a WeChat update, an iOS update, or a display setting on the phone.
- Open one of the test files on a different iPhone model. If the shift stays 139 sheet px it is a constant the page could compensate; if it changes with the height of the status bar it is tied to the device and no value written into a file can be right everywhere.
- Then decide: compensate, or wait for the viewer to be fixed. A compensation would put pictures one row low again the day the viewer goes back to its September behaviour, and no other reader would mind either way, since only this viewer reads `a:xfrm`.

The shift applies to every file the same way, so it is no reason to hold back one-cell anchor support specifically: one-cell pictures land exactly as wrong as two-cell ones.

## How to reproduce

The generated files have no data in them: a header row, three rows with a number, a name and a price, and one flat coloured picture per row in column B (22 characters wide), added with `ws.add_image(img, 'B2')` in openpyxl, pictures made with Pillow. Each is then run through the page's own script under Node, the same way `tests/repair.test.mjs` loads it, and the output is sent to the phone.

To measure a screenshot: find the top grid line of the table and the top edge of each picture's black border, and compare `(table top + y * 2.25 - picture top) / 2.25` with zero, where `y` is the picture's `a:off` in sheet pixels. Measuring against the table rather than the screen is what makes screenshots taken at different pull distances comparable. Do not judge by eye.
