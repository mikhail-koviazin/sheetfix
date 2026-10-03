# Decisions and why

What was chosen and what it rules out. Not a chronicle: each entry is here because
someone would otherwise make the opposite choice by default.

## 2026-08-24: its own repository, not a file in the parent

The fix was found in a private repository that holds order data, and the first version
of it lives there as a Python script. That is the right home for the script and the
wrong home for a web page: the people who need the page have neither Python nor access
to that repository, and a public page cannot be served out of a repository full of
client data.

So the page gets its own repository, its own deploy and its own address, the same shape
already used for the field app. The parent keeps the script and the Excel macro, links
here, and is told about milestones only.

## 2026-08-24: everything in the browser, no server

An .xlsx file with photos is a business document: prices, suppliers, sometimes a client
list. Uploading one to a stranger's site to have it repaired is a worse deal than the
bug it fixes, and saying "we delete it right after" does not change that, because it
cannot be checked from outside.

A browser can do the whole job. `DecompressionStream` and `CompressionStream` have been
available across Safari, Chrome and Firefox since 2023, and a zip central directory is a
hundred lines to parse. So there is no upload, no server to trust, no account, and the
promise on the page is verifiable: the network tab stays empty.

This also settles hosting. A static page can sit anywhere, which keeps a move to another
host a DNS change and nothing more.

## 2026-08-24: recompute the absolute coordinates, never delete them

The obvious first fix is to delete `a:xfrm` altogether: Excel ignores it, so it looks
like dead metadata. Tried on a real file, it made things worse. The iOS viewer reads
only those coordinates, so deleting them left it with nothing to draw and the photos
disappeared even where they had been visible.

`a:xfrm` is therefore not junk but the second half of a two part record, and the fix is
to keep both halves in agreement. The direction is fixed too: the anchor is the truth
and the absolute values are derived from it, never the other way round, because the
anchor is what Excel maintains while editing.

## 2026-08-24: repack the zip instead of rebuilding the workbook

A spreadsheet library would parse the whole workbook, hold the pictures in memory and
write a new file. Two things make that the wrong shape here. It is slow and heavy in a
browser tab on a phone, and it silently rewrites parts of the document that nobody asked
it to touch, so the returned file differs from the original in ways the user cannot see.

Instead only `xl/drawings/drawing*.xml` is decoded and rewritten. Every other entry,
photos included, is copied with its bytes still compressed. A five megabyte file takes
about twenty milliseconds, the images are never decoded, and the diff between input and
output is exactly the change that was asked for.

## 2026-08-24: one file, no build step, no dependencies

The page is a self-contained HTML file. This is a constraint worth defending: a person
handed a link and asked to feed a business document to it should be able to read the
whole thing, and a tool with no build and no dependencies still works years later when
nobody has looked at it. Adding a bundler, a framework or an npm package needs an entry
in this file first.

## 2026-08-24: target the viewer's layout, not Excel's

The first version simply mirrored the anchor into `a:off` and calibrated the column width model against whatever Excel had written into that particular file. Measurements taken from iPhone screenshots showed that this is the wrong target. The viewer lays columns out with its own model and ignores the workbook font, and it draws the grid about 12 sheet pixels to the right of the picture layer. That is why pictures looked shifted left even in a file whose coordinates Excel itself had written.

So the model is now fixed at MDW=8 and a constant offset is added. This is deliberately a choice in favour of one reader, and the justification is that `a:off` has no other reader: Excel ignores it, and so do LibreOffice and Google Sheets, which all draw from the anchor. The field was dead weight until it turned out that one viewer reads nothing else. Storing a copy of the anchor in it helps nobody; making it correct for the only program that looks at it helps.

Calibrating MDW per file is tempting and wrong for the same reason. It reproduces Excel's model rather than the viewer's, and on a file this page had already corrected the calibration tripped over the grid offset, so a second pass degraded the file.

A file whose coordinates are already correct is now returned untouched. The page can reproduce anchors but not intent, and a generator that positioned its pictures for this viewer on purpose would otherwise have that undone.

## 2026-09-14: center and fit to cell, as a checkbox, not the default

Some catalogs anchor each picture to the cell it belongs in but leave its size and
position inside that cell to whatever the paste dialog did: too big for the row, too
small for the column, sitting in a corner. A checkbox reads the picture's own pixel
width and height straight from its file header, then resizes it to fit inside the box
its anchor already defines, keeping its proportions, and centers it there.

It stays a checkbox instead of becoming what the plain fix always does. The plain fix
already leaves a picture alone once its absolute coordinates look correct, on the
premise that someone may have positioned it on purpose; resizing a picture that was
already sitting where its author put it would break that premise outright. Center and
fit is a different, explicit request, so it always runs when asked, even on a picture
the plain fix would otherwise call already correct.

A row with several pictures side by side (checked against real catalogs, one with four
product photos sharing a row, another with two) turned out to give each picture its own
non-overlapping `from`/`to` slot already. Fitting a picture inside its own slot therefore
needs no logic to keep it from colliding with its neighbours: the file had already drawn
the boundary.

## 2026-09-16: no .xls to .xlsx conversion

Considered adding conversion so a supplier's old `.xls` (BIFF8, Excel 97-2003) could be
fixed on a phone without resaving it on a computer first. Ruled out.

`.xls` is not xlsx-without-zip, it is a different binary format entirely, so this is not
a small addition on top of the existing zip/XML code, it is a second file format to
parse from scratch. The only way to read it without writing a full BIFF8 parser is a
third-party library, and every one checked drops the one thing this page exists for.
SheetJS community edition (the only free, no-build, drop-in option) reads and writes
`.xls`/`.xlsx` cell data but does not read or write embedded pictures at all, that is a
SheetJS Pro (paid, closed, minified) feature. Searched further for anything that reads
the MSODRAWING/escher picture records inside a `.xls` file specifically: nothing free
exists, in JavaScript or in the wider ecosystem (checked the Python side too, same gap).

Writing a from-scratch escher/BLIP parser to pull pictures out of `.xls` and re-anchor
them into a fresh `.xlsx` is possible in principle, in the same spirit as the anchor fix
this page already does, but it is a second, much larger reverse-engineering project, not
an extension of this one. Not worth it for a format that Excel itself will convert on
`File > Save As` in one click. The page keeps telling the visitor to resave as `.xlsx`
first.

## 2026-10-03: tests run the page's script as is, under Node, with nothing installed

Checking the page used to mean dragging real catalogs into a browser and reading the resulting `drawing1.xml` by eye, which nobody repeats after a small change. `tests/repair.test.mjs` now does it mechanically: it pulls the inline script out of `public/index.html`, evaluates it under Node with a stub in place of the document, and feeds it small workbooks built in the test from hand-written XML.

This keeps the one-file constraint intact. The page gains no export, no module boundary and no build step for the tests' sake, and the tests use only what ships with Node (`node:test`, `node:vm`, `node:zlib`), so there is still no `package.json` and nothing to install. The run is `node --test`, locally, before a commit; no CI was added because a workflow file is one more thing to keep alive for a page that changes a few times a year.

Fixtures are synthetic on purpose. Real catalogs carry order data and are ignored by git, so anything a real file teaches goes into a test as the few lines of XML that reproduce it. The output zip is checked with a separate reader written in the test rather than the page's own, so a mistake in the zip code cannot hide behind itself.

What the tests cannot see is the viewer. They pin the arithmetic (which coordinates are written for which anchor) and not whether WeChat on iOS draws the result where expected; that still takes a phone.
