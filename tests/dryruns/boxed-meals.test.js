/* boxed-meals.test.js — dry run replaying the signed boxed-meals verbal
   quotation minute (Sample Approval for Food-GA Training) through pathway
   P1 with the ministry-dotted profile.

   Designed deviation from the signed sample, recorded in ASSUMPTIONS.md:
   the sample writes "in the sum Twelve Hundred Dollars" — a hand-written
   idiom (and a dropped "of"). This system generates the words from the
   same number as the figure, so it prints "in the sum of One Thousand,
   Two Hundred Dollars ($1,200.00)". The figure is identical.

   The sample names only the selected caterer; the two other companies the
   narrative says were telephoned are given illustrative names here because
   the engine requires every contact to be recorded. */
'use strict';

const t = require('../harness.js');
const cm = require('../../js/lib/casemodel.js');
const sp = require('../../js/lib/styleprofile.js');
const documents = require('../../js/lib/documents.js');
const verifycase = require('../../js/lib/verifycase.js');
const votestatus = require('../../js/lib/votestatus.js');
require('../../js/lib/docs/hybridminute.js');
require('../../js/lib/docs/verbalform.js');
require('../../js/lib/docs/hybridcert.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../../styles/' + f + '.profile.js'));
}

function boxedMealsCase() {
  const cf = cm.newCase('P1', 'ministry-dotted', '2026-05-20T09:00:00.000Z');
  const st = cf.docState;
  st.minfile = 'MOD/PROC: 22/18/7:2026';
  st.minsheet = '1a';
  st.date = '2026-05-20';
  st.subject = 'The Provision of Boxed Meals';
  st.minsigname = 'Name';
  st.minsigpost = 'Clerk IV(Ag)';
  st.need = 'The Human Resource Department, Ministry of Defence will be hosting a Human Resource Training Workshop. As such, the provision of boxed meals for the facilitators is requested for the duration of the workshop, Folio 2 refers.';
  st.folios = [
    { desc: 'Vote Position re: Office Stationery and Supplies', date: '04/05/26' },
    { desc: 'Copy of Memorandum re: Request for expenditure for Lunches', date: '06/05/26' },
    { desc: 'Recommended list of vendors', date: '' },
    { desc: 'Verbal Quotation Form re: Boxed Meals', date: '07/05/26', tag: 'verbal-form' },
    { desc: 'Request for Quotation- The Provision of Boxed Meals', date: '07/05/26' },
    { desc: 'Quotation re: Ate6Ate Savor City Caterers Ltd', date: '13/05/26', tag: 'quote:Ate6Ate Savor City Caterers Ltd' }
  ];
  cf.verbal = {
    purpose: 'the provision of Boxed Meals for the Human Resource Training Workshop',
    contacts: [
      { name: 'Ate6Ate Savor City Caterers Ltd', phone: '868-000-0001', date: '2026-05-07', spokeTo: 'Manager', officer: 'Clerk IV', outcome: 'quoted', amount: '1,200.00' },
      { name: 'Caterer B (illustrative — not named in the sample)', phone: '868-000-0002', date: '2026-05-07', spokeTo: 'Front desk', officer: 'Clerk IV', outcome: 'quoted', amount: '1,450.00' },
      { name: 'Caterer C (illustrative — not named in the sample)', phone: '868-000-0003', date: '2026-05-07', spokeTo: 'Owner', officer: 'Clerk IV', outcome: 'quoted', amount: '1,500.00' }
    ],
    selected: 0,
    selectionBasis: 'the best option based on price',
    notLowestJustification: '',
    tableTitle: 'Boxed Meals',
    schedule: [
      { date: '2026-05-19', desc: '(4) Chicken, (1) Fish Meals with Drink', qty: 5, rate: '60.00', kind: 'line' },
      { date: '2026-05-19', desc: 'Delivery', qty: 1, rate: '100.00', kind: 'delivery' },
      { date: '2026-05-20', desc: '(4) Chicken, (1) Fish Meals with Drink', qty: 5, rate: '60.00', kind: 'line' },
      { date: '2026-05-20', desc: 'Delivery', qty: 1, rate: '100.00', kind: 'delivery' },
      { date: '2026-05-21', desc: '(4) Chicken, (1) Fish Meals with Drink', qty: 5, rate: '60.00', kind: 'line' },
      { date: '2026-05-21', desc: 'Delivery', qty: 1, rate: '100.00', kind: 'delivery' }
    ]
  };
  cf.oprRegistered = true;
  cf.voteBlock = {
    head: ['84', 'Ministry of Defence'],
    subHead: ['02', 'Goods and Services'],
    item: ['001', 'General Administration'],
    subItem: ['10', 'Office and Stationery Supplies']
  };
  cf.voteStatus = {
    originalProvision: '380,000.00',
    revisedAllocation: '380,000.00',
    releasesToDate: '32,602.00',
    expenditureToDate: '3,560.57',
    commitment: '21,654.44'
  };
  return cf;
}

t.test('boxed meals: the case clears verification completely', () => {
  const cf = boxedMealsCase();
  const R = verifycase.runAllChecks(cf);
  t.eq(R.filter(c => c.result === 'FAIL'), []);
});

t.test('boxed meals: vote balances are computed and equal the signed sample', () => {
  const c = votestatus.compute(boxedMealsCase().voteStatus);
  t.eq(c.ok, true);
  t.eq(c.cents.balanceOfReleases, 738699, 'Balance of Releases $7,386.99');
  t.eq(c.cents.balanceOfProvision, 37643943, 'Balance of Provision $376,439.43');
  t.eq(c.cents.uncommittedBalance, 35478499, 'Uncommitted Balance $354,784.99');
});

t.test('boxed meals: the minute reproduces the sample structure and figures', () => {
  const cf = boxedMealsCase();
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('draftstamp') < 0, 'no DRAFT stamp — the case is clear');
  t.ok(html.indexOf('File No:\u00A0\u00A0 MOD/PROC: 22/18/7:2026\u00A0\u00A0 Vol. I') > 0, 'header file number');
  t.ok(html.indexOf('Sheet No:\u00A0 1a') > 0, 'header sheet number');
  t.ok(html.indexOf('MINUTE SHEET') > 0);
  t.ok(html.indexOf('>1.</td>') > 0 && html.indexOf('>6.</td>') > 0, 'dotted folio register 1..6');
  t.ok(html.indexOf('Verbal Quotation Form re: Boxed Meals') > 0);
  t.ok(html.indexOf('13/05/26') > 0, 'folio dates');
  t.ok(html.indexOf('ufs Administrative Officer V (Ag)') > 0, 'routing line');
  t.ok(html.indexOf('Folios  1   to   6    refers,') > 0, 'computed folio range');
  t.ok(html.indexOf('Approval is hereby sought to incur expenditure in the sum of One Thousand, Two Hundred Dollars ($1,200.00) in favour of <b>Ate6Ate Savor City Caterers Ltd</b> for the provision of Boxed Meals for the Human Resource Training Workshop.') > 0, 'paragraph 1 — words and figure computed from the same number');
  t.ok(html.indexOf('A verbal quotation form was used as a means of micro procurement. Three companies were contacted via telephone and verbal quotations were given. After examination of the verbal quotations, it was recommended that Ate6Ate Savor City Caterers Ltd was the best option based on price. Folios 4 and 6 refers.') > 0, 'verbal paragraph with computed folio references');
  t.ok(html.indexOf('Table 1: Boxed Meals') > 0);
  t.ok(html.indexOf('19.05.2026') > 0, 'schedule dates in dotted style');
  t.ok(html.indexOf('Five (5)') > 0, 'quantity in words and figures');
  t.ok(html.indexOf('$60.00') > 0 && html.indexOf('$300.00') > 0 && html.indexOf('$100.00') > 0);
  t.ok(html.indexOf('<b>$1,200.00</b>') > 0, 'computed schedule total');
  t.ok(html.indexOf('In accordance with regulation 10 and 11 of the Public Procurement and Disposal of Public Property (Procurement Methods and Procedures) Regulations') > 0);
  t.ok(html.indexOf('Ate6Ate Savor City Caterers Ltd are registered with the Office of Procurement Regulation (OPR’s) Procurement Depository') > 0, 'OPR line, collective "are" as the samples use');
  t.ok(html.indexOf('Funding to meet this expenditure in the sum of One Thousand, Two Hundred Dollars ($1,200.00) to be made available under the following vote:') > 0);
  t.ok(html.indexOf('Ministry of Defence') > 0 && html.indexOf('>84<') > 0, 'vote block Head 84');
  t.ok(html.indexOf('Office and Stationery Supplies') > 0, 'vote block Sub-Item');
  t.ok(html.indexOf('The status of the vote is as follows:') > 0);
  for (const cell of ['$380,000.00', '$32,602.00', '$3,560.57', '$21,654.44', '$7,386.99', '$376,439.43', '$354,784.99']) {
    t.ok(html.indexOf(cell) > 0, 'vote status cell ' + cell + ' (balances computed, not typed)');
  }
  t.ok(html.indexOf('Director of Finance') < 0, 'no transfer line — uncommitted balance covers the total');
  t.ok(html.indexOf('Submitted for your consideration and approval to incur expenditure in the sum of One Thousand, Two Hundred Dollars ($1,200.00), in favour of <b>Ate6Ate Savor City Caterers Ltd</b>.') > 0);
  t.ok(html.indexOf('Submitted for your consideration.') > 0);
  t.ok(html.indexOf('May\u00A0\u00A0\u00A0\u00A0\u00A0, 2026') > 0, 'signature month/year with the day left for hand insertion');
});

t.test('boxed meals: paragraph numbering runs 2..8 as in the sample', () => {
  const html = documents.build(boxedMealsCase(), 'minute');
  for (let n = 2; n <= 8; n++) {
    t.ok(html.indexOf('<div class="no">' + n + '.</div>') > 0, 'paragraph ' + n);
  }
  t.ok(html.indexOf('<div class="no">9.</div>') < 0, 'no paragraph 9');
});

t.test('boxed meals: folio renumbering follows the start number everywhere', () => {
  const cf = boxedMealsCase();
  cf.folioStart = 12;
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('Folios  12   to   17    refers,') > 0, 'range renumbered');
  t.ok(html.indexOf('Folios 15 and 17 refers.') > 0, 'verbal paragraph references renumbered');
  t.ok(html.indexOf('>12.</td>') > 0 && html.indexOf('>17.</td>') > 0, 'register renumbered');
});

t.test('boxed meals: verbal form and telephone register render with the case data', () => {
  const cf = boxedMealsCase();
  const form = documents.build(cf, 'verbal-form');
  t.ok(form.indexOf('VERBAL QUOTATION FORM') > 0);
  t.ok(form.indexOf('Ate6Ate Savor City Caterers Ltd') > 0);
  t.ok(form.indexOf('[SELECTED]') > 0);
  t.ok(form.indexOf('Quoted $1,200.00') > 0);
  t.ok(form.indexOf('One Thousand, Two Hundred Dollars ($1,200.00)') > 0);
  const reg = documents.build(cf, 'phone-register');
  t.ok(reg.indexOf('TELEPHONE-CONTACT REGISTER') > 0);
  t.ok(reg.indexOf('Quoted $1,450.00') > 0);
});

t.test('boxed meals: a non-lowest verbal selection demands justification', () => {
  const cf = boxedMealsCase();
  cf.verbal.selected = 1; // the $1,450.00 caterer over the $1,200.00 one
  let R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'V5' && c.result === 'FAIL'));
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('DRAFT — NOT CLEARED') > 0, 'documents are stamped while the check fails');
  cf.verbal.notLowestJustification = 'The lowest caterer cannot deliver to the training venue before 07:00.';
  R = verifycase.runAllChecks(cf);
  t.ok(R.some(c => c.id === 'V5' && c.result === 'PASS'));
});

t.test('boxed meals: hybrid certificate carries all checks and the schedule figures', () => {
  const cert = documents.build(boxedMealsCase(), 'certificate');
  t.ok(cert.indexOf('VERIFICATION CERTIFICATE') > 0);
  t.ok(cert.indexOf('Part A') > 0 && cert.indexOf('Part B') > 0);
  t.ok(cert.indexOf('V5') > 0, 'verbal checks included');
  t.ok(cert.indexOf('H1') > 0, 'vote checks included');
  t.ok(cert.indexOf('(4) Chicken, (1) Fish Meals with Drink (19.05.2026)') > 0, 'figure-by-figure rows');
  t.ok(cert.indexOf('One Thousand, Two Hundred Dollars') > 0);
});
