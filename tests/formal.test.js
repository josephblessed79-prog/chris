/* formal.test.js — the Formal Tender / RFP / ITB Evaluation module: the
   engine (technical totals, gate, verified prices, computed ranking), the
   F-series governance checks (committee + Appendix I declarations,
   criteria, gate, preliminary examination, technical/commercial
   evaluation, ranking, recommendation VAT inclusive, PDAC/AO review), and
   the OPR-template report + COI declaration documents. Includes a clean
   worked example ranked to the cent. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const formal = require('../js/lib/formal.js');
const money = require('../js/lib/money.js');
const documents = require('../js/lib/documents.js');
const verifycase = require('../js/lib/verifycase.js');
require('../js/lib/docs/formalreport.js');
require('../js/lib/docs/coiforms.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

/* Worked example: 3 proponents, 3 criteria (40/30/30 = 100 max), gate 70,
   weights 70/30. A: 36+27+27 = 90; B: 32+24+20 = 76; C: 28+20+15 = 63.
   Prices VAT incl: A $1,000,000.00; B $850,000.00. C fails the gate.
   finPct: min = B $850,000. A = 0.85, B = 1.00.
   combined: A = .7×.90 + .3×.85 = .885 ; B = .7×.76 + .3×1.0 = .832.
   A ranks first; recommend A at $1,000,000.00 VAT inclusive. */
function workedCase() {
  const cf = cm.newCase('formal-evaluation', 'agency-neutral', NOW);
  cf.docState.minfile = 'MOD/RFP: 7/2026';
  cf.docState.date = '2026-07-01';
  cf.docState.subject = 'Provision of Facilities Management Services';
  cf.docState.minsigname = 'Chair Person';
  cf.docState.folios = [{ desc: 'Evaluation report', date: '', tag: '' }];
  const f = formal.newFormal();
  f.rfpTitle = 'Provision of Facilities Management Services';
  f.rfpNumber = 'RFP-7-2026';
  f.reportDate = '2026-07-01';
  f.introduction = 'The Ministry requires facilities management services for its head office.';
  f.background = 'Approval to proceed was granted; the RFP was advertised and three proposals were received by the deadline.';
  f.committee = [
    { name: 'Ann Chair', jobTitle: 'Director', role: 'Chairperson', coiSigned: true, coiConflict: 'none' },
    { name: 'Bob Tech', jobTitle: 'Engineer', role: 'Technical', coiSigned: true, coiConflict: 'none' },
    { name: 'Cy Legal', jobTitle: 'Attorney', role: 'Legal', coiSigned: true, coiConflict: 'none' }
  ];
  f.criteria = [
    { name: 'Experience', description: 'Relevant experience', maxPoints: 40 },
    { name: 'Methodology', description: 'Approach', maxPoints: 30 },
    { name: 'Team', description: 'Key staff', maxPoints: 30 }
  ];
  f.minTechnicalScore = 70;
  f.technicalWeight = 70;
  f.financialWeight = 30;
  f.rankingFormula = 'St×0.70 + Sf×0.30, Sf = lowest price / price';
  f.proponents = [
    { name: 'Alpha FM Ltd', compliant: 'yes', complianceNote: '' },
    { name: 'Beta Services Ltd', compliant: 'yes', complianceNote: '' },
    { name: 'Gamma Co Ltd', compliant: 'yes', complianceNote: '' }
  ];
  f.techScores = {
    '0:0': 36, '0:1': 27, '0:2': 27,
    '1:0': 32, '1:1': 24, '1:2': 20,
    '2:0': 28, '2:1': 20, '2:2': 15
  };
  f.prices = [
    { quotedPrice: '1,000,000.00', verifiedPrice: '1,000,000.00', arithmeticNote: 'No arithmetic errors.' },
    { quotedPrice: '850,000.00', verifiedPrice: '850,000.00', arithmeticNote: 'No arithmetic errors.' },
    { quotedPrice: '700,000.00', verifiedPrice: '700,000.00', arithmeticNote: 'Not carried (below gate).' }
  ];
  f.recommendedProponent = 0;
  f.recommendationNote = '';
  f.pdacReview = 'Reviewed by PDAC 03/07/2026.';
  cf.formal = f;
  return cf;
}

t.test('technical totals and the gate are computed', () => {
  const f = workedCase().formal;
  t.eq(formal.maxTechnicalPoints(f), 100);
  t.eq(formal.technicalTotal(f, 0).total, 90);
  t.eq(formal.technicalTotal(f, 1).total, 76);
  t.eq(formal.technicalTotal(f, 2).total, 63);
  t.eq(formal.passesGate(f, 0), true);
  t.eq(formal.passesGate(f, 1), true);
  t.eq(formal.passesGate(f, 2), false, 'Gamma 63 < 70 fails the gate');
});

t.test('ranking is computed deterministically to the cent', () => {
  const f = workedCase().formal;
  t.eq(formal.lowestVerifiedCents(f), 85000000, 'lowest gate-passer is Beta $850,000.00');
  const r = formal.ranking(f);
  t.eq(r.ok, true);
  t.eq(r.rows.length, 2, 'only the two gate-passers are ranked');
  t.eq(r.rows[0].name, 'Alpha FM Ltd');
  t.eq(r.rows[0].combinedPct, '88.50%');
  t.eq(r.rows[1].name, 'Beta Services Ltd');
  t.eq(r.rows[1].combinedPct, '83.20%');
  t.eq(formal.topRanked(f).proponent, 0);
});

t.test('a worked case clears every F-series check', () => {
  const R = verifycase.runAllChecks(workedCase());
  const fails = R.filter(c => c.result === 'FAIL');
  t.eq(fails, [], 'no failures: ' + fails.map(x => x.id + ' ' + x.detail).join(' | '));
  t.eq(R.find(c => c.id === 'F0').result, 'PASS');
  t.eq(R.find(c => c.id === 'F1b').result, 'PASS', 'all declarations signed');
  t.eq(R.find(c => c.id === 'F8').result, 'PASS', 'ranking computed');
  t.eq(R.find(c => c.id === 'F9').result, 'PASS', 'recommendation matches the ranking');
});

t.test('an unsigned COI declaration is a hard failure', () => {
  const cf = workedCase();
  cf.formal.committee[1].coiSigned = false;
  const R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F1b').result, 'FAIL');
  t.ok(/not signed/.test(R.find(c => c.id === 'F1b').detail));
});

t.test('a declared conflict is surfaced', () => {
  const cf = workedCase();
  cf.formal.committee[2].coiConflict = 'Former employee of Gamma Co Ltd.';
  const R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F1c').result, 'WARN');
});

t.test('the gate excludes a proponent from the price evaluation and ranking', () => {
  const f = workedCase().formal;
  // Gamma is below the gate, so it never reaches commercial evaluation or ranking
  const R = verifycase.runAllChecks(workedCase());
  t.ok(!R.some(c => c.id === 'F7.3'), 'no verified-price demand on the sub-gate proponent');
  t.ok(formal.ranking(f).rows.every(row => row.proponent !== 2));
});

t.test('a non-compliant proponent needs a recorded reason', () => {
  const cf = workedCase();
  cf.formal.proponents[2].compliant = 'no';
  cf.formal.proponents[2].complianceNote = '';
  let R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F5.3r').result, 'FAIL');
  cf.formal.proponents[2].complianceNote = 'Did not submit the mandatory tax clearance.';
  R = verifycase.runAllChecks(cf);
  t.ok(!R.some(c => c.id === 'F5.3r'));
});

t.test('the weights must total 100', () => {
  const cf = workedCase();
  cf.formal.financialWeight = 40; // 70 + 40 = 110
  const R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F8').result, 'FAIL');
  t.ok(/total 100/.test(R.find(c => c.id === 'F8').detail));
});

t.test('a recommendation that departs from the ranking must be justified', () => {
  const cf = workedCase();
  cf.formal.recommendedProponent = 1; // Beta, not the top-ranked Alpha
  cf.formal.recommendationNote = '';
  let R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F9').result, 'FAIL');
  cf.formal.recommendationNote = 'Alpha withdrew after evaluation; Beta is next-ranked.';
  R = verifycase.runAllChecks(cf);
  t.eq(R.find(c => c.id === 'F9').result, 'PASS');
});

t.test('a malformed verified price is refused', () => {
  const cf = workedCase();
  cf.formal.prices[0].verifiedPrice = '1,00,000.00';
  const R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'F7.1' && c.result === 'FAIL'));
});

t.test('the Evaluation Report is to the OPR template with the recommendation VAT inclusive', () => {
  const html = documents.build(workedCase(), 'formal-report');
  t.ok(html.indexOf('EVALUATION REPORT') > 0);
  t.ok(html.indexOf('Recommendation for Award of Contract') > 0);
  t.ok(html.indexOf('Preliminary Examination') > 0);
  t.ok(html.indexOf('Commercial Evaluation') > 0);
  t.ok(html.indexOf('Ranking of the Proposals') > 0);
  // the recommendation names Alpha and the amount in words, VAT INCLUSIVE
  t.ok(html.indexOf('ONE MILLION DOLLARS VAT INCLUSIVE ($1,000,000.00)') > 0, 'amount in words, VAT inclusive');
  t.ok(html.indexOf('Alpha FM Ltd') > 0);
  // the ranking table carries the computed percentages
  t.ok(html.indexOf('88.50%') > 0 && html.indexOf('83.20%') > 0);
});

t.test('the COI / confidentiality declaration form is produced per member', () => {
  const html = documents.build(workedCase(), 'coi-forms');
  t.ok(html.indexOf('Confidentiality and Conflict of Interest Declaration Form') > 0);
  t.ok(html.indexOf('CONFIDENTIALITY DECLARATION') > 0);
  t.ok(html.indexOf('CONFLICT OF INTEREST DECLARATION') > 0);
  t.ok(html.indexOf('Ann Chair') > 0 && html.indexOf('Bob Tech') > 0 && html.indexOf('Cy Legal') > 0);
  // three members -> two page breaks between them
  t.eq(html.split('page-break-after').length - 1, 2);
});

t.test('availableDocs offers only the formal documents for a formal case', () => {
  const docs = documents.availableDocs(workedCase()).map(d => d.id);
  t.eq(docs, ['formal-report', 'coi-forms']);
});

t.test('the register total for a formal case is the recommended award', () => {
  const storage = require('../js/lib/storage.js');
  const e = storage.registerEntry(workedCase());
  t.eq(e.module, 'formal-evaluation');
  t.eq(e.totalCents, 100000000, 'recommended award $1,000,000.00');
});
