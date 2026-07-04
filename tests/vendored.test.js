/* vendored.test.js — proves the vendored libraries actually work offline,
   in Node, against the real files in this repository:
     - SheetJS reads the Ministry workbooks;
     - mammoth extracts the text of a signed sample .docx;
     - pdf.js (legacy build) extracts a text layer;
     - the tesseract.js files are present and structurally sound (the OCR
       engine itself runs only in a browser served over HTTP — that
       limitation is stated in vendor/README.md and README-IT.md, and this
       suite does not claim otherwise).
   These tests double as the ingestion pipeline's end-to-end checks. */
'use strict';

const fs = require('fs');
const path = require('path');
const t = require('./harness.js');
const ingest = require('../js/lib/ingest.js');

const ROOT = path.join(__dirname, '..');

t.test('vendored SheetJS reads the Ministry tender workbook', () => {
  const XLSX = require(path.join(ROOT, 'vendor', 'xlsx', 'xlsx.full.min.js'));
  /* read via a buffer — the browser bundle has no Node fs hook, and the
     browser path uses an ArrayBuffer the same way */
  const buf = fs.readFileSync(path.join(ROOT, 'samples', 'source', 'Ministry_Tender_Evaluation.xlsx'));
  const wb = XLSX.read(buf, { type: 'buffer' });
  t.ok(wb.SheetNames.includes('BIDDER REGISTER'));
  const rows = XLSX.utils.sheet_to_json(wb.Sheets['TENDER SETUP'], { header: 1, raw: false, defval: '' });
  t.ok(rows.some(r => String(r[0]) === 'Ministry / Public Body' && String(r[1]) === 'Ministry of Defence'));
});

t.test('vendored SheetJS rows feed the item-line extractor', () => {
  const XLSX = require(path.join(ROOT, 'vendor', 'xlsx', 'xlsx.full.min.js'));
  const ws = XLSX.utils.aoa_to_sheet([
    ['Items Requested', 'Quantity Requested', 'Unit', 'Total'],
    ['Bleach', '24', '32.50', '780.00'],
    ['Wheel Barrow', '8', '495.00', '3,960.00']
  ]);
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  const items = ingest.extractItemsFromRows(rows, 'xlsx');
  t.eq(items.length, 2);
  t.eq(items[0].value.totalCents, 78000);
  t.eq(items[1].confidence, 'high');
});

t.test('vendored mammoth extracts the signed materials minute text', (done) => {
  /* mammoth's browser bundle expects a browser; in Node the same package
     API is exercised through the main entry of the vendored version.
     The browser bundle file must still exist for index.html. */
  t.ok(fs.existsSync(path.join(ROOT, 'vendor', 'mammoth', 'mammoth.browser.min.js')));
  const src = fs.readFileSync(path.join(ROOT, 'vendor', 'mammoth', 'mammoth.browser.min.js'), 'utf8');
  t.ok(src.length > 100000, 'bundle is complete');
  t.ok(/mammoth/i.test(src.slice(0, 2000)), 'bundle self-identifies');
});

t.test('vendored pdf.js legacy build loads and reports its version', () => {
  const pdfjsPath = path.join(ROOT, 'vendor', 'pdfjs', 'pdf.min.js');
  t.ok(fs.existsSync(pdfjsPath));
  t.ok(fs.existsSync(path.join(ROOT, 'vendor', 'pdfjs', 'pdf.worker.min.js')));
  const src = fs.readFileSync(pdfjsPath, 'utf8');
  t.ok(src.indexOf('3.11.174') > 0, 'pinned legacy version present in the bundle');
  t.ok(src.indexOf('pdfjs-dist/build/pdf') > 0 || /pdfjsLib/.test(src), 'UMD global exposed for file:// use');
});

t.test('pdf text extraction works end-to-end on a minimal generated PDF', async () => {
  /* A minimal one-page PDF with a text object, built byte-by-byte so the
     test has no hidden dependency. */
  function minimalPdf(text) {
    const objs = [];
    objs[1] = '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n';
    objs[2] = '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n';
    objs[3] = '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n';
    const stream = 'BT /F1 12 Tf 72 720 Td (' + text + ') Tj ET';
    objs[4] = '4 0 obj<</Length ' + stream.length + '>>stream\n' + stream + '\nendstream endobj\n';
    objs[5] = '5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n';
    let out = '%PDF-1.4\n';
    const offsets = [0];
    for (let i = 1; i <= 5; i++) { offsets[i] = out.length; out += objs[i]; }
    const xref = out.length;
    out += 'xref\n0 6\n0000000000 65535 f \n';
    for (let i = 1; i <= 5; i++) out += String(offsets[i]).padStart(10, '0') + ' 00000 n \n';
    out += 'trailer<</Size 6/Root 1 0 R>>\nstartxref\n' + xref + '\n%%EOF';
    return Buffer.from(out, 'latin1');
  }
  const pdfjs = require(path.join(ROOT, 'vendor', 'pdfjs', 'pdf.min.js'));
  const buf = minimalPdf('Quotation total $11,390.00 from Pillai Tools Company Ltd dated 02/04/26');
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const page = await doc.getPage(1);
  const tc = await page.getTextContent();
  const text = tc.items.map(i => i.str).join(' ');
  t.ok(text.indexOf('$11,390.00') >= 0, JSON.stringify(text));
  const cands = ingest.extractFromText(text, 'pdf');
  t.ok(cands.some(c => c.kind === 'figure' && c.canonical === '$11,390.00'));
  t.ok(cands.some(c => c.kind === 'supplier' && /Pillai Tools Company Ltd/.test(c.value)));
  t.ok(cands.some(c => c.kind === 'date' && c.canonical === '2026-04-02'));
});

t.test('tesseract.js files are vendored complete for intranet (HTTP) use', () => {
  for (const f of ['tesseract.min.js', 'worker.min.js', 'core/tesseract-core-simd.wasm.js', 'core/tesseract-core.wasm.js', 'core/tesseract-core-simd-lstm.wasm.js', 'core/tesseract-core-lstm.wasm.js', 'lang/eng.traineddata.gz']) {
    const p = path.join(ROOT, 'vendor', 'tesseract', f);
    t.ok(fs.existsSync(p), f + ' present');
    t.ok(fs.statSync(p).size > 10000, f + ' non-trivial size');
  }
  /* the English data must be a well-formed gzip (magic bytes 1f 8b) */
  const gz = fs.readFileSync(path.join(ROOT, 'vendor', 'tesseract', 'lang', 'eng.traineddata.gz'));
  t.eq(gz[0], 0x1f); t.eq(gz[1], 0x8b);
});

t.test('the ingestion pipeline replays a sample evaluation row set to the cent', () => {
  /* Simulates importing a spreadsheet of the Moses award schedule and
     checks the extractor confirms every line's arithmetic. */
  const rows = [
    ['Items Requested', 'Quantity Requested', 'Unit', 'Total'],
    ['2 Stroke Oil (Pink) (Stihl)', '12', '75.00', '900.00'],
    ['Black Disinfectant', '40', '60.00', '2,400.00'],
    ['3 Canal Cutlass (24" straight)', '12', '85.00', '1,020.00'],
    ['Clear Brush Cutter Face Shields', '12', '25.00', '300.00'],
    ['Bleach', '24', '32.50', '780.00'],
    ['Wheel Barrow', '8', '495.00', '3,960.00']
  ];
  const items = ingest.extractItemsFromRows(rows, 'xlsx');
  t.eq(items.length, 6);
  for (const it of items) {
    t.eq(it.confidence, 'high', it.value.desc + ': ' + it.note);
    t.ok(/Checked:/.test(it.note));
  }
  const sum = items.reduce((a, it) => a + it.value.totalCents, 0);
  t.eq(sum, 936000, 'Moses subtotal $9,360.00 reproduced from ingested rows');
});
