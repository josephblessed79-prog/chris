/* adversarial.test.js — the review pass that tries to break the build:
   hostile text, overflow, garbage files, blank cases, unknown profiles.
   Each test documents an attack and proves the system fails loudly or
   escapes safely — never silently wrong. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const money = require('../js/lib/money.js');
const words = require('../js/lib/words.js');
const evaluation = require('../js/lib/evaluation.js');
const documents = require('../js/lib/documents.js');
const verifycase = require('../js/lib/verifycase.js');
const storage = require('../js/lib/storage.js');
require('../js/lib/docs/hybridminute.js');
require('../js/lib/docs/verbalform.js');
require('../js/lib/docs/evalreport.js');
require('../js/lib/docs/hybridcert.js');
require('../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

t.test('overflow: figures beyond the exactness cap are refused, not approximated', () => {
  t.eq(money.parseStrict('999,999,999,999.99').ok, true);
  t.eq(money.parseStrict('1,000,000,000,000.00').reason, 'too-large');
  t.eq(money.parseStrict('9007199254740993.00').reason, 'too-large');
});

t.test('overflow: an evaluation cell whose extended total is not exactly computable errors', () => {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'Huge Ltd', status: 'quoted' }];
  ev.items = [{ desc: 'Everything', variant: '', qty: 999999999, unitName: 'Each' }];
  ev.cells = [{ item: 0, supplier: 0, unit: '999,999,999,999.99', vatable: false, quotedQty: null, packSize: null, compliant: true }];
  const c = evaluation.computeCell(ev, 0, 0);
  t.eq(c.extendedCents, null);
  t.ok(c.errors.some(e => /too large to compute exactly/.test(e)));
  const R = evaluation.runEvalChecks(ev);
  t.ok(R.some(x => x.id.indexOf('E4.') === 0 && x.result === 'FAIL'));
});

t.test('negative amounts are never spelt out as money', () => {
  t.eq(words.amountInWords(-12345), '');
  t.eq(money.fmtMoney(-12345), '-$123.45', 'the figure shows the sign; the words refuse');
});

t.test('hostile supplier names are escaped in the evaluation worksheet and award tables', () => {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: '<script>alert("x")</script> & "Sons"', status: 'quoted' }];
  ev.items = [{ desc: '<td>break</td>', variant: '<i>x</i>', qty: 1, unitName: '' }];
  ev.cells = [{ item: 0, supplier: 0, unit: '10.00', vatable: true, quotedQty: null, packSize: null, compliant: true }];
  const ws = evaluation.worksheetHTML(ev);
  t.ok(ws.indexOf('<script>') < 0);
  t.ok(ws.indexOf('&lt;script&gt;') >= 0);
  const table = evaluation.awardTableHTML(ev, evaluation.breakdown(ev).schedules[0]);
  t.ok(table.indexOf('<script>') < 0);
  t.ok(table.indexOf('&lt;td&gt;') >= 0);
});

t.test('hostile override justification is escaped where it is carried forward', () => {
  const ev = evaluation.newEvaluation();
  ev.suppliers = [{ name: 'A', status: 'quoted' }, { name: 'B', status: 'quoted' }];
  ev.items = [{ desc: 'W', variant: '', qty: 1, unitName: '' }];
  ev.cells = [
    { item: 0, supplier: 0, unit: '10.00', vatable: false, quotedQty: null, packSize: null, compliant: true },
    { item: 0, supplier: 1, unit: '20.00', vatable: false, quotedQty: null, packSize: null, compliant: true }
  ];
  ev.selections = [{ item: 0, supplier: 1, justification: '<img src=x onerror=alert(1)>' }];
  const table = evaluation.awardTableHTML(ev, evaluation.breakdown(ev).schedules[0]);
  t.ok(table.indexOf('<img') < 0);
  t.ok(table.indexOf('&lt;img') >= 0);
});

t.test('every document type renders on a blank case of its pathway without crashing', () => {
  for (const pathway of ['P1', 'P2', 'P3', 'P4']) {
    const cf = cm.newCase(pathway, pathway === 'P2' ? 'ttcg-formation' : 'ministry-dotted', NOW);
    if (pathway === 'P3') cf.evaluation = evaluation.newEvaluation();
    if (pathway === 'P4') cf.disposal = require('../js/lib/disposal.js').newDisposal();
    if (pathway === 'P1') cf.verbal = require('../js/lib/verbal.js').newVerbal();
    for (const d of documents.availableDocs(cf)) {
      let html;
      try { html = documents.build(cf, d.id); }
      catch (e) {
        /* documents that need pathway data may refuse loudly; that is
           acceptable — silence or a crash is not */
        t.ok(e.message && e.message.length > 5, pathway + '/' + d.id + ' throws with a message');
        continue;
      }
      t.ok(typeof html === 'string' && html.length > 40, pathway + '/' + d.id + ' renders');
    }
  }
});

t.test('an unknown style profile fails loudly at build time', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.styleProfileId = 'profile-that-does-not-exist';
  t.throws(() => documents.build(cf, 'minute'));
});

t.test('garbage case files are refused with reasons, not half-opened', () => {
  t.eq(cm.load('a string').ok, false);
  t.eq(cm.load(12).ok, false);
  t.eq(cm.load({ schemaVersion: 2 }).ok, false, 'v2 without docState refused');
  t.eq(cm.load({ schemaVersion: 99, docState: {} }).ok, false, 'future schema refused, not guessed at');
  const idx = storage.rebuildRegister([{ name: 'evil.json', text: '"just a string"' }], NOW);
  t.eq(idx.cases.length, 0);
  t.eq(idx.problems.length, 1);
});

t.test('a v2 case with hand-mangled arrays is repaired on load, and reported sound', () => {
  const cf = cm.newCase('P2', 'ttcg-formation', NOW);
  cf.docState.items = 'oops';
  cf.docState.folios = null;
  const round = JSON.parse(cm.serialize(cf));
  const loaded = cm.load(round);
  t.eq(loaded.ok, true);
  t.eq(loaded.caseFile.docState.items, []);
  t.eq(loaded.caseFile.docState.folios, []);
});

t.test('the double-count guard: one item cannot be awarded twice in quantity mode', () => {
  const fx = require('./fixtures.js');
  const st = fx.shoesCase();
  st.items[0].quotes[0].recommended = true;
  st.items[0].quotes[1].recommended = true;
  const verify = require('../js/lib/verify.js');
  const R = verify.runChecks(st);
  t.ok(R.some(c => c.id === 'C8b.1' && c.result === 'FAIL'));
});

t.test('folio tags never invent a number: a missing tag yields null and the prose omits it', () => {
  const folio = require('../js/lib/folio.js');
  t.eq(folio.numberOfTag([{ desc: 'X', tag: 'other' }], 1, 'evaluation'), null);
  t.eq(folio.proseRef([]), '');
  // the hybrid minute drops the folio sentence rather than printing a wrong number
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.docState.minfile = 'F'; cf.docState.date = '2026-07-01'; cf.docState.subject = 'S'; cf.docState.minsigname = 'N';
  cf.docState.folios = [{ desc: 'Some folio', date: '' }]; // no tags at all
  cf.verbal = {
    purpose: 'p', contacts: [{ name: 'A Ltd', outcome: 'quoted', amount: '10.00' }],
    selected: 0, selectionBasis: 'only quote', notLowestJustification: '', tableTitle: '',
    schedule: [{ date: '2026-07-01', desc: 'D', qty: 1, rate: '10.00', kind: 'line' }]
  };
  const html = documents.build(cf, 'minute');
  t.ok(!/Folios?\s+(undefined|null|NaN)/.test(html));
});

t.test('very long registers: circled numerals beyond 50 fall back plainly', () => {
  const folio = require('../js/lib/folio.js');
  const folios = [];
  for (let i = 0; i < 60; i++) folios.push({ desc: 'Folio number ' + (i + 1), date: '' });
  const html = folio.registerHTML(folios, 1, 'circled');
  t.ok(html.indexOf('㊿') > 0);
  t.ok(html.indexOf('(51)') > 0);
  t.ok(html.indexOf('(60)') > 0);
});

t.test('the VAT rate is data: a changed rate flows through every computed total', () => {
  const ev = evaluation.newEvaluation();
  ev.vatRate = { num: 150, den: 1000, label: '15%' }; // a hypothetical future rate
  ev.suppliers = [{ name: 'A', status: 'quoted' }];
  ev.items = [{ desc: 'W', variant: '', qty: 10, unitName: '' }];
  ev.cells = [{ item: 0, supplier: 0, unit: '10.00', vatable: true, quotedQty: null, packSize: null, compliant: true }];
  const tot = evaluation.supplierTotals(ev, 0);
  t.eq(tot.vatCents, 1500, '15% of $100.00');
  t.eq(tot.totalCents, 11500);
});

t.test('register filenames strip hostile path characters', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.docState.subject = '../../etc/passwd <>|;&';
  const name = storage.caseFileName(cf);
  t.ok(!/[\/\\<>|;&]/.test(name), name);
});
