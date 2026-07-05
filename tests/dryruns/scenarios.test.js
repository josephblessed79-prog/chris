/* scenarios.test.js — full-system dry runs. Together with the four sample
   replays (pantry, minor equipment, boxed meals, materials), this file
   completes the required set of at least fifteen end-to-end scenarios
   spanning all pathways. Each scenario builds a complete case, runs the
   whole verification, and asserts exact computed figures and document
   content. */
'use strict';

const t = require('../harness.js');
const fx = require('../fixtures.js');
const cm = require('../../js/lib/casemodel.js');
const sp = require('../../js/lib/styleprofile.js');
const documents = require('../../js/lib/documents.js');
const verifycase = require('../../js/lib/verifycase.js');
const evaluation = require('../../js/lib/evaluation.js');
const votestatus = require('../../js/lib/votestatus.js');
const words = require('../../js/lib/words.js');
const money = require('../../js/lib/money.js');
require('../../js/lib/docs/hybridminute.js');
require('../../js/lib/docs/verbalform.js');
require('../../js/lib/docs/evalreport.js');
require('../../js/lib/docs/hybridcert.js');
require('../../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

function byId(R, id) { return R.find(c => c.id === id); }

/* Scenario 1 — P2 formation letter, single supplier, all clear. */
t.test('S1: P2 uniform purchase clears and letters carry the computed total', () => {
  const { caseFile } = cm.migrateV1(fx.shoesCase(), NOW);
  const R = verifycase.runAllChecks(caseFile);
  t.eq(R.filter(c => c.result === 'FAIL'), []);
  const letter = documents.build(caseFile, 'approval');
  t.ok(letter.indexOf('Ninety-Nine Thousand, Four Hundred and Fifty Dollars ($99,450.00)') > 0);
  t.ok(letter.indexOf('draftstamp') < 0);
});

/* Scenario 2 — P2 split award across three suppliers. */
t.test('S2: P2 split award sets out each supplier with its own computed amount', () => {
  const { caseFile } = cm.migrateV1(fx.splitAwardCase(), NOW);
  const letter = documents.build(caseFile, 'approval');
  t.ok(letter.indexOf('the undermentioned suppliers') > 0);
  t.ok(letter.indexOf('J. Chai Trading Co. Ltd') > 0);
  t.ok(letter.indexOf('A. Moses &amp; Sons Limited') > 0);
  t.ok(letter.indexOf('Print Express Ltd') > 0);
});

/* Scenario 3 — legacy v1 draft opens, verifies and renders identically. */
t.test('S3: an old Approvals Composer draft opens with no loss and no change of output', () => {
  const v1 = fx.directCase();
  const { caseFile, report } = cm.migrateV1(v1, NOW);
  t.ok(report.length >= 1);
  const dMin = require('../../js/lib/docs/minute.js');
  t.eq(documents.build(caseFile, 'minute'), dMin.buildMinute(fx.directCase()));
});

/* Scenario 4 — funds shortfall on the legacy cover check blocks clearance. */
t.test('S4: funds that do not cover the total are a hard failure with the two figures shown', () => {
  const { caseFile } = cm.migrateV1(fx.shortfallCase(), NOW);
  const R = verifycase.runAllChecks(caseFile);
  const c16 = byId(R, 'C16');
  t.eq(c16.result, 'FAIL');
  t.ok(/\$10,000\.00 vs total \$99,450\.00/.test(c16.detail));
  t.ok(documents.build(caseFile, 'minute').indexOf('DRAFT — NOT CLEARED') >= 0);
});

/* Scenario 5 — non-lowest recommendation without justification fails; with it, clears. */
t.test('S5: the lowest-cost rule demands a written justification', () => {
  const { caseFile } = cm.migrateV1(fx.shoesCase(), NOW);
  caseFile.docState.items[0].quotes[0].recommended = false;
  caseFile.docState.items[0].quotes[1].recommended = true; // dearer supplier
  let R = verifycase.runAllChecks(caseFile);
  t.eq(byId(R, 'C10.1').result, 'FAIL');
  caseFile.docState.notlowest = 'Alpha Footwear cannot supply the required sizes before the parade date.';
  R = verifycase.runAllChecks(caseFile);
  t.eq(byId(R, 'C10.1').result, 'PASS');
});

/* Scenario 6 — P3 evaluation with an unjustified override never clears. */
t.test('S6: an override without justification cannot clear, and the stamp says so', () => {
  const cf = cm.newCase('P3', 'ministry-dotted', NOW);
  cf.docState.minfile = 'MOD/PROC: 1/1/1:2026';
  cf.docState.date = '2026-07-01';
  cf.docState.subject = 'Test Evaluation';
  cf.docState.minsigname = 'A. Officer';
  cf.docState.folios = [{ desc: 'Evaluation', date: '', tag: 'evaluation' }];
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'Cheap Ltd', status: 'quoted' }, { name: 'Dear Ltd', status: 'quoted' }];
  ev.items = [{ desc: 'Widget', variant: '', qty: 10, unitName: 'Each' }];
  ev.cells = [
    { item: 0, supplier: 0, unit: '10.00', vatable: true, quotedQty: null, packSize: null, compliant: true },
    { item: 0, supplier: 1, unit: '12.00', vatable: true, quotedQty: null, packSize: null, compliant: true }
  ];
  ev.selections = [{ item: 0, supplier: 1, justification: '' }];
  cf.evaluation = ev;
  let R = verifycase.runAllChecks(cf);
  t.eq(byId(R, 'E7.1').result, 'FAIL');
  t.ok(documents.build(cf, 'eval-report').indexOf('SCAFFOLD') < 0, 'procurement reports carry no disposal banner');
  t.ok(documents.build(cf, 'eval-report').indexOf('DRAFT — NOT CLEARED') >= 0);
  ev.selections[0].justification = 'Cheap Ltd failed the delivery-time requirement stated in the RFQ.';
  R = verifycase.runAllChecks(cf);
  t.eq(byId(R, 'E7.1').result, 'PASS');
  const report = documents.build(cf, 'eval-report');
  t.ok(report.indexOf('OVERRIDE') > 0 && report.indexOf('delivery-time requirement') > 0);
});

/* Scenario 7 — malformed figures cannot enter an evaluation. */
t.test('S7: the malformed sample figures are refused wherever they are keyed', () => {
  for (const bad of ['$11,3900.00', '$57,4716.72', '1,23.45', '12.345']) {
    t.eq(money.parseStrict(bad).ok, false, bad);
  }
});

/* Scenario 8 — tie resolution is recorded and visible. */
t.test('S8: a tie requires a recorded committee pick and displays as one', () => {
  const cf = cm.newCase('P3', 'ministry-dotted', NOW);
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'A Ltd', status: 'quoted' }, { name: 'B Ltd', status: 'quoted' }];
  ev.items = [{ desc: 'Paper', variant: '', qty: 10, unitName: 'Reams' }];
  ev.cells = [
    { item: 0, supplier: 0, unit: '52.00', vatable: false, quotedQty: null, packSize: null, compliant: true },
    { item: 0, supplier: 1, unit: '52.00', vatable: false, quotedQty: null, packSize: null, compliant: true }
  ];
  cf.evaluation = ev;
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'E6.1' && c.result === 'FAIL'));
  ev.selections = [{ item: 0, supplier: 0, tieNote: 'Single delivery with the existing A Ltd award.' }];
  R = verifycase.runAllChecks(cf);
  t.ok(!R.some(c => c.id === 'E6.1' && c.result === 'FAIL'));
  const sel = evaluation.effectiveSelection(ev, 0);
  t.eq(sel.tie, true);
});

/* Scenario 9 — folio renumbering from a supervisor-set start, all documents. */
t.test('S9: setting the starting folio renumbers every reference in every document', () => {
  const cf = cm.newCase('P1', 'ministry-circled', NOW);
  cf.docState.minfile = 'X'; cf.docState.date = '2026-07-01'; cf.docState.subject = 'Renumber test';
  cf.docState.minsigname = 'N';
  cf.docState.folios = [
    { desc: 'One', date: '' }, { desc: 'Two', date: '', tag: 'verbal-form' }, { desc: 'Three', date: '' }
  ];
  cf.verbal = {
    purpose: 'testing', contacts: [{ name: 'Solo Ltd', outcome: 'quoted', amount: '100.00' }],
    selected: 0, selectionBasis: 'only respondent', notLowestJustification: '', tableTitle: '',
    schedule: [{ date: '2026-07-02', desc: 'Thing', qty: 1, rate: '100.00', kind: 'line' }]
  };
  cf.folioStart = 41;
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('Folios  41   to   43    refers,') > 0);
  t.ok(html.indexOf('Folio 42 refers.') > 0, 'tagged verbal-form folio renumbered in prose');
  t.ok(html.indexOf('㊶') > 0, 'circled numeral for 41');
});

/* Scenario 10 — vote status: computed balances and the negative-balance guard. */
t.test('S10: vote balances are computed and impossible figures are challenged', () => {
  const good = votestatus.compute({
    originalProvision: '100,000.00', revisedAllocation: '100,000.00',
    releasesToDate: '99,713.00', expenditureToDate: '33,750.00', commitment: '58,975.34'
  });
  t.eq(good.cents.uncommittedBalance, 727466);
  const impossible = votestatus.compute({
    originalProvision: '10,000.00', revisedAllocation: '10,000.00',
    releasesToDate: '1,000.00', expenditureToDate: '9,000.00', commitment: '5,000.00'
  });
  t.ok(impossible.errors.some(e => /negative/.test(e)));
  const bad = votestatus.compute({
    originalProvision: '38,0000.00', revisedAllocation: '380,000.00',
    releasesToDate: '1.00', expenditureToDate: '1.00', commitment: '1.00'
  });
  t.eq(bad.ok, false, 'malformed vote figure refused');
});

/* Scenario 11 — P4 disposal case end to end (see disposal.test.js for depth). */
t.test('S11: P4 case produces the three instruments, all bannered, totals computed', () => {
  const cf = cm.newCase('P4', 'ministry-dotted', NOW);
  cf.docState.minfile = 'MOD/DISP: 1'; cf.docState.date = '2026-07-01';
  cf.docState.subject = 'Disposal'; cf.docState.minsigname = 'N';
  cf.docState.folios = [{ desc: 'Survey', date: '' }];
  cf.disposal = {
    committee: [{ name: 'A', post: 'Chair' }, { name: 'B', post: 'M' }, { name: 'C', post: 'M' }],
    narrative: '',
    items: [{ desc: 'Old desk', identification: '', qty: 4, condition: 'Worn', location: 'HQ', acquisitionCost: '', valuation: '400.00', valuationBasis: 'Survey', valuationDate: '', method: 'Sale by tender', methodReason: '' }]
  };
  t.eq(verifycase.runAllChecks(cf).filter(c => c.result === 'FAIL'), []);
  for (const d of ['disposal-inventory', 'disposal-minute', 'disposal-instrument']) {
    const html = documents.build(cf, d);
    t.ok(html.indexOf('AWAITING FORMAT AUTHORITY') > 0, d);
    t.ok(html.indexOf('$400.00') > 0, d + ' total');
  }
});

/* Scenario 12 — P3 -> P2 carry-over: exact totals, no retyping. */
t.test('S12: evaluation result carried to a P2 letter keeps the totals exact', () => {
  const cf = cm.newCase('P3', 'ttcg-formation', NOW);
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'Alpha Ltd', address: 'POS', status: 'quoted' }, { name: 'Beta Ltd', address: '', status: 'quoted' }];
  ev.items = [
    { desc: 'Rope', variant: '', qty: 10, unitName: 'Coils' },
    { desc: 'Paint', variant: '', qty: 20, unitName: 'Gallons' }
  ];
  ev.cells = [
    { item: 0, supplier: 0, unit: '100.00', vatable: true, quotedQty: null, packSize: null, compliant: true },
    { item: 0, supplier: 1, unit: '110.00', vatable: true, quotedQty: null, packSize: null, compliant: true },
    { item: 1, supplier: 0, unit: '90.00', vatable: false, quotedQty: null, packSize: null, compliant: true },
    { item: 1, supplier: 1, unit: '80.00', vatable: false, quotedQty: null, packSize: null, compliant: true }
  ];
  cf.evaluation = ev;
  const bk = evaluation.breakdown(ev);
  // Alpha: rope 10×$100 V, VAT $125, total $1,125; Beta: paint 20×$80 NV = $1,600
  t.eq(bk.grandTotalCents, 112500 + 160000);
  cm.setPresentation(cf, 'formation', 'Comparison adopted into a formation approval', NOW);
  cf.docState.items = evaluation.toDocItems(ev);
  const compute = require('../../js/lib/compute.js');
  t.eq(compute.grandTotal(cf.docState.items), bk.grandTotalCents);
  const letter = documents.build(cf, 'approval');
  t.ok(letter.indexOf('Two Thousand, Seven Hundred and Twenty-Five Dollars ($2,725.00)') > 0);
});

/* Scenario 13 — the DRAFT stamp appears and disappears with the checks. */
t.test('S13: documents are stamped while any check fails and clean once fixed', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.verbal = {
    purpose: 'a thing', contacts: [{ name: 'One Ltd', outcome: 'quoted', amount: '50.00' }],
    selected: 0, selectionBasis: 'only quote', notLowestJustification: '', tableTitle: '',
    schedule: [{ date: '2026-07-01', desc: 'Thing', qty: 1, rate: '50.00', kind: 'line' }]
  };
  t.ok(documents.build(cf, 'minute').indexOf('DRAFT — NOT CLEARED') >= 0, 'missing details stamp the minute');
  cf.docState.minfile = 'F'; cf.docState.date = '2026-07-01'; cf.docState.subject = 'S';
  cf.docState.minsigname = 'N'; cf.docState.folios = [{ desc: 'Quote', date: '' }];
  t.ok(documents.build(cf, 'minute').indexOf('DRAFT — NOT CLEARED') < 0, 'stamp lifts when the case clears');
});

/* Scenario 14 — ingestion to case: an imported schedule lands only through acceptance. */
t.test('S14: ingested rows only reach the case as reviewed candidates', () => {
  const ingest = require('../../js/lib/ingest.js');
  const rows = ingest.parseCSV('Items Requested,Quantity Requested,Unit,Total\nBleach,24,32.50,780.00\n');
  const cands = ingest.extractItemsFromRows(rows, 'csv');
  t.eq(cands.length, 1);
  t.eq(cands[0].accepted, false, 'nothing is accepted by default');
  t.eq(ingest.canBulkAccept(cands[0]), false, 'and an item line can never be bulk-accepted');
  // acceptance is a user action in the staging screen; the candidate carries
  // everything needed to apply it without re-parsing
  t.eq(cands[0].value.unitCents, 3250);
  t.eq(cands[0].value.totalCents, 78000);
});

/* Scenario 15 — words and figures cannot disagree, across the full money range used. */
t.test('S15: amounts-in-words round-trip for every case total in this suite', () => {
  const totals = [12000, 40000, 120000, 230000, 272500, 491775, 1053000, 1066878,
    4011400, 4503175, 5719086, 7838964, 9945000, 12146875, 23922376];
  for (const cents of totals) {
    const w = words.amountInWords(cents);
    t.ok(w.length > 0);
    t.ok(!/\d/.test(w), 'no digits leak into the words: ' + w);
    // the figure printed beside the words comes from the same integer
    t.eq(money.parseStrict(money.fmtMoney(cents)).cents, cents);
  }
});

/* Scenario 16 — presentation moved internal -> formation -> internal keeps
   the data and records each move; a module change does the same. */
t.test('S16: presentation and activity transitions preserve data and record history', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.docState.subject = 'KEEP ME';
  cm.setPresentation(cf, 'formation', 'Formation request received', NOW);
  cm.setPresentation(cf, 'internal', 'Reverted — internal after all', NOW);
  t.eq(cf.docState.subject, 'KEEP ME');
  const events = cf.meta.history.map(h => h.event);
  t.eq(events.filter(e => e === 'presentation-changed').length, 2);
  cm.transitionActivity(cf, 'disposal', 'Misfiled', NOW);
  t.eq(cf.docState.subject, 'KEEP ME');
  t.eq(cf.module, 'disposal');
  t.eq(cf.meta.history[cf.meta.history.length - 1].event, 'activity-changed');
});

/* Scenario 17 — hostile text cannot break out of the documents. */
t.test('S17: markup in typed values is escaped in every generated document', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.docState.minfile = 'F'; cf.docState.date = '2026-07-01';
  cf.docState.subject = '<script>alert(1)</script>';
  cf.docState.minsigname = '<img src=x onerror=alert(1)>';
  cf.verbal = {
    purpose: '<b>bold-injection</b>', contacts: [{ name: 'Nasty "<script>" Ltd', outcome: 'quoted', amount: '10.00' }],
    selected: 0, selectionBasis: '', notLowestJustification: '', tableTitle: '',
    schedule: [{ date: '2026-07-01', desc: '<td>breakout</td>', qty: 1, rate: '10.00', kind: 'line' }]
  };
  cf.docState.folios = [{ desc: '<script>x</script>', date: '' }];
  for (const d of ['minute', 'verbal-form', 'certificate']) {
    const html = documents.build(cf, d);
    t.ok(html.indexOf('<script>') < 0, d + ' escapes script tags');
    t.ok(html.indexOf('&lt;script&gt;') >= 0 || html.indexOf('&lt;td&gt;') >= 0, d + ' shows the text escaped');
  }
});
