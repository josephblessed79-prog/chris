/* evaluation.test.js — unit behaviours of the evaluation worksheet engine. */
'use strict';

const t = require('./harness.js');
const evaluation = require('../js/lib/evaluation.js');

function tinyEval() {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [
    { name: 'Alpha', address: '', status: 'quoted' },
    { name: 'Bravo', address: '', status: 'quoted' },
    { name: 'Charlie', address: '', status: 'did-not-quote' }
  ];
  ev.items = [
    { desc: 'Bottled Water', variant: '500ml', qty: 60, unitName: 'Bottles' },
    { desc: 'Paper', variant: 'A4', qty: 10, unitName: 'Reams' }
  ];
  ev.cells = [
    // Alpha prices water by the case of 24 at $230.00; Bravo per bottle at $10.00
    { item: 0, supplier: 0, unit: '230.00', vatable: true, quotedQty: null, packSize: 24, note: '', compliant: true },
    { item: 0, supplier: 1, unit: '10.00', vatable: true, quotedQty: null, packSize: null, note: '', compliant: true },
    { item: 1, supplier: 0, unit: '55.00', vatable: false, quotedQty: null, packSize: null, note: '', compliant: true },
    { item: 1, supplier: 1, unit: '52.00', vatable: false, quotedQty: null, packSize: null, note: '', compliant: true }
  ];
  return ev;
}

t.test('pack conversion computes packs, coverage and extended total', () => {
  const ev = tinyEval();
  const c = evaluation.computeCell(ev, 0, 0);
  t.eq(c.packs, 3);                 // ceil(60/24)
  t.eq(c.effectiveQty, 72);
  t.eq(c.extendedCents, 69000);     // 3 × $230.00
  t.eq(c.warnings.length, 1);       // 72 covers 60 — visible note
});

t.test('comparison uses the exact rational rate, not the extended totals', () => {
  const ev = tinyEval();
  // Alpha: $230/24 = $9.5833 per bottle (extended $690) beats Bravo $10.00
  // per bottle (extended $600) — per-unit price decides, as the samples do.
  const rec = evaluation.recommendItem(ev, 0);
  t.eq(rec.lowest, 0);
  t.eq(evaluation.recommendItem(ev, 1).lowest, 1);
});

t.test('quantity shortfall is excluded from the automatic recommendation', () => {
  const ev = tinyEval();
  ev.cells[3].quotedQty = 8; // Bravo can only supply 8 of 10 reams
  const rec = evaluation.recommendItem(ev, 1);
  t.eq(rec.lowest, 0);
  t.eq(rec.excluded, [{ supIdx: 1, reason: 'quantity shortfall' }]);
});

t.test('non-compliant cells are excluded and selecting one fails', () => {
  const ev = tinyEval();
  ev.cells[3].compliant = false;
  t.eq(evaluation.recommendItem(ev, 1).lowest, 0);
  ev.selections.push({ item: 1, supplier: 1, justification: 'Preferred brand.' });
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(c => c.id === 'E8.2' && c.result === 'FAIL'));
});

t.test('a price tie demands a recorded committee selection', () => {
  const ev = tinyEval();
  ev.cells[2].unit = '52.00'; // Alpha now equal to Bravo on paper
  let R = evaluation.runEvalChecks(ev);
  t.ok(R.some(c => c.id === 'E6.2' && c.result === 'FAIL'), 'unresolved tie fails');
  ev.selections.push({ item: 1, supplier: 0, tieNote: 'Single delivery with the water award.' });
  R = evaluation.runEvalChecks(ev);
  t.ok(!R.some(c => c.id === 'E6.2' && c.result === 'FAIL'), 'resolved tie passes');
  const sel = evaluation.effectiveSelection(ev, 1);
  t.eq(sel.tie, true);
  t.eq(sel.override, false);
});

t.test('override without justification is a hard verification failure', () => {
  const ev = tinyEval();
  ev.selections.push({ item: 1, supplier: 0, justification: '' }); // Alpha over cheaper Bravo
  let R = evaluation.runEvalChecks(ev);
  const fail = R.find(c => c.id === 'E7.2');
  t.eq(fail.result, 'FAIL');
  t.ok(/without a recorded justification/.test(fail.detail));
  ev.selections[0].justification = 'Bravo cannot deliver before the training date; Alpha delivers in two days.';
  R = evaluation.runEvalChecks(ev);
  const pass = R.find(c => c.id === 'E7.2');
  t.eq(pass.result, 'PASS');
  t.ok(/^OVERRIDE — /.test(pass.detail));
  t.ok(/Bravo cannot deliver/.test(pass.detail));
});

t.test('an override never breaks the arithmetic — totals follow the selection', () => {
  const ev = tinyEval();
  ev.selections.push({ item: 1, supplier: 0, justification: 'Delivery time.' });
  const bk = evaluation.breakdown(ev);
  const alpha = bk.schedules.find(s => s.name === 'Alpha');
  // Alpha now carries both awards: water $690.00 (V) + paper $550.00 (NV)
  t.eq(alpha.vCents, 69000);
  t.eq(alpha.nvCents, 55000);
  t.eq(alpha.vatCents, 8625);        // 12.5% of $690.00
  t.eq(alpha.totalCents, 132625);
  t.eq(bk.grandTotalCents, 132625);
  const row = alpha.rows.find(r => r.desc === 'Paper');
  t.eq(row.override, true);
  t.ok(evaluation.awardTableHTML(ev, alpha).indexOf('OVERRIDE: Delivery time.') > 0,
    'override visible in the award table');
});

t.test('malformed figures are rejected at the cell with the reason', () => {
  const ev = tinyEval();
  ev.cells[1].unit = '11,3900.00'; // the malformed grouping from the signed sample
  const c = evaluation.computeCell(ev, 0, 1);
  t.eq(c.extendedCents, null);
  t.ok(/rejected/.test(c.errors[0]));
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(x => x.id.indexOf('E4.') === 0 && x.result === 'FAIL'));
});

t.test('price for a non-quoting supplier is an inconsistency failure', () => {
  const ev = tinyEval();
  ev.cells.push({ item: 0, supplier: 2, unit: '9.00', vatable: true, quotedQty: null, packSize: null, compliant: true });
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(c => c.id.indexOf('E5.') === 0 && c.result === 'FAIL'));
});

t.test('did-not-quote register lists non-respondents', () => {
  t.eq(evaluation.didNotQuote(tinyEval()), ['Charlie']);
});

t.test('carry-over items preserve the evaluation totals exactly', () => {
  const compute = require('../js/lib/compute.js');
  const ev = tinyEval();
  const items = evaluation.toDocItems(ev);
  t.eq(items.length, 2); // Alpha (water), Bravo (paper)
  const gt = compute.grandTotal(items);
  const bk = evaluation.breakdown(ev);
  t.eq(gt, bk.grandTotalCents);
});

t.test('worksheet HTML shows V flags, conversion notes and markers', () => {
  const ev = tinyEval();
  const html = evaluation.worksheetHTML(ev);
  t.ok(html.indexOf('$230.00 — 3 cases = 72 (24/case)') > 0, 'computed conversion note');
  t.ok(html.indexOf('<b>V</b>') > 0, 'V flag');
  t.ok(html.indexOf('[LOWEST]') > 0, 'lowest marker');
  t.ok(html.indexOf('Suppliers that Did Not Quote') > 0);
  t.ok(html.indexOf('Charlie') > 0);
});
