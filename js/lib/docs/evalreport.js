/* docs/evalreport.js — the Evaluation Committee outputs (pathway P3):
   the full worksheet document and the evaluation report. Registers
   'eval-worksheet' and 'eval-report' with the dispatcher.
   Loads as MODPA.docs.evalreport / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../evaluation.js'), require('../verifycase.js'),
      require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.evalreport = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.evaluation, root.MODPA.verifycase,
      root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, evaluation, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  function header(caseFile, title) {
    var st = caseFile.docState;
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">' + esc(title) + '</div>';
    h += '<p style="text-align:center;margin-top:-6pt"><b>' + esc(st.subject || '[subject]') + '</b><br>File: ' + esc(st.minfile || st.ref || '[file number]') + (st.date ? ' &nbsp;·&nbsp; Date: ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    return h;
  }

  function buildWorksheet(caseFile) {
    var ev = caseFile.evaluation;
    var h = header(caseFile, 'EVALUATION WORKSHEET');
    if (!ev || !ev.items.length) return h + '<p>[No evaluation data entered.]</p>';
    h += evaluation.worksheetHTML(ev);
    h += '<p style="font-size:10.5pt">V marks a VAT-applicable cell. Pack conversions and comparable rates are computed from the recorded pack size; the comparison uses exact arithmetic, not rounded rates. [LOWEST] marks the computed lowest compliant quotation; [OVERRIDE] and [SELECTED — tied lowest] mark committee selections, with their justifications carried into the report and the verification certificate.</p>';
    return h;
  }

  function buildReport(caseFile) {
    var ev = caseFile.evaluation;
    var h = header(caseFile, 'EVALUATION REPORT');
    if (!ev || !ev.items.length) return h + '<p>[No evaluation data entered.]</p>';
    var quoted = ev.suppliers.filter(function (s) { return s.status === 'quoted'; });
    var dnq = evaluation.didNotQuote(ev);
    h += '<p>Quotations were invited from ' + textutil.countWord(ev.suppliers.length) + ' (' + ev.suppliers.length + ') suppliers; ' +
      textutil.countWord(quoted.length) + ' (' + quoted.length + ') quoted' +
      (dnq.length ? ' and ' + textutil.countWord(dnq.length) + ' (' + dnq.length + ') did not quote' : '') +
      '. The comparison of every quoted item is at the attached worksheet; the committee’s determinations are set out below.</p>';
    /* per-item determinations, overrides spelled out */
    h += '<table class="cert"><thead><tr><th style="width:5%">No.</th><th>Item</th><th style="width:22%">Determination</th><th>Basis</th></tr></thead>';
    for (var i = 0; i < ev.items.length; i++) {
      var sel = evaluation.effectiveSelection(ev, i);
      var det, basis;
      if (sel.supIdx == null) {
        det = '<b>UNRESOLVED</b>';
        basis = sel.auto.tied.length > 1 ? 'Tied lowest price — committee selection required.' : 'No compliant computable quotation.';
      } else {
        var c = evaluation.computeCell(ev, i, sel.supIdx);
        det = esc(ev.suppliers[sel.supIdx].name) + ' — ' + fmtMoney(c.extendedCents);
        if (sel.override) basis = '<b>OVERRIDE</b> — ' + (sel.justification ? esc(sel.justification) : '<b>JUSTIFICATION MISSING</b>');
        else if (sel.tie) basis = 'Tied lowest price; committee selection' + (sel.tieNote ? ' — ' + esc(sel.tieNote) : '');
        else basis = 'Lowest compliant quotation';
        var excl = sel.auto.excluded.map(function (x) { return esc(ev.suppliers[x.supIdx].name) + ' (' + x.reason + ')'; });
        if (excl.length) basis += '. Excluded from the automatic comparison: ' + excl.join('; ') + '.';
      }
      h += '<tr><td class="r">' + (i + 1) + '</td><td>' + esc(ev.items[i].desc) + (ev.items[i].variant ? ' — ' + esc(ev.items[i].variant) : '') + '</td><td>' + det + '</td><td style="font-size:9.5pt">' + basis + '</td></tr>';
    }
    h += '</table>';
    /* award tables + breakdown */
    var bk = evaluation.breakdown(ev);
    for (var s2 = 0; s2 < bk.schedules.length; s2++) {
      h += '<p style="margin:0 0 4pt">Table ' + (s2 + 1) + '.</p>';
      h += evaluation.awardTableHTML(ev, bk.schedules[s2]);
    }
    if (bk.schedules.length > 1) h += evaluation.breakdownTableHTML(ev);
    if (!bk.bad && bk.schedules.length) {
      h += '<p><b>Total recommended expenditure:</b> ' + words.amountInWords(bk.grandTotalCents) + ' (' + fmtMoney(bk.grandTotalCents) + ').</p>';
    }
    /* committee sign-off */
    var committee = caseFile.committee || [];
    h += '<p style="margin-top:22pt">Determined by the Evaluation Committee:</p>';
    if (committee.length) {
      for (var m = 0; m < committee.length; m++) {
        h += '<p style="margin-top:18pt">____________________________<br><b>' + esc(committee[m].name) + '</b>' + (committee[m].post ? ' — ' + esc(committee[m].post) : '') + '</p>';
      }
    } else {
      h += '<p style="margin-top:18pt">Chairperson: ____________________________&nbsp;&nbsp;Date: ______________</p>';
      h += '<p>Member: ____________________________&nbsp;&nbsp;Date: ______________</p>';
      h += '<p>Member: ____________________________&nbsp;&nbsp;Date: ______________</p>';
    }
    return h;
  }

  documents.registerBuilder('eval-worksheet', buildWorksheet);
  documents.registerBuilder('eval-report', buildReport);

  return { buildWorksheet: buildWorksheet, buildReport: buildReport };
});
