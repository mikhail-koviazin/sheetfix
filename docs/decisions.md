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
