// Runs the page's own script under Node and checks what it writes into a workbook.
// Run with: node --test
//
// The page is not changed for the tests' sake: its inline script is evaluated as is, with
// a stub standing in for the document. Fixtures are built here from hand-written XML, so
// no real spreadsheet is ever committed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';

const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const scripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];

const element = () => ({ addEventListener() {}, classList: { add() {}, remove() {} }, click() {}, remove() {} });
globalThis.document = { ...element(), getElementById: element, createElement: element, body: { appendChild() {} } };
globalThis.window = globalThis;
vm.runInThisContext(scripts[0][2] +
  ';globalThis.sheetfix = { repair, processDrawing, sheetGeometry, imageSizePx, readZip, writeZip };');
const { repair, imageSizePx, writeZip } = globalThis.sheetfix;

/* ---------- fixtures ---------- */

const enc = new TextEncoder(), dec = new TextDecoder();
const EMU_PX = 9525, EMU_PT = 12700;

// Column A is 10 characters wide and B is 20, which the viewer's model (MDW=8) turns into
// 80 and 160 px. Rows 1 and 2 are 20 and 100 pt, every other row the default 15.
const COL_A = 80 * EMU_PX, COL_B = 160 * EMU_PX, COL_DEFAULT = 67 * EMU_PX;
const ROW_1 = 20 * EMU_PT, ROW_2 = 100 * EMU_PT;
const GRID = 12 * EMU_PX;

const SHEET = '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<sheetFormatPr defaultRowHeight="15"/>' +
  'COLS' +
  '<sheetData><row r="1" ht="20" customHeight="1"/><row r="2" ht="100" customHeight="1"/></sheetData>' +
  'MERGES<drawing r:id="rId1"/></worksheet>';

const COLS = '<cols><col min="1" max="1" width="10" customWidth="1"/><col min="2" max="2" width="20" customWidth="1"/></cols>';

const rels = (target) => '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  `<Relationship Id="rId1" Type="x" Target="${target}"/></Relationships>`;

const corner = (p, tag, [col, colOff, row, rowOff]) =>
  `<${p}${tag}><${p}col>${col}</${p}col><${p}colOff>${colOff}</${p}colOff><${p}row>${row}</${p}row><${p}rowOff>${rowOff}</${p}rowOff></${p}${tag}>`;

const xfrmXml = (x, y, cx, cy) => `<a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>`;

const pic = (p, xfrm) =>
  `<${p}pic><${p}nvPicPr><${p}cNvPr id="2" name="Picture 1"/><${p}cNvPicPr/></${p}nvPicPr>` +
  `<${p}blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></${p}blipFill>` +
  `<${p}spPr>${xfrm}<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></${p}spPr></${p}pic><${p}clientData/>`;

const twoCell = (from, to, xfrm = '', p = 'xdr:') =>
  `<${p}twoCellAnchor editAs="oneCell">${corner(p, 'from', from)}${corner(p, 'to', to)}${pic(p, xfrm)}</${p}twoCellAnchor>`;

const oneCell = (from, cx, cy, xfrm = '', p = 'xdr:') =>
  `<${p}oneCellAnchor>${corner(p, 'from', from)}<${p}ext cx="${cx}" cy="${cy}"/>${pic(p, xfrm)}</${p}oneCellAnchor>`;

const absolute = (x, y, cx, cy, p = 'xdr:') =>
  `<${p}absoluteAnchor><${p}pos x="${x}" y="${y}"/><${p}ext cx="${cx}" cy="${cy}"/>${pic(p, '')}</${p}absoluteAnchor>`;

const drawing = (body, p = 'xdr:') => {
  const ns = p ? 'xmlns:xdr' : 'xmlns';
  return `<${p}wsDr ${ns}="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" ` +
    'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${body}</${p}wsDr>`;
};

// The shape openpyxl writes: the default namespace instead of "xdr", the "a" prefix
// declared on each element that uses it rather than once on the root, and relationship
// targets as absolute paths with Id as the last attribute.
const A_NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const openpyxlAnchor = (from, cx, cy) =>
  `<oneCellAnchor>${corner('', 'from', from)}<ext cx="${cx}" cy="${cy}"/>` +
  '<pic><nvPicPr><cNvPr id="1" name="Image 1" descr="Picture"/><cNvPicPr/></nvPicPr>' +
  `<blipFill><a:blip ${A_NS} xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" cstate="print" r:embed="rId1"/>` +
  `<a:stretch ${A_NS}><a:fillRect/></a:stretch></blipFill><spPr><a:prstGeom ${A_NS} prst="rect"/></spPr></pic><clientData/></oneCellAnchor>`;
const openpyxlDrawing = (body) =>
  `<wsDr xmlns="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing">${body}</wsDr>`;
const OPENPYXL_RELS = '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Type="x" Target="/xl/media/image1.png" Id="rId1"/></Relationships>';

// Every prefix an element or an attribute uses has to be declared on that element or on
// one above it. Node has no XML parser, and this is the one rule the page can break by
// pasting a:xfrm into a document that it did not write.
function assertNamespaces(xml) {
  const stack = [new Set(['xml', 'xmlns'])];
  for (const m of xml.matchAll(/<(\/?)([\w:.-]+)((?:\s+[\w:.-]+="[^"]*")*)\s*(\/?)>/g)) {
    const [, close, name, attrs, selfClose] = m;
    if (close) { stack.pop(); continue; }
    const scope = new Set(stack.at(-1));
    const names = [...attrs.matchAll(/([\w:.-]+)=/g)].map(a => a[1]);
    for (const n of names) if (n.startsWith('xmlns:')) scope.add(n.slice(6));
    for (const n of [name, ...names]) {
      const prefix = n.includes(':') ? n.split(':')[0] : null;
      assert.ok(!prefix || scope.has(prefix), `prefix "${prefix}" is not declared at <${name}>`);
    }
    if (!selfClose) stack.push(scope);
  }
  assert.equal(stack.length, 1, 'tags are balanced');
}

function png(w, h) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]).copy(b);
  b.writeUInt32BE(w, 16);
  b.writeUInt32BE(h, 20);
  return new Uint8Array(b);
}

async function workbook(drawingXml, { image = png(200, 100), merges = '', cols = COLS, drawingRels = rels('../media/image1.png') } = {}) {
  const files = {
    '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
    'xl/worksheets/sheet1.xml': SHEET.replace('COLS', cols).replace('MERGES', merges),
    'xl/worksheets/_rels/sheet1.xml.rels': rels('../drawings/drawing1.xml'),
    'xl/drawings/drawing1.xml': drawingXml,
    'xl/drawings/_rels/drawing1.xml.rels': drawingRels,
    'xl/media/image1.png': image,
  };
  const items = Object.entries(files).map(([name, body]) => {
    const bytes = typeof body === 'string' ? enc.encode(body) : body;
    return { nameBytes: enc.encode(name), flags: 0, method: 8, time: 0, date: 0x21,
             crc: zlib.crc32(bytes), usize: bytes.length, data: new Uint8Array(zlib.deflateRawSync(bytes)) };
  });
  return writeZip(items).arrayBuffer();
}

// Deliberately not the page's reader: walks the local headers front to back and inflates
// with zlib, so a mistake in the page's own zip code cannot hide behind itself.
function unzip(buffer) {
  const buf = Buffer.from(buffer);
  const files = new Map();
  let off = 0;
  while (buf.readUInt32LE(off) === 0x04034b50) {
    const method = buf.readUInt16LE(off + 8), crc = buf.readUInt32LE(off + 14);
    const csize = buf.readUInt32LE(off + 18), usize = buf.readUInt32LE(off + 22);
    const nameLen = buf.readUInt16LE(off + 26), extraLen = buf.readUInt16LE(off + 28);
    const name = buf.toString('utf8', off + 30, off + 30 + nameLen);
    const raw = buf.subarray(off + 30 + nameLen + extraLen, off + 30 + nameLen + extraLen + csize);
    const bytes = method === 0 ? raw : zlib.inflateRawSync(raw);
    assert.equal(bytes.length, usize, `${name}: size`);
    assert.equal(zlib.crc32(bytes), crc, `${name}: crc`);
    files.set(name, { raw, bytes });
    off += 30 + nameLen + extraLen + csize;
  }
  assert.equal(buf.readUInt32LE(off), 0x02014b50, 'central directory follows the last entry');
  return files;
}

async function run(drawingXml, opts, bookOpts) {
  const input = await workbook(drawingXml, bookOpts);
  const { stat, blob } = await repair(input, opts);
  const output = await blob.arrayBuffer();
  const xml = dec.decode(unzip(output).get('xl/drawings/drawing1.xml').bytes);
  assertNamespaces(xml);
  return { stat, xml, input, output };
}

function xfrmOf(xml) {
  const m = /<a:xfrm[^>]*><a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/><\/a:xfrm>/.exec(xml);
  assert.ok(m, 'the picture carries a:xfrm');
  return m.slice(1).map(Number);
}

// A picture filling B2: one column and one row in from the corner.
const B2 = { from: [1, 0, 1, 0], to: [2, 0, 2, 0] };
const B2_XFRM = [COL_A + GRID, ROW_1, COL_B, ROW_2];

/* ---------- the page itself ---------- */

test('the page is one self-contained file', () => {
  assert.equal(scripts.length, 1);
  assert.equal(scripts[0][1].trim(), '', 'the script is inline');
  assert.doesNotMatch(html, /<link\b/);
  assert.doesNotMatch(html, /\b(src|href)\s*=\s*["']?(https?:)?\/\//);
});

/* ---------- twoCellAnchor ---------- */

test('missing coordinates are written from the anchor', async () => {
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to)));
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(stat.total, 1);
  assert.equal(stat.missing, 1);
  assert.equal(stat.stale, 0);
});

test('offsets inside the cell are carried over', async () => {
  const { xml } = await run(drawing(twoCell([1, 9525, 1, 12700], [1, 95250, 1, 127000])));
  assert.deepEqual(xfrmOf(xml), [COL_A + 9525 + GRID, ROW_1 + 12700, 95250 - 9525, 127000 - 12700]);
});

test('columns and rows without an explicit size use the defaults', async () => {
  const { xml } = await run(drawing(twoCell([3, 0, 4, 0], [4, 0, 5, 0])));
  assert.deepEqual(xfrmOf(xml), [COL_A + COL_B + COL_DEFAULT + GRID, ROW_1 + ROW_2 + 2 * 15 * EMU_PT, COL_DEFAULT, 15 * EMU_PT]);
});

test('stale coordinates are replaced', async () => {
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to, xfrmXml(0, 9000000, 1, 1))));
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(stat.stale, 1);
  assert.equal(stat.missing, 0);
  assert.equal(xml.match(/<a:xfrm>/g).length, 1, 'replaced, not duplicated');
});

test('correct coordinates are recognised and a second pass changes nothing', async () => {
  const first = await run(drawing(twoCell(B2.from, B2.to)));
  const second = await repair(first.output);
  assert.equal(second.stat.missing, 0);
  assert.equal(second.stat.stale, 0);
  const again = dec.decode(unzip(await second.blob.arrayBuffer()).get('xl/drawings/drawing1.xml').bytes);
  assert.equal(again, first.xml);
});

test('a drawing that declares the namespace as default is handled', async () => {
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to, '', ''), ''));
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(stat.missing, 1);
});

test('several pictures each get their own coordinates', async () => {
  const { stat, xml } = await run(drawing(twoCell([0, 0, 0, 0], [1, 0, 1, 0]) + twoCell(B2.from, B2.to)));
  assert.equal(stat.total, 2);
  const all = [...xml.matchAll(/<a:off x="(\d+)" y="(\d+)"\/>/g)].map(m => [+m[1], +m[2]]);
  assert.deepEqual(all, [[GRID, 0], [COL_A + GRID, ROW_1]]);
});

/* ---------- center and fit ---------- */

test('fit: a wide picture fills the width and is centered vertically', async () => {
  // 200x100 px into a 160x(100pt) cell: limited by width, scale 0.8.
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to)), { fitCell: true });
  const cy = COL_B / 2;
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1 + (ROW_2 - cy) / 2, COL_B, cy]);
  assert.equal(stat.fitted, 1);
});

test('fit: a tall picture fills the height and is centered horizontally', async () => {
  const { xml } = await run(drawing(twoCell(B2.from, B2.to)), { fitCell: true }, { image: png(100, 400) });
  const cx = ROW_2 / 4;
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID + (COL_B - cx) / 2, ROW_1, cx, ROW_2]);
});

test('fit: a picture whose format cannot be read keeps the plain repair', async () => {
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to)), { fitCell: true }, { image: new Uint8Array(40) });
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(stat.unfit, 1);
});

/* ---------- oneCellAnchor ---------- */

test('one-cell anchor: missing coordinates are the corner cell plus the stored size', async () => {
  const { stat, xml } = await run(drawing(oneCell([1, 9525, 1, 12700], 100000, 200000)));
  assert.deepEqual(xfrmOf(xml), [COL_A + 9525 + GRID, ROW_1 + 12700, 100000, 200000]);
  assert.equal(stat.total, 1);
  assert.equal(stat.missing, 1);
  assert.equal(stat.other, 0);
});

test('one-cell anchor: stale coordinates are replaced', async () => {
  const { stat, xml } = await run(drawing(oneCell([1, 0, 1, 0], 100000, 200000, xfrmXml(0, 9000000, 5, 5))));
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1, 100000, 200000]);
  assert.equal(stat.stale, 1);
});

test('one-cell anchor: a second pass changes nothing', async () => {
  const first = await run(drawing(oneCell([1, 0, 1, 0], 100000, 200000)));
  const second = await repair(first.output);
  assert.equal(second.stat.missing, 0);
  assert.equal(second.stat.stale, 0);
  const again = dec.decode(unzip(await second.blob.arrayBuffer()).get('xl/drawings/drawing1.xml').bytes);
  assert.equal(again, first.xml);
});

test('one-cell anchor: the anchor itself is not rewritten', async () => {
  const anchor = oneCell([1, 0, 1, 0], 100000, 200000);
  const { xml } = await run(drawing(anchor), { fitCell: true });
  assert.ok(xml.includes(anchor.slice(0, anchor.indexOf('<xdr:pic>'))));
});

test('one-cell anchor, fit: a corner sticking out by a pixel does not decide the cell', async () => {
  // The corner sits in A1, one pixel short of B2, and the picture is the size of B2.
  const from = [0, COL_A - EMU_PX, 0, ROW_1 - EMU_PT];
  const { stat, xml } = await run(drawing(oneCell(from, COL_B, ROW_2)), { fitCell: true });
  const cy = COL_B / 2;
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1 + (ROW_2 - cy) / 2, COL_B, cy]);
  assert.equal(stat.fitted, 1);
});

test('one-cell anchor, fit: the cell is chosen by overlap, not by where the middle falls', async () => {
  // A and C are 160 px, B between them is 16 px. A 200 px picture starting 70 px into A
  // covers 90 px of A, all of B and 94 px of C: its middle is in B, most of it is in C.
  const cols = '<cols><col min="1" max="1" width="20"/><col min="2" max="2" width="2"/><col min="3" max="3" width="20"/></cols>';
  const { xml } = await run(drawing(oneCell([0, 70 * EMU_PX, 1, 0], 200 * EMU_PX, 50 * EMU_PT)), { fitCell: true }, { cols });
  const cy = 160 * EMU_PX / 2;
  assert.deepEqual(xfrmOf(xml), [176 * EMU_PX + GRID, ROW_1 + (ROW_2 - cy) / 2, 160 * EMU_PX, cy]);
});

test('one-cell anchor, fit: a merged block is used whole', async () => {
  const merges = '<mergeCells count="1"><mergeCell ref="B2:C3"/></mergeCells>';
  const w = COL_B + COL_DEFAULT, h = ROW_2 + 15 * EMU_PT;
  const { xml } = await run(drawing(oneCell([1, 0, 1, 0], 100000, 200000)), { fitCell: true }, { merges, image: png(227, 100) });
  assert.equal(w, 227 * EMU_PX);
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1 + (h - 100 * EMU_PX) / 2, w, 100 * EMU_PX]);
});

test('one-cell anchor: without the fit option merged cells change nothing', async () => {
  const merges = '<mergeCells count="1"><mergeCell ref="B2:C3"/></mergeCells>';
  const { xml } = await run(drawing(oneCell([1, 0, 1, 0], 100000, 200000)), {}, { merges });
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1, 100000, 200000]);
});

/* ---------- files written by openpyxl ---------- */

test('openpyxl: a:xfrm brings its own namespace when the root does not declare it', async () => {
  const first = await run(openpyxlDrawing(openpyxlAnchor([1, 0, 1, 0], 100000, 200000)));
  assert.deepEqual(xfrmOf(first.xml), [COL_A + GRID, ROW_1, 100000, 200000]);
  assert.ok(first.xml.includes(`<spPr><a:xfrm ${A_NS}><a:off `));
  const second = await repair(first.output);
  assert.equal(second.stat.missing, 0);
  const again = dec.decode(unzip(await second.blob.arrayBuffer()).get('xl/drawings/drawing1.xml').bytes);
  assert.equal(again, first.xml);
});

test('the namespace is not repeated when the root already declares it', async () => {
  const { xml } = await run(drawing(twoCell(B2.from, B2.to)));
  assert.ok(xml.includes('<xdr:spPr><a:xfrm><a:off '));
});

test('openpyxl: relationships with an absolute target and Id last are followed', async () => {
  const { stat, xml } = await run(openpyxlDrawing(openpyxlAnchor([1, 0, 1, 0], 100000, 200000)),
    { fitCell: true }, { drawingRels: OPENPYXL_RELS });
  const cy = COL_B / 2;
  assert.equal(stat.fitted, 1);
  assert.deepEqual(xfrmOf(xml), [COL_A + GRID, ROW_1 + (ROW_2 - cy) / 2, COL_B, cy]);
});

test('rotation and flips on an existing a:xfrm survive', async () => {
  const old = '<a:xfrm rot="5400000" flipH="1"><a:off x="0" y="9000000"/><a:ext cx="1" cy="1"/></a:xfrm>';
  const { xml } = await run(drawing(twoCell(B2.from, B2.to, old)));
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(xml.match(/<a:xfrm/g).length, 1);
  assert.ok(xml.includes('<a:xfrm rot="5400000" flipH="1"><a:off '));
});

test('an empty a:xfrm is filled in, not doubled', async () => {
  const { xml } = await run(drawing(twoCell(B2.from, B2.to, '<a:xfrm/>')));
  assert.deepEqual(xfrmOf(xml), B2_XFRM);
  assert.equal(xml.match(/<a:xfrm/g).length, 1);
});

/* ---------- absoluteAnchor ---------- */

test('absolute anchors are counted and left exactly as they are', async () => {
  const abs = absolute(1000, 2000, 3000, 4000);
  const { stat, xml } = await run(drawing(twoCell(B2.from, B2.to) + abs + oneCell([1, 0, 1, 0], 100000, 200000)));
  assert.equal(stat.total, 2);
  assert.equal(stat.other, 1);
  assert.ok(xml.includes(abs));
});

/* ---------- the zip around it ---------- */

test('every entry except the drawing is copied byte for byte, still compressed', async () => {
  const { input, output } = await run(drawing(twoCell(B2.from, B2.to)));
  const before = unzip(input), after = unzip(output);
  assert.deepEqual([...after.keys()], [...before.keys()]);
  for (const [name, entry] of before) {
    if (name === 'xl/drawings/drawing1.xml') continue;
    assert.ok(entry.raw.equals(after.get(name).raw), name);
  }
});

test('a workbook without drawings is reported as such', async () => {
  const items = [{ nameBytes: enc.encode('xl/workbook.xml'), flags: 0, method: 0, time: 0, date: 0x21,
                   crc: zlib.crc32(enc.encode('<workbook/>')), usize: 11, data: enc.encode('<workbook/>') }];
  const { stat, blob } = await repair(await writeZip(items).arrayBuffer());
  assert.equal(stat, null);
  assert.equal(blob, undefined);
});

test('something that is not a zip is refused', async () => {
  await assert.rejects(repair(enc.encode('not a spreadsheet, just some text to be long enough').buffer), /not an \.xlsx/);
});

/* ---------- picture headers ---------- */

test('pixel size is read from PNG, JPEG, GIF and BMP headers', () => {
  assert.deepEqual(imageSizePx(png(640, 480)), { w: 640, h: 480 });

  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xc0, 0, 11, 8, 0x01, 0xe0, 0x02, 0x80, 3, 0, 0, 0, 0]);
  assert.deepEqual(imageSizePx(new Uint8Array(jpeg)), { w: 640, h: 480 });

  const gif = Buffer.alloc(13);
  gif.write('GIF89a', 'latin1');
  gif.writeUInt16LE(640, 6);
  gif.writeUInt16LE(480, 8);
  assert.deepEqual(imageSizePx(new Uint8Array(gif)), { w: 640, h: 480 });

  const bmp = Buffer.alloc(30);
  bmp.write('BM', 'latin1');
  bmp.writeInt32LE(640, 18);
  bmp.writeInt32LE(-480, 22);
  assert.deepEqual(imageSizePx(new Uint8Array(bmp)), { w: 640, h: 480 });

  assert.equal(imageSizePx(new Uint8Array(40)), null);
});
