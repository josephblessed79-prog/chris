/* disposal.test.js — the P4 scaffold: model, checks, computed totals, and
   the AWAITING FORMAT AUTHORITY banner on every generated document. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const disposal = require('../js/lib/disposal.js');
const verifycase = require('../js/lib/verifycase.js');
const documents = require('../js/lib/documents.js');
require('../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}

function disposalCase() {
  const cf = cm.newCase('P4', 'ministry-dotted', '2026-06-01T09:00:00.000Z');
  const st = cf.docState;
  st.minfile = 'MOD/DISP: 3/1/1:2026';
  st.date = '2026-06-01';
  st.subject = 'Disposal of Unserviceable Office Equipment';
  st.minsigname = 'A. Officer';
  st.folios = [
    { desc: 'Board of Survey report', date: '12/05/26' },
    { desc: 'Disposal inventory and valuation record', date: '19/05/26' }
  ];
  cf.disposal = {
    committee: [
      { name: 'Member One', post: 'Chairperson' },
      { name: 'Member Two', post: 'Member' },
      { name: 'Member Three', post: 'Member' }
    ],
    narrative: 'The items were surveyed and found beyond economic repair or surplus to requirements.',
    items: [
      { desc: 'Photocopier, Model X', identification: 'MOD/EQ/00123', qty: 1, condition: 'Beyond economic repair', location: 'HQ Stores', acquisitionCost: '', valuation: '500.00', valuationBasis: 'Board of Survey assessment', valuationDate: '2026-05-12', method: 'Sale by public auction', methodReason: '' },
      { desc: 'Steel filing cabinets', identification: '', qty: 12, condition: 'Serviceable, surplus', location: 'HQ Stores', acquisitionCost: '', valuation: '1,800.00', valuationBasis: 'Board of Survey assessment', valuationDate: '2026-05-12', method: 'Transfer to another public body', methodReason: '' },
      { desc: 'Expired chemical stock', identification: 'Batch 44', qty: 1, condition: 'Expired — hazardous', location: 'FMU compound', acquisitionCost: '', valuation: '0.00', valuationBasis: 'No residual value — Board of Survey', valuationDate: '2026-05-12', method: 'Destruction', methodReason: 'Expired and hazardous; certified for supervised destruction.' }
    ]
  };
  return cf;
}

t.test('disposal totals and method grouping are computed', () => {
  const d = disposalCase().disposal;
  t.eq(disposal.totalValuationCents(d), 230000, 'Total valuation $2,300.00');
  const groups = disposal.byMethod(d);
  t.eq(groups.map(g => g.method), ['Sale by public auction', 'Transfer to another public body', 'Destruction']);
  t.eq(groups[1].cents, 180000);
});

t.test('a complete disposal case has no failures, and always the format-authority caution', () => {
  const R = verifycase.runAllChecks(disposalCase());
  t.eq(R.filter(c => c.result === 'FAIL'), []);
  const d0 = R.find(c => c.id === 'D0');
  t.eq(d0.result, 'WARN');
  t.ok(/AWAITING FORMAT AUTHORITY/.test(d0.detail));
});

t.test('destruction and donation demand a recorded reason', () => {
  const cf = disposalCase();
  cf.disposal.items[2].methodReason = '';
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'));
  cf.disposal.items[2].method = 'Donation';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'), 'donation too');
  cf.disposal.items[2].methodReason = 'Donated to a registered charity; no residual value.';
  R = verifycase.runAllChecks(cf);
  t.ok(!R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'));
});

t.test('valuation figures are strict-parsed; basis is mandatory', () => {
  const cf = disposalCase();
  cf.disposal.items[0].valuation = '5,00.00';
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D4.1' && c.result === 'FAIL' && /rejected/.test(c.detail)));
  cf.disposal.items[0].valuation = '500.00';
  cf.disposal.items[0].valuationBasis = '';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D4.1b' && c.result === 'FAIL'));
});

t.test('an unrecognised method fails loudly', () => {
  const cf = disposalCase();
  cf.disposal.items[0].method = 'Give away to staff';
  const R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.1' && c.result === 'FAIL'));
});

t.test('every disposal document carries the AWAITING FORMAT AUTHORITY banner', () => {
  const cf = disposalCase();
  for (const doc of ['disposal-inventory', 'disposal-minute', 'disposal-instrument']) {
    const html = documents.build(cf, doc);
    t.ok(html.indexOf('SCAFFOLD — AWAITING FORMAT AUTHORITY') >= 0, doc);
  }
});

t.test('the disposal documents carry the computed figures', () => {
  const cf = disposalCase();
  const inv = documents.build(cf, 'disposal-inventory');
  t.ok(inv.indexOf('$2,300.00') > 0, 'computed total in the inventory');
  t.ok(inv.indexOf('Board of Survey assessment') > 0);
  const min = documents.build(cf, 'disposal-minute');
  t.ok(min.indexOf('Two Thousand, Three Hundred Dollars ($2,300.00)') > 0, 'amount in words computed');
  t.ok(min.indexOf('Recommended method: Destruction') > 0);
  t.ok(min.indexOf('certified for supervised destruction') > 0, 'reason carried into the minute');
  const inst = documents.build(cf, 'disposal-instrument');
  t.ok(inst.indexOf('Sale by public auction — 1 item(s), valuation $500.00') > 0);
  t.ok(inst.indexOf('proceeds (if any) brought to account') > 0);
});

t.test('availableDocs offers the disposal set on P4', () => {
  const docs = documents.availableDocs(disposalCase()).map(d => d.id);
  t.ok(docs.includes('disposal-inventory'));
  t.ok(docs.includes('disposal-minute'));
  t.ok(docs.includes('disposal-instrument'));
});
