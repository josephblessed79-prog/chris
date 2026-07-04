/* minor-equipment.test.js — dry run replaying the signed minor-equipment
   evaluation. The signed sheet contains several figure errors; this replay
   computes the correct arithmetic and demonstrates that the system flags
   the malformed printed figures on entry:
     - Pillai item 1 extended printed $59,405.44; correct is 8 × $7,425.00
       = $59,400.00.
     - J. Chai item 7 extended printed "$11,3900.00" (malformed grouping);
       correct is 2 × $5,695.00 = $11,390.00.
     - Pillai Sub Total (V) printed "$57,4716.72" (malformed grouping, and
       stale on top of the item-1 error); correct is $574,711.28.
     - Pillai VAT printed $60,106.32; 12.5% of the correct V subtotal is
       $71,838.91.
     - J. Chai Total left blank; correct is $562,846.88.
     - Trintrac Total printed $256,231.68, which omits the VAT; correct is
       $279,883.77. */
'use strict';

const t = require('../harness.js');
const money = require('../../js/lib/money.js');
const evaluation = require('../../js/lib/evaluation.js');
const { minorEquipmentEvaluation } = require('./sampledata.js');

t.test('minor equipment: FT Farfan totals match the signed sheet exactly', () => {
  const ev = minorEquipmentEvaluation();
  const f = evaluation.supplierTotals(ev, 0);
  t.eq(f.nvCents, 6051500, 'Sub Total (NV) $60,515.00');
  t.eq(f.vCents, 17305670, 'Sub Total (V) $173,056.70');
  t.eq(f.vatCents, 2163209, 'Vat $21,632.09 (half-up at the cent)');
  t.eq(f.totalCents, 25520379, 'Total $255,203.79');
});

t.test('minor equipment: Pillai totals computed correctly against the erroneous sheet', () => {
  const ev = minorEquipmentEvaluation();
  const p = evaluation.supplierTotals(ev, 1);
  t.eq(p.nvCents, 0);
  // item 1 correct: 8 × $7,425.00 = $59,400.00 (sheet printed $59,405.44)
  t.eq(evaluation.computeCell(ev, 0, 1).extendedCents, 5940000);
  t.eq(p.vCents, 57471128, 'Sub Total (V) $574,711.28 (sheet printed "$57,4716.72")');
  t.eq(p.vatCents, 7183891, 'Vat $71,838.91 (sheet printed $60,106.32)');
  t.eq(p.totalCents, 64655019, 'Total $646,550.19 (sheet printed $634,823.04)');
});

t.test('minor equipment: J. Chai totals computed, including the blank the sheet left', () => {
  const ev = minorEquipmentEvaluation();
  const j = evaluation.supplierTotals(ev, 2);
  t.eq(j.nvCents, 5280000, 'Sub Total (NV) $52,800.00');
  // item 7 correct: 2 × $5,695.00 = $11,390.00 (sheet printed "$11,3900.00")
  t.eq(evaluation.computeCell(ev, 6, 2).extendedCents, 1139000);
  t.eq(j.vCents, 45337500, 'Sub Total (V) $453,375.00');
  t.eq(j.vatCents, 5667188, 'Vat $56,671.88 — 12.5% of $453,375.00 is $56,671.875, rounded half-up');
  t.eq(j.totalCents, 56284688, 'Total $562,846.88 (the signed sheet left this cell blank)');
});

t.test('minor equipment: Trintrac totals computed — the signed sheet omitted VAT from its total', () => {
  const ev = minorEquipmentEvaluation();
  const tr = evaluation.supplierTotals(ev, 3);
  t.eq(tr.nvCents, 6701500, 'Sub Total (NV) $67,015.00');
  t.eq(tr.vCents, 18921668, 'Sub Total (V) $189,216.68');
  t.eq(tr.vatCents, 2365209, 'Vat $23,652.09');
  t.eq(tr.totalCents, 27988377, 'Total $279,883.77 (sheet printed $256,231.68 = NV + V without VAT)');
});

t.test('minor equipment: the malformed printed figures are refused on entry', () => {
  // Anyone re-keying the sheet's own printed figures is stopped with a reason.
  const a = money.parseStrict('$11,3900.00');
  t.eq(a.ok, false);
  t.eq(a.reason, 'bad-grouping');
  const b = money.parseStrict('$57,4716.72');
  t.eq(b.ok, false);
  t.eq(b.reason, 'bad-grouping');
  // And a cell holding such a figure is a verification FAIL, not a silent guess.
  const ev = minorEquipmentEvaluation();
  ev.cells.find(c => c.item === 6 && c.supplier === 2).unit = '11,3900.00';
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(c => c.id.indexOf('E4.') === 0 && c.result === 'FAIL' && /11,3900\.00/.test(c.detail)));
});

t.test('minor equipment: lowest-compliant recommendation per item', () => {
  const ev = minorEquipmentEvaluation();
  const expect = [3, 0, 3, 0, 3, 3, 0]; // Trintrac / Farfan split
  for (let i = 0; i < ev.items.length; i++) {
    const sel = evaluation.effectiveSelection(ev, i);
    t.eq(sel.supIdx, expect[i], 'item ' + (i + 1));
    t.eq(sel.override, false);
  }
});

t.test('minor equipment: Pillai hedge-trimmer quantity variance is visible', () => {
  const ev = minorEquipmentEvaluation();
  const c = evaluation.computeCell(ev, 5, 1);
  t.eq(c.extendedCents, 2073804, '3 × $6,912.68 = $20,738.04 as the sheet shows');
  t.ok(c.warnings.some(w => /Quoted for 3 against a requirement of 2/.test(w)));
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(x => x.id.indexOf('E4w.') === 0 && /requirement of 2/.test(x.detail)));
});

t.test('minor equipment: award schedules and grand total computed to the cent', () => {
  const bk = evaluation.breakdown(minorEquipmentEvaluation());
  const farfan = bk.schedules.find(s => /Farfan/.test(s.name));
  t.eq(farfan.rows.map(r => r.desc), ['Lower Back Pack Blower', 'Ride-on Lawn Mower/Cutter', 'Chain Saw']);
  t.eq(farfan.nvCents, 1073500);
  t.eq(farfan.vCents, 9843000);
  t.eq(farfan.vatCents, 1230375);
  t.eq(farfan.totalCents, 12146875, 'Farfan award $121,468.75');
  const trintrac = bk.schedules.find(s => /Trintrac/.test(s.name));
  t.eq(trintrac.nvCents, 5602500);
  t.eq(trintrac.vCents, 5487112);
  t.eq(trintrac.vatCents, 685889);
  t.eq(trintrac.totalCents, 11775501, 'Trintrac award $117,755.01');
  t.eq(bk.grandTotalCents, 23922376, 'Grand total $239,223.76');
});
