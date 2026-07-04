/* docs/certificate.js — the verification certificate: Part A automated
   checks, Part B figure-by-figure manual folio verification. Ported from
   Approvals_Composer.html buildCert; byte-parity is tested.
   Loads in the browser as MODPA.docs.certificate and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../compute.js'), require('../verify.js'), require('./common.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.certificate = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute, root.MODPA.verify, root.MODPA.docs.common);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute, verify, common) {
  'use strict';

  var parseMoney = money.parseMoney, fmtMoney = money.fmtMoney;
  var amountInWords = words.amountInWords;
  var esc = textutil.esc, fmtDateLong = textutil.fmtDateLong;
  var lineTotal = compute.lineTotal, grandTotal = compute.grandTotal;

  function buildCert(st) {
    var R = verify.runChecks(st), s = verify.checkStats(R);
    var h = common.draftStampIfNeeded(st);
    h += '<div class="ttl">VERIFICATION CERTIFICATE — PROCUREMENT APPROVAL PACK</div>';
    h += '<p style="text-align:center;margin-top:-6pt"><b>' + esc(st.subject || '[subject]') + '</b><br>File: ' + esc(st.ref || '[ref]') + ' &nbsp;·&nbsp; Date: ' + esc(fmtDateLong(st.date, false) || '[date]') + '</p>';
    h += '<p style="font-size:10.5pt"><b>Part A — Automated consistency checks.</b> Computed from the pack data at the time of printing. ' + (s.fail ? ('<b style="color:#b3261e">' + s.fail + ' check(s) FAILED — the pack must not be carried for signature.</b>') : 'All checks passed.') + (s.warn ? (' ' + s.warn + ' caution(s) noted.') : '') + '</p>';
    h += '<table class="cert"><tr><th style="width:9%">ID</th><th>Check</th><th style="width:10%">Result</th><th>Detail</th></tr>';
    for (var i = 0; i < R.length; i++) h += '<tr><td>' + R[i].id + '</td><td>' + esc(R[i].name) + '</td><td class="r">' + R[i].result + '</td><td style="font-size:9pt">' + esc(R[i].detail) + '</td></tr>';
    h += '</table>';
    h += '<p style="font-size:10.5pt;margin-top:14pt"><b>Part B — Figure-by-figure source verification (manual).</b> The computer cannot read the paper quotations. For every line below, the checker compares the figure against the quotation at the stated folio and initials the box. No pack proceeds to signature with an empty box.</p>';
    h += '<table class="cert"><tr><th>Item</th><th>Supplier</th><th style="width:8%">Qty</th><th style="width:12%">Unit / Amount</th><th style="width:10%">VAT</th><th style="width:12%">Total</th><th style="width:9%">Folio</th><th class="chk">✓</th></tr>';
    for (var a = 0; a < st.items.length; a++) {
      var it = st.items[a], amountMode = it.mode === 'amount';
      for (var b = 0; b < it.quotes.length; b++) {
        var q = it.quotes[b];
        if (q.status !== 'Quoted') { h += '<tr><td>' + esc(it.desc) + '</td><td>' + esc(q.supplier) + '</td><td colspan="4" style="text-align:center">' + (q.status === 'No Response' ? 'No response' : 'Did not quote') + '</td><td></td><td class="chk"></td></tr>'; continue; }
        var lt = lineTotal(q);
        var qtyCell = amountMode ? '&mdash;' : esc(it.qty);
        var amtCell = amountMode ? fmtMoney(parseMoney(q.sub)) : fmtMoney(parseMoney(q.unit));
        h += '<tr><td>' + esc(it.desc) + '</td><td>' + esc(q.supplier) + '</td><td style="text-align:center">' + qtyCell + '</td><td class="num" style="text-align:right">' + amtCell + '</td><td style="text-align:right">' + fmtMoney(q.vat === '' || q.vat == null ? 0 : parseMoney(q.vat)) + '</td><td style="text-align:right"><b>' + (isNaN(lt) ? 'CHECK' : fmtMoney(lt)) + '</b></td><td></td><td class="chk"></td></tr>';
      }
    }
    var gt = grandTotal(st.items);
    h += '<tr><td colspan="5" style="text-align:right"><b>Grand total (recommended lines)</b></td><td style="text-align:right"><b>' + (isNaN(gt) ? 'CHECK' : fmtMoney(gt)) + '</b></td><td></td><td class="chk"></td></tr>';
    h += '</table>';
    h += '<p style="font-size:10.5pt"><b>Amount in words (as it appears in both documents):</b> ' + (isNaN(gt) ? '[FIGURES INVALID]' : amountInWords(gt)) + ' (' + fmtMoney(isNaN(gt) ? 0 : gt) + ')</p>';
    h += '<p style="margin-top:22pt">Prepared by: ____________________________&nbsp;&nbsp;Rank/Post: ______________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p>Verified by (PPO / AO V / Supervisor): ____________________________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p style="font-size:9.5pt;color:#333">Certification: I have compared every figure in Part B against the source document at the stated folio, confirmed the attachments listed in the approval are present in the file, and confirm the pack is fit to be carried for signature.</p>';
    return h;
  }

  return { buildCert: buildCert };
});
