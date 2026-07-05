/* disposal-casestudy.test.js — replays the OPR Sample Disposal Case
   Study #1 (Sept 2021 v1.0) through the disposal module and asserts the
   Form C computed columns and the total appraised value to the cent:
   TT$70,650.00. Every figure typed here is taken straight from the case
   study's Forms A–C; every derived figure is computed by the engine. */
'use strict';

const t = require('../harness.js');
const cm = require('../../js/lib/casemodel.js');
const sp = require('../../js/lib/styleprofile.js');
const disposal = require('../../js/lib/disposal.js');
const documents = require('../../js/lib/documents.js');
const verifycase = require('../../js/lib/verifycase.js');
require('../../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

/* The case study's items, as typed from Forms A, B and C. Desks are two
   rows in Form C (10 L-shaped, 10 rectangular), exactly as the study
   splits them; the combined Form A line of 20 is these two together. */
function caseStudy() {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  cf.docState.minfile = 'DISP: 0001';
  cf.docState.date = '2020-10-20';
  cf.docState.subject = 'Used Office Furniture and Equipment';
  cf.docState.minsigname = 'John Doe';
  cf.docState.folios = [{ desc: 'Request for Asset Disposal (Form A)', date: '' }];
  const d = disposal.newDisposal();
  d.entity = 'Company X';
  d.department = 'Facilities';
  d.assetLocation = 'Building B, Basement & ICT Storage';
  d.requestDate = '2020-10-20';
  d.requestRef = '0001';
  d.npoName = 'John Doe';
  d.npoDesignation = 'Procurement Officer';
  d.aoName = 'Accounting Officer';
  d.committee = [
    { name: 'Member One', post: 'Senior/Procurement Officer' },
    { name: 'Member Two', post: 'Stores/Asset Officer' },
    { name: 'Member Three', post: 'Subject Matter Expert' }
  ];
  d.items = [
    // 1. Office chairs — no NBV, estimated sale price $50, qty 17 -> $850
    mk('Black fabric covered Office Chairs, Adjustable with wheels', 17, '', 'S', 'yes', '50.00', 'No NBV but in usable condition, value/price estimated.'),
    // 2. Workstations/Cubicles — Total NBV $24,291.67, qty 5, sale $3800 -> $19,000
    mk('Office Work Station / Cubicles', 5, '24,291.67', 'VG', 'yes', '3,800.00', 'Considerations as per point 2 above and prorated accordingly.'),
    // 3. Filing cabinets — no NBV, $100, qty 13 -> $1,300
    mk('Filing Cabinets Lateral', 13, '', 'S', 'yes', '100.00', 'No NBV but in usable condition, value/price estimated.'),
    // 4a. Managers' Desks L-Shaped — Total NBV $27,300.00, qty 10, sale $2000 -> $20,000
    mk("Managers' Desks — L-Shaped", 10, '27,300.00', 'VG', 'yes', '2,000.00', 'Considerations as per point 2 above and prorated accordingly.'),
    // 4b. Managers' Desks Rectangular — Total NBV $35,100.00, qty 10, sale $2800 -> $28,000
    mk("Managers' Desks — Rectangular", 10, '35,100.00', 'VG', 'yes', '2,800.00', 'Considerations as per point 2 above and prorated accordingly.'),
    // 5. Bookshelves — no NBV, $100, qty 15 -> $1,500
    mk('Bookshelves', 15, '', 'S', 'yes', '100.00', 'No NBV but in usable condition, value/price estimated.'),
    // 6. Photocopier — Total NBV $3,410.00, not saleable (recycle)
    recycle('Photocopier (Multifunction)', 1, '3,410.00', 'Recycle at a cost; not saleable.', 'Recycling', 'Certified e-waste recycler, lowest of three quotations.'),
    // 7. Air conditioning units — no NBV, not saleable (recycle)
    recycle('Window Air Conditioning Units', 6, '', 'Recycle at no cost; not saleable.', 'Recycling', 'Refrigerant Recovery Recycle Association, Montreal Protocol.'),
    // 8. Laptops — no NBV, not saleable (donate)
    recycle('Laptops', 5, '', 'Donate to laptop refurbishment programme; not saleable.', 'Donation', 'Donated to the TTCS laptop refurbishment programme; non-functional and outdated.')
  ];
  d.appraisalFindings = 'The identified properties were all located in a central storage area at Building B, Basement, easily visible.';
  d.appraisalProcedures = 'The condition was assessed through physical inspection; appraisal value was determined from the original purchase price, depreciated value, current market value and present condition and functionality.';
  cf.disposal = d;
  return cf;
}

function mk(desc, qty, totalNBV, disposition, saleable, salePrice, comment) {
  const it = disposal.blankItem();
  it.desc = desc; it.qty = qty; it.totalNBV = totalNBV; it.disposition = disposition;
  it.condition = 'Inspected — see appraisal';
  it.saleable = saleable; it.salePrice = salePrice; it.valueComment = comment;
  it.method = 'Sale to employees (s. 57, Reg 7)';
  return it;
}
function recycle(desc, qty, totalNBV, comment, method, reason) {
  const it = disposal.blankItem();
  it.desc = desc; it.qty = qty; it.totalNBV = totalNBV; it.disposition = 'S';
  it.condition = 'Non-functional / obsolete';
  it.saleable = 'no'; it.valueComment = comment; it.method = method; it.methodReason = reason;
  return it;
}

t.test('case study: Form C unit columns compute exactly as the OPR worked example', () => {
  const d = caseStudy().disposal;
  // Item 2 — Workstations: Total NBV $24,291.67 / 5
  const a2 = disposal.appraisal(d.items[1]);
  t.eq(a2.unitNBVCents, 485833, 'Unit NBV $4,858.33');
  t.eq(a2.pct20Cents, 97167, '20% NBV $971.67');
  t.eq(a2.less20Cents, 388667, 'Appraised less 20% $3,886.67');
  t.eq(a2.returnsCents, 1900000, 'Expected returns $19,000.00');
  // Item 4a — Desks L-shaped: $27,300.00 / 10
  const a4a = disposal.appraisal(d.items[3]);
  t.eq(a4a.unitNBVCents, 273000, 'Unit NBV $2,730.00');
  t.eq(a4a.pct20Cents, 54600, '20% NBV $546.00');
  t.eq(a4a.less20Cents, 218400, 'Appraised less 20% $2,184.00');
  t.eq(a4a.returnsCents, 2000000, 'Expected returns $20,000.00');
  // Item 4b — Desks rectangular: $35,100.00 / 10
  const a4b = disposal.appraisal(d.items[4]);
  t.eq(a4b.unitNBVCents, 351000, 'Unit NBV $3,510.00');
  t.eq(a4b.pct20Cents, 70200, '20% NBV $702.00');
  t.eq(a4b.less20Cents, 280800, 'Appraised less 20% $2,808.00');
  t.eq(a4b.returnsCents, 2800000, 'Expected returns $28,000.00');
  // Estimated (no-NBV) items carry no NBV columns but do have returns
  const a1 = disposal.appraisal(d.items[0]);
  t.eq(a1.hasNBV, false);
  t.eq(a1.returnsCents, 85000, 'Office chairs 17 × $50 = $850.00');
  // Non-saleable items contribute nothing
  t.eq(disposal.appraisal(d.items[6]).saleable, false, 'photocopier not saleable');
  t.eq(disposal.appraisal(d.items[6]).returnsCents, null);
});

t.test('case study: total appraised value is TT$70,650.00 to the cent', () => {
  const d = caseStudy().disposal;
  t.eq(disposal.totalExpectedReturnsCents(d), 7065000);
  // 850 + 19,000 + 1,300 + 20,000 + 28,000 + 1,500 = 70,650
  t.eq(disposal.totalExpectedReturnsCents(d), 85000 + 1900000 + 130000 + 2000000 + 2800000 + 150000);
});

t.test('case study: Form C document prints the columns and the total in words', () => {
  const cf = caseStudy();
  const html = documents.build(cf, 'disposal-form-c');
  t.ok(html.indexOf('$4,858.33') > 0, 'unit NBV printed');
  t.ok(html.indexOf('$3,886.67') > 0, 'appraised less 20% printed');
  t.ok(html.indexOf('$19,000.00') > 0, 'expected returns printed');
  t.ok(html.indexOf('Seventy Thousand, Six Hundred and Fifty Dollars ($70,650.00)') > 0, 'total in words and figure');
  t.ok(html.indexOf('AWAITING FORMAT AUTHORITY') < 0, 'no scaffold banner — Forms A–E have authority now');
});

t.test('case study: Forms A, B, D, E render without crashing and cite the authority', () => {
  const cf = caseStudy();
  for (const form of ['disposal-form-a', 'disposal-form-b', 'disposal-form-d', 'disposal-form-e']) {
    const html = documents.build(cf, form);
    t.ok(html.length > 200, form + ' renders');
    t.ok(html.indexOf('OPR Retention &amp; Disposal') > 0 || html.indexOf('OPR Retention & Disposal') > 0, form + ' cites the authority');
  }
  // Form B carries the disposition key and a tick in the recorded band
  const b = documents.build(cf, 'disposal-form-b');
  t.ok(b.indexOf('Scrap (S) 0-9%') > 0, 'disposition key present');
  t.ok(b.indexOf('&#10003;') > 0, 'a disposition band is ticked');
  // Form E shows the enclosed forms line
  t.ok(documents.build(cf, 'disposal-form-e').indexOf('Enclosed: Forms A to D') > 0);
});

t.test('case study: the disposal case clears verification (three-officer DC, methods, appraisal)', () => {
  const R = verifycase.runAllChecks(caseStudy());
  const fails = R.filter(c => c.result === 'FAIL');
  t.eq(fails, [], 'no failures: ' + fails.map(f => f.id + ' ' + f.detail).join(' | '));
  // D0 now passes with the authority citation, not a warning
  t.eq(R.find(c => c.id === 'D0').result, 'PASS');
  t.ok(R.find(c => c.id === 'D0').detail.indexOf('Case Study') > 0);
  // Three-officer committee check passes
  t.eq(R.find(c => c.id === 'D1').result, 'PASS');
});

t.test('case study: employee-sale rule engages because items are sold to employees', () => {
  const cf = caseStudy();
  const R = verifycase.runAllChecks(cf);
  const d8 = R.find(c => c.id === 'D8');
  t.ok(d8, 'the s.57/reg 7 employee-sale check appears');
  t.eq(d8.result, 'WARN', 'warns until the PDAC prior-approval notice is recorded');
  // record the approval -> it clears
  cf.disposal.approvals.employeeSaleApproval = true;
  cf.disposal.approvals.employeeSaleDetails = 'PDAC notice ref DISP/EMP/0001 sent to the Accounting Officer 22/10/2020.';
  t.eq(verifycase.runAllChecks(cf).find(c => c.id === 'D8').result, 'PASS');
});
