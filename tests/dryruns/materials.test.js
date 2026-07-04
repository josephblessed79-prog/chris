/* materials.test.js — dry run replaying the signed materials-and-supplies
   minute (Sample Approval for Material Supplies): a three-supplier split
   award presented in the hybrid minute with circled folio numerals, the
   per-supplier award tables, the Breakdown of Price per Company, the vote
   status table with computed balances, and — because the computed
   uncommitted balance ($7,274.66) cannot cover the computed total
   ($78,389.64) — the transfer-of-funds line, included automatically.
   The signed sample's arithmetic in this minute is correct throughout and
   the replay reproduces every figure exactly, including the amounts in
   words. */
'use strict';

const t = require('../harness.js');
const cm = require('../../js/lib/casemodel.js');
const sp = require('../../js/lib/styleprofile.js');
const documents = require('../../js/lib/documents.js');
const verifycase = require('../../js/lib/verifycase.js');
const evaluation = require('../../js/lib/evaluation.js');
require('../../js/lib/docs/hybridminute.js');
require('../../js/lib/docs/evalreport.js');
require('../../js/lib/docs/hybridcert.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../../styles/' + f + '.profile.js'));
}

/* Each awarded item was quoted by exactly one of the three quoting
   suppliers (the minute is the authority; the evaluation folio itself is
   not in the sample pack), so the lowest-compliant recommendation resolves
   to the committee's award without overrides. */
function materialsCase() {
  const cf = cm.newCase('P1', 'ministry-circled', '2026-05-20T09:00:00.000Z');
  const st = cf.docState;
  st.minfile = 'MOD/PROC: 22/12/2:2026';
  st.minsheet = '1a';
  st.date = '2026-05-20';
  st.subject = 'Purchase of Material and Supplies for the Facilities Management Unit (FMU) of the Lifeguard Service';
  st.subjectProse = 'the purchase of material and supplies for the Facilities Management Unit (FMU) of the Lifeguard Service';
  st.minsigname = 'Name';
  st.minsigpost = 'Clerk IV (Ag)';
  st.need = 'In consideration of the request, it should be noted that presently the FMU of the Lifeguard Service is currently out of stock on all these supplies and therefore should replenish to adequately meet the needs of the Organization.';
  st.folios = [
    { desc: 'Purchase Requisition', date: '24/03/26' },
    { desc: 'Vote Position Re: Other Minor Equipment', date: '31/03/26' },
    { desc: 'List of Recommended Vendors', date: '' },
    { desc: 'RFQ for Materials and Supplies', date: '02/04/26' },
    { desc: 'Quotation Re: Pillai Tools Company Ltd', date: '02/04/26', tag: 'quote:Pillai Tools Company Ltd' },
    { desc: 'Quotation Re: A Moses and Sons Limited', date: '17/04/26', tag: 'quote:A. Moses & Sons Limited' },
    { desc: 'Quotation Re: J. Chai Trading Co Ltd', date: '21/04/26', tag: 'quote:J. Chai Trading Co. Ltd' },
    { desc: 'Evaluation for Materials and Supplies', date: '', tag: 'evaluation' }
  ];
  const ev = evaluation.newEvaluation();
  ev.suppliers = [
    { name: 'A. Moses & Sons Limited', address: '', status: 'quoted' },
    { name: 'Pillai Tools Company Ltd', address: '', status: 'quoted' },
    { name: 'J. Chai Trading Co. Ltd', address: '', status: 'quoted' },
    { name: 'Procare Limited', address: '', status: 'did-not-quote' },
    { name: 'Johnny Q Hardware', address: '', status: 'did-not-quote' },
    { name: 'Bhawansingh Ltd', address: '', status: 'did-not-quote' },
    { name: 'Oilfield and Marine Technologies Company Limited', address: '', status: 'did-not-quote' }
  ];
  /* rows: [desc, qty, unitName, qtyText|null, supplierIdx, unit, quotedQty, packSize] */
  const rows = [
    // Table 1 — A. Moses & Sons Limited (supplier 0)
    ['2 Stroke Oil (Pink) (Stihl)', 12, '', '1 Case (12)', 0, '75.00', null, null],
    ['Black Disinfectant', 40, 'Gallon', null, 0, '60.00', null, null],
    ['3 Canal Cutlass (24" straight)', 12, 'Each', null, 0, '85.00', null, null],
    ['Clear Brush Cutter Face Shields', 12, 'Each', null, 0, '25.00', null, null],
    ['Bleach', 24, 'Gallon', null, 0, '32.50', null, null],
    ['Wheel Barrow', 8, 'Each', null, 0, '495.00', null, null],
    // Table 2 — Pillai Tools Company Ltd (supplier 1)
    ['File (Triangular)', 72, '', '12 Box (72 Each)', 1, '27.72', null, null],
    ['File (Circular)', 72, '', '12 Box (72 Each)', 1, '25.20', null, null],
    ['Dark Tinted Safety Glasses', 12, 'Each', null, 1, '11.20', null, null],
    ['Pick Stick (Metal)', 16, 'Each', null, 1, '236.74', null, null],
    ['25ft Extension Cords (110v or 2.5 amps)', 4, 'Each', null, 1, '102.92', null, null],
    ['Soap Powder (Breeze)', 16, 'Gallon', null, 1, '62.40', null, 2],   // $62.40 per 2kg pack, 8 packs
    ['Green Microfiber cloth', 100, 'Each', null, 1, '168.00', null, 20], // $168.00 per 20-pack, 5 packs
    // Table 3 — J. Chai Trading Co. Ltd (supplier 2)
    ['2 Cycle Engine Oil', 2, 'Case', null, 2, '952.56', null, null],
    ['Chain Bar Oil for Chain Saw', 2, 'Case', null, 2, '960.00', null, null],
    ['Grinder discs 4"', 8, 'Each', null, 2, '9.00', null, null],
    ['Grinder blade 4"', 20, 'Each', null, 2, '12.95', null, null],
    ['Right Hand Swiper Brushing Cutlass', 12, 'Each', null, 2, '115.00', null, null],
    ['Leather Gloves (STIHL Brush Cutter)', 16, 'Pairs', null, 2, '59.95', null, null],
    ['100ft Garden Hose', 4, 'Each', null, 2, '295.00', null, null],
    ['Brush Cutter Back Strap with support (harness)', 16, 'Each', null, 2, '650.00', null, null],
    ['Brush Cutter Aprons (Grey Leather)', 16, 'Each', null, 2, '125.00', null, null],
    ['16"-18" Fan Rakes (Straight with Clamps)', 40, 'Each', null, 2, '95.00', null, null],
    ['Fan Rakes (Circular)', 40, 'Each', null, 2, '69.95', null, null],
    ['Fan Rakes (Broad for Sand)', 12, 'Each', null, 2, '39.95', null, null],
    ['Brush Cutter Spark Plugs (CMR6H)', 24, 'Each', null, 2, '47.35', null, null],
    ['Brush Cutter Spark Plugs (CJ6Y11)', 24, 'Each', null, 2, '35.00', null, null],
    ['Brush Cutter Filter (Orange STIHL 450)', 12, 'Each', null, 2, '84.35', null, null],
    ['Pull cord (String 4.0)', 4, 'Roll', null, 2, '398.50', null, null],
    ['Purple Blaster (Grease Remover)', 1, 'Case', null, 2, '380.00', null, null],
    ['Chlorine Powder', 20, 'Gallon/lb.', null, 2, '300.00', null, null],
    ['Spray Cans (Plants/Sanitizing)', 4, 'Each', null, 2, '265.00', null, null],
    ['Air Filter (Eye lets for Brush Cutters)', 12, 'Each', null, 2, '22.00', null, null],
    ['Industrial/Heavy Duty Mop and Handle', 30, 'Each', null, 2, '124.95', null, null],
    ['Industrial/Heavy Duty Broom and Handle', 30, 'Each', null, 2, '69.95', null, null],
    ['Industrial Mop Bucket', 8, 'Each', null, 2, '525.00', null, null],
    ['Fuel Canister 20 Litres', 6, 'Cans', null, 2, '225.00', null, null]
  ];
  rows.forEach(function (r, i) {
    ev.items.push({ desc: r[0], variant: '', qty: r[1], unitName: r[2], qtyText: r[3] || undefined });
    ev.cells.push({ item: i, supplier: r[4], unit: r[5], vatable: true, quotedQty: r[6], packSize: r[7], note: '', compliant: true });
  });
  cf.evaluation = ev;
  cf.oprRegistered = true;
  cf.voteBlock = {
    head: ['84', 'Ministry of Defence'],
    subHead: ['02', 'Goods and Services'],
    item: ['008', 'Lifeguard Service'],
    subItem: ['12', 'Material and Supplies']
  };
  cf.voteStatus = {
    originalProvision: '100,000.00',
    revisedAllocation: '100,000.00',
    releasesToDate: '99,713.00',
    expenditureToDate: '33,750.00',
    commitment: '58,975.34'
  };
  return cf;
}

t.test('materials: the case clears verification (shortfall is a caution, handled in the minute)', () => {
  const R = verifycase.runAllChecks(materialsCase());
  t.eq(R.filter(c => c.result === 'FAIL'), []);
  const h2 = R.find(c => c.id === 'H2');
  t.eq(h2.result, 'WARN');
  t.ok(/\$71,114\.98/.test(h2.detail), 'shortfall computed: 78,389.64 − 7,274.66');
});

t.test('materials: per-supplier award totals match the signed minute to the cent', () => {
  const bk = evaluation.breakdown(materialsCase().evaluation);
  const moses = bk.schedules.find(s => /Moses/.test(s.name));
  t.eq(moses.nvCents + moses.vCents, 936000, 'Moses Sub Total $9,360.00');
  t.eq(moses.vatCents, 117000, 'Moses Vat $1,170.00');
  t.eq(moses.totalCents, 1053000, 'Moses Total $10,530.00');
  const pillai = bk.schedules.find(s => /Pillai/.test(s.name));
  t.eq(pillai.nvCents + pillai.vCents, 948336, 'Pillai Sub Total $9,483.36');
  t.eq(pillai.vatCents, 118542, 'Pillai Vat $1,185.42');
  t.eq(pillai.totalCents, 1066878, 'Pillai Total $10,668.78');
  const chai = bk.schedules.find(s => /Chai/.test(s.name));
  t.eq(chai.nvCents + chai.vCents, 5083632, 'J. Chai Sub Total $50,836.32');
  t.eq(chai.vatCents, 635454, 'J. Chai Vat $6,354.54');
  t.eq(chai.totalCents, 5719086, 'J. Chai Total $57,190.86');
  t.eq(bk.grandTotalCents, 7838964, 'Grand total $78,389.64');
});

t.test('materials: pack-priced lines compute as the sample shows', () => {
  const ev = materialsCase().evaluation;
  const soap = evaluation.computeCell(ev, 11, 1);
  t.eq(soap.packs, 8);
  t.eq(soap.extendedCents, 49920, 'Soap Powder 8 × $62.40 = $499.20');
  const cloth = evaluation.computeCell(ev, 12, 1);
  t.eq(cloth.packs, 5);
  t.eq(cloth.extendedCents, 84000, 'Microfiber 5 × $168.00 = $840.00');
  const files = evaluation.computeCell(ev, 6, 1);
  t.eq(files.extendedCents, 199584, 'File (Triangular) 72 × $27.72 = $1,995.84');
});

t.test('materials: the minute reproduces the sample wording, tables and computed figures', () => {
  const cf = materialsCase();
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('draftstamp') < 0, 'no DRAFT stamp');
  t.ok(html.indexOf('File No:\u00A0\u00A0 MOD/PROC: 22/12/2:2026\u00A0\u00A0 Temp: Vol. I') > 0, 'Temp: Vol. I header from the circled profile');
  t.ok(html.indexOf('>①</td>') > 0 && html.indexOf('>⑧</td>') > 0, 'circled folio numerals ① to ⑧');
  t.ok(html.indexOf('u.f.s Administrative Officer IV (Ag), (Procurement)') > 0);
  t.ok(html.indexOf('u.f.s Administrative Officer V (Ag), (Procurement)') > 0);
  t.ok(html.indexOf('Folios  1   to   8    refers,') > 0);
  t.ok(html.indexOf('Approval is hereby sought to incur expenditure in favour of the following suppliers for the purchase of material and supplies for the Facilities Management Unit (FMU) of the Lifeguard Service as follows: -') > 0);
  t.ok(html.indexOf('Ten Thousand, Five Hundred and Thirty Dollars ($10,530.00) in favour of <b>A. Moses &amp; Sons Limited</b>.') > 0);
  t.ok(html.indexOf('Ten Thousand, Six Hundred and Sixty-Eight Dollars and Seventy-Eight Cents ($10,668.78) in favour of <b>Pillai Tools Company Ltd</b>.') > 0);
  t.ok(html.indexOf('Fifty-Seven Thousand, One Hundred and Ninety Dollars and Eighty-Six Cents ($57,190.86) in favour of <b>J. Chai Trading Co. Ltd</b>.') > 0);
  t.ok(html.indexOf('Quotations were requested from seven (7) companies') > 0);
  t.ok(html.indexOf('only three (3) companies replied') > 0);
  t.ok(html.indexOf('A. Moses &amp; Sons Limited; Quoted') > 0);
  t.ok(html.indexOf('Procare Limited;') > 0);
  t.ok(html.indexOf('shown in Folio 8.') > 0, 'evaluation folio reference computed from its tag');
  t.ok(html.indexOf('Table 1.') > 0 && html.indexOf('Table 2.') > 0 && html.indexOf('Table 3.') > 0 && html.indexOf('Table 4.') > 0);
  t.ok(html.indexOf('Breakdown of Price per Company') > 0);
  t.ok(html.indexOf('$78,389.64') > 0, 'computed grand total');
  t.ok(html.indexOf('Funding to meet this expenditure in the sum of Seventy-Eight Thousand, Three Hundred and Eighty-Nine Dollars and Sixty-Four Cents ($78,389.64) to be made available under the following vote:') > 0);
  t.ok(html.indexOf('Lifeguard Service') > 0 && html.indexOf('>008<') > 0, 'vote block Item 008');
  for (const cell of ['$100,000.00', '$99,713.00', '$33,750.00', '$58,975.34', '$6,987.66', '$66,250.00', '$7,274.66']) {
    t.ok(html.indexOf(cell) > 0, 'vote status cell ' + cell + ' (balances computed)');
  }
  t.ok(html.indexOf('The Director of Finance to address the necessary transfer for additional funds.') > 0, 'transfer line included automatically on the computed shortfall');
  t.ok(html.indexOf('are registered with the Office of Procurement Regulation') > 0);
  t.ok(html.indexOf('Procurement Unit') > 0, 'signature unit line from the circled profile');
  t.ok(html.indexOf('May\u00A0\u00A0\u00A0\u00A0\u00A0, 2026') > 0);
});

t.test('materials: paragraph numbering runs 2..10 as in the sample', () => {
  const html = documents.build(materialsCase(), 'minute');
  for (let n = 2; n <= 10; n++) t.ok(html.indexOf('<div class="no">' + n + '.</div>') > 0, 'paragraph ' + n);
  t.ok(html.indexOf('<div class="no">11.</div>') < 0);
});

t.test('materials: evaluation report and worksheet render for the P3 view of the case', () => {
  const cf = materialsCase();
  cf.pathway = 'P3';
  const report = documents.build(cf, 'eval-report');
  t.ok(report.indexOf('EVALUATION REPORT') > 0);
  t.ok(report.indexOf('seven (7) suppliers') > 0);
  t.ok(report.indexOf('Lowest compliant quotation') > 0);
  t.ok(report.indexOf('Seventy-Eight Thousand, Three Hundred and Eighty-Nine Dollars and Sixty-Four Cents ($78,389.64)') > 0);
  const ws = documents.build(cf, 'eval-worksheet');
  t.ok(ws.indexOf('EVALUATION WORKSHEET') > 0);
  t.ok(ws.indexOf('Suppliers that Did Not Quote') > 0);
});

t.test('materials: P3 -> P1 carry-over keeps every figure without retyping', () => {
  const cf = materialsCase();
  cf.pathway = 'P3';
  cm.transitionPathway(cf, 'P1', 'Evaluation adopted; minute prepared', '2026-05-21T10:00:00.000Z');
  t.eq(cf.pathway, 'P1');
  const html = documents.build(cf, 'minute');
  t.ok(html.indexOf('$78,389.64') > 0);
  const evd = require('../../js/lib/evaluation.js');
  const items = evd.toDocItems(cf.evaluation);
  const compute = require('../../js/lib/compute.js');
  t.eq(compute.grandTotal(items), 7838964, 'projected docState items carry the exact total');
});
