/* samples.js — worked examples, one per module. Each is a complete,
   correct case the test suites already replay to the cent: the
   boxed-meals verbal quotation ($400.00), the OPR formal worked example
   (Alpha 88.50% / Beta 83.20%), and the OPR disposal case study
   (TT$70,650.00). Loading one shows a first-time user what "done" looks
   like — every figure typed here is a source figure; every derived
   figure is computed by the engine, never stored.
   Browser: window.SAMPLES. Node: require() for testing. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../lib/casemodel.js'), require('../lib/verbal.js'), require('../lib/formal.js'), require('../lib/disposal.js'));
  } else {
    var M = root.MODPA;
    root.SAMPLES = factory(M.casemodel, M.verbal, M.formal, M.disposal);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (casemodel, verbal, formal, disposal) {
  'use strict';

  function routineSample() {
    var cf = casemodel.newCase('routine', 'ministry-dotted');
    cf.docState.minfile = 'MOD/PROC: 22/18/7:2026';
    cf.docState.date = '2026-05-20';
    cf.docState.subject = 'The Provision of Boxed Meals';
    cf.docState.subjectProse = 'the provision of Boxed Meals for the Human Resource Training Workshop';
    cf.docState.need = 'Approval is sought for the provision of Boxed Meals for participants of the Human Resource Training Workshop carded for 19 May 2026.';
    cf.docState.minsigname = 'A. Officer';
    cf.docState.minsigpost = 'Clerk IV (Ag)';
    cf.oprRegistered = true;
    cf.verbal = verbal.newVerbal();
    cf.verbal.purpose = 'the provision of Boxed Meals for the Human Resource Training Workshop';
    cf.verbal.contacts = [
      { name: 'Ate6Ate Savor City Caterers Ltd', phone: '868-555-0101', date: '2026-05-18', spokeTo: 'Manager', officer: 'A. Officer', outcome: 'quoted', amount: '1,200.00' },
      { name: 'Caterer B Ltd', phone: '868-555-0102', date: '2026-05-18', spokeTo: 'Owner', officer: 'A. Officer', outcome: 'quoted', amount: '1,450.00' },
      { name: 'Caterer C Ltd', phone: '868-555-0103', date: '2026-05-18', spokeTo: 'Clerk', officer: 'A. Officer', outcome: 'quoted', amount: '1,500.00' }
    ];
    cf.verbal.selected = 0;
    cf.verbal.schedule = [
      { date: '2026-05-19', desc: '(4) Chicken, (1) Fish Meals with Drink', qty: 5, rate: '60.00', kind: 'line' },
      { date: '2026-05-19', desc: 'Delivery', qty: 1, rate: '100.00', kind: 'delivery' }
    ];
    cf.voteStatus = {
      originalProvision: '380,000.00', revisedAllocation: '380,000.00',
      releasesToDate: '32,602.00', expenditureToDate: '3,560.57', commitment: '21,654.44'
    };
    cf.docState.folios = [
      { desc: 'Verbal Quotation Form re: Boxed Meals', date: '2026-05-18', tag: 'verbal-form' },
      { desc: 'Quotation — Ate6Ate Savor City Caterers Ltd', date: '2026-05-18', tag: 'quote:Ate6Ate Savor City Caterers Ltd' }
    ];
    return cf;
  }

  function formalSample() {
    var cf = casemodel.newCase('formal-evaluation', 'agency-neutral');
    cf.docState.minfile = 'MOD/RFP: 7/2026';
    cf.docState.date = '2026-07-01';
    cf.docState.subject = 'Provision of Facilities Management Services';
    cf.docState.minsigname = 'Chair Person';
    cf.docState.folios = [{ desc: 'Evaluation report', date: '', tag: '' }];
    var f = formal.newFormal();
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

  function disposalItem(desc, qty, totalNBV, saleable, salePrice, comment, method, methodReason) {
    var it = disposal.blankItem();
    it.desc = desc; it.qty = qty; it.totalNBV = totalNBV;
    it.disposition = 'S';
    it.condition = saleable === 'yes' ? 'Inspected — see appraisal' : 'Non-functional / obsolete';
    it.saleable = saleable;
    if (saleable === 'yes') it.salePrice = salePrice;
    it.valueComment = comment;
    it.method = method;
    if (methodReason) it.methodReason = methodReason;
    return it;
  }

  function disposalSample() {
    var cf = casemodel.newCase('disposal', 'ministry-dotted');
    cf.docState.minfile = 'DISP: 0001';
    cf.docState.date = '2026-06-15';
    cf.docState.subject = 'Used Office Furniture and Equipment';
    cf.docState.minsigname = 'J. Officer';
    cf.docState.folios = [{ desc: 'Request for Asset Disposal (Form A)', date: '', tag: '' }];
    var d = disposal.newDisposal();
    d.entity = 'Ministry of Defence';
    d.department = 'Facilities';
    d.assetLocation = 'Building B, Basement & ICT Storage';
    d.requestDate = '2026-06-15';
    d.requestRef = '0001';
    d.npoName = 'J. Officer';
    d.npoDesignation = 'Procurement Officer';
    d.aoName = 'Accounting Officer';
    d.committee = [
      { name: 'Member One', post: 'Senior/Procurement Officer' },
      { name: 'Member Two', post: 'Stores/Asset Officer' },
      { name: 'Member Three', post: 'Subject Matter Expert' }
    ];
    var SALE = 'Sale to employees (s. 57, Reg 7)';
    d.items = [
      disposalItem('Black fabric covered Office Chairs, Adjustable with wheels', 17, '', 'yes', '50.00', 'No NBV but in usable condition, value/price estimated.', SALE),
      disposalItem('Office Work Station / Cubicles', 5, '24,291.67', 'yes', '3,800.00', 'NBV prorated per unit.', SALE),
      disposalItem('Filing Cabinets Lateral', 13, '', 'yes', '100.00', 'No NBV but in usable condition, value/price estimated.', SALE),
      disposalItem("Managers' Desks — L-Shaped", 10, '27,300.00', 'yes', '2,000.00', 'NBV prorated per unit.', SALE),
      disposalItem("Managers' Desks — Rectangular", 10, '35,100.00', 'yes', '2,800.00', 'NBV prorated per unit.', SALE),
      disposalItem('Bookshelves', 15, '', 'yes', '100.00', 'No NBV but in usable condition, value/price estimated.', SALE),
      disposalItem('Photocopier (Multifunction)', 1, '3,410.00', 'no', '', 'Recycle at a cost; not saleable.', 'Recycling', 'Certified e-waste recycler, lowest of three quotations.'),
      disposalItem('Window Air Conditioning Units', 6, '', 'no', '', 'Recycle at no cost; not saleable.', 'Recycling', 'Refrigerant Recovery Recycle Association, Montreal Protocol.'),
      disposalItem('Laptops', 5, '', 'no', '', 'Donate to laptop refurbishment programme; not saleable.', 'Donation', 'Donated to a laptop refurbishment programme; non-functional and outdated.')
    ];
    d.appraisalFindings = 'The identified properties were all located in a central storage area at Building B, Basement, easily visible.';
    d.appraisalProcedures = 'The condition was assessed through physical inspection; appraisal value was determined from the original purchase price, depreciated value, current market value and present condition and functionality.';
    cf.disposal = d;
    return cf;
  }

  var BUILDERS = { 'routine': routineSample, 'formal-evaluation': formalSample, 'disposal': disposalSample };

  function build(moduleId) {
    var f = BUILDERS[moduleId];
    return f ? f() : null;
  }

  return { build: build };
});
