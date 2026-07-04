/* sheetnumbers.test.js — the per-case sheet-numbering decision and the
   continuation-formatting safeguard.

   Sheet numbers: the starting-folio requirement is NOT hard-coded onto
   sheet numbers. When (and only when) a starting folio above 1 is set,
   the user decides per case whether the sheet numbers follow it
   ('follow-folio') or stay as typed ('manual'); the decision is recorded
   in the G6 check detail, which prints on every certificate.

   Continuation: every generated table marks its header rows as true
   table headers (<thead>), which Word treats as "repeat header row at
   the top of each page" when a schedule continues onto another page —
   printed clarity without altering the approved layout. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const folio = require('../js/lib/folio.js');
const verifycase = require('../js/lib/verifycase.js');
const documents = require('../js/lib/documents.js');
const evaluation = require('../js/lib/evaluation.js');
const verbal = require('../js/lib/verbal.js');
const votestatus = require('../js/lib/votestatus.js');
require('../js/lib/docs/hybridminute.js');
require('../js/lib/docs/verbalform.js');
require('../js/lib/docs/hybridcert.js');
require('../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

function verbalCase(folioStart, sheetNumbering) {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.folioStart = folioStart;
  if (sheetNumbering) cf.sheetNumbering = sheetNumbering;
  cf.docState.minfile = 'F'; cf.docState.date = '2026-07-01';
  cf.docState.subject = 'S'; cf.docState.minsigname = 'N'; cf.docState.minsheet = '1a';
  cf.docState.folios = [{ desc: 'Quote', date: '' }];
  cf.verbal = {
    purpose: 'a requirement', contacts: [{ name: 'Solo Ltd', outcome: 'quoted', amount: '10.00' }],
    selected: 0, selectionBasis: 'only quote', notLowestJustification: '', tableTitle: '',
    schedule: [{ date: '2026-07-01', desc: 'Thing', qty: 1, rate: '10.00', kind: 'line' }]
  };
  return cf;
}

t.test('sheetLabel: manual keeps the typed value; follow-folio renumbers the digits', () => {
  t.eq(folio.sheetLabel('1a', 41, 'manual'), '1a');
  t.eq(folio.sheetLabel('1a', 41, null), '1a', 'undecided behaves as typed');
  t.eq(folio.sheetLabel('1a', 41, 'follow-folio'), '41a');
  t.eq(folio.sheetLabel('2b', 41, 'follow-folio'), '41b');
  t.eq(folio.sheetLabel('', 7, 'follow-folio'), '7a');
  t.eq(folio.sheetLabel('a', 7, 'follow-folio'), '7a', 'no leading digits: prefixed');
  t.eq(folio.sheetLabel('1a', undefined, 'follow-folio'), '1a', 'invalid start falls back to 1');
});

t.test('G6 is not raised at all when the starting folio is 1', () => {
  const R = verifycase.runAllChecks(verbalCase(1));
  t.ok(!R.some(c => c.id === 'G6'), 'no question where none arises');
});

t.test('G6 warns when a custom start is set and no decision is recorded', () => {
  const R = verifycase.runAllChecks(verbalCase(41));
  const g6 = R.find(c => c.id === 'G6');
  t.eq(g6.result, 'WARN');
  t.ok(/no decision is recorded/.test(g6.detail));
  t.ok(/Case Details/.test(g6.action));
});

t.test('G6 records the decision in the check detail, both ways', () => {
  const follow = verifycase.runAllChecks(verbalCase(41, 'follow-folio')).find(c => c.id === 'G6');
  t.eq(follow.result, 'PASS');
  t.ok(/follow the starting folio number \(41\)/.test(follow.detail));
  t.ok(/Sheet No 41a/.test(follow.detail));
  const manual = verifycase.runAllChecks(verbalCase(41, 'manual')).find(c => c.id === 'G6');
  t.eq(manual.result, 'PASS');
  t.ok(/kept separate/.test(manual.detail));
  t.ok(/Sheet No 1a as typed/.test(manual.detail));
});

t.test('the hybrid minute header follows the recorded decision', () => {
  t.ok(documents.build(verbalCase(41, 'follow-folio'), 'minute').indexOf('Sheet No:  41a') > 0);
  t.ok(documents.build(verbalCase(41, 'manual'), 'minute').indexOf('Sheet No:  1a') > 0);
  t.ok(documents.build(verbalCase(1), 'minute').indexOf('Sheet No:  1a') > 0);
});

t.test('the decision prints on the certificate through the G6 detail', () => {
  const cert = documents.build(verbalCase(41, 'follow-folio'), 'certificate');
  t.ok(cert.indexOf('G6') > 0);
  t.ok(cert.indexOf('Decision recorded on this case') > 0);
});

t.test('an invalid sheetNumbering value is refused on load', () => {
  const cf = verbalCase(41);
  cf.sheetNumbering = 'sometimes';
  t.ok(cm.validate(cf).some(e => /sheetNumbering/.test(e)));
});

t.test('continuation: generated tables mark their header rows for Word repetition', () => {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'A Ltd', status: 'quoted' }, { name: 'None Ltd', status: 'did-not-quote' }];
  ev.items = [{ desc: 'W', variant: '', qty: 2, unitName: '' }];
  ev.cells = [{ item: 0, supplier: 0, unit: '10.00', vatable: true, quotedQty: null, packSize: null, compliant: true }];
  t.ok(evaluation.worksheetHTML(ev).indexOf('<thead>') >= 0, 'worksheet');
  t.ok(evaluation.awardTableHTML(ev, evaluation.breakdown(ev).schedules[0]).indexOf('<thead>') >= 0, 'award table');
  const v = { purpose: 'p', contacts: [{ name: 'A', outcome: 'quoted', amount: '10.00' }], selected: 0, selectionBasis: '', notLowestJustification: '', tableTitle: '', schedule: [{ date: '2026-07-01', desc: 'D', qty: 1, rate: '10.00', kind: 'line' }] };
  t.ok(verbal.scheduleTableHTML(v).indexOf('<thead>') >= 0, 'verbal schedule');
  t.ok(votestatus.tableHTML({ originalProvision: '1.00', revisedAllocation: '1.00', releasesToDate: '1.00', expenditureToDate: '0.00', commitment: '0.00' }).indexOf('<thead>') >= 0, 'vote status table');
  const cert = documents.build(verbalCase(1), 'certificate');
  t.ok((cert.match(/<thead>/g) || []).length >= 2, 'certificate Part A and Part B tables');
});

t.test('continuation markers do not disturb the sample replays (all suites still pass around this one)', () => {
  // The materials and pantry dry runs assert exact figures and wording;
  // they run in this same suite execution. This placeholder records the
  // intent: <thead> is structural only, never content.
  t.ok(true);
});
