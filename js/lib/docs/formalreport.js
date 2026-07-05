/* docs/formalreport.js — the formal Evaluation Report, to the OPR Tender
   Evaluation Report Template (Appendix II of the Evaluation of Submissions
   guideline): Introduction; Background; Evaluation of Bids (Team, Criteria
   and Scoring, Methodology, Preliminary Examination, Technical Evaluation
   with the score-summary table, Commercial Evaluation with verified
   pricing, Clarification, Ranking, Negotiations); Recommendation for Award
   (amount in words, VAT INCLUSIVE); signatures; appendices. Registers
   'formal-report'. Loads as MODPA.docs.formalreport / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../formal.js'), require('../verifycase.js'),
      require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.formalreport = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.formal, root.MODPA.verifycase, root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, formal, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  function para(text) { return (text || '').trim() ? '<p>' + esc(text).replace(/\n\n+/g, '</p><p>') + '</p>' : ''; }

  function build(caseFile) {
    var f = caseFile.formal || formal.newFormal();
    var st = caseFile.docState;
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">EVALUATION REPORT</div>';
    h += '<p style="text-align:center;margin-top:-4pt">' + esc(f.solicitationType === 'ITB' ? 'INVITATION TO BID' : 'REQUEST FOR PROPOSALS') +
      ' FOR ' + esc(f.rfpTitle || st.subject || '[title]') + '<br>' + esc(f.solicitationType || 'RFP') + ' #: ' + esc(f.rfpNumber || '[number]') +
      (f.reportDate ? '<br>' + esc(textutil.fmtDateProse(f.reportDate)) : '') + '</p>';

    /* 1. Introduction */
    h += '<h3>Introduction</h3>';
    h += para(f.introduction) || '<p style="color:#888">[Reason for the project.]</p>';

    /* 2. Background */
    h += '<h3>Background</h3>';
    h += para(f.background) || '<p style="color:#888">[Project initiation, prior approval, invitation, submission deadline, firms that submitted, tender-opening procedure.]</p>';
    if ((f.submissionDeadline || '').trim() || (f.tenderOpening || '').trim()) {
      h += '<p>';
      if ((f.submissionDeadline || '').trim()) h += '<b>Submission deadline:</b> ' + esc(f.submissionDeadline) + '. ';
      if ((f.tenderOpening || '').trim()) h += '<b>Tender opening:</b> ' + esc(f.tenderOpening) + '.';
      h += '</p>';
    }
    var submitted = f.proponents.filter(function (p) { return (p.name || '').trim(); });
    if (submitted.length) {
      h += '<p>The following ' + textutil.countWord(submitted.length) + ' (' + submitted.length + ') firm(s) submitted a proposal:</p><ol>';
      for (var s = 0; s < submitted.length; s++) h += '<li>' + esc(submitted[s].name) + '</li>';
      h += '</ol>';
    }

    /* 3. Evaluation of Bids */
    h += '<h3>Evaluation of Bids</h3>';
    h += '<h4>Evaluation Team</h4>';
    if (f.committee.length) {
      h += '<table class="cert"><thead><tr><th>Name</th><th>Job title</th><th>Role on the committee</th><th style="width:12%">Declarations</th></tr></thead>';
      for (var m = 0; m < f.committee.length; m++) {
        var mm = f.committee[m];
        h += '<tr><td>' + esc(mm.name || '') + '</td><td>' + esc(mm.jobTitle || '') + '</td><td>' + esc(mm.role || '') + '</td><td>' + (mm.coiSigned ? 'Signed' : '<b style="color:#b3261e">not signed</b>') + '</td></tr>';
      }
      h += '</table>';
    } else h += '<p style="color:#888">[Team composition.]</p>';

    h += '<h4>Evaluation Criteria and Scoring System</h4>';
    if (f.mandatoryCriteria.filter(function (c) { return (c.name || '').trim(); }).length) {
      h += '<p><b>Mandatory (pass/fail) criteria:</b></p><ul>';
      f.mandatoryCriteria.forEach(function (c) { if ((c.name || '').trim()) h += '<li>' + esc(c.name) + '</li>'; });
      h += '</ul>';
    }
    var maxT = formal.maxTechnicalPoints(f);
    if (f.criteria.length) {
      h += '<table class="cert"><thead><tr><th style="width:6%">No.</th><th>Weighted criterion</th><th>Description</th><th style="width:14%">Maximum points</th></tr></thead>';
      for (var c = 0; c < f.criteria.length; c++) {
        h += '<tr><td class="r">' + (c + 1) + '</td><td>' + esc(f.criteria[c].name || '') + '</td><td style="font-size:9.5pt">' + esc(f.criteria[c].description || '') + '</td><td class="r">' + esc(String(f.criteria[c].maxPoints || '')) + '</td></tr>';
      }
      h += '<tr><td colspan="3" class="r"><b>Maximum technical score</b></td><td class="r"><b>' + (isNaN(maxT) ? 'CHECK' : maxT) + '</b></td></tr>';
      h += '</table>';
    } else h += '<p style="color:#888">[Criteria from the solicitation document.]</p>';
    var min = f.minTechnicalScore;
    if (String(min).trim()) h += '<p>The minimum technical score for a proposal to be carried to the price evaluation is <b>' + esc(String(min)) + '</b> points.</p>';

    h += '<h4>Evaluation Methodology</h4>';
    h += '<p>The evaluation methodology was as follows:</p><ol>' +
      '<li>Proposals received were reviewed to ensure compliance with the requirements of the ' + esc(f.solicitationType || 'RFP') + ' (Preliminary Examination).</li>' +
      '<li>Proposals deemed compliant were accepted for Technical Evaluation on the basis of the pre-determined evaluation criteria and scoring system shown above.</li>' +
      '<li>The price proposals of the firms that achieved at least the minimum score of ' + esc(String(min || '____')) + ' in the Technical Evaluation were examined to verify the integrity of the prices quoted.</li>' +
      '<li>Clarification was sought where required (arithmetic corrections only).</li>' +
      '<li>The Technical and Financial scores were normalised to rank the proposals and identify the top-ranked proponent.</li></ol>';
    if ((f.methodologyNote || '').trim()) h += para(f.methodologyNote);

    /* Preliminary examination */
    h += '<h4>Results of the Preliminary Examination</h4>';
    var compliant = [], nonCompliant = [];
    for (var pi = 0; pi < f.proponents.length; pi++) {
      if (!(f.proponents[pi].name || '').trim()) continue;
      (f.proponents[pi].compliant === 'yes' ? compliant : nonCompliant).push(pi);
    }
    h += '<p>The submissions were reviewed for compliance. After the preliminary examination, ' +
      textutil.countWord(compliant.length) + ' (' + compliant.length + ') of the ' + textutil.countWord(submitted.length) + ' (' + submitted.length + ') firm(s) that submitted a proposal were deemed compliant. The compliance checklist is attached as an appendix.</p>';
    if (nonCompliant.length) {
      h += '<table class="cert"><thead><tr><th>Non-compliant proponent</th><th>Reason</th></tr></thead>';
      nonCompliant.forEach(function (pi) { h += '<tr><td>' + esc(f.proponents[pi].name) + '</td><td>' + esc(f.proponents[pi].complianceNote || '[reason]') + '</td></tr>'; });
      h += '</table>';
    }

    /* Technical evaluation — the score summary table */
    h += '<h4>Results of the Technical Evaluation</h4>';
    if (compliant.length && f.criteria.length) {
      h += '<table class="cert"><thead><tr><th>Proponent</th>';
      for (var c2 = 0; c2 < f.criteria.length; c2++) h += '<th class="r">' + esc(f.criteria[c2].name || ('Criterion ' + (c2 + 1))) + '<br><span style="font-weight:normal">/' + esc(String(f.criteria[c2].maxPoints || '')) + '</span></th>';
      h += '<th class="r">Total<br><span style="font-weight:normal">/' + (isNaN(maxT) ? '—' : maxT) + '</span></th><th class="r">Gate</th></tr></thead>';
      compliant.forEach(function (pi) {
        var tt = formal.technicalTotal(f, pi);
        h += '<tr><td>' + esc(f.proponents[pi].name) + '</td>';
        for (var c3 = 0; c3 < f.criteria.length; c3++) {
          var sc = formal.techScore(f, pi, c3);
          h += '<td class="r">' + (sc == null ? '—' : sc) + '</td>';
        }
        h += '<td class="r"><b>' + tt.total + '</b></td><td class="r">' + (formal.passesGate(f, pi) ? 'Pass' : '<b>Below</b>') + '</td></tr>';
      });
      h += '</table><p>The evaluation matrix is attached as an appendix.</p>';
    } else h += '<p style="color:#888">[Technical evaluation of the compliant proposals against the pre-determined criteria.]</p>';

    /* Commercial evaluation */
    h += '<h4>Evaluation of Price Proposal (Commercial Evaluation)</h4>';
    var gate = compliant.filter(function (pi) { return formal.passesGate(f, pi); });
    if (gate.length) {
      h += '<p>The proposals that achieved at least the minimum score of ' + esc(String(min || '____')) + ' were examined to ensure that all items were priced and that there were no arithmetic errors. The verified pricing (VAT inclusive) is shown below.</p>';
      h += '<table class="cert"><thead><tr><th>Proponent</th><th class="r">Verified price (VAT inclusive)</th><th>Arithmetic check</th></tr></thead>';
      gate.forEach(function (pi) {
        var pc = formal.verifiedPriceCents(f, pi);
        h += '<tr><td>' + esc(f.proponents[pi].name) + '</td><td class="r">' + (isNaN(pc) ? 'CHECK' : fmtMoney(pc)) + '</td><td style="font-size:9.5pt">' + esc((f.prices[pi] && f.prices[pi].arithmeticNote) || '') + '</td></tr>';
      });
      h += '</table>';
    } else h += '<p style="color:#888">[Verified pricing of the proposals meeting the technical gate.]</p>';

    /* Clarification */
    var clar = (f.clarifications || []).filter(function (c) { return (c.summary || '').trim() || c.proponent != null; });
    if (clar.length) {
      h += '<h4>Clarification of Submissions</h4><table class="cert"><thead><tr><th>Proponent</th><th style="width:12%">Issued</th><th style="width:12%">Received</th><th>Summary</th></tr></thead>';
      clar.forEach(function (c) {
        var pn = (f.proponents[c.proponent] || {}).name || '';
        h += '<tr><td>' + esc(pn) + '</td><td>' + esc(c.issued || '') + '</td><td>' + esc(c.received || '') + '</td><td style="font-size:9.5pt">' + esc(c.summary || '') + '</td></tr>';
      });
      h += '</table><p>Copies of the requests and responses are attached as an appendix.</p>';
    }

    /* Ranking */
    h += '<h4>Ranking of the Proposals</h4>';
    var r = formal.ranking(f);
    if (r.ok && r.rows.length) {
      h += '<p>The Technical and Financial scores were normalised using the pre-determined weighting (' +
        esc(String(f.technicalWeight)) + '% technical, ' + esc(String(f.financialWeight)) + '% financial' +
        ((f.rankingFormula || '').trim() ? '; ' + esc(f.rankingFormula) : '') + '). The proponents ranked as follows:</p>';
      h += '<table class="cert"><thead><tr><th class="r">Rank</th><th>Proponent</th><th class="r">Technical</th><th class="r">Financial</th><th class="r">Combined</th></tr></thead>';
      r.rows.forEach(function (row) {
        h += '<tr><td class="r">' + row.rank + '</td><td>' + esc(row.name) + '</td><td class="r">' + row.techPct + '</td><td class="r">' + row.finPct + '</td><td class="r"><b>' + row.combinedPct + '</b></td></tr>';
      });
      h += '</table>';
    } else h += '<p style="color:#888">[Ranking by the pre-determined formula once scores and verified prices are complete.]</p>';

    if ((f.negotiationNote || '').trim()) { h += '<h4>Negotiations</h4>'; h += para(f.negotiationNote); }

    /* Recommendation for Award — VAT INCLUSIVE, amount in words */
    h += '<h3>Recommendation for Award of Contract</h3>';
    var rec = f.recommendedProponent != null ? f.proponents[f.recommendedProponent] : null;
    var recCents = f.recommendedProponent != null ? formal.verifiedPriceCents(f, f.recommendedProponent) : NaN;
    if (rec && !isNaN(recCents)) {
      h += '<p>Based on the foregoing, the Evaluation Committee recommends that the award of contract for ' +
        esc(f.rfpTitle || st.subject || '[title]') + ' be awarded to <b>' + esc(rec.name) + '</b> in the amount of <b>' +
        esc(words.amountInWords(recCents).toUpperCase()) + ' VAT INCLUSIVE (' + fmtMoney(recCents) + ')</b>.</p>';
    } else {
      h += '<p style="color:#888">[Recommendation for award — the amount in words, VAT INCLUSIVE, once the recommendation is recorded.]</p>';
    }
    if ((f.recommendationNote || '').trim()) h += para(f.recommendationNote);

    /* Signatures — every committee member signs */
    h += '<p style="margin-top:22pt">For the Evaluation Committee:</p>';
    if (f.committee.length) {
      f.committee.forEach(function (mm) {
        h += '<p style="margin-top:18pt">Name: <b>' + esc(mm.name || '') + '</b>&nbsp;&nbsp;Signature: ____________________________&nbsp;&nbsp;Date: ______________</p>';
      });
    } else {
      h += '<p style="margin-top:18pt">Name: ____________________&nbsp;&nbsp;Signature: ____________________&nbsp;&nbsp;Date: ____________</p>';
    }
    if ((f.pdacReview || '').trim()) h += '<p style="margin-top:14pt"><b>PDAC review:</b> ' + esc(f.pdacReview) + '</p>';
    if ((f.aoReview || '').trim()) h += '<p><b>Accounting Officer:</b> ' + esc(f.aoReview) + '</p>';

    h += '<p style="font-size:9.5pt;color:#555;margin-top:20pt;border-top:1px solid #ccc;padding-top:6pt">Appendices: compliance checklist; evaluation matrix; requests for clarification and responses; negotiation minutes (if any); the signed Conflict of Interest and Confidentiality declarations. Built to the ' + esc(formal.AUTHORITY) + ' The ranking is computed from the committee’s own scores and the solicitation’s own weights; no figure is invented.</p>';
    return h;
  }

  documents.registerBuilder('formal-report', build);
  return { build: build };
});
