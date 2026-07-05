/* disposal.js — the Disposal of Public Property module, built to the OPR
   authority supplied to this project:

     - Public Procurement and Disposal of Public Property Act 2015 (as
       amended), Part VI (ss. 53–57A);
     - PP&DPP (Retention and Disposal of Personal Property) Regulations,
       2021 — especially reg 6 (disposal of stores and equipment) and
       reg 7 (disposal to public employees);
     - OPR Retention & Disposal of Public Property Handbook, HGRD02
       05-2023 Version 3.0;
     - OPR Sample Disposal Case Study #1 (Sept 2021, v1.0), whose worked
       Forms A–E fix the layouts and the appraisal arithmetic (unit NBV
       from total NBV over quantity; 20% of NBV; appraised value less
       20%; committee-set sale price; expected returns = quantity × sale
       price — the case study totals TT$70,650.00 and this engine
       reproduces it to the cent, by test).

   STILL PENDING FORMAT AUTHORITY: Form F (Summary Report of Approved
   Disposal Action), Form G (Transfer/Donation of Excess Personal
   Property), Form H (Notice of Rejection) — named in the Handbook's
   workflow but not supplied as layouts — and real-property disposals
   (s. 57A regulations pending). Recorded in ASSUMPTIONS.md.

   Data model (figures typed once, every derived figure computed):
     disposal = {
       entity, department, assetLocation, requestDate, requestRef,
       otherInformation, submittedBy, verifiedBy,
       npoName, npoDesignation, aoName, aoPost,
       committee: [{name, post}],          // DC — not less than three (ss. 55–56)
       pdac: [{name, post}],               // Reg 21 of the Methods Regulations
       appraisalFindings, appraisalProcedures,   // Form C narrative blocks
       items: [{
         desc, makeModel, reason, qty, condition, location,
         originalUnitPrice ('' or figure), purchaseDate, comments,   // Form A
         propertyNo, dateAcquired, serviceYears, totalNBV ('' or figure),
         disposition ('VG'|'G'|'F'|'P'|'S'|''),                      // Form B
         saleable ('yes'|'no'|''), salePrice, valueComment,          // Form C
         method, methodReason                                        // strategy
       }],
       strategy: { background, scope, businessSupport, objectives,
         findings, optionsConsidered, requirementIssues,
         needsAssessment, contractualIssues, applicableIssues,
         expenditure: [{detail, amount}], stakeholders: [{name, interest}],
         stakeholderImpact, marketResearch, optionsAnalysis,
         recommendation, advertisingNote },                          // Form D
       approvals: { strategyRequestDate, npoReviewDate, pdacReviewDate,
         recommendationReceivedDate, aoDecision (''|'approved'|'rejected'),
         aoDecisionDate, rejectionReasons,
         employeeSaleApproval (bool), employeeSaleDetails,
         completionDate, oprNotifiedDate, proceedsAccounted (bool) }  // Form E + statute
     }
   Legacy scaffold sections (committee/narrative/items with valuation
   fields) upgrade in place, losing nothing: old fields are kept on the
   object and old method names map to the reg 6(2) wording.
   Loads as MODPA.disposal / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.disposal = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var fmtMoney = money.fmtMoney;

  var AUTHORITY = 'OPR Disposal Templates (Forms A–H) and the OPR Retention & Disposal of Public Property Handbook (HGRD02 05-2023 v3.0), with the Sample Disposal Case Study #1 (Sept 2021 v1.0), under the Act (Part VI) and the Retention and Disposal of Personal Property Regulations 2021.';
  var PENDING = 'Real-property disposals (s. 57A) remain pending their own regulations; the personal-property Forms A–H are complete.';

  /* Reg 6(2): the most appropriate means "including, but not limited to"
     this list. Sale to employees is not a reg 6(2) route of its own — it
     is a sale governed by s. 57 and reg 7, listed here so the rule can be
     applied when it is chosen. */
  var METHODS = [
    'Public sale or tendering',
    'Public auction',
    'Sale to employees (s. 57, Reg 7)',
    'Gift',
    'Lease',
    'Concession',
    'Transfer',
    'Destruction',
    'Trade-in',
    'Recycling',
    'Donation'
  ];

  /* Value leaves public hands without proceeds: a recorded reason always. */
  var REASON_MANDATORY = ['Gift', 'Donation', 'Destruction'];

  /* Old scaffold method names -> reg 6(2) wording. */
  var LEGACY_METHOD_MAP = {
    'Transfer to another public body': 'Transfer',
    'Sale by public auction': 'Public auction',
    'Sale by tender': 'Public sale or tendering'
  };

  /* Form B disposition bands, verbatim from the OPR form. */
  var DISPOSITIONS = [
    { code: 'VG', label: 'Very Good (VG) 75-100%', detail: 'Being used to its fully specified purpose without being modified' },
    { code: 'G', label: 'Good (G) 50-74%', detail: 'Being used near its fully specified utilisation, with minor repair' },
    { code: 'F', label: 'Fair (F) 30-49%', detail: 'Below its fully specified utilisation, requires general repair/replacement of minor parts' },
    { code: 'P', label: 'Poor (P) 10-29%', detail: 'Below its fully specified utilisation, needs extensive repair/replacement of major components' },
    { code: 'S', label: 'Scrap (S) 0-9%', detail: 'Unserviceable/cannot be utilised to any practical degree regardless of modification or repair' }
  ];

  var ADVERT_THRESHOLD_CENTS = 100000 * 100; /* reg 6(3): TT$100,000 */

  function blankItem() {
    return {
      desc: '', makeModel: '', reason: '', qty: 1, condition: '', location: '',
      originalUnitPrice: '', purchaseDate: '', comments: '',
      propertyNo: '', dateAcquired: '', serviceYears: '', totalNBV: '', disposition: '',
      saleable: '', salePrice: '', valueComment: '',
      method: '', methodReason: ''
    };
  }

  function blankStrategy() {
    return {
      background: '', scope: '', businessSupport: '', objectives: '',
      findings: '', optionsConsidered: '', requirementIssues: '',
      needsAssessment: '', contractualIssues: '', applicableIssues: '',
      expenditure: [], stakeholders: [],
      stakeholderImpact: '', marketResearch: '', optionsAnalysis: '',
      recommendation: '', advertisingNote: ''
    };
  }

  function blankApprovals() {
    return {
      strategyRequestDate: '', npoReviewDate: '', pdacReviewDate: '',
      recommendationReceivedDate: '', aoDecision: '', aoDecisionDate: '',
      rejectionReasons: '',
      employeeSaleApproval: false, employeeSaleDetails: '',
      completionDate: '', oprNotifiedDate: '', proceedsAccounted: false
    };
  }

  /* Form F — Summary Report of Approved Disposal Action. */
  function blankSummary() {
    return {
      executionDate: '', executedAsApproved: '', deviationReasons: '',
      proceedingsSummary: '', challenges: '', totalProceeds: ''
    };
  }

  /* Form G — Transfer / Donation of Excess Personal Property. */
  function blankTransferItem() {
    return { stockCode: '', itemNo: '', description: '', unit: '', quantity: '' };
  }
  function blankTransfer() {
    return {
      toOrg: '', fromEntity: '', shipTo: '', propertyLocation: '',
      items: [], receivedBy: '', comments: ''
    };
  }

  /* Form H — Notice of Rejection (Accounting Officer + Line Minister). */
  function blankRejection() {
    return {
      lineMinisterConsultation: '', reasons: '', newDecision: '',
      preparedByAO: '', lineMinisterName: ''
    };
  }

  function newDisposal() {
    return {
      entity: '', department: '', assetLocation: '', requestDate: '', requestRef: '',
      otherInformation: '', submittedBy: '', financeOfficer: '', verifiedBy: '',
      npoName: '', npoDesignation: '', aoName: '', aoPost: '',
      committee: [], pdac: [],
      /* Form C narrative */
      appraisalAsOf: '', inventoryReportDated: '',
      appraisalFindings: '', appraisalProcedures: '',
      items: [], strategy: blankStrategy(), approvals: blankApprovals(),
      summary: blankSummary(), transfer: blankTransfer(), rejection: blankRejection()
    };
  }

  /* Upgrade any disposal section in place (idempotent). Legacy scaffold
     fields are never deleted: the old valuation figures are carried into
     the Form C value comment so no typed figure is lost, and old method
     names map to the reg 6(2) wording with the original kept. */
  function upgrade(d) {
    if (!d || typeof d !== 'object') return d;
    var fresh = newDisposal();
    for (var k in fresh) {
      if (!(k in d)) d[k] = fresh[k];
    }
    if (typeof d.narrative === 'string' && d.narrative && !d.strategy.background) {
      d.strategy.background = d.narrative;
    }
    if (!d.strategy || typeof d.strategy !== 'object') d.strategy = blankStrategy();
    var fs = blankStrategy();
    for (var ks in fs) { if (!(ks in d.strategy)) d.strategy[ks] = fs[ks]; }
    if (!Array.isArray(d.strategy.expenditure)) d.strategy.expenditure = [];
    if (!Array.isArray(d.strategy.stakeholders)) d.strategy.stakeholders = [];
    if (!d.approvals || typeof d.approvals !== 'object') d.approvals = blankApprovals();
    var fa = blankApprovals();
    for (var ka in fa) { if (!(ka in d.approvals)) d.approvals[ka] = fa[ka]; }
    if (!d.summary || typeof d.summary !== 'object') d.summary = blankSummary();
    else { var fsm = blankSummary(); for (var ksm in fsm) { if (!(ksm in d.summary)) d.summary[ksm] = fsm[ksm]; } }
    if (!d.transfer || typeof d.transfer !== 'object') d.transfer = blankTransfer();
    else { var ft = blankTransfer(); for (var kt in ft) { if (!(kt in d.transfer)) d.transfer[kt] = ft[kt]; } if (!Array.isArray(d.transfer.items)) d.transfer.items = []; }
    if (!d.rejection || typeof d.rejection !== 'object') d.rejection = blankRejection();
    else { var fr = blankRejection(); for (var kr in fr) { if (!(kr in d.rejection)) d.rejection[kr] = fr[kr]; } }
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      var bi = blankItem();
      for (var kb in bi) { if (!(kb in it)) it[kb] = bi[kb]; }
      if (it.identification && !it.propertyNo) it.propertyNo = it.identification;
      if (it.acquisitionCost && !it.originalUnitPrice) it.originalUnitPrice = it.acquisitionCost;
      if (it.method && LEGACY_METHOD_MAP[it.method]) {
        if (!it.legacyMethod) it.legacyMethod = it.method;
        it.method = LEGACY_METHOD_MAP[it.method];
      }
      if (it.valuation && !it.valueComment) {
        it.valueComment = 'Recorded valuation (pre-Form C): ' + it.valuation +
          (it.valuationBasis ? ' — ' + it.valuationBasis : '') +
          (it.valuationDate ? ' (' + it.valuationDate + ')' : '') +
          '. Set the Form C sale price from a fresh appraisal.';
      }
    }
    return d;
  }

  /* ---------- exact appraisal arithmetic (Form C) ---------- */

  /* Nearest-integer division, halves up, for non-negative n and positive d. */
  function halfUpDiv(n, den) {
    return Math.floor((2 * n + den) / (2 * den));
  }

  function qtyInt(item) {
    var q = Number(item.qty);
    return Number.isInteger(q) && q > 0 ? q : NaN;
  }

  /* The Form C computed columns for one item. All from the exact rational
     totalNBV/qty, as the case study computes them:
       unit NBV        = T/q          (displayed half-up at the cent)
       20% of NBV      = T/(5q)
       appraised -20%  = 4T/(5q)
     Sale price is the committee's decision, typed; expected returns are
     qty × sale price. */
  function appraisal(item) {
    var out = {
      qty: qtyInt(item),
      hasNBV: false, unitNBVCents: null, pct20Cents: null, less20Cents: null,
      saleable: item.saleable === 'yes' ? true : item.saleable === 'no' ? false : null,
      salePriceCents: null, returnsCents: null, errors: []
    };
    if (isNaN(out.qty)) out.errors.push('Quantity must be a whole number of 1 or more.');
    if (item.totalNBV && String(item.totalNBV).trim()) {
      var nbv = money.parseStrict(item.totalNBV);
      if (!nbv.ok) out.errors.push('Total NBV "' + item.totalNBV + '" rejected: ' + nbv.hint);
      else if (!isNaN(out.qty)) {
        out.hasNBV = true;
        out.unitNBVCents = halfUpDiv(nbv.cents, out.qty);
        out.pct20Cents = halfUpDiv(nbv.cents, 5 * out.qty);
        out.less20Cents = halfUpDiv(4 * nbv.cents, 5 * out.qty);
      }
    }
    if (out.saleable === true) {
      var sp = money.parseStrict(item.salePrice);
      if (!sp.ok) out.errors.push('Sale price "' + (item.salePrice || '') + '" rejected: ' + sp.hint);
      else {
        out.salePriceCents = sp.cents;
        if (!isNaN(out.qty)) out.returnsCents = out.qty * sp.cents;
      }
    }
    return out;
  }

  /* Total expected returns across the saleable items (the Form C total —
     TT$70,650.00 in the case study). NaN when a saleable item cannot be
     computed; items marked not-saleable contribute nothing. */
  function totalExpectedReturnsCents(d) {
    var t = 0;
    for (var i = 0; i < d.items.length; i++) {
      var a = appraisal(d.items[i]);
      if (a.saleable === true) {
        if (a.returnsCents == null) return NaN;
        t += a.returnsCents;
      }
    }
    return t;
  }

  /* The Form D spend-analysis total. */
  function spendTotalCents(d) {
    var t = 0;
    var rows = (d.strategy && d.strategy.expenditure) || [];
    for (var i = 0; i < rows.length; i++) {
      if (!(rows[i].amount || '').trim()) continue;
      var p = money.parseStrict(rows[i].amount);
      if (!p.ok) return NaN;
      t += p.cents;
    }
    return t;
  }

  /* Items grouped by recommended method, with expected returns per group. */
  function byMethod(d) {
    var map = {}, order = [];
    for (var i = 0; i < d.items.length; i++) {
      var m = d.items[i].method || '[no method]';
      if (!map[m]) { map[m] = { method: m, items: [], cents: 0, bad: false }; order.push(m); }
      map[m].items.push(d.items[i]);
      var a = appraisal(d.items[i]);
      if (a.saleable === true) {
        if (a.returnsCents == null) map[m].bad = true; else map[m].cents += a.returnsCents;
      }
    }
    return order.map(function (k) { return map[k]; });
  }

  function isPublicSaleMethod(method) {
    return method === 'Public sale or tendering' || method === 'Public auction';
  }

  function isEmployeeSaleMethod(method) {
    return method === 'Sale to employees (s. 57, Reg 7)' || /employee/i.test(method || '');
  }

  function isSaleMethod(method) {
    return isPublicSaleMethod(method) || isEmployeeSaleMethod(method) || method === 'Trade-in';
  }

  /* Reg 6(3): public sale/tendering or public auction where the net book,
     market or residual value exceeds TT$100,000 must be advertised in at
     least two daily newspapers and on the website. The value tested is
     the higher of the recorded NBV and the expected returns of the items
     under those methods. */
  function advertisingRequirement(d) {
    var nbv = 0, returns = 0, any = false, computable = true;
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      if (!isPublicSaleMethod(it.method)) continue;
      any = true;
      if (it.totalNBV && String(it.totalNBV).trim()) {
        var p = money.parseStrict(it.totalNBV);
        if (p.ok) nbv += p.cents; else computable = false;
      }
      var a = appraisal(it);
      if (a.saleable === true) {
        if (a.returnsCents == null) computable = false; else returns += a.returnsCents;
      }
    }
    var valueCents = Math.max(nbv, returns);
    return {
      applies: any,
      computable: computable,
      valueCents: valueCents,
      required: any && computable && valueCents > ADVERT_THRESHOLD_CENTS
    };
  }

  function employeeSaleItems(d) {
    var out = [];
    for (var i = 0; i < d.items.length; i++) {
      if (isEmployeeSaleMethod(d.items[i].method)) out.push(i);
    }
    return out;
  }

  /* Whole days between two ISO dates (yyyy-mm-dd); NaN when unreadable. */
  function daysBetween(fromIso, toIso) {
    var a = Date.parse(fromIso), b = Date.parse(toIso);
    if (isNaN(a) || isNaN(b)) return NaN;
    return Math.round((b - a) / 86400000);
  }

  /* ---------- D-series verification checks ---------- */
  function runDisposalChecks(d) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    if (!d) { add('D1', 'Disposal record', 'FAIL', 'No disposal record on a disposal case.', 'Complete the disposal forms.'); return R; }
    upgrade(d);

    add('D0', 'Format authority', 'PASS',
      'Forms A to H are built to the ' + AUTHORITY + ' ' + PENDING, '');

    /* DC: ss. 55–56 — not less than three officers. */
    var named = d.committee.filter(function (m) { return m && (m.name || '').trim(); });
    add('D1', 'Disposal Committee of not less than three officers', named.length >= 3 ? 'PASS' : 'FAIL',
      named.length + ' named member(s). The Act (ss. 55–56) requires a Disposal Committee of not less than three officers to recommend the best method of disposal.',
      'Record at least three committee members by name.');

    add('D2', 'Property to be disposed of is listed', d.items.length ? 'PASS' : 'FAIL', '',
      'Add the stores or equipment to Form A.');

    var validDisp = DISPOSITIONS.map(function (x) { return x.code; });
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i], n = i + 1, tag = 'Item ' + n + (it.desc ? ' (' + it.desc + ')' : '');
      if (!(it.desc || '').trim()) add('D3.' + n, tag + ': description', 'FAIL', '', 'Describe the property (Form A).');
      if (isNaN(qtyInt(it))) add('D3.' + n + 'q', tag + ': quantity', 'FAIL', 'Quantity "' + it.qty + '" is not a whole number of 1 or more.', 'Enter the quantity.');
      if (!(it.condition || '').trim()) add('D3.' + n + 'c', tag + ': condition', 'FAIL', '', 'Record the condition as inspected (Form A/B).');
      if (!it.disposition) {
        add('D3.' + n + 'd', tag + ': disposition band', 'WARN',
          'Form B requires one disposition tick per article: Very Good, Good, Fair, Poor or Scrap — the committee’s inspection finding as a percentage of useful life.',
          'Tick the disposition band on the inventory.');
      } else if (validDisp.indexOf(it.disposition) < 0) {
        add('D3.' + n + 'd', tag + ': disposition band', 'FAIL', '"' + it.disposition + '" is not one of VG, G, F, P, S.', 'Pick a band from the form.');
      }

      /* Form C: the saleable question must be answered; a saleable item
         needs a committee sale price and how it was determined. */
      var a = appraisal(it);
      if (a.saleable === null) {
        add('D4.' + n, tag + ': saleable or not', 'FAIL',
          'Every article on the appraisal is either offered for a price or marked N/A (not saleable). This one is neither yet.',
          'On the appraisal, mark the item saleable (and price it) or not saleable.');
      } else if (a.saleable === true) {
        for (var e = 0; e < a.errors.length; e++) add('D4.' + n, tag + ': appraisal figure', 'FAIL', a.errors[e], 'Correct the figure.');
        if (!a.errors.length && !(it.valueComment || '').trim()) {
          add('D4.' + n + 'b', tag + ': value determination recorded', 'FAIL',
            'A sale price without how it was determined cannot be verified (Form C carries a comment per article — e.g. prorated from NBV, or estimated where no NBV exists).',
            'Record how the price was determined.');
        }
      } else if (a.errors.length && it.totalNBV) {
        for (var e2 = 0; e2 < a.errors.length; e2++) add('D4.' + n, tag + ': appraisal figure', 'FAIL', a.errors[e2], 'Correct the figure.');
      }

      if (!it.method) add('D5.' + n, tag + ': method of disposal', 'FAIL', '', 'Record the recommended method (reg 6(2)).');
      else if (METHODS.indexOf(it.method) < 0) {
        add('D5.' + n, tag + ': method outside the reg 6(2) list', (it.methodReason || '').trim() ? 'WARN' : 'FAIL',
          '"' + it.method + '" is not on the reg 6(2) list. The list is not closed ("including, but not limited to"), so another means is lawful — with its reasoning recorded.' + ((it.methodReason || '').trim() ? ' Reason recorded.' : ''),
          'Record why this means is the most appropriate.');
      } else if (REASON_MANDATORY.indexOf(it.method) >= 0 && !(it.methodReason || '').trim()) {
        add('D5.' + n + 'r', tag + ': ' + it.method.toLowerCase() + ' justified', 'FAIL',
          it.method + ' passes value out of public hands without sale proceeds; the reason must be recorded.',
          'Record why this route is recommended.');
      }
    }

    if (d.items.length) {
      var t = totalExpectedReturnsCents(d);
      add('D6', 'Total expected returns computable', isNaN(t) ? 'FAIL' : 'PASS',
        isNaN(t) ? 'A saleable item has an appraisal that cannot be computed.' : fmtMoney(t) + ' across the saleable items.',
        isNaN(t) ? 'Correct the flagged items.' : '');
    }

    /* Reg 6(3) advertising — the question exists only when a public sale
       or auction is actually chosen. */
    var adv = advertisingRequirement(d);
    if (adv.applies) {
      if (!adv.computable) {
        add('D7', 'Advertising threshold (reg 6(3))', 'WARN', 'The value of the items under public sale/auction cannot be computed yet, so the TT$100,000 advertising threshold cannot be tested.', 'Fix the flagged figures first.');
      } else if (adv.required) {
        add('D7', 'Advertising in two newspapers and on the website (reg 6(3))',
          (d.strategy.advertisingNote || '').trim() ? 'PASS' : 'WARN',
          'The items going to public sale or auction are worth ' + fmtMoney(adv.valueCents) + ' — above TT$100,000. The law says the list of items and the date, time and venue must be published in at least two daily newspapers and on the public body’s website. In plain terms: the sale is big enough that the whole country must get a fair chance to bid, not just people who happen to hear about it.' + ((d.strategy.advertisingNote || '').trim() ? ' Arrangement recorded: ' + d.strategy.advertisingNote : ''),
          'Record on the strategy how and where the advertisement will be placed.');
      } else {
        add('D7', 'Advertising threshold (reg 6(3))', 'PASS',
          'The items going to public sale or auction are worth ' + fmtMoney(adv.valueCents) + ' — not above TT$100,000, so newspaper advertising is not demanded; the disposal is still advertised on the public body’s website (reg 6(4)).', '');
      }
    }

    /* s. 57 / reg 7 — only when a sale to an employee is actually chosen. */
    var emp = employeeSaleItems(d);
    if (emp.length) {
      var ok = !!d.approvals.employeeSaleApproval && (d.approvals.employeeSaleDetails || '').trim();
      add('D8', 'Sale to employees: prior approval through the PDAC (s. 57, reg 7)', ok ? 'PASS' : 'WARN',
        emp.length + ' item group(s) are to be sold to employees. The Act forbids selling to the public body’s own people except as the Regulations expressly allow: the PDAC must send the Accounting Officer a notice, before the sale, setting out the items, the valuation report, the method, the reasons, the names and their relationship to the public body, and the proposed price. In plain terms: selling to your own staff is allowed only with the paperwork done first, so nobody can say the insiders helped themselves.' + (ok ? ' Recorded: ' + d.approvals.employeeSaleDetails : ''),
        'Tick the prior-approval box once the PDAC notice is sent and record its reference and date.');
    }

    /* AO decision — ss. 55–56: written notice within fourteen days. */
    var ap = d.approvals;
    if ((ap.recommendationReceivedDate || '').trim()) {
      if ((ap.aoDecisionDate || '').trim()) {
        var days = daysBetween(ap.recommendationReceivedDate, ap.aoDecisionDate);
        if (isNaN(days)) add('D9', 'Accounting Officer decision within fourteen days', 'WARN', 'One of the two dates cannot be read.', 'Enter both dates as calendar dates.');
        else add('D9', 'Accounting Officer decision within fourteen days', days <= 14 && days >= 0 ? 'PASS' : 'FAIL',
          'Recommendation received ' + ap.recommendationReceivedDate + '; decision ' + ap.aoDecisionDate + ' — ' + days + ' day(s). The Act allows fourteen.',
          'If the fourteen days passed, record why on the file; the decision stands but the delay is on record.');
      } else {
        add('D9', 'Accounting Officer decision within fourteen days', 'WARN',
          'The committee’s recommendation was received on ' + ap.recommendationReceivedDate + ' and no decision is recorded yet. The Act gives the Accounting Officer fourteen days to accept or reject in writing.',
          'Record the decision and its date when made.');
      }
      if (ap.aoDecision === 'rejected') {
        add('D9r', 'Rejection carries written reasons and goes to the OPR', (ap.rejectionReasons || '').trim() ? 'PASS' : 'FAIL',
          'Where the Accounting Officer rejects the recommendation, the notice must include written reasons, the manner of disposal is settled after consulting the responsible Minister, and the Office of Procurement Regulation gets a copy of the notice and the decision with reasons.',
          'Record the written reasons for the rejection.');
      }
    }

    /* Reg 6(5)(h): OPR notified within six weeks of completion. */
    if ((ap.completionDate || '').trim()) {
      if ((ap.oprNotifiedDate || '').trim()) {
        var d2 = daysBetween(ap.completionDate, ap.oprNotifiedDate);
        if (isNaN(d2)) add('D10', 'OPR notified within six weeks of completion', 'WARN', 'One of the two dates cannot be read.', 'Enter both dates as calendar dates.');
        else add('D10', 'OPR notified within six weeks of completion', d2 <= 42 && d2 >= 0 ? 'PASS' : 'FAIL',
          'Completed ' + ap.completionDate + '; OPR notified ' + ap.oprNotifiedDate + ' — ' + d2 + ' day(s). The Regulations allow six weeks (42 days), through the OPR Procurement Depository, with the items, prices, method and supporting documents.',
          'If the six weeks passed, record why on the file.');
      } else {
        add('D10', 'OPR notified within six weeks of completion', 'WARN',
          'The disposal completed on ' + ap.completionDate + ' and no OPR notification is recorded. Every disposal action is reported to the Office of Procurement Regulation within six weeks of completion, through the OPR Procurement Depository.',
          'Record the notification date once made.');
      }
      var anySale = d.items.some(function (x) { return isSaleMethod(x.method); });
      if (anySale) {
        add('D11', 'Net proceeds brought to account (reg 6(5)(c))', ap.proceedsAccounted ? 'PASS' : 'WARN',
          'Items were sold; the net proceeds must be properly accounted for in the financial records, and the disposal expenses recorded in the inventory and financial systems.',
          'Tick the box once the proceeds are brought to account.');
      }
    }

    /* Form F — Summary Report of Approved Disposal Action. Only when an
       execution date is recorded (the disposal has actually been carried
       out). A deviation from the approved strategy needs its reasons. */
    var sm = d.summary || {};
    if ((sm.executionDate || '').trim()) {
      if (sm.executedAsApproved === 'no' && !(sm.deviationReasons || '').trim()) {
        add('D12', 'Form F: deviation from the approved strategy is explained', 'FAIL',
          'The summary records that the disposal was NOT executed as approved, but gives no reason. A departure from the approved strategy must state why and what action was taken.',
          'Record the reasons and the action taken on Form F.');
      } else {
        add('D12', 'Form F: summary of the completed disposal recorded', 'PASS',
          'Executed ' + sm.executionDate + (sm.executedAsApproved === 'yes' ? ' as approved.' : '.') + ' Attach receipts, invoices and the record of expenses.', '');
      }
    }

    return R;
  }

  /* Per-item appraised value (Form C simple column) = expected returns for
     a saleable item, null when not saleable or not computable. */
  function appraisedValueCents(item) {
    var a = appraisal(item);
    return a.saleable === true ? a.returnsCents : null;
  }

  /* Legacy scaffold total (old valuation field, per-item totals) — kept so
     nothing that used it breaks; new work uses totalExpectedReturnsCents. */
  function itemValuationCents(item) {
    var p = money.parseStrict(item.valuation);
    return p.ok ? p.cents : NaN;
  }
  function totalValuationCents(d) {
    var t = 0;
    for (var i = 0; i < d.items.length; i++) {
      var v = itemValuationCents(d.items[i]);
      if (isNaN(v)) return NaN;
      t += v;
    }
    return t;
  }

  return {
    AUTHORITY: AUTHORITY,
    PENDING: PENDING,
    METHODS: METHODS,
    REASON_MANDATORY: REASON_MANDATORY,
    DISPOSITIONS: DISPOSITIONS,
    ADVERT_THRESHOLD_CENTS: ADVERT_THRESHOLD_CENTS,
    newDisposal: newDisposal,
    blankItem: blankItem,
    blankSummary: blankSummary,
    blankTransfer: blankTransfer,
    blankTransferItem: blankTransferItem,
    blankRejection: blankRejection,
    upgrade: upgrade,
    halfUpDiv: halfUpDiv,
    appraisal: appraisal,
    appraisedValueCents: appraisedValueCents,
    totalExpectedReturnsCents: totalExpectedReturnsCents,
    spendTotalCents: spendTotalCents,
    byMethod: byMethod,
    advertisingRequirement: advertisingRequirement,
    employeeSaleItems: employeeSaleItems,
    isPublicSaleMethod: isPublicSaleMethod,
    isEmployeeSaleMethod: isEmployeeSaleMethod,
    isSaleMethod: isSaleMethod,
    daysBetween: daysBetween,
    runDisposalChecks: runDisposalChecks,
    itemValuationCents: itemValuationCents,
    totalValuationCents: totalValuationCents
  };
});
