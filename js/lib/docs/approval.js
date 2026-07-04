/* docs/approval.js — the formation approval letter (P2), e.g. the Trinidad
   and Tobago Coast Guard letter to the Permanent Secretary. Ported from
   Approvals_Composer.html buildApproval; byte-parity is tested.
   Loads in the browser as MODPA.docs.approval and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../compute.js'), require('./common.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.approval = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute, root.MODPA.docs.common);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute, common) {
  'use strict';

  var fmtMoney = money.fmtMoney;
  var amountInWords = words.amountInWords;
  var esc = textutil.esc, fmtDateLong = textutil.fmtDateLong;
  var grandTotal = compute.grandTotal, recommendedSuppliers = compute.recommendedSuppliers;

  function buildApproval(st) {
    var gt = grandTotal(st.items);
    var totWords = isNaN(gt) ? '[FIGURES INVALID]' : amountInWords(gt);
    var vatSuffix = st.vat === 'VAT Inclusive' ? ' (VAT Inclusive)' : st.vat === 'VAT and Duty Free' ? ' (VAT and Duty Free)' : '';
    var recs = recommendedSuppliers(st.items);
    var svc = recs.length === 0 ? '[no supplier recommended]'
      : recs.length === 1 ? '<b>' + esc(recs[0].name) + '</b>'
        : 'the undermentioned suppliers';
    var n = 0;
    function np(t) { n++; return '<div class="np"><div class="no">' + n + '.</div><div style="flex:1"><p style="margin:0 0 11pt">' + t + '</p></div></div>'; }
    var h = common.draftStampIfNeeded(st) + common.letterheadHTML(st);
    h += '<p style="margin:4pt 0 2pt">' + esc(st.ref) + '</p>';
    h += '<table style="width:100%;border-collapse:collapse"><tr><td style="vertical-align:top">' +
      (st.addr || '').split(/\n/).map(function (l, ix) { return (ix === 0 ? '<b>' : '') + esc(l) + (ix === 0 ? '</b>' : ''); }).join('<br>') +
      '</td><td style="vertical-align:bottom;text-align:right;white-space:nowrap">' + esc(fmtDateLong(st.date, st.handdate)) + '</td></tr></table>';
    h += '<div class="ttl">' + esc(st.subject) + '</div>';
    h += np('Approval is requested to engage the services of ' + svc + ' for the supply and delivery of the undermentioned items for the ' + esc(st.sigform || st.formation || '') + ', at a total cost of <b>' + totWords + ' (' + fmtMoney(isNaN(gt) ? 0 : gt) + ')' + vatSuffix + '</b>.');
    h += np('The following table outlines the quantities, description of the items required, their cost and the recommended supplier:');
    h += common.comparisonTableHTML(st);
    if (st.need && st.need.trim()) h += np(esc(st.need.trim()).replace(/\n+/g, '</p><p style="margin:0 0 11pt">'));
    h += np(common.methodParagraph(st));
    var rp = common.recommendationParagraph(st);
    h += common.renderRecommendation(rp, np);
    h += '<div class="uhead">Vote to be utilised</div>';
    h += np('It is carded that this purchase will be funded from <b>' + esc(st.vote).replace(/\n/g, ', ') + '</b>.');
    h += np('Submitted for your approval.');
    h += '<div class="sig"><div style="border-top:1px dotted #555;width:200pt;margin-bottom:2pt">&nbsp;</div><div><b>' + esc(st.signame) + '</b></div>' + (st.sigrank ? '<div>' + esc(st.sigrank) + '</div>' : '') + '<div>' + esc(st.sigapp) + '</div>' + (st.sigform ? '<div>' + esc(st.sigform) + '</div>' : '') + '</div>';
    var att = st.attachments.filter(function (a) { return a && a.trim(); });
    if (att.length) { h += '<div class="uhead" style="margin-top:22pt">Attachments:</div><ol class="att">' + att.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ol>'; }
    return h;
  }

  return { buildApproval: buildApproval };
});
