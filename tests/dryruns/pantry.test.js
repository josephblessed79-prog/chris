/* pantry.test.js — dry run replaying the signed pantry-supplies evaluation
   to the cent.

   The signed sheet's FULL-QUOTE totals are arithmetically consistent with
   its own cells and this replay reproduces them exactly. The signed sheet's
   AWARD tables for Ramsackal, however, carry a $300.00 arithmetic error:
   the award rows it lists (with their own printed V flags) sum to
   Sub Total (V) $21,248.00, but the sheet prints $20,948.00, and the VAT,
   supplier total and grand total printed there propagate that error
   ($2,618.50 / $39,776.50 / $44,694.25). This dry run asserts the CORRECT
   computed figures, which is the point of the system. */
'use strict';

const t = require('../harness.js');
const evaluation = require('../../js/lib/evaluation.js');
const { pantryEvaluation } = require('./sampledata.js');

t.test('pantry: full-quote totals match the signed sheet to the cent', () => {
  const ev = pantryEvaluation();
  const beyond = evaluation.supplierTotals(ev, 0);
  t.eq(beyond.nvCents, 2591965, 'Beyond Sub Total (NV) $25,919.65');
  t.eq(beyond.vCents, 1986835, 'Beyond Sub Total (V) $19,868.35');
  t.eq(beyond.vatCents, 248354, 'Beyond Vat $2,483.54');
  t.eq(beyond.totalCents, 4827154, 'Beyond Total $48,271.54');
  const rams = evaluation.supplierTotals(ev, 1);
  t.eq(rams.nvCents, 1645000, 'Ramsackal Sub Total (NV) $16,450.00');
  t.eq(rams.vCents, 2556800, 'Ramsackal Sub Total (V) $25,568.00');
  t.eq(rams.vatCents, 319600, 'Ramsackal Vat $3,196.00');
  t.eq(rams.totalCents, 4521400, 'Ramsackal Total $45,214.00');
});

t.test('pantry: the recommendation reproduces the committee award', () => {
  const ev = pantryEvaluation();
  // Beyond wins Ensure Chocolate and Ensure Vanilla on price, and Digestive
  // Biscuits on the recorded tie selection; Ramsackal wins everything else.
  const beyondItems = [];
  for (let i = 0; i < ev.items.length; i++) {
    const sel = evaluation.effectiveSelection(ev, i);
    t.ok(sel.supIdx !== null, 'item ' + (i + 1) + ' resolves');
    if (sel.supIdx === 0) beyondItems.push(i);
  }
  t.eq(beyondItems, [3, 4, 23]);
  // Ovaltine: Beyond quoted only 48 of 50 packs — shortfall excludes it from
  // the automatic recommendation even at the lower unit price.
  const ov = evaluation.recommendItem(ev, 16);
  t.eq(ov.lowest, 1);
  t.eq(ov.excluded, [{ supIdx: 0, reason: 'quantity shortfall' }]);
  // Granola: Beyond non-compliant (boxes of 6), so Ramsackal wins.
  const gr = evaluation.recommendItem(ev, 30);
  t.eq(gr.lowest, 1);
  t.eq(gr.excluded, [{ supIdx: 0, reason: 'does not meet specification' }]);
});

t.test('pantry: Beyond award table matches the signed sheet to the cent', () => {
  const bk = evaluation.breakdown(pantryEvaluation());
  const beyond = bk.schedules.find(s => /Beyond/.test(s.name));
  t.eq(beyond.rows.map(r => r.desc), ['Ensure', 'Ensure', 'Digestive Biscuits']);
  t.eq(beyond.nvCents, 24000, 'Sub Total (NV) $240.00');
  t.eq(beyond.vCents, 415800, 'Sub Total (V) $4,158.00');
  t.eq(beyond.vatCents, 51975, 'Vat $519.75');
  t.eq(beyond.totalCents, 491775, 'Total $4,917.75');
});

t.test('pantry: Ramsackal award computed correctly — the signed sheet is $300.00 out', () => {
  const bk = evaluation.breakdown(pantryEvaluation());
  const rams = bk.schedules.find(s => /Ramsackal/.test(s.name));
  t.eq(rams.rows.length, 30);
  t.eq(rams.nvCents, 1621000, 'Sub Total (NV) $16,210.00 (signed sheet agrees)');
  // The signed sheet prints $20,948.00 here; its own award rows sum to $21,248.00.
  t.eq(rams.vCents, 2124800, 'Sub Total (V) $21,248.00 — correct figure');
  t.eq(rams.vatCents, 265600, 'Vat $2,656.00 — correct figure (sheet printed $2,618.50)');
  t.eq(rams.totalCents, 4011400, 'Total $40,114.00 — correct figure (sheet printed $39,776.50)');
  // Cross-check: correct award V equals the (correct) full-quote V minus the
  // two Ensure lines lost to Beyond ($25,568.00 − 2 × $2,160.00 = $21,248.00).
  t.eq(2556800 - 2 * 216000, 2124800);
});

t.test('pantry: grand total computed (signed sheet printed $44,694.25 on the stale figure)', () => {
  const bk = evaluation.breakdown(pantryEvaluation());
  t.eq(bk.grandTotalCents, 491775 + 4011400);
  t.eq(bk.grandTotalCents, 4503175, 'Grand total $45,031.75');
});

t.test('pantry: evaluation clears verification with the tie recorded', () => {
  const ev = pantryEvaluation();
  const R = evaluation.runEvalChecks(ev);
  const fails = R.filter(c => c.result === 'FAIL');
  t.eq(fails, []);
  // The tie selection is visible, not silent.
  const sel = evaluation.effectiveSelection(ev, 23);
  t.eq(sel.tie, true);
  t.ok(/single delivery/i.test(sel.tieNote));
});

t.test('pantry: did-not-quote register matches the signed sheet', () => {
  t.eq(evaluation.didNotQuote(pantryEvaluation()), [
    'Massy Stores Limited',
    'A. S. Brydens & Sons (Trinidad) Limited',
    'Micon Marketing Limited',
    'The Food Hall Limited',
    'Pigalle’s Limited'
  ]);
});

t.test('pantry: worksheet renders the computed pack conversions', () => {
  const html = evaluation.worksheetHTML(pantryEvaluation());
  t.ok(html.indexOf('$320.00 — 3 cases = 72 (24/case)') > 0, 'Lucozade conversion');
  t.ok(html.indexOf('$826.15 — 5 cases = 240 (48/case)') > 0, 'Condensed Milk conversion (the signed sheet mislabels the case size; the arithmetic is 5 × $826.15)');
  t.ok(html.indexOf('$190.00 — 17 cases = 204 (12/case)') > 0, 'Trinidad Juices conversion');
});
