/* ingest.test.js — candidate extraction and the staging gate rules.
   Uses the real extracted sample text where possible. */
'use strict';

const fs = require('fs');
const path = require('path');
const t = require('./harness.js');
const ingest = require('../js/lib/ingest.js');

t.test('figures: valid ones canonicalised, malformed ones refused with a reason', () => {
  const text = 'Total $11,390.00 was approved; the sheet also shows $11,3900.00 and 574,716.72 and $9,483.36.';
  const figs = ingest.extractFigures(text, 'pdf');
  const vals = figs.map(f => [f.value, f.canonical]);
  t.ok(vals.some(v => v[0] === '$11,390.00' && v[1] === '$11,390.00'));
  t.ok(vals.some(v => v[0] === '$9,483.36' && v[1] === '$9,483.36'));
  const bad = figs.find(f => f.value === '$11,3900.00');
  t.eq(bad.canonical, null);
  t.ok(/REJECTED/.test(bad.note));
  t.eq(ingest.canAccept(bad), false, 'a rejected-parse figure cannot be accepted until edited');
});

t.test('figures and item lines can never be bulk-accepted', () => {
  const fig = ingest.extractFigures('$100.00', 'text')[0];
  t.eq(ingest.canBulkAccept(fig), false);
  const item = { kind: 'item-line' };
  t.eq(ingest.canBulkAccept(item), false);
  const sup = { kind: 'supplier' };
  t.eq(ingest.canBulkAccept(sup), true);
});

t.test('dates: day-first reading, ambiguity flagged, month names high confidence', () => {
  const ds = ingest.extractDates('Issued 02/04/26, closed 17.04.2026, signed 13 May 2026.', 'text');
  const a = ds.find(d => d.value === '02/04/26');
  t.eq(a.canonical, '2026-04-02');
  t.ok(/Could also be month-first/.test(a.note));
  const b = ds.find(d => d.value === '17.04.2026');
  t.eq(b.canonical, '2026-04-17');
  t.ok(!/Could also be/.test(b.note), 'day 17 cannot be a month — no ambiguity note');
  const c = ds.find(d => /13 May 2026/.test(d.value));
  t.eq(c.canonical, '2026-05-13');
  t.eq(c.confidence, 'high');
});

t.test('references and suppliers found in real sample text', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'samples', 'extracted', 'Sample Approval for Material Supplies.txt'), 'utf8');
  const refs = ingest.extractReferences(text, 'docx');
  t.ok(refs.some(r => /MOD\/PROC/.test(r.value)), 'file reference found');
  const sups = ingest.extractSuppliers(text, 'docx');
  const names = sups.map(s => s.value);
  t.ok(names.some(n => /Pillai Tools Company Ltd/.test(n)), JSON.stringify(names));
  t.ok(names.some(n => /J\. Chai Trading Co/.test(n)));
  t.ok(names.some(n => /Oilfield and Marine Technologies Company Limited/.test(n)));
});

t.test('OCR-derived candidates carry the plain error-prone warning and low confidence', () => {
  const out = ingest.extractFromText('Quotation from Alpha Supplies Limited dated 02/04/26 total $1,234.56', 'ocr');
  t.ok(out.length >= 3);
  for (const c of out) {
    t.eq(c.confidence, 'low', c.kind);
    t.ok(c.note.indexOf('OCR is error-prone') >= 0, c.kind + ' carries the OCR note');
  }
});

t.test('CSV parser handles quotes, commas and newlines', () => {
  const rows = ingest.parseCSV('Item,Qty,"Unit Cost",Total\n"Rope, nylon",4,"1,250.00","5,000.00"\nBleach,24,32.50,780.00\n');
  t.eq(rows.length, 3);
  t.eq(rows[1], ['Rope, nylon', '4', '1,250.00', '5,000.00']);
});

t.test('item lines from rows: arithmetic checked, agreement raises confidence', () => {
  const rows = [
    ['Item', 'Qty', 'Unit Cost', 'Total'],
    ['Bleach', '24', '32.50', '780.00'],          // 24 × 32.50 = 780.00 — agrees
    ['Wheel Barrow', '8', '495.00', '3,970.00'],  // disagrees: 8 × 495 = 3,960
    ['Cutlass', '12', '85.00', '']                // no total given
  ];
  const items = ingest.extractItemsFromRows(rows, 'csv');
  t.eq(items.length, 3);
  t.eq(items[0].confidence, 'high');
  t.ok(/Checked: 24 × \$32\.50 = \$780\.00/.test(items[0].note));
  t.eq(items[1].confidence, 'low');
  t.ok(/ARITHMETIC DISAGREES/.test(items[1].note));
  t.ok(/\$3,960\.00/.test(items[1].note), 'the computed figure is stated');
  t.eq(items[2].value.qty, 12);
  t.eq(items[2].value.unitCents, 8500);
});

t.test('item rows with malformed figures are flagged, not silently parsed', () => {
  const rows = [
    ['Description', 'Quantity', 'Rate', 'Amount'],
    ['Chain Saw', '2', '5,695.00', '11,3900.00'] // the signed sample's own malformed figure
  ];
  const items = ingest.extractItemsFromRows(rows, 'xlsx');
  t.eq(items.length, 1);
  t.ok(/Total figure rejected/.test(items[0].note));
  t.eq(items[0].value.totalCents, null);
  t.eq(items[0].confidence, 'low');
});

t.test('column detection tolerates header variants', () => {
  t.eq(ingest.detectColumns(['Items Requested', 'Quantity Requested', 'Unit', 'Total']),
    { desc: 0, qty: 1, unit: 2, total: 3 });
  t.eq(ingest.detectColumns(['Description', 'No. of Units', 'Price', 'Amount']).desc, 0);
});
