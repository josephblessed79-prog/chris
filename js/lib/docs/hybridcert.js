/* docs/hybridcert.js — the verification certificate for pathway-aware
   cases: Part A lists every check the case verification ran (general,
   evaluation, verbal, vote status); Part B is the mandatory figure-by-
   figure folio check, whatever route the figures took into the system —
   typed or ingested, every figure is confirmed against its folio by a
   person before signature. Registers 'certificate-hybrid'.
   Loads as MODPA.docs.hybridcert / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../evaluation.js'), require('../verbal.js'),
      require('../compute.js'), require('../verifycase.js'), require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.hybridcert = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.evaluation, root.MODPA.verbal,
      root.MODPA.compute, root.MODPA.verifycase, root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, evaluation, verbal, compute, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  function partBRows(caseFile) {
    var h = '';
    if (caseFile.evaluation && caseFile.evaluation.items.length) {
      var ev = caseFile.evaluation;
      for (var i = 0; i < ev.items.length; i++) {
        for (var s = 0; s < ev.suppliers.length; s++) {
          var c = evaluation.computeCell(ev, i, s);
          if (!c.exists) continue;
          h += '<tr><td>' + esc(ev.items[i].desc) + '</td><td>' + esc(ev.suppliers[s].name) + '</td>' +
            '<td style="text-align:center">' + (c.effectiveQty == null ? '' : c.effectiveQty) + '</td>' +
            '<td style="text-align:right">' + (c.unitCents == null ? 'REJECTED' : fmtMoney(c.unitCents)) + '</td>' +
            '<td style="text-align:center">' + (c.vatable ? 'V' : 'NV') + '</td>' +
            '<td style="text-align:right"><b>' + (c.extendedCents == null ? 'CHECK' : fmtMoney(c.extendedCents)) + '</b></td>' +
            '<td></td><td class="chk"></td></tr>';
        }
      }
      return h;
    }
    if (caseFile.verbal && caseFile.verbal.schedule.length) {
      var v = caseFile.verbal;
      for (var k = 0; k < v.schedule.length; k++) {
        var r = v.schedule[k];
        var rt = verbal.rowTotalCents(r);
        var p = money.parseStrict(r.rate);
        h += '<tr><td>' + esc(r.desc) + ' (' + esc(textutil.fmtDateDots(r.date)) + ')</td><td>' + esc((verbal.selectedContact(v) || { name: '' }).name) + '</td>' +
          '<td style="text-align:center">' + r.qty + '</td>' +
          '<td style="text-align:right">' + (p.ok ? fmtMoney(p.cents) : 'REJECTED') + '</td>' +
          '<td style="text-align:center">—</td>' +
          '<td style="text-align:right"><b>' + (isNaN(rt) ? 'CHECK' : fmtMoney(rt)) + '</b></td>' +
          '<td></td><td class="chk"></td></tr>';
      }
      return h;
    }
    var items = caseFile.docState.items;
    for (var a = 0; a < items.length; a++) {
      var it = items[a], amountMode = it.mode === 'amount';
      for (var b = 0; b < it.quotes.length; b++) {
        var q = it.quotes[b];
        if (q.status !== 'Quoted') {
          h += '<tr><td>' + esc(it.desc) + '</td><td>' + esc(q.supplier) + '</td><td colspan="4" style="text-align:center">' + (q.status === 'No Response' ? 'No response' : 'Did not quote') + '</td><td></td><td class="chk"></td></tr>';
          continue;
        }
        var lt = compute.lineTotal(q);
        h += '<tr><td>' + esc(it.desc) + '</td><td>' + esc(q.supplier) + '</td>' +
          '<td style="text-align:center">' + (amountMode ? '—' : esc(it.qty)) + '</td>' +
          '<td style="text-align:right">' + (amountMode ? fmtMoney(money.parseMoney(q.sub)) : fmtMoney(money.parseMoney(q.unit))) + '</td>' +
          '<td style="text-align:right">' + fmtMoney(q.vat === '' || q.vat == null ? 0 : money.parseMoney(q.vat)) + '</td>' +
          '<td style="text-align:right"><b>' + (isNaN(lt) ? 'CHECK' : fmtMoney(lt)) + '</b></td>' +
          '<td></td><td class="chk"></td></tr>';
      }
    }
    return h;
  }

  function build(caseFile) {
    var st = caseFile.docState;
    var R = verifycase.runAllChecks(caseFile);
    var fails = 0, warns = 0;
    for (var i = 0; i < R.length; i++) { if (R[i].result === 'FAIL') fails++; if (R[i].result === 'WARN') warns++; }
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">VERIFICATION CERTIFICATE — PROCUREMENT CASE</div>';
    h += '<p style="text-align:center;margin-top:-6pt"><b>' + esc(st.subject || (caseFile.verbal && caseFile.verbal.purpose) || '[subject]') + '</b><br>File: ' + esc(st.minfile || st.ref || '[file number]') + ' &nbsp;·&nbsp; Activity: Routine procurement (' + (caseFile.presentation === 'formation' ? 'external formation' : 'Ministry internal') + ')' +(st.date ? ' &nbsp;·&nbsp; Date: ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    h += '<p style="font-size:10.5pt"><b>Part A — Automated consistency checks.</b> Computed from the case data at the time of printing. ' +
      (fails ? ('<b style="color:#b3261e">' + fails + ' check(s) FAILED — the pack must not be carried for signature.</b>') : 'All checks passed.') +
      (warns ? (' ' + warns + ' caution(s) noted.') : '') + '</p>';
    h += '<table class="cert"><thead><tr><th style="width:9%">ID</th><th>Check</th><th style="width:10%">Result</th><th>Detail</th></tr></thead>';
    for (var j = 0; j < R.length; j++) {
      h += '<tr><td>' + esc(R[j].id) + '</td><td>' + esc(R[j].name) + '</td><td class="r">' + R[j].result + '</td><td style="font-size:9pt">' + esc(R[j].detail) + '</td></tr>';
    }
    h += '</table>';
    h += '<p style="font-size:10.5pt;margin-top:14pt"><b>Part B — Figure-by-figure source verification (manual, mandatory).</b> The computer cannot read the paper file, and figures brought in by document ingestion are no more trustworthy than typed ones. For every line below, the checker compares the figure against the source document at the stated folio and initials the box. No pack proceeds to signature with an empty box.</p>';
    h += '<table class="cert"><thead><tr><th>Item</th><th>Supplier</th><th style="width:8%">Qty</th><th style="width:12%">Unit / Rate</th><th style="width:7%">V/NV</th><th style="width:12%">Total</th><th style="width:9%">Folio</th><th class="chk">✓</th></tr></thead>';
    h += partBRows(caseFile);
    var total = verifycase.caseTotalCents(caseFile);
    h += '<tr><td colspan="5" style="text-align:right"><b>Case total (awarded / recommended)</b></td><td style="text-align:right"><b>' + (isNaN(total) ? 'CHECK' : fmtMoney(total)) + '</b></td><td></td><td class="chk"></td></tr>';
    h += '</table>';
    h += '<p style="font-size:10.5pt"><b>Amount in words (as printed in the documents):</b> ' + (isNaN(total) ? '[FIGURES INVALID]' : words.amountInWords(total)) + ' (' + fmtMoney(isNaN(total) ? 0 : total) + ')</p>';
    h += '<p style="margin-top:22pt">Prepared by: ____________________________&nbsp;&nbsp;Rank/Post: ______________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p>Verified by (PPO / AO V / Supervisor): ____________________________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p style="font-size:9.5pt;color:#333">Certification: I have compared every figure in Part B against the source document at the stated folio, confirmed the attachments listed are present in the file, and confirm the pack is fit to be carried for signature.</p>';
    return h;
  }

  documents.registerBuilder('certificate-hybrid', build);

  return { build: build };
});
