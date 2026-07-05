/* make-samples.js — build one realistic case per module and export its
   documents as .doc files (the exact files the Download button produces),
   so the outputs can be inspected without running the browser.
   Run from the repo root:  node tools/make-samples.js [outDir]  */
'use strict';
const fs = require('fs');
const path = require('path');

const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const documents = require('../js/lib/documents.js');
const common = require('../js/lib/docs/common.js');
const evaluation = require('../js/lib/evaluation.js');
const verbal = require('../js/lib/verbal.js');
const formal = require('../js/lib/formal.js');
const disposal = require('../js/lib/disposal.js');
require('../js/lib/docs/hybridminute.js');
require('../js/lib/docs/verbalform.js');
require('../js/lib/docs/evalreport.js');
require('../js/lib/docs/hybridcert.js');
require('../js/lib/docs/disposaldocs.js');
require('../js/lib/docs/formalreport.js');
require('../js/lib/docs/coiforms.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-05T09:00:00.000Z';
const OUT = process.argv[2] || path.resolve(__dirname, '../sample-output');
fs.mkdirSync(OUT, { recursive: true });

/* Combine several document bodies into one printable .doc, page-broken. */
function exportCombined(fileName, title, caseFile, docTypes) {
  const body = docTypes.map(function (dt, i) {
    return (i ? '<div style="page-break-before:always"></div>' : '') + documents.build(caseFile, dt);
  }).join('\n');
  fs.writeFileSync(path.join(OUT, fileName), common.wordWrap(body, title));
  console.log('  ' + fileName);
}

/* ---------------- Routine / daily procurement ---------------- */
function routineCase() {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const st = cf.docState;
  st.minfile = 'MOD/PROC: 22/18/7:2026';
  st.date = '2026-06-18';
  st.subject = 'The Provision of Boxed Meals for the Human Resource Training Workshop';
  st.subjectProse = 'the provision of Boxed Meals for the Human Resource Training Workshop';
  st.minsigname = 'K. Ramnarine';
  st.minsigpost = 'Clerk IV (Ag)';
  st.need = 'A Human Resource Training Workshop is carded for the period 19–20 June 2026.\n\nCatering is required for the thirty-five (35) participants over the two days.';
  st.method = 'Request for Quotation';
  st.folios = [
    { desc: 'Verbal Quotation Form re: Boxed Meals', date: '17/06/26', tag: 'verbal-form' },
    { desc: 'Telephone Contact Register', date: '17/06/26' }
  ];
  cf.verbal = {
    purpose: 'the provision of Boxed Meals for the Human Resource Training Workshop',
    tableTitle: 'Boxed Meals', selectionBasis: 'lowest quotation', notLowestJustification: '',
    contacts: [
      { name: 'Ate6Ate Savor City Caterers Ltd', phone: '620-1234', date: '2026-06-17', spokeTo: 'Manager', officer: 'K. Ramnarine', outcome: 'quoted', amount: '1,200.00' },
      { name: 'Island Flavours Catering', phone: '640-5678', date: '2026-06-17', spokeTo: 'Owner', officer: 'K. Ramnarine', outcome: 'quoted', amount: '1,450.00' },
      { name: 'Doubles & More Ltd', phone: '655-9012', date: '2026-06-17', spokeTo: 'Supervisor', officer: 'K. Ramnarine', outcome: 'quoted', amount: '1,500.00' }
    ],
    selected: 0,
    schedule: [
      { date: '2026-06-19', desc: '(4) Chicken, (1) Fish Meals with Drink', qty: 5, rate: '60.00', kind: 'line' },
      { date: '2026-06-19', desc: 'Delivery', qty: 1, rate: '100.00', kind: 'delivery' }
    ]
  };
  cf.voteStatus = {
    originalProvision: '380,000.00', revisedAllocation: '380,000.00',
    releasesToDate: '32,602.00', expenditureToDate: '3,560.57', commitment: '21,654.44'
  };
  return cf;
}

/* ---------------- Formal tender / RFP / ITB evaluation ---------------- */
function formalCase() {
  const cf = cm.newCase('formal-evaluation', 'agency-neutral', NOW);
  cf.docState.minfile = 'MOD/RFP: 7/2026';
  cf.docState.date = '2026-07-01';
  cf.docState.subject = 'Provision of Facilities Management Services';
  cf.docState.minsigname = 'A. Chairperson';
  cf.docState.formation = 'MINISTRY OF DEFENCE';
  cf.docState.folios = [{ desc: 'Evaluation report', date: '', tag: '' }];
  const f = formal.newFormal();
  f.rfpTitle = 'Provision of Facilities Management Services';
  f.rfpNumber = 'RFP-7-2026'; f.reportDate = '2026-07-01';
  f.introduction = 'The Ministry requires facilities management services for its head office building for a period of two years.';
  f.background = 'Approval to proceed was granted by the Accounting Officer; the Request for Proposals was advertised and three (3) proposals were received by the submission deadline of 20 June 2026. The proposals were opened in the presence of the Evaluation Committee.';
  f.submissionDeadline = '20 June 2026, 2:00 p.m.';
  f.tenderOpening = 'Opened 20 June 2026 by the Evaluation Committee.';
  f.committee = [
    { name: 'Ann Chair', jobTitle: 'Director of Corporate Services', role: 'Chairperson', coiSigned: true, coiConflict: 'none' },
    { name: 'Bob Tech', jobTitle: 'Facilities Engineer', role: 'Technical member', coiSigned: true, coiConflict: 'none' },
    { name: 'Cy Legal', jobTitle: 'Legal Officer', role: 'Legal member', coiSigned: true, coiConflict: 'none' }
  ];
  f.criteria = [
    { name: 'Relevant Experience', description: 'Experience in comparable facilities management contracts.', maxPoints: 40 },
    { name: 'Methodology', description: 'Soundness of the proposed approach and work plan.', maxPoints: 30 },
    { name: 'Key Personnel', description: 'Qualifications and experience of the proposed team.', maxPoints: 30 }
  ];
  f.minTechnicalScore = 70; f.technicalWeight = 70; f.financialWeight = 30;
  f.rankingFormula = 'Total = 0.70 × Technical% + 0.30 × Financial%, where Financial% = lowest verified price ÷ price.';
  f.proponents = [
    { name: 'Alpha Facilities Management Ltd', compliant: 'yes', complianceNote: '' },
    { name: 'Beta Integrated Services Ltd', compliant: 'yes', complianceNote: '' },
    { name: 'Gamma Property Care Co Ltd', compliant: 'yes', complianceNote: '' }
  ];
  f.techScores = { '0:0': 36, '0:1': 27, '0:2': 27, '1:0': 32, '1:1': 24, '1:2': 20, '2:0': 28, '2:1': 20, '2:2': 15 };
  f.prices = [
    { quotedPrice: '1,000,000.00', verifiedPrice: '1,000,000.00', arithmeticNote: 'All items priced; no arithmetic errors.' },
    { quotedPrice: '850,000.00', verifiedPrice: '850,000.00', arithmeticNote: 'All items priced; no arithmetic errors.' },
    { quotedPrice: '700,000.00', verifiedPrice: '700,000.00', arithmeticNote: 'Not carried — below the technical gate.' }
  ];
  f.clarifications = [{ proponent: 0, issued: '24/06/26', received: '25/06/26', summary: 'Confirmation of the unit rate for after-hours cleaning.' }];
  f.recommendedProponent = 0;
  f.pdacReview = 'Reviewed and recommended by PDAC on 03/07/2026.';
  cf.formal = f;
  return cf;
}

/* ---------------- Disposal (the OPR Case Study, to $70,650.00) -------- */
function disp(desc, qty, nbv, disposition, saleable, salePrice, method, reason, comment) {
  const it = disposal.blankItem();
  it.desc = desc; it.qty = qty; it.totalNBV = nbv || ''; it.disposition = disposition;
  it.condition = 'Inspected — see appraisal'; it.saleable = saleable; it.salePrice = salePrice || '';
  it.method = method; it.methodReason = reason || ''; it.valueComment = comment || '';
  return it;
}
function disposalCase() {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  cf.docState.minfile = 'MOD/DISP: 0001';
  cf.docState.date = '2026-06-01';
  cf.docState.subject = 'Used Office Furniture and Equipment';
  cf.docState.minsigname = 'J. Doe';
  const d = disposal.newDisposal();
  d.entity = 'Ministry of Defence'; d.department = 'Facilities';
  d.assetLocation = 'Building B, Basement & ICT Storage'; d.requestDate = '2026-05-20'; d.requestRef = '0001';
  d.submittedBy = 'Officer One'; d.financeOfficer = 'Finance Officer'; d.npoName = 'John Doe';
  d.npoDesignation = 'Procurement Officer'; d.aoName = 'Permanent Secretary';
  d.appraisalAsOf = '2026-05-28'; d.inventoryReportDated = '2026-05-25';
  d.appraisalFindings = 'The identified properties were all located in a central storage area at Building B, Basement, and were easily visible.';
  d.appraisalProcedures = 'The condition was assessed through physical inspection; the appraised value is based on the available current market value and the Guidelines on Appraisal of Personal Property.';
  d.committee = [
    { name: 'Member One', post: 'Senior/Procurement Officer' },
    { name: 'Member Two', post: 'Stores/Asset Officer' },
    { name: 'Member Three', post: 'Subject Matter Expert' }
  ];
  d.pdac = [
    { name: 'PDAC One', post: 'Head of Finance' },
    { name: 'PDAC Two', post: 'Head of Legal' },
    { name: 'PDAC Three', post: 'Subject Matter Expert' }
  ];
  const emp = 'Sale to employees (s. 57, Reg 7)';
  d.items = [
    disp('Black fabric covered Office Chairs, Adjustable with wheels', 17, '', 'S', 'yes', '50.00', emp, '', 'No NBV but in usable condition; value estimated.'),
    disp('Office Work Station / Cubicles', 5, '24,291.67', 'VG', 'yes', '3,800.00', emp, '', 'Prorated from NBV.'),
    disp('Filing Cabinets Lateral', 13, '', 'S', 'yes', '100.00', emp, '', 'No NBV but in usable condition; value estimated.'),
    disp("Managers' Desks — L-Shaped", 10, '27,300.00', 'VG', 'yes', '2,000.00', emp, '', 'Prorated from NBV.'),
    disp("Managers' Desks — Rectangular", 10, '35,100.00', 'VG', 'yes', '2,800.00', emp, '', 'Prorated from NBV.'),
    disp('Bookshelves', 15, '', 'S', 'yes', '100.00', emp, '', 'No NBV but in usable condition; value estimated.'),
    disp('Photocopier (Multifunction)', 1, '3,410.00', 'S', 'no', '', 'Recycling', 'Certified e-waste recycler; lowest of three quotations.', 'Not saleable — to be recycled.'),
    disp('Window Air Conditioning Units', 6, '', 'S', 'no', '', 'Recycling', 'Refrigerant Recovery Recycle Association; Montreal Protocol.', 'Not saleable — to be recycled.'),
    disp('Laptops', 5, '', 'S', 'no', '', 'Donation', 'Donated to the TTCS laptop refurbishment programme.', 'Not saleable — to be donated.')
  ];
  d.strategy.background = 'Used, old and damaged office furniture and equipment gathered over the years has been identified for disposal. The items have been stored in the basement of Building B.';
  d.strategy.scope = 'The storage room is required for use by a contracted landscaper within one month; the space must be cleared in time.';
  d.strategy.objectives = 'To dispose of the items in the shortest feasible timeframe, achieving value for money, promoting fair competition, and complying with environmental obligations.';
  d.strategy.recommendation = 'Furniture is offered for sale to employees; the photocopier and air-conditioning units are recycled; the laptops are donated for refurbishment.';
  d.strategy.expenditure = [
    { detail: 'Labour for basement reorganisation ($400 × 3 labourers)', amount: '1,200.00' },
    { detail: 'Photocopier recycling', amount: '75.00' }
  ];
  d.approvals.strategyRequestDate = '2026-05-29';
  d.approvals.recommendationReceivedDate = '2026-05-29';
  d.approvals.aoDecision = 'approved'; d.approvals.aoDecisionDate = '2026-06-05';
  d.approvals.employeeSaleApproval = true;
  d.approvals.employeeSaleDetails = 'PDAC notice ref DISP/EMP/0001 sent to the Accounting Officer on 29/05/2026.';
  cf.disposal = d;
  return cf;
}

console.log('Writing sample documents to ' + OUT);
console.log('Routine / daily procurement:');
exportCombined('1-Routine-Minute-and-Certificate.doc', 'Routine Procurement — Minute & Certificate', routineCase(), ['minute', 'verbal-form', 'phone-register', 'certificate']);
console.log('Formal tender / RFP / ITB evaluation:');
exportCombined('2-Formal-EvaluationReport.doc', 'Formal Evaluation Report', formalCase(), ['formal-report']);
exportCombined('3-Formal-COI-Confidentiality-Forms.doc', 'Conflict of Interest & Confidentiality Forms', formalCase(), ['coi-forms']);
console.log('Disposal (OPR Forms A–H, case study — total $70,650.00):');
exportCombined('4-Disposal-Forms-A-to-H.doc', 'Disposal — Forms A to H', disposalCase(),
  ['disposal-form-a', 'disposal-form-b', 'disposal-form-c', 'disposal-form-c-catalogue',
   'disposal-form-d', 'disposal-form-e', 'disposal-form-f', 'disposal-form-g', 'disposal-form-h']);
console.log('Done.');
