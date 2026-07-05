/* docs/disposaldocs.js — the disposal documents as the official OPR blank
   templates, Forms A–H (Disposal-Templates.docx), with the OPR Retention
   & Disposal Handbook (HGRD02 v3.0) and Sample Disposal Case Study #1 as
   supporting authority, under the Act (Part VI) and the Retention and
   Disposal of Personal Property Regulations 2021.

     Form A — Request for Asset Disposal (NBV column; three signatures)
     Form B — Inventory & Inspection Report (Unit/Total Cost; VG–S bands)
     Form C — Sample Appraisal Report (Item | Appraised Value | Total)
              + optional Appraisal Catalogue annex (the NBV working)
     Form D — Disposal Strategy Development Analysis & Report
     Form E — Disposal Strategy Approval Form
     Form F — Summary Report of Approved Disposal Action
     Form G — Transfer / Donation of Excess Personal Property
     Form H — Notice of Rejection

   Professional Output Standard: shared header/footer, aligned tables with
   repeating header rows (Word continuation), consistent signature blocks,
   and page control between forms — always within the official layout; the
   template governs, and nothing mandatory is dropped or reordered. An
   optional 'enhanced' output profile refines spacing/typography only.

   Registers 'disposal-form-a' … 'disposal-form-h' and
   'disposal-form-c-catalogue'. Loads as MODPA.docs.disposaldocs / require(). */
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
  var NA = '<span style="color:#888">N/A</span>';
  var dash = '<span style="color:#888">—</span>';

  function money0(cents) { return cents == null ? NA : fmtMoney(cents); }

  /* Is the enhanced output profile chosen for this case? Compliance-safe:
     it refines presentation only — never the mandated form structure. */
  function enhanced(caseFile) {
    return caseFile && caseFile.outputProfile === 'enhanced';
  }

  /* Shared professional header: an optional logo/letterhead slot (the
     templates print "INSERT YOUR LOGO HERE"), the form code and title, and
     the case reference line. */
  function header(caseFile, form, title) {
    var st = caseFile.docState;
    var d = caseFile.disposal || {};
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="formhead" style="border-bottom:2px solid #333;padding-bottom:6pt;margin-bottom:10pt">';
    h += '<table style="width:100%;border-collapse:collapse"><tr>' +
      '<td style="width:26%;vertical-align:top;color:#999;font-size:9pt;border:1px dashed #bbb;padding:8pt;text-align:center">' + (d.entity ? '<b style="color:#333;font-size:11pt">' + esc(d.entity) + '</b>' : 'INSERT YOUR LOGO HERE') + '</td>' +
      '<td style="vertical-align:middle;text-align:center"><div style="font-size:9.5pt;letter-spacing:1px;color:#555">' + esc(form) + '</div><div style="font-size:15pt;font-weight:bold">' + esc(title) + '</div></td>' +
      '</tr></table></div>';
    h += '<p style="text-align:center;margin-top:-2pt;font-size:10.5pt">' + esc(st.subject || d.entity || '[subject]') +
      (st.minfile ? ' &nbsp;·&nbsp; File: ' + esc(st.minfile) : '') +
      (st.date ? ' &nbsp;·&nbsp; ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    return h;
  }

  function footer() {
    return '<p style="font-size:9pt;color:#555;margin-top:20pt;border-top:1px solid #ccc;padding-top:6pt">' +
      esc(disposal.AUTHORITY) + ' ' + esc(disposal.PENDING) +
      ' Every derived figure on this form (unit costs, appraised value, totals) is computed by the system from the quantities and figures entered; nothing is invented.</p>';
  }

  /* A consistent, professional signature block. roles: [{role, name}]. */
  function signatures(roles, columns) {
    var cols = columns || 1;
    var w = Math.floor(100 / cols);
    var h = '<table style="width:100%;border-collapse:collapse;margin-top:16pt">';
    for (var i = 0; i < roles.length; i += cols) {
      h += '<tr>';
      for (var c = 0; c < cols; c++) {
        var r = roles[i + c];
        if (!r) { h += '<td style="width:' + w + '%"></td>'; continue; }
        h += '<td style="width:' + w + '%;vertical-align:top;padding:10pt 12pt 4pt 0">' +
          '<div style="border-top:1px solid #333;padding-top:2pt;font-size:10pt"><b>' + esc(r.role) + '</b></div>' +
          '<div style="font-size:9.5pt;color:#444">' + (r.name ? esc(r.name) : 'Name (block letters): ____________________') + '</div>' +
          '<div style="font-size:9.5pt;color:#444">Signature: ____________________&nbsp;&nbsp;Date: ____________</div>' +
          '</td>';
      }
      h += '</tr>';
    }
    return h + '</table>';
  }

  function labelGrid(pairs) {
    var h = '<table style="width:100%;border-collapse:collapse;font-size:11pt;margin:6pt 0">';
    for (var i = 0; i < pairs.length; i += 2) {
      h += '<tr><td style="padding:3pt 10pt 3pt 0;white-space:nowrap;vertical-align:top"><b>' + esc(pairs[i][0]) + ':</b> ' + esc(pairs[i][1] || '') + '</td>';
      if (pairs[i + 1]) h += '<td style="padding:3pt 0;vertical-align:top"><b>' + esc(pairs[i + 1][0]) + ':</b> ' + esc(pairs[i + 1][1] || '') + '</td></tr>';
      else h += '<td></td></tr>';
    }
    return h + '</table>';
  }

  function d(caseFile) { return disposal.upgrade(caseFile.disposal || disposal.newDisposal()); }

  /* ------------------- Form A — Request for Asset Disposal ------------ */
  function buildFormA(caseFile) {
    var dd = d(caseFile);
    var h = header(caseFile, 'FORM A', 'Request for Asset Disposal');
    h += labelGrid([
      ['Organisation Name', dd.entity], ['Business Unit / Department', dd.department],
      ['Location of Asset', dd.assetLocation], ['Date', dd.requestDate ? textutil.fmtDateShort(dd.requestDate) : '']
    ]);
    h += '<table class="cmp"><thead><tr><th style="width:4%">No.</th><th>Asset(s) Description</th><th style="width:9%">Make / Model</th><th>Reason for Disposal</th><th style="width:5%">Qty</th><th style="width:10%">Condition</th><th style="width:10%">Original Purchase Price</th><th style="width:8%">Purchase Date</th><th style="width:10%">Net Book Value (NBV)</th><th>Comments</th></tr></thead>';
    for (var i = 0; i < dd.items.length; i++) {
      var it = dd.items[i];
      var pp = it.originalUnitPrice && money.parseStrict(it.originalUnitPrice).ok ? fmtMoney(money.parseStrict(it.originalUnitPrice).cents) : (it.originalUnitPrice ? esc(it.originalUnitPrice) : NA);
      var nbv = it.totalNBV && money.parseStrict(it.totalNBV).ok ? fmtMoney(money.parseStrict(it.totalNBV).cents) : (it.totalNBV ? esc(it.totalNBV) : dash);
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td>' + (esc(it.makeModel || '') || NA) + '</td><td>' + esc(it.reason || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td><td>' + esc(it.condition || '') + '</td><td class="num">' + pp + '</td><td class="ctr">' + (it.purchaseDate ? esc(textutil.fmtDateShort(it.purchaseDate)) : NA) + '</td><td class="num">' + nbv + '</td><td>' + esc(it.comments || '') + '</td></tr>';
    }
    h += '</table>';
    h += '<p style="margin-top:8pt"><b>Other Information:</b> ' + (esc(dd.otherInformation || '') || '<span style="color:#888">Please include any literature, photographs or other information that may help with the disposal of the asset(s).</span>') + '</p>';
    h += signatures([
      { role: 'Submitted by Assigned Officer', name: dd.submittedBy },
      { role: 'Verified by Finance / Accounting Officer', name: dd.financeOfficer },
      { role: 'Received by Named Procurement Officer', name: dd.npoName }
    ], 1);
    h += '<div style="font-size:8.5pt;color:#666;margin-top:10pt;border-top:1px dotted #ccc;padding-top:5pt">' +
      '<p style="margin:2pt 0"><b>Note 1:</b> The Assigned Officer is per the Retention and Disposal of Personal Property Regulations, 2021, s. 5(5): a public body assigns a trained, technically capable officer to manage the receipt, storage, issuance and disposal identification of stores and equipment.</p>' +
      '<p style="margin:2pt 0"><b>Note 2:</b> Form A must be verified by a Finance / Accounting Officer to confirm the asset is properly recorded and valued (NBV) and to prevent losses or irregularities in the disposal.</p></div>';
    h += footer();
    return h;
  }

  /* ------------- Form B — Inventory & Inspection Report --------------- */
  function buildFormB(caseFile) {
    var dd = d(caseFile);
    var h = header(caseFile, 'FORM B', 'Inventory & Inspection Report Form');
    h += labelGrid([
      ['Organisation Name', dd.entity], ['Inventory & Inspection requested by (NPO)', dd.npoName],
      ['Location of Asset(s)', dd.assetLocation]
    ]);
    var bands = disposal.DISPOSITIONS.map(function (x) { return x.code; });
    h += '<table class="cmp"><thead>';
    h += '<tr><th style="width:4%" rowspan="2">No.</th><th colspan="7">Inventory Information</th><th colspan="5">Disposition</th></tr>';
    h += '<tr><th>Articles</th><th style="width:6%">Quantity</th><th style="width:10%">Unit Cost</th><th style="width:10%">Total Cost</th><th style="width:8%">Property No.</th><th style="width:8%">Date Acquired</th><th style="width:6%">Service Years</th>';
    for (var b = 0; b < bands.length; b++) h += '<th style="width:3.4%">' + bands[b] + '</th>';
    h += '</tr></thead>';
    for (var i = 0; i < dd.items.length; i++) {
      var it = dd.items[i];
      var unit = it.originalUnitPrice && money.parseStrict(it.originalUnitPrice).ok ? money.parseStrict(it.originalUnitPrice).cents : null;
      var qn = Number(it.qty);
      var totalCost = (unit != null && Number.isInteger(qn) && qn > 0) ? unit * qn : null;
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td><td class="num">' + money0(unit) + '</td><td class="num">' + money0(totalCost) + '</td><td class="ctr">' + (esc(it.propertyNo || '') || NA) + '</td><td class="ctr">' + (it.dateAcquired ? esc(textutil.fmtDateShort(it.dateAcquired)) : NA) + '</td><td class="ctr">' + (esc(String(it.serviceYears || '')) || NA) + '</td>';
      for (var b2 = 0; b2 < bands.length; b2++) h += '<td class="ctr">' + (it.disposition === bands[b2] ? '&#10003;' : '') + '</td>';
      h += '</tr>';
    }
    h += '</table>';
    h += '<p style="margin-top:8pt"><b>General Comments:</b> ' + (esc(dd.appraisalFindings || '') || '') + '</p>';
    h += '<p style="font-size:10.5pt">I CERTIFY that I have inspected each and every article enumerated in this report and that the disposition made thereof was, in my judgement, the best for the public interest.</p>';
    var committee = dd.committee.filter(function (m) { return m && (m.name || '').trim(); });
    var roles = [];
    for (var m = 0; m < Math.max(3, committee.length); m++) {
      var cm = committee[m];
      roles.push({ role: 'Disposal Committee Member ' + (m + 1) + (m === 2 ? ' (Subject Matter Expert)' : ''), name: cm ? cm.name : '' });
    }
    h += signatures(roles, 1);
    /* disposition key, verbatim */
    h += '<p style="font-weight:bold;margin-top:10pt;font-size:10pt">Definitions of Disposition classifications:</p>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:8.7pt"><tr>' + disposal.DISPOSITIONS.map(function (x) {
      return '<td style="border:1px solid #ccc;padding:4pt;vertical-align:top;width:20%"><b>' + esc(x.label) + '</b><br>' + esc(x.detail) + '</td>';
    }).join('') + '</tr></table>';
    h += footer();
    return h;
  }

  /* ------------- Form C — Sample Appraisal Report -------------------- */
  function buildFormC(caseFile) {
    var dd = d(caseFile);
    var h = header(caseFile, 'FORM C', 'Sample Appraisal Report');
    h += labelGrid([
      ['Organisation Name', dd.entity], ['Appraisal Report as of', dd.appraisalAsOf ? textutil.fmtDateShort(dd.appraisalAsOf) : '']
    ]);
    h += '<p><b>Subject:</b> Appraisal of the properties intended for disposal as listed under the attached Inventory and Inspection Report' + (dd.inventoryReportDated ? ' dated ' + esc(textutil.fmtDateShort(dd.inventoryReportDated)) : '') + '.</p>';
    if ((dd.appraisalFindings || '').trim()) h += '<p><b>Findings / Observations:</b> ' + esc(dd.appraisalFindings) + '</p>';
    h += '<p><b>Valuation Procedures / Considerations:</b> ' + (esc(dd.appraisalProcedures || '') || 'The condition of the subject properties was assessed through physical inspection; the appraised value is based on the available current market value (CMV) and the Guidelines on Appraisal of Personal Property.') + '</p>';
    var total = disposal.totalExpectedReturnsCents(dd);
    h += '<p><b>The total appraised value of the subject properties is ' + (isNaN(total) ? '[CHECK — a saleable item cannot be computed]' : '<span style="white-space:nowrap">' + words.amountInWords(total) + ' (' + fmtMoney(total) + ')</span>') + '.</b> Details as follows:</p>';
    h += '<table class="cmp"><thead><tr><th style="width:6%">No.</th><th>Item Description</th><th style="width:22%">Appraised Value</th></tr></thead>';
    for (var i = 0; i < dd.items.length; i++) {
      var it = dd.items[i];
      var av = disposal.appraisedValueCents(it);
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + (it.saleable === 'no' ? ' <span style="color:#888;font-size:9pt">(not saleable)</span>' : '') + '</td><td class="num">' + (av == null ? NA : fmtMoney(av)) + '</td></tr>';
    }
    h += '<tr><td colspan="2" class="num"><b>Total Appraised Value</b></td><td class="num"><b>' + (isNaN(total) ? 'CHECK' : fmtMoney(total)) + '</b></td></tr>';
    h += '</table>';
    h += '<p style="font-size:9.5pt;color:#555">For items or quantities greater than five, a separate catalogue is prepared and attached (see the optional Appraisal Catalogue, which shows how each appraised value was determined). Items marked N/A are not saleable and contribute nothing to the total.</p>';
    var committee = dd.committee.filter(function (m) { return m && (m.name || '').trim(); });
    var roles = [];
    for (var m = 0; m < Math.max(3, committee.length); m++) {
      roles.push({ role: 'Disposal Committee Member ' + (m + 1) + (m === 2 ? ' (Subject Matter Expert)' : ''), name: committee[m] ? committee[m].name : '' });
    }
    h += '<p style="margin-top:12pt"><b>Prepared by:</b></p>';
    h += signatures(roles, 3);
    h += footer();
    return h;
  }

  /* Optional Appraisal Catalogue — the NBV working the Case Study showed,
     attachable to Form C (the template invites a separate catalogue). */
  function buildFormCCatalogue(caseFile) {
    var dd = d(caseFile);
    var h = header(caseFile, 'FORM C — APPENDIX', 'Appraisal Catalogue');
    h += '<p style="font-size:10.5pt">This catalogue supports Form C. It shows how each appraised value was arrived at: the unit net book value and the derived figures where an NBV exists, and the committee’s sale price. All derived figures are computed (halves rounded up at the cent); items with no NBV are valued at the committee’s estimate.</p>';
    h += '<table class="cmp"><thead><tr><th style="width:4%">No.</th><th>Item Description</th><th style="width:5%">Qty</th><th style="width:11%">Unit NBV</th><th style="width:9%">20% NBV</th><th style="width:12%">Unit Appraised less 20%</th><th style="width:11%">Unit Sale Price</th><th style="width:12%">Total Appraised Value</th><th>Comments</th></tr></thead>';
    for (var i = 0; i < dd.items.length; i++) {
      var it = dd.items[i], a = disposal.appraisal(it);
      var salePrice = a.saleable === true ? (a.salePriceCents == null ? '<b>CHECK</b>' : fmtMoney(a.salePriceCents)) : NA;
      var returns = a.saleable === true ? (a.returnsCents == null ? '<b>CHECK</b>' : fmtMoney(a.returnsCents)) : NA;
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.unitNBVCents) : dash) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.pct20Cents) : dash) + '</td>' +
        '<td class="num">' + (a.hasNBV ? fmtMoney(a.less20Cents) : dash) + '</td>' +
        '<td class="num">' + salePrice + '</td><td class="num">' + returns + '</td>' +
        '<td style="font-size:9.5pt">' + esc(it.valueComment || '') + '</td></tr>';
    }
    var total = disposal.totalExpectedReturnsCents(dd);
    h += '<tr><td colspan="7" class="num"><b>Total Appraised Value</b></td><td class="num"><b>' + (isNaN(total) ? 'CHECK' : fmtMoney(total)) + '</b></td><td></td></tr>';
    h += '</table>';
    h += footer();
    return h;
  }

  /* ------------- Form D — Strategy Development Report ---------------- */
  function para(label, text) { return (text || '').trim() ? '<p><b>' + esc(label) + ':</b> ' + esc(text) + '</p>' : ''; }
  function section(title) { return '<p style="font-weight:bold;margin-top:12pt;border-bottom:1px solid #ccc;padding-bottom:2pt">' + esc(title) + '</p>'; }
  function buildFormD(caseFile) {
    var dd = d(caseFile);
    var s = dd.strategy;
    var h = header(caseFile, 'FORM D', 'Disposal Strategy Development Analysis & Report');

    h += section('Executive Summary');
    h += para('Background', s.background);
    h += para('Scope', s.scope);
    h += para('How this disposal supports programmatic / business objectives', s.businessSupport);
    h += para('Disposal objectives', s.objectives);
    h += para('Findings of research and analysis', s.findings);
    h += para('Disposal strategy options considered', s.optionsConsidered);
    h += '<p style="margin:8pt 0 2pt"><b>Recommended disposal strategy (per item):</b></p>';
    h += '<table class="cmp"><thead><tr><th style="width:5%">No.</th><th>Item</th><th style="width:38%">Recommended Strategy</th></tr></thead>';
    for (var i = 0; i < dd.items.length; i++) {
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(dd.items[i].desc || '') + '</td><td>' + (esc(dd.items[i].method || '') || '<b>[method not set]</b>') + (dd.items[i].methodReason ? ' — ' + esc(dd.items[i].methodReason) : '') + '</td></tr>';
    }
    h += '</table>';

    h += section('Disposal Requirement Analysis');
    h += para('Definition of the goods / services / works', s.requirementIssues);
    h += para('Summary of findings, needs assessment / feasibility', s.needsAssessment);
    var spend = (s.expenditure || []).filter(function (r) { return (r.detail || '').trim() || (r.amount || '').trim(); });
    if (spend.length) {
      h += '<p style="margin:8pt 0 2pt"><b>Spend analysis / estimated disposal expenditure:</b></p>';
      h += '<table class="cmp"><thead><tr><th>Details</th><th style="width:22%">Expenditure</th></tr></thead>';
      for (var e = 0; e < spend.length; e++) {
        var amt = spend[e].amount && money.parseStrict(spend[e].amount).ok ? fmtMoney(money.parseStrict(spend[e].amount).cents) : (spend[e].amount ? '<b>REJECTED: ' + esc(spend[e].amount) + '</b>' : '');
        h += '<tr><td>' + esc(spend[e].detail || '') + '</td><td class="num">' + amt + '</td></tr>';
      }
      var st2 = disposal.spendTotalCents(dd);
      h += '<tr><td class="num"><b>Total</b></td><td class="num"><b>' + (isNaN(st2) ? 'CHECK' : fmtMoney(st2)) + '</b></td></tr></table>';
    }
    h += para('Current demand / contractual issues', s.contractualIssues);
    h += para('Specification of requirements issues', s.applicableIssues);

    var stk = (s.stakeholders || []).filter(function (r) { return (r.name || '').trim() || (r.interest || '').trim(); });
    if (stk.length) {
      h += section('Stakeholder Analysis');
      h += '<table class="cmp"><thead><tr><th style="width:30%">Stakeholders</th><th>Needs / interest</th></tr></thead>';
      stk.forEach(function (r) { h += '<tr><td>' + esc(r.name || '') + '</td><td>' + esc(r.interest || '') + '</td></tr>'; });
      h += '</table>';
    }
    if ((s.stakeholderImpact || '').trim()) h += para('Analysis of stakeholder influence on the disposal objectives', s.stakeholderImpact);

    if ((s.marketResearch || '').trim()) { h += section('Market Analysis'); h += '<p>' + esc(s.marketResearch) + '</p>'; }
    if ((s.optionsAnalysis || '').trim()) { h += section('Disposal Strategy Options'); h += '<p>' + esc(s.optionsAnalysis) + '</p>'; }
    h += section('Preferred Disposal Strategy Recommendation');
    h += (s.recommendation || '').trim() ? '<p>' + esc(s.recommendation) + '</p>' : '<p style="color:#888">[Recommend the preferred strategy and how it best satisfies the disposal objectives.]</p>';

    var adv = disposal.advertisingRequirement(dd);
    if (adv.applies && adv.computable && adv.required) {
      h += '<p style="border:1px solid #9a6a00;color:#7a5400;padding:6pt 10pt;border-radius:5px"><b>Advertising (reg 6(3)):</b> the items going to public sale or auction are worth ' + fmtMoney(adv.valueCents) + ', above TT$100,000, so the list of items and the date, time and venue must be advertised in at least two daily newspapers and on the public body’s website.' + ((s.advertisingNote || '').trim() ? ' Arrangement recorded: ' + esc(s.advertisingNote) : ' <b>No advertising arrangement is recorded yet.</b>') + '</p>';
    }
    h += footer();
    return h;
  }

  /* ------------- Form E — Strategy Approval Form -------------------- */
  function buildFormE(caseFile) {
    var dd = d(caseFile);
    var st = caseFile.docState;
    var ap = dd.approvals;
    var h = header(caseFile, 'FORM E', 'Disposal Strategy Approval Form');
    h += '<p><b>Disposal of (name of items):</b> ' + (esc(st.subject || '') || '____________________________________') + '</p>';
    var committee = dd.committee.filter(function (m) { return m && (m.name || '').trim(); });
    var roles = [];
    for (var m = 0; m < Math.max(3, committee.length); m++) roles.push({ role: 'Disposal Committee Member', name: committee[m] ? committee[m].name : '' });
    h += '<p style="font-weight:bold;margin-top:8pt">Disposal Committee Members:</p>' + signatures(roles, 2);
    h += '<p style="margin-top:8pt"><b>Date Approved by Disposal Committee:</b> ' + (ap.strategyRequestDate ? esc(textutil.fmtDateShort(ap.strategyRequestDate)) : '______________') + '</p>';
    h += '<p style="font-weight:bold;margin-top:10pt">Reviewed by Named Procurement Officer:</p>' + signatures([{ role: 'Named Procurement Officer', name: dd.npoName }], 1);
    if (ap.npoReviewDate) h += '<p style="margin-top:-6pt;color:#555">Date: ' + esc(textutil.fmtDateShort(ap.npoReviewDate)) + '</p>';
    var pdac = (dd.pdac || []).filter(function (m) { return m && (m.name || '').trim(); });
    var pdacRoles = [];
    for (var p = 0; p < Math.max(4, pdac.length); p++) pdacRoles.push({ role: pdac[p] && pdac[p].post ? pdac[p].post : 'PDAC Member', name: pdac[p] ? pdac[p].name : '' });
    h += '<p style="font-weight:bold;margin-top:10pt">Reviewed by Procurement &amp; Disposal Advisory Committee (PDAC):</p>' + signatures(pdacRoles, 2);
    if (ap.pdacReviewDate) h += '<p style="margin-top:-6pt;color:#555">Date: ' + esc(textutil.fmtDateShort(ap.pdacReviewDate)) + '</p>';
    var approved = ap.aoDecision === 'approved', rejected = ap.aoDecision === 'rejected';
    h += '<p style="margin-top:14pt"><b>Approved:</b> [' + (approved ? '&#10003;' : '&nbsp;&nbsp;') + '] &nbsp;&nbsp; <b>Not Approved:</b> [' + (rejected ? '&#10003;' : '&nbsp;&nbsp;') + ']</p>';
    h += signatures([{ role: 'Accounting Officer / Equivalent', name: dd.aoName }], 1);
    if (ap.aoDecisionDate) h += '<p style="margin-top:-6pt;color:#555">Date: ' + esc(textutil.fmtDateShort(ap.aoDecisionDate)) + '</p>';
    h += '<p style="margin-top:10pt;color:#555">Enclosed: Forms A to D.</p>';
    h += footer();
    return h;
  }

  /* ------------- Form F — Summary Report of Approved Disposal Action -- */
  function buildFormF(caseFile) {
    var dd = d(caseFile);
    var sm = dd.summary || {};
    var h = header(caseFile, 'FORM F', 'Summary Report of Approved Disposal Action');
    h += '<p><b>Disposal Execution Date:</b> ' + (sm.executionDate ? esc(textutil.fmtDateShort(sm.executionDate)) : '____________________') + '</p>';
    var yes = sm.executedAsApproved === 'yes', no = sm.executedAsApproved === 'no';
    h += '<p><b>Was the disposal strategy executed as approved?</b> &nbsp; YES [' + (yes ? '&#10003;' : '&nbsp;&nbsp;') + '] &nbsp; NO [' + (no ? '&#10003;' : '&nbsp;&nbsp;') + ']</p>';
    if (no) h += '<p><b>If no, reasons and action taken:</b> ' + (esc(sm.deviationReasons || '') || '[to be recorded]') + '</p>';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10.5pt">';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;width:34%;vertical-align:top"><b>Summary of Disposal Proceedings</b></td><td style="border:1px solid #ccc;padding:6pt">' + esc(sm.proceedingsSummary || '') + '</td></tr>';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>Challenges Encountered During Disposal</b></td><td style="border:1px solid #ccc;padding:6pt">' + esc(sm.challenges || '') + '</td></tr>';
    var proceeds = sm.totalProceeds && money.parseStrict(sm.totalProceeds).ok ? fmtMoney(money.parseStrict(sm.totalProceeds).cents) + ' (' + words.amountInWords(money.parseStrict(sm.totalProceeds).cents) + ')' : (sm.totalProceeds ? '<b>REJECTED: ' + esc(sm.totalProceeds) + '</b>' : '');
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>Total Proceeds / Revenue Earned</b><br><span style="font-weight:normal;font-size:9pt;color:#666">(based on report from Cashier)</span></td><td style="border:1px solid #ccc;padding:6pt">' + proceeds + '</td></tr>';
    h += '</table>';
    h += signatures([{ role: 'Reviewed by Named Procurement Officer', name: dd.npoName }], 1);
    var pdac = (dd.pdac || []).filter(function (m) { return m && (m.name || '').trim(); });
    var pdacRoles = [];
    for (var p = 0; p < Math.max(3, pdac.length); p++) pdacRoles.push({ role: 'PDAC Member ' + (p + 1), name: pdac[p] ? pdac[p].name : '' });
    h += '<p style="font-weight:bold;margin-top:10pt">Reviewed by PDAC:</p>' + signatures(pdacRoles, 3);
    h += signatures([{ role: 'Reviewed by Accounting Officer', name: dd.aoName }], 1);
    h += '<p style="font-size:9pt;color:#555;margin-top:8pt">Note: attach all receipts, invoices or proof of payment for purchased items and a record of total expenses incurred in the disposal process. Enclosed: Forms A to E.</p>';
    h += footer();
    return h;
  }

  /* ------------- Form G — Transfer / Donation ----------------------- */
  function buildFormG(caseFile) {
    var dd = d(caseFile);
    var tr = dd.transfer || {};
    var h = header(caseFile, 'FORM G', 'Transfer / Donation of Excess Personal Property');
    h += '<table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin:6pt 0">';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;width:50%;vertical-align:top"><b>To — Requesting Organisation</b><br>' + (esc(tr.toOrg || '') || '<span style="color:#888">(full name &amp; address)</span>') + '</td>' +
      '<td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>From — Holding Entity</b><br>' + (esc(tr.fromEntity || dd.entity || '') || '<span style="color:#888">(full name &amp; address)</span>') + '</td></tr>';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>Ship To</b><br>' + (esc(tr.shipTo || '') || '<span style="color:#888">(consignee &amp; destination)</span>') + '</td>' +
      '<td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>Location of Property</b><br>' + (esc(tr.propertyLocation || dd.assetLocation || '') || '') + '</td></tr>';
    h += '</table>';
    h += '<p style="font-weight:bold;margin-top:6pt">Details of Property to be Transferred / Donated</p>';
    h += '<table class="cmp"><thead><tr><th style="width:14%">Stock Code</th><th style="width:10%">Item No.</th><th>Description</th><th style="width:10%">Unit</th><th style="width:12%">Quantity</th></tr></thead>';
    var items = (tr.items || []);
    if (items.length) {
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        h += '<tr><td>' + esc(it.stockCode || '') + '</td><td class="ctr">' + esc(it.itemNo || '') + '</td><td>' + esc(it.description || '') + '</td><td class="ctr">' + esc(it.unit || '') + '</td><td class="ctr">' + esc(String(it.quantity == null ? '' : it.quantity)) + '</td></tr>';
      }
    } else {
      h += '<tr><td colspan="5" style="color:#888;text-align:center">No transfer items recorded yet.</td></tr>';
    }
    h += '</table>';
    h += '<p style="margin-top:6pt"><b>Total Amount of Property Requesting:</b> ' + items.length + ' line(s)</p>';
    h += signatures([{ role: 'Items Received by', name: tr.receivedBy }], 1);
    h += '<p style="margin-top:8pt"><b>Comments:</b> ' + esc(tr.comments || '') + '</p>';
    h += footer();
    return h;
  }

  /* ------------- Form H — Notice of Rejection ----------------------- */
  function buildFormH(caseFile) {
    var dd = d(caseFile);
    var rj = dd.rejection || {};
    var ap = dd.approvals || {};
    var h = header(caseFile, 'FORM H', 'Notice of Rejection');
    h += '<table style="width:100%;border-collapse:collapse;font-size:10.5pt;margin:6pt 0">';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;width:34%;vertical-align:top"><b>Summary of Consultation with Line Minister</b></td><td style="border:1px solid #ccc;padding:6pt">' + esc(rj.lineMinisterConsultation || '') + '</td></tr>';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>Reasons for Rejection of the Proposal submitted by the Disposal Committee</b></td><td style="border:1px solid #ccc;padding:6pt">' + esc(rj.reasons || ap.rejectionReasons || '') + '</td></tr>';
    h += '<tr><td style="border:1px solid #ccc;padding:6pt;vertical-align:top"><b>New decision on how the property should be disposed, and reasoning</b></td><td style="border:1px solid #ccc;padding:6pt">' + esc(rj.newDecision || '') + '</td></tr>';
    h += '</table>';
    h += signatures([
      { role: 'Prepared by Accounting Officer', name: rj.preparedByAO || dd.aoName },
      { role: 'Confirmation of Line Minister', name: rj.lineMinisterName }
    ], 1);
    h += '<p style="font-size:9pt;color:#555;margin-top:8pt">Submit the signed and completed notice through: NPO &raquo; PDAC &raquo; Disposal Committee &raquo; to the Office of Procurement Regulation.</p>';
    h += footer();
    return h;
  }

  documents.registerBuilder('disposal-form-a', buildFormA);
  documents.registerBuilder('disposal-form-b', buildFormB);
  documents.registerBuilder('disposal-form-c', buildFormC);
  documents.registerBuilder('disposal-form-c-catalogue', buildFormCCatalogue);
  documents.registerBuilder('disposal-form-d', buildFormD);
  documents.registerBuilder('disposal-form-e', buildFormE);
  documents.registerBuilder('disposal-form-f', buildFormF);
  documents.registerBuilder('disposal-form-g', buildFormG);
  documents.registerBuilder('disposal-form-h', buildFormH);

  return {
    buildFormA: buildFormA, buildFormB: buildFormB, buildFormC: buildFormC,
    buildFormCCatalogue: buildFormCCatalogue, buildFormD: buildFormD,
    buildFormE: buildFormE, buildFormF: buildFormF, buildFormG: buildFormG,
    buildFormH: buildFormH
  };
});
