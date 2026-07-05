/* docs/disposaldocs.js — the disposal documents as the OPR Forms A–E,
   built to the OPR Retention & Disposal of Public Property Handbook
   (HGRD02 05-2023 v3.0) and the OPR Sample Disposal Case Study #1
   (Sept 2021 v1.0), under the Act (Part VI) and the Retention and
   Disposal of Personal Property Regulations 2021.

     Form A — Request for Asset Disposal
     Form B — Inventory & Inspection Report of Unserviceable Property
     Form C — Disposal Committee Appraisal Report (computed columns)
     Form D — Disposal Strategy Development Analysis & Report
     Form E — Disposal Strategy Approval / Signature Form

   Forms F, G, H and real-property layouts are not yet supplied; the
   footer of each form states that plainly. Registers 'disposal-form-a'
   … 'disposal-form-e'. Loads as MODPA.docs.disposaldocs / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../folio.js'), require('../disposal.js'),
      require('../verifycase.js'), require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.disposaldocs = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.folio, root.MODPA.disposal,
      root.MODPA.verifycase, root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, folio, disposal, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;
  var dash = '<span style="color:#888">—</span>';
  var NA = '<span style="color:#888">N/A</span>';

  function money0(cents) { return cents == null ? NA : fmtMoney(cents); }

  function footer() {
    return '<p style="font-size:9.5pt;color:#555;margin-top:20pt;border-top:1px solid #ccc;padding-top:6pt">' +
      esc(disposal.AUTHORITY) + ' ' + esc(disposal.PENDING) +
      ' Every derived figure on this form is computed by the system from the quantities and net book values entered; nothing is invented.</p>';
  }

  function header(caseFile, form, title) {
    var st = caseFile.docState;
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">' + esc(form) + '</div>';
    h += '<div style="text-align:center;font-weight:bold;margin-top:-4pt">' + esc(title) + '</div>';
    h += '<p style="text-align:center;margin-top:4pt">' + esc(st.subject || '[subject]') + '<br>File: ' + esc(st.minfile || st.ref || '[file number]') + (st.date ? ' &nbsp;·&nbsp; ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    return h;
  }

  function labelRow(pairs) {
    var h = '<table style="width:100%;border-collapse:collapse;font-size:11pt;margin:8pt 0">';
    for (var i = 0; i < pairs.length; i += 2) {
      h += '<tr><td style="padding:2pt 8pt 2pt 0;white-space:nowrap"><b>' + esc(pairs[i][0]) + ':</b> ' + esc(pairs[i][1] || '') + '</td>';
      if (pairs[i + 1]) h += '<td style="padding:2pt 0"><b>' + esc(pairs[i + 1][0]) + ':</b> ' + esc(pairs[i + 1][1] || '') + '</td></tr>';
      else h += '<td></td></tr>';
    }
    return h + '</table>';
  }

  function sigLine(role, name) {
    return '<p style="margin-top:16pt">' + esc(role) + ': ____________________________&nbsp;&nbsp;' +
      (name ? '(<b>' + esc(name) + '</b>)&nbsp;&nbsp;' : '') + 'Date: ______________</p>';
  }

  /* ---------------- Form A — Request for Asset Disposal ---------------- */
  function buildFormA(caseFile) {
    var d = disposal.upgrade(caseFile.disposal || disposal.newDisposal());
    var h = header(caseFile, 'FORM A', 'Request for Asset Disposal');
    h += labelRow([
      ['Name', d.entity], ['Business Unit / Department', d.department],
      ['Location of Asset', d.assetLocation], ['Date', d.requestDate ? textutil.fmtDateShort(d.requestDate) : '']
    ]);
    h += '<table class="cmp"><thead><tr><th style="width:4%">No.</th><th>Asset(s) Description (Articles)</th><th style="width:9%">Make / Model</th><th>Reason for Disposal</th><th style="width:5%">Qty</th><th style="width:11%">Condition</th><th style="width:11%">Original Purchase Price (Unit) TT$</th><th style="width:9%">Purchase Date</th><th>Comments</th></tr></thead>';
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      var pp = it.originalUnitPrice && money.parseStrict(it.originalUnitPrice).ok ? fmtMoney(money.parseStrict(it.originalUnitPrice).cents) : (it.originalUnitPrice ? esc(it.originalUnitPrice) : NA);
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td>' + (esc(it.makeModel || '') || NA) + '</td><td>' + esc(it.reason || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td><td>' + esc(it.condition || '') + '</td><td class="num">' + pp + '</td><td class="ctr">' + (it.purchaseDate ? esc(textutil.fmtDateShort(it.purchaseDate)) : NA) + '</td><td>' + esc(it.comments || '') + '</td></tr>';
    }
    h += '</table>';
    if ((d.otherInformation || '').trim()) h += '<p><b>Other Information:</b> ' + esc(d.otherInformation) + '</p>';
    h += sigLine('Submitted by Assigned Inventory / Requesting Officer', d.submittedBy);
    h += sigLine('Verified by Assigned Officer', d.verifiedBy);
    h += footer();
    return h;
  }

  /* -------- Form B — Inventory & Inspection Report ---------------------- */
  function buildFormB(caseFile) {
    var d = disposal.upgrade(caseFile.disposal || disposal.newDisposal());
    var h = header(caseFile, 'FORM B', 'Inventory & Inspection Report of Unserviceable Property');
    h += labelRow([
      ['Entity', d.entity], ['Name of Accountable Officer', d.npoName],
      ['Designation', d.npoDesignation]
    ]);
    var bands = disposal.DISPOSITIONS.map(function (x) { return x.code; });
    h += '<table class="cmp"><thead><tr><th style="width:4%">No.</th><th>Articles (1)</th><th style="width:6%">Qty (2)</th><th style="width:10%">Unit Cost (3)</th><th style="width:10%">Total Cost (4)</th><th style="width:8%">Property No. (5)</th><th style="width:8%">Date Acquired (6)</th><th style="width:6%">Service Years (7)</th><th style="width:11%">Total NBV (8)</th>';
    for (var b = 0; b < bands.length; b++) h += '<th style="width:3.5%">' + bands[b] + '</th>';
    h += '</tr></thead>';
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      var unit = it.originalUnitPrice && money.parseStrict(it.originalUnitPrice).ok ? money.parseStrict(it.originalUnitPrice).cents : null;
      var qn = Number(it.qty);
      var totalCost = (unit != null && Number.isInteger(qn) && qn > 0) ? unit * qn : null;
      var nbv = it.totalNBV && money.parseStrict(it.totalNBV).ok ? money.parseStrict(it.totalNBV).cents : null;
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td><td class="num">' + money0(unit) + '</td><td class="num">' + money0(totalCost) + '</td><td class="ctr">' + (esc(it.propertyNo || '') || NA) + '</td><td class="ctr">' + (it.dateAcquired ? esc(textutil.fmtDateShort(it.dateAcquired)) : NA) + '</td><td class="ctr">' + (esc(String(it.serviceYears || '')) || NA) + '</td><td class="num">' + (nbv == null ? dash : fmtMoney(nbv)) + '</td>';
      for (var b2 = 0; b2 < bands.length; b2++) h += '<td class="ctr">' + (it.disposition === bands[b2] ? '&#10003;' : '') + '</td>';
      h += '</tr>';
    }
    h += '</table>';
    h += '<p style="margin-top:10pt"><b>General Comments:</b> I HEREBY request inspection and disposition of the property enumerated above.</p>';
    h += sigLine('Requested by (Named Procurement Officer)', d.npoName);
    h += '<p style="margin-top:12pt">I CERTIFY that I have inspected each and every article enumerated in this report and that the disposition made thereof was, in my judgment, the best for the public interest.</p>';
    var committee = d.committee.filter(function (m) { return m && (m.name || '').trim(); });
    if (committee.length) {
      for (var m = 0; m < committee.length; m++) sigLine('', '');
      h += committee.map(function (mm) { return sigLine('Disposal Committee Member', mm.name); }).join('');
    } else {
      h += sigLine('Disposal Committee Member', '');
      h += sigLine('Disposal Committee Member', '');
      h += sigLine('Disposal Committee Member', '');
    }
    /* the disposition key, verbatim from the OPR form */
    h += '<table style="width:100%;border-collapse:collapse;font-size:9pt;margin-top:12pt">';
    h += '<tr>' + disposal.DISPOSITIONS.map(function (x) {
      return '<td style="border:1px solid #ccc;padding:4pt;vertical-align:top;width:20%"><b>' + esc(x.label) + '</b><br>' + esc(x.detail) + '</td>';
    }).join('') + '</tr></table>';
    h += footer();
    return h;
  }

  /* -------- Form C — Committee Appraisal Report (computed) -------------- */
  function buildFormC(caseFile) {
    var d = disposal.upgrade(caseFile.disposal || disposal.newDisposal());
    var h = header(caseFile, 'FORM C', 'Disposal Committee Appraisal Report');
    h += '<p><b>Subject:</b> Appraisal of the properties intended for disposal as listed in Forms A &amp; B.</p>';
    if ((d.appraisalFindings || '').trim()) h += '<p><b>Findings / Observations:</b> ' + esc(d.appraisalFindings) + '</p>';
    if ((d.appraisalProcedures || '').trim()) h += '<p><b>Valuation Procedures / Considerations:</b> ' + esc(d.appraisalProcedures) + '</p>';
    var total = disposal.totalExpectedReturnsCents(d);
    h += '<p><b>The total appraised value of the subject properties is ' + (isNaN(total) ? '[CHECK — a saleable item cannot be computed]' : '<span style="white-space:nowrap">' + words.amountInWords(total) + ' (' + fmtMoney(total) + ')</span>') + '.</b></p>';
    h += '<table class="cmp"><thead><tr><th style="width:4%">No.</th><th>Item Description</th><th style="width:5%">Qty</th><th style="width:11%">Unit NBV</th><th style="width:9%">20% NBV</th><th style="width:12%">Unit Appraised Value less 20%</th><th style="width:11%">Unit Sale Price</th><th style="width:12%">Total Expected Returns</th><th>Comments on Value / Price Determination</th></tr></thead>';
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i], a = disposal.appraisal(it);
      var returns = a.saleable === true ? (a.returnsCents == null ? '<b>CHECK</b>' : fmtMoney(a.returnsCents)) : NA;
      var salePrice = a.saleable === true ? (a.salePriceCents == null ? '<b>CHECK</b>' : fmtMoney(a.salePriceCents)) : NA;
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.unitNBVCents) : dash) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.pct20Cents) : dash) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.less20Cents) : dash) + '</td>' +
        '<td class="num">' + salePrice + '</td>' +
        '<td class="num">' + returns + '</td>' +
        '<td style="font-size:9.5pt">' + esc(it.valueComment || '') + '</td></tr>';
    }
    h += '<tr><td colspan="7" class="num"><b>Total Expected Returns</b></td><td class="num"><b>' + (isNaN(total) ? 'CHECK' : fmtMoney(total)) + '</b></td><td></td></tr>';
    h += '</table>';
    h += '<p style="font-size:10pt;color:#555">Unit NBV, 20% of NBV and appraised-value-less-20% are computed from the Total NBV and quantity entered on Form B (halves rounded up at the cent). The unit sale price is the committee’s decision, entered on the appraisal; total expected returns = quantity × unit sale price. Items marked N/A are not saleable and contribute nothing to the total.</p>';
    h += footer();
    return h;
  }

  /* -------- Form D — Disposal Strategy Development Analysis & Report ----- */
  function para(label, text) {
    return (text || '').trim() ? '<p><b>' + esc(label) + ':</b> ' + esc(text) + '</p>' : '';
  }
  function buildFormD(caseFile) {
    var d = disposal.upgrade(caseFile.disposal || disposal.newDisposal());
    var s = d.strategy;
    var h = header(caseFile, 'FORM D', 'Disposal Strategy Development Analysis & Report');

    h += '<p style="font-weight:bold;margin-top:8pt">I. Executive Summary</p>';
    h += para('Background', s.background);
    h += para('Scope', s.scope);
    h += para('How this disposal supports programmatic / business objectives', s.businessSupport);
    h += para('Disposal objectives', s.objectives);
    h += para('Findings from research and analysis', s.findings);
    h += para('Disposal strategy options considered', s.optionsConsidered);

    /* Table 1 — recommended strategy per item, straight from each item's method */
    h += '<p style="margin:8pt 0 2pt"><b>Table 1 — Recommended strategy per item</b></p>';
    h += '<table class="cmp"><thead><tr><th style="width:5%">No.</th><th>Item</th><th style="width:38%">Recommended Strategy</th></tr></thead>';
    for (var i = 0; i < d.items.length; i++) {
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(d.items[i].desc || '') + '</td><td>' + (esc(d.items[i].method || '') || '<b>[method not set]</b>') + (d.items[i].methodReason ? ' — ' + esc(d.items[i].methodReason) : '') + '</td></tr>';
    }
    h += '</table>';

    h += '<p style="font-weight:bold;margin-top:10pt">II. Disposal Requirement Analysis</p>';
    h += para('Specification / requirement issues', s.requirementIssues);
    h += para('Needs assessment / feasibility', s.needsAssessment);
    /* Table 3 — spend analysis, computed */
    var spend = (s.expenditure || []).filter(function (r) { return (r.detail || '').trim() || (r.amount || '').trim(); });
    if (spend.length) {
      h += '<p style="margin:8pt 0 2pt"><b>Table 3 — Estimated disposal expenditure</b></p>';
      h += '<table class="cmp"><thead><tr><th>Details</th><th style="width:22%">Expenditure</th></tr></thead>';
      for (var e = 0; e < spend.length; e++) {
        var amt = spend[e].amount && money.parseStrict(spend[e].amount).ok ? fmtMoney(money.parseStrict(spend[e].amount).cents) : (spend[e].amount ? '<b>REJECTED: ' + esc(spend[e].amount) + '</b>' : '');
        h += '<tr><td>' + esc(spend[e].detail || '') + '</td><td class="num">' + amt + '</td></tr>';
      }
      var st2 = disposal.spendTotalCents(d);
      h += '<tr><td class="num"><b>Total</b></td><td class="num"><b>' + (isNaN(st2) ? 'CHECK' : fmtMoney(st2)) + '</b></td></tr>';
      h += '</table>';
    }
    h += para('Current demand / contractual issues', s.contractualIssues);
    h += para('Applicable issues for the disposal requirement', s.applicableIssues);

    /* Table 4 — stakeholders */
    var stk = (d.strategy.stakeholders || []).filter(function (r) { return (r.name || '').trim() || (r.interest || '').trim(); });
    if (stk.length) {
      h += '<p style="font-weight:bold;margin-top:10pt">III. Stakeholder Analysis</p>';
      h += '<table class="cmp"><thead><tr><th style="width:30%">Stakeholders</th><th>Level of Interest</th></tr></thead>';
      for (var k = 0; k < stk.length; k++) h += '<tr><td>' + esc(stk[k].name || '') + '</td><td>' + esc(stk[k].interest || '') + '</td></tr>';
      h += '</table>';
    }
    if ((s.stakeholderImpact || '').trim()) h += para('Analysis of stakeholder influence on the disposal objectives', s.stakeholderImpact);

    if ((s.marketResearch || '').trim()) { h += '<p style="font-weight:bold;margin-top:10pt">IV. Market Research &amp; Analysis</p>'; h += '<p>' + esc(s.marketResearch) + '</p>'; }
    if ((s.optionsAnalysis || '').trim()) { h += '<p style="font-weight:bold;margin-top:10pt">V. Disposal Strategy Options</p>'; h += '<p>' + esc(s.optionsAnalysis) + '</p>'; }
    h += '<p style="font-weight:bold;margin-top:10pt">VI. Preferred Disposal Strategy Recommendation</p>';
    h += (s.recommendation || '').trim() ? '<p>' + esc(s.recommendation) + '</p>' : '<p style="color:#888">[Recommendation to be recorded.]</p>';

    /* Reg 6(3) advertising note surfaced on the strategy where it applies */
    var adv = disposal.advertisingRequirement(d);
    if (adv.applies && adv.computable && adv.required) {
      h += '<p style="border:1px solid #9a6a00;color:#7a5400;padding:6pt 10pt;border-radius:5px"><b>Advertising (reg 6(3)):</b> the items going to public sale or auction are worth ' + fmtMoney(adv.valueCents) + ', above TT$100,000, so the list of items and the date, time and venue must be advertised in at least two daily newspapers and on the public body’s website.' + ((s.advertisingNote || '').trim() ? ' Arrangement recorded: ' + esc(s.advertisingNote) : ' <b>No advertising arrangement is recorded yet.</b>') + '</p>';
    }
    h += footer();
    return h;
  }

  /* -------- Form E — Disposal Strategy Approval / Signature Form -------- */
  function buildFormE(caseFile) {
    var d = disposal.upgrade(caseFile.disposal || disposal.newDisposal());
    var st = caseFile.docState;
    var ap = d.approvals;
    var h = header(caseFile, 'FORM E', 'Disposal Strategy Approval / Signature Form');
    h += labelRow([
      ['Disposal of', st.subject || ''], ['Disposal Request Reference', d.requestRef || '']
    ]);
    h += sigLine('Senior / Procurement Officer — Team Leader', d.npoName);
    h += '<p style="margin-top:14pt"><b>Strategy Development Team / Disposal Committee Members:</b></p>';
    var committee = d.committee.filter(function (m) { return m && (m.name || '').trim(); });
    if (committee.length) h += committee.map(function (m) { return sigLine('Member', m.name); }).join('');
    else { h += sigLine('Member', ''); h += sigLine('Member', ''); h += sigLine('Member', ''); }

    h += '<p style="margin-top:14pt"><b>Request for Approval of Strategy:</b> Date: ' + (ap.strategyRequestDate ? esc(textutil.fmtDateShort(ap.strategyRequestDate)) : '______________') + '</p>';
    h += sigLine('Reviewed by Named Procurement Officer', d.npoName);
    if (ap.npoReviewDate) h += '<p style="margin-top:-6pt;color:#555">Reviewed ' + esc(textutil.fmtDateShort(ap.npoReviewDate)) + '</p>';

    h += '<p style="margin-top:14pt"><b>Reviewed by Procurement &amp; Disposal Advisory Committee (PDAC):</b></p>';
    var pdac = (d.pdac || []).filter(function (m) { return m && (m.name || '').trim(); });
    if (pdac.length) h += pdac.map(function (m) { return sigLine(m.post || 'PDAC Member', m.name); }).join('');
    else { h += sigLine('PDAC Member', ''); h += sigLine('PDAC Member', ''); h += sigLine('Subject Matter Specialist', ''); }
    if (ap.pdacReviewDate) h += '<p style="margin-top:-6pt;color:#555">Reviewed ' + esc(textutil.fmtDateShort(ap.pdacReviewDate)) + '</p>';

    /* AO decision box */
    var approved = ap.aoDecision === 'approved';
    var rejected = ap.aoDecision === 'rejected';
    h += '<p style="margin-top:16pt"><b>Approved:</b> [' + (approved ? '&#10003;' : '&nbsp;&nbsp;') + '] &nbsp;&nbsp; <b>Not Approved:</b> [' + (rejected ? '&#10003;' : '&nbsp;&nbsp;') + ']</p>';
    if (rejected && (ap.rejectionReasons || '').trim()) h += '<p><b>Reasons for rejection:</b> ' + esc(ap.rejectionReasons) + '</p>';
    h += sigLine('Accounting Officer / Equivalent', d.aoName);
    if (ap.aoDecisionDate) h += '<p style="margin-top:-6pt;color:#555">Decision dated ' + esc(textutil.fmtDateShort(ap.aoDecisionDate)) + (ap.recommendationReceivedDate ? '; recommendation received ' + esc(textutil.fmtDateShort(ap.recommendationReceivedDate)) + ' (the Act allows fourteen days)' : '') + '</p>';
    h += '<p style="margin-top:10pt;color:#555">Enclosed: Forms A to D.</p>';
    h += footer();
    return h;
  }

  documents.registerBuilder('disposal-form-a', buildFormA);
  documents.registerBuilder('disposal-form-b', buildFormB);
  documents.registerBuilder('disposal-form-c', buildFormC);
  documents.registerBuilder('disposal-form-d', buildFormD);
  documents.registerBuilder('disposal-form-e', buildFormE);

  return {
    buildFormA: buildFormA,
    buildFormB: buildFormB,
    buildFormC: buildFormC,
    buildFormD: buildFormD,
    buildFormE: buildFormE
  };
});
