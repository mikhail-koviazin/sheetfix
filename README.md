# sheetfix

Photos in an Excel file are invisible when the file is opened in WeChat on an iPhone.
The table shows up, the picture column is empty. This page gives back a fixed copy.

**[sheetfix.koviazin.dev](https://sheetfix.koviazin.dev)**

Everything happens in the browser. The file is not uploaded anywhere, there is no
server behind the page, no account and no storage.

## What is actually wrong

A picture in an `.xlsx` file carries its position twice:

- anchored to cells, as `xdr:from` and `xdr:to`
- as absolute coordinates, in `a:xfrm/a:off` and `a:ext`

Excel reads the anchor and ignores the absolute values, so on a desktop the file always
looks right. The WeChat viewer on iOS does the opposite: it reads only the absolute
values. They go stale when rows are resized after the pictures were placed, and some
generators (openpyxl among them) never write them at all. Then the pictures are drawn
far below the table, or not drawn.

Android shows the same file correctly, which is why the problem is easy to miss.

This page recomputes the absolute coordinates from the anchors. Excel does not read
them, so the fixed copy is identical everywhere it already worked.

Deleting `a:xfrm` instead looks like the obvious fix and makes things worse: it leaves
the iOS viewer with no position at all, and then nothing is drawn even in a file that
was fine.

## How it works

`.xlsx` is a zip. The page reads the central directory itself, unpacks only
`xl/drawings/drawing*.xml` and the sheets it needs for row heights and column widths,
rewrites the coordinates and repacks. Every other entry, the photos included, is copied
with its bytes still compressed, so a five megabyte file is done in about twenty
milliseconds and the pictures are never decoded.

Column widths are stored in characters, and turning them into pixels depends on the
width of a digit in the workbook font (MDW):

```
px = trunc(((256 * width + trunc(128 / MDW)) / 256) * MDW)
```

The common value is 7, but Excel for Mac writes files that only line up with 8. When the
file already carries coordinates written by Excel, the page calibrates MDW against them
and falls back to 8.

No dependencies, no build step, one HTML file. Read it before you trust it.

## Center and fit to cell

An optional checkbox additionally resizes each picture to the cell its anchor already
occupies and centers it there, keeping its own proportions. It reads the picture's real
pixel size from the file, so nothing is stretched. It runs even on a picture the plain
fix would call already correct, since asking for it is itself the request.

## Doing it without the page

A Python version of the same fix, with a diagnostic mode that reports what is wrong with
a file without changing it, lives in a separate repository. There is also a VBA macro for
Excel on macOS that makes Excel rewrite the coordinates on the next save.
