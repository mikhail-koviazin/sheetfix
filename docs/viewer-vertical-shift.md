# Pictures drawn 139 px too high in generated test files

Open investigation, started 2026-10-03. Not resolved. Read this before touching one-cell anchors or the vertical coordinate.

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

## Next step

One observation decides between the two. Open in WeChat on the same iPhone a real catalog that the page repaired earlier and that looked right then.

- Still right: the cause is in the generated files. Compare a real file's sheet and workbook parts with an openpyxl one (sheetViews, dimension, pageMargins, sheetFormatPr, workbook views) and vary those one at a time, as above.
- Now shifted too: the viewer changed. Find out whether WeChat or iOS was updated after 2026-09-14 and whether it is the same phone. Then decide what the page can still promise, since a correction that depends on the phone cannot be written into a file.

Until this is settled, one-cell anchor support is committed but must not be deployed as a fix that is known to work.

## How to reproduce

The generated files have no data in them: a header row, three rows with a number, a name and a price, and one flat coloured picture per row in column B (22 characters wide), added with `ws.add_image(img, 'B2')` in openpyxl, pictures made with Pillow. Each is then run through the page's own script under Node, the same way `tests/repair.test.mjs` loads it, and the output is sent to the phone.

To measure a screenshot: find the top grid line of the table and the top edge of each picture's black border, and compare `(table top + y * 2.25 - picture top) / 2.25` with zero, where `y` is the picture's `a:off` in sheet pixels. Measuring against the table rather than the screen is what makes screenshots taken at different pull distances comparable. Do not judge by eye.
