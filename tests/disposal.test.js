/* disposal.test.js — the disposal module built to OPR authority: the
   data model, the appraisal arithmetic, the D-series governance checks
   (three-officer committee, reg 6(2) methods, reg 6(3) advertising, s.57
   employee sale, AO fourteen-day decision, six-week OPR notification) and
   the Forms A–E documents. The to-the-cent case-study replay lives in
   dryruns/disposal-casestudy.test.js. */
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
const NOW = '2026-06-01T09:00:00.000Z';

function sale(desc, qty, totalNBV, salePrice, method) {
  const it = disposal.blankItem();
  it.desc = desc; it.qty = qty; it.condition = 'Inspected'; it.disposition = totalNBV ? 'VG' : 'S';
  it.totalNBV = totalNBV || ''; it.saleable = 'yes'; it.salePrice = salePrice;
  it.valueComment = 'Prorated from NBV or estimated.'; it.method = method || 'Public sale or tendering';
  return it;
}

function disposalCase() {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  const st = cf.docState;
  st.minfile = 'MOD/DISP: 3/1/1:2026';
  st.date = '2026-06-01';
  st.subject = 'Disposal of Unserviceable Office Equipment';
  st.minsigname = 'A. Officer';
  st.folios = [{ desc: 'Board of Survey report', date: '12/05/26' }];
  const d = disposal.newDisposal();
  d.entity = 'Ministry of Defence';
  d.npoName = 'Named Officer'; d.npoDesignation = 'Procurement Officer';
  d.aoName = 'Permanent Secretary';
  d.committee = [
    { name: 'Member One', post: 'Chairperson' },
    { name: 'Member Two', post: 'Member' },
    { name: 'Member Three', post: 'Member' }
  ];
  d.items = [
    sale('Steel filing cabinets', 12, '1,800.00', '150.00', 'Transfer'),
    (() => { const it = disposal.blankItem(); it.desc = 'Photocopier, Model X'; it.qty = 1; it.condition = 'Beyond economic repair'; it.disposition = 'S'; it.saleable = 'no'; it.method = 'Recycling'; it.methodReason = 'Certified e-waste recycler.'; return it; })(),
    (() => { const it = disposal.blankItem(); it.desc = 'Expired chemical stock'; it.qty = 1; it.condition = 'Expired — hazardous'; it.disposition = 'S'; it.saleable = 'no'; it.method = 'Destruction'; it.methodReason = 'Expired and hazardous; certified for supervised destruction.'; return it; })()
  ];
  cf.disposal = d;
  return cf;
}

t.test('appraisal arithmetic: unit NBV, 20%, less 20% halves rounded up at the cent', () => {
  // $1,000.00 over 3 units: 100000/3 = 33333.33 -> 33333 cents ($333.33)
  const it = sale('Thing', 3, '1,000.00', '');
  const a = disposal.appraisal(it);
  t.eq(a.unitNBVCents, 33333, '$333.33');
  t.eq(a.pct20Cents, 6667, '20% = $66.67 (66.666.. rounds up)');
  t.eq(a.less20Cents, 26667, 'less 20% = $266.67');
  // halfUpDiv rounds .5 up
  t.eq(disposal.halfUpDiv(5, 2), 3, '2.5 -> 3');
  t.eq(disposal.halfUpDiv(3, 2), 2, '1.5 -> 2');
  t.eq(disposal.halfUpDiv(2, 2), 1, 'exact');
});

t.test('total expected returns sums only the saleable items', () => {
  const d = disposalCase().disposal;
  // filing cabinets 12 × $150 = $1,800; the recycled/destroyed items add nothing
  t.eq(disposal.totalExpectedReturnsCents(d), 180000);
  const groups = disposal.byMethod(d);
  t.eq(groups.map(g => g.method), ['Transfer', 'Recycling', 'Destruction']);
  t.eq(groups[0].cents, 180000);
  t.eq(groups[1].cents, 0, 'recycling yields no sale proceeds');
});

t.test('a complete disposal case clears, and D0 cites the authority (no scaffold warning)', () => {
  const R = verifycase.runAllChecks(disposalCase());
  t.eq(R.filter(c => c.result === 'FAIL'), []);
  const d0 = R.find(c => c.id === 'D0');
  t.eq(d0.result, 'PASS');
  t.ok(/Forms A.{1,4}H/.test(d0.detail) && /Handbook/.test(d0.detail));
  t.ok(/[Rr]eal-property/.test(d0.detail), 'still names what is pending (real property)');
});

t.test('the Disposal Committee must be at least three officers (ss. 55–56)', () => {
  const cf = disposalCase();
  cf.disposal.committee = [{ name: 'Only One', post: 'Chair' }];
  const d1 = verifycase.runAllChecks(cf).find(c => c.id === 'D1');
  t.eq(d1.result, 'FAIL');
  t.ok(/not less than three/.test(d1.detail));
});

t.test('destruction, donation and gift demand a recorded reason', () => {
  const cf = disposalCase();
  cf.disposal.items[2].methodReason = '';
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'), 'destruction');
  cf.disposal.items[2].method = 'Donation';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'), 'donation');
  cf.disposal.items[2].method = 'Gift';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'), 'gift');
  cf.disposal.items[2].methodReason = 'No residual value; certified for supervised destruction.';
  R = verifycase.runAllChecks(cf);
  t.ok(!R.some(c => c.id === 'D5.3r' && c.result === 'FAIL'));
});

t.test('appraisal figures are strict-parsed; a saleable item needs a value determination', () => {
  const cf = disposalCase();
  cf.disposal.items[0].salePrice = '1,5.00';
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D4.1' && c.result === 'FAIL' && /rejected/.test(c.detail)));
  cf.disposal.items[0].salePrice = '150.00';
  cf.disposal.items[0].valueComment = '';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D4.1b' && c.result === 'FAIL'));
});

t.test('an item neither priced nor marked N/A is flagged', () => {
  const cf = disposalCase();
  cf.disposal.items[0].saleable = '';
  const R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D4.1' && c.result === 'FAIL' && /saleable/.test(c.detail)));
});

t.test('a method off the reg 6(2) list is allowed only with recorded reasoning', () => {
  const cf = disposalCase();
  cf.disposal.items[0].method = 'Give away to a friend';
  cf.disposal.items[0].methodReason = '';
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'D5.1' && c.result === 'FAIL'), 'no reason: fails');
  cf.disposal.items[0].methodReason = 'Bespoke arrangement approved by the AO for reasons on file.';
  R = verifycase.runAllChecks(cf);
  const d5 = R.find(c => c.id === 'D5.1');
  t.eq(d5.result, 'WARN', 'with reason: allowed but flagged, since the list is not closed');
});

t.test('reg 6(3): public sale/auction above TT$100,000 must be advertised', () => {
  const cf = disposalCase();
  // one big auction lot: 1 unit, sale price $150,000
  const big = sale('Marine vessel (decommissioned)', 1, '', '150,000.00', 'Public auction');
  cf.disposal.items = [big, cf.disposal.items[0], cf.disposal.items[1], cf.disposal.items[2]];
  let R = verifycase.runAllChecks(cf);
  const d7 = R.find(c => c.id === 'D7');
  t.eq(d7.result, 'WARN', 'above threshold with no advertising arrangement recorded');
  t.ok(/two daily newspapers/.test(d7.detail));
  cf.disposal.strategy.advertisingNote = 'Advertised in the Express and Guardian on 10/06/2026 and on the Ministry website.';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D7').result, 'PASS');
  // below the threshold: no newspaper demand
  big.salePrice = '50,000.00';
  R = verifycase.runAllChecks(cf);
  t.ok(/not above TT\$100,000/.test(R.find(c => c.id === 'D7').detail));
});

t.test('reg 6(3) advertising is not raised when no public sale/auction is chosen', () => {
  // the base case sells by transfer/recycling/destruction only
  const R = verifycase.runAllChecks(disposalCase());
  t.ok(!R.some(c => c.id === 'D7'), 'no advertising question when it does not arise');
});

t.test('s.57 / reg 7: sale to employees needs prior PDAC approval — asked only when it arises', () => {
  const cf = disposalCase();
  t.ok(!verifycase.runAllChecks(cf).some(c => c.id === 'D8'), 'not raised on a transfer/recycle case');
  cf.disposal.items[0].method = 'Sale to employees (s. 57, Reg 7)';
  let R = verifycase.runAllChecks(cf);
  const d8 = R.find(c => c.id === 'D8');
  t.eq(d8.result, 'WARN');
  t.ok(/prior/.test(d8.detail) || /before the sale/.test(d8.detail));
  cf.disposal.approvals.employeeSaleApproval = true;
  cf.disposal.approvals.employeeSaleDetails = 'PDAC notice ref X sent to AO 05/06/2026.';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D8').result, 'PASS');
});

t.test('AO fourteen-day decision (ss. 55–56) is computed from the dates', () => {
  const cf = disposalCase();
  cf.disposal.approvals.recommendationReceivedDate = '2026-06-01';
  cf.disposal.approvals.aoDecisionDate = '2026-06-10';
  cf.disposal.approvals.aoDecision = 'approved';
  let d9 = verifycase.runAllChecks(cf).find(c => c.id === 'D9');
  t.eq(d9.result, 'PASS', '9 days is within fourteen');
  cf.disposal.approvals.aoDecisionDate = '2026-06-30';
  d9 = verifycase.runAllChecks(cf).find(c => c.id === 'D9');
  t.eq(d9.result, 'FAIL', '29 days is over fourteen');
  t.ok(/29 day/.test(d9.detail));
});

t.test('a rejection needs written reasons and goes to the OPR', () => {
  const cf = disposalCase();
  cf.disposal.approvals.recommendationReceivedDate = '2026-06-01';
  cf.disposal.approvals.aoDecisionDate = '2026-06-05';
  cf.disposal.approvals.aoDecision = 'rejected';
  let R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D9r').result, 'FAIL');
  cf.disposal.approvals.rejectionReasons = 'The valuation basis is disputed; a fresh Board of Survey is directed.';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D9r').result, 'PASS');
});

t.test('OPR six-week notification and proceeds-to-account, on a completed sale', () => {
  const cf = disposalCase();
  cf.disposal.items[0].method = 'Public sale or tendering'; // a sale, so proceeds must be accounted
  cf.disposal.approvals.completionDate = '2026-06-15';
  cf.disposal.approvals.oprNotifiedDate = '2026-06-20';
  let R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D10').result, 'PASS', '5 days is within six weeks');
  t.eq(R.find(c => c.id === 'D11').result, 'WARN', 'proceeds not yet brought to account');
  cf.disposal.approvals.oprNotifiedDate = '2026-08-30';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D10').result, 'FAIL', 'over six weeks');
  cf.disposal.approvals.proceedsAccounted = true;
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D11').result, 'PASS');
});

t.test('legacy scaffold disposal sections upgrade in place, losing nothing', () => {
  // a disposal section exactly as the old scaffold saved it
  const legacy = {
    committee: [{ name: 'A', post: 'Chair' }, { name: 'B', post: 'M' }, { name: 'C', post: 'M' }],
    narrative: 'Surveyed and found beyond economic repair.',
    items: [{ desc: 'Old desk', identification: 'MOD/EQ/1', qty: 4, condition: 'Worn', location: 'HQ', acquisitionCost: '2,000.00', valuation: '400.00', valuationBasis: 'Board of Survey', valuationDate: '2026-05-12', method: 'Sale by public auction', methodReason: '' }]
  };
  const d = disposal.upgrade(legacy);
  t.eq(d.strategy.background, 'Surveyed and found beyond economic repair.', 'narrative -> strategy background');
  t.eq(d.items[0].propertyNo, 'MOD/EQ/1', 'identification -> propertyNo');
  t.eq(d.items[0].originalUnitPrice, '2,000.00', 'acquisitionCost -> originalUnitPrice');
  t.eq(d.items[0].method, 'Public auction', 'method mapped to reg 6(2) wording');
  t.eq(d.items[0].legacyMethod, 'Sale by public auction', 'original method preserved');
  t.ok(/Recorded valuation \(pre-Form C\): 400\.00/.test(d.items[0].valueComment), 'old valuation kept in the value comment');
});

t.test('Forms A–E render, compute, and cite the authority — no scaffold banner', () => {
  const cf = disposalCase();
  for (const form of ['disposal-form-a', 'disposal-form-b', 'disposal-form-c', 'disposal-form-d', 'disposal-form-e']) {
    const html = documents.build(cf, form);
    t.ok(html.length > 200, form + ' renders');
    t.ok(html.indexOf('AWAITING FORMAT AUTHORITY') < 0, form + ' has no scaffold banner');
    t.ok(html.indexOf('SCAFFOLD') < 0, form + ' is not a scaffold');
  }
  // Form C computes the total appraised value
  t.ok(documents.build(cf, 'disposal-form-c').indexOf('One Thousand, Eight Hundred Dollars ($1,800.00)') > 0);
  // Form B shows the disposition key
  t.ok(documents.build(cf, 'disposal-form-b').indexOf('Very Good (VG) 75-100%') > 0);
});

t.test('availableDocs offers the full Forms A–H set for a disposal case', () => {
  const docs = documents.availableDocs(disposalCase()).map(d => d.id);
  t.eq(docs, ['disposal-form-a', 'disposal-form-b', 'disposal-form-c', 'disposal-form-c-catalogue',
    'disposal-form-d', 'disposal-form-e', 'disposal-form-f', 'disposal-form-g', 'disposal-form-h']);
});

t.test('Forms F, G and H render to their official templates', () => {
  const cf = disposalCase();
  cf.disposal.summary = { executionDate: '2026-06-20', executedAsApproved: 'yes', deviationReasons: '', proceedingsSummary: 'Sold by transfer and recycling.', challenges: 'None.', totalProceeds: '1,800.00' };
  const f = documents.build(cf, 'disposal-form-f');
  t.ok(f.indexOf('Summary Report of Approved Disposal Action') > 0);
  t.ok(f.indexOf('Total Proceeds') > 0 && f.indexOf('$1,800.00') > 0);
  cf.disposal.transfer = { toOrg: 'A School', fromEntity: 'MOD', shipTo: 'The School', propertyLocation: 'HQ', items: [{ stockCode: 'SC1', itemNo: '1', description: 'Desk', unit: 'Ea', quantity: 3 }], receivedBy: 'Principal', comments: '' };
  const g = documents.build(cf, 'disposal-form-g');
  t.ok(g.indexOf('Transfer / Donation of Excess Personal Property') > 0);
  t.ok(g.indexOf('A School') > 0 && g.indexOf('Desk') > 0);
  cf.disposal.rejection = { lineMinisterConsultation: 'Consulted 01/06/2026.', reasons: 'Valuation disputed.', newDecision: 'Re-survey directed.', preparedByAO: 'PS', lineMinisterName: 'Minister' };
  const hDoc = documents.build(cf, 'disposal-form-h');
  t.ok(hDoc.indexOf('Notice of Rejection') > 0);
  t.ok(hDoc.indexOf('Re-survey directed') > 0 && hDoc.indexOf('Office of Procurement Regulation') > 0);
});

t.test('Form F flags a deviation from the approved strategy without reasons', () => {
  const cf = disposalCase();
  cf.disposal.summary = { executionDate: '2026-06-20', executedAsApproved: 'no', deviationReasons: '', proceedingsSummary: '', challenges: '', totalProceeds: '' };
  let R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D12').result, 'FAIL');
  cf.disposal.summary.deviationReasons = 'Auction postponed; items transferred instead, approved by the AO.';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'D12').result, 'PASS');
});
