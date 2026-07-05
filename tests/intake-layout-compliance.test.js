/* intake-layout-compliance.test.js (Phase 7) — a malformed uploaded table
   (missing the VAT column, or merging Unit Price and Total) is rejected
   and the official template layout is preserved; a fully compliant table
   is accepted; and a signature order that puts a signatory after the
   Accounting Officer is rejected. */
'use strict';

const t = require('./harness.js');
const intake = require('../js/lib/intake.js');

const OFFICIAL = intake.officialTableFor('routine'); // Item, Description, Qty, Unit Price, VAT, Total

t.test('a table missing the VAT column is rejected; the official layout is used', () => {
  const uploaded = ['Item', 'Description', 'Qty', 'Unit Price', 'Total']; // no VAT
  const r = intake.checkTableCompliance(uploaded, OFFICIAL);
  t.eq(r.compliant, false);
  t.ok(r.missing.indexOf('VAT') >= 0, 'VAT flagged missing');
  t.ok(/VAT/.test(r.reason) && /official layout will be used/i.test(r.reason));
});

t.test('a table merging Unit Price and Total is rejected with the exact wording', () => {
  const uploaded = ['Item', 'Description', 'Qty', 'Unit Price / Total Price', 'VAT'];
  const r = intake.checkTableCompliance(uploaded, OFFICIAL);
  t.eq(r.compliant, false);
  t.ok(r.merged.length >= 1, 'a merged column is detected');
  t.ok(/merges/.test(r.reason) && /violates the verification check requirement/.test(r.reason));
  t.ok(/official layout will be used/i.test(r.reason));
});

t.test('a fully compliant table is accepted', () => {
  const uploaded = ['Item', 'Description', 'Qty', 'Unit Price', 'VAT', 'Total'];
  const r = intake.checkTableCompliance(uploaded, OFFICIAL);
  t.eq(r.compliant, true);
  t.eq(r.reason, '');
  t.eq(r.missing.length, 0);
  t.eq(r.merged.length, 0);
});

t.test('layout extraction keeps XLSX column widths and notes DOCX has none', () => {
  const fromXlsx = intake.extractTableLayout({ tables: [{ columns: ['A', 'B'], rowCount: 3, columnWidths: [12, 30] }] });
  t.eq(fromXlsx.tables[0].columnWidths, [12, 30], 'XLSX widths preserved');
  const fromDocx = intake.extractTableLayout({ tables: [{ columns: ['A', 'B'], rowCount: 3 }] });
  t.eq(fromDocx.tables[0].columnWidths, null, 'DOCX yields no reliable widths');
  t.eq(fromDocx.tables[0].cellPadding, null, 'DOCX yields no reliable cell padding');
});

t.test('a signature order after the Accounting Officer is rejected and logged', () => {
  // AO not last -> rejected
  const bad = intake.signatureCompliance(['Accounting Officer', 'Procurement Officer']);
  t.eq(bad.ok, false);
  t.ok(/Accounting Officer/.test(bad.reason) && /must appear last/.test(bad.reason));
  // reordering preparers/reviewers before the AO is permitted
  const ok = intake.signatureCompliance(['Finance Officer', 'Procurement Officer', 'Accounting Officer']);
  t.eq(ok.ok, true);
  t.eq(ok.reason, '');
});
