# sheetfix

A single static page that repairs .xlsx files whose pictures do not show up in some
viewers, WeChat on iOS above all. Everything runs in the visitor's browser: the file is
never uploaded, there is no server, no account and no storage.

**`AGENTS.md` is the only rules file, for every agent.** Claude Code reads it itself when no `CLAUDE.md` exists in the folder or above, so there is no `CLAUDE.md` here. A `CLAUDE.md` mentioned in older docs means this file; new references point to `AGENTS.md`.

## Origin and boundary

- Spun out of the private repository `china-products-monitoring`, where the bug was
  found and diagnosed while sending product tables to clients. That repository keeps
  order data and a Python version of the same fix (`tools/fix_image_anchors.py`); this
  one keeps the browser tool with its own deploy and its own address. Neither copies
  the other's content, they link.
- Nothing about clients, orders, prices or suppliers belongs here. This repository is
  public: it holds a tool and the reasoning behind it, and no data.
- Work on the tool is run from a session opened in this directory, so that this guide,
  this journal and this queue are the ones in context. The parent repository is told
  only about milestones, never about intermediate steps.
- The parent's rules do not carry over. Its layout, its Russian commits and its order
  workflow were written for its own content.

## Language

- Dialogue with Mike is in Russian.
- Everything written down is in English: the page, the README, the docs, the commit
  messages, the journal. The repository is public and the page is aimed at whoever hits
  the same bug.
- No em dashes anywhere, in any language. Commas, colons, parentheses, shorter
  sentences. Prose is not wrapped to a column width: a paragraph is one line.

## Layout

```
public/index.html    the whole tool: markup, styles and logic in one self-contained file
docs/                knowledge that outlives a session: decisions.md (what was chosen and why)
tests/               node --test: runs the page's inline script under Node against synthetic workbooks
gotchas.md           traps of the format and of the browsers, each with a date
NEXT.md              open items only, one line plus a link, rewritten at session close
```

The page stays a single file with no build step and no dependencies. That is a
deliberate constraint, not an accident: it is the reason the tool can be read end to
end by anyone who does not trust it, and the reason it will still work untouched years
from now. A bundler, a framework or an npm dependency needs a decision in
`docs/decisions.md` before it arrives.

## The fix itself

A picture in an .xlsx file carries its position twice: anchored to cells
(`xdr:from`/`xdr:to`) and as absolute coordinates (`a:xfrm/a:off` and `a:ext`). Excel
reads the anchor and ignores the absolute values, so on a desktop the file always looks
right. The WeChat viewer on iOS reads only the absolute values. They go stale when rows
are resized after the pictures were placed, and tools like openpyxl never write them at
all, so the pictures land far below the table or are not drawn.

Two anchor kinds tie a picture to a cell: `twoCellAnchor` (Excel) and `oneCellAnchor` (openpyxl's default). Both are repaired. `absoluteAnchor` is reported and left alone until a real file shows how the viewer treats it.

Two rules follow. Write both positions, always, and keep them in agreement. Never delete
`a:xfrm`: it is not leftover junk but the second half of the record, and removing it
takes away the only thing the iOS viewer uses.

## Git

- GitHub, public, `mikhail-koviazin/sheetfix`, branch `main`.
- One commit per closed topic, not per message in the chat. Short header, bullets when
  there is more than one change. Stage explicit paths, never `git add -A`.
- No AI attribution in commits, PR bodies or comments.

## Deploy

Cloudflare Pages, output directory `public`, custom domain `sheetfix.koviazin.dev` with
a CNAME at the registrar, the same shape as `fieldsheet`. The address is what gets sent
to people, so it does not move without a decision.

The Pages project has no git integration: a push deploys nothing. Deploy by hand with `npx wrangler pages deploy public --project-name sheetfix`, and only after the change has been checked on a phone.

## Never committed

Machine-local settings (`.idea/`, `.vscode/`, `.claude/settings.local.json`), secrets and
`.env`, test spreadsheets carrying real order data, build or render artifacts.
