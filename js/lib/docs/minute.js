/* docs/minute.js — the Ministry minute sheet. Ported from
   Approvals_Composer.html buildMinute; byte-parity is tested.
   Loads in the browser as MODPA.docs.minute and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../compute.js'), require('./common.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.minute = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute, root.MODPA.docs.common);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute, common) {
  'use strict';

  var fmtMoney = money.fmtMoney;
  var amountInWords = words.amountInWords;
  var esc = textutil.esc, countWord = textutil.countWord, joinAnd = textutil.joinAnd,
    fmtDateProse = textutil.fmtDateProse;
  var grandTotal = compute.grandTotal, recommendedSuppliers = compute.recommendedSuppliers,
    awardSummary = compute.awardSummary, allSuppliers = compute.allSuppliers;

  function buildMinute(st) {
    var gt = grandTotal(st.items);
    var totWords = isNaN(gt) ? '[FIGURES INVALID]' : amountInWords(gt);
    var vatTag = st.vat === 'VAT Inclusive' ? ' VAT Inclusive' : st.vat === 'VAT and Duty Free' ? ' VAT and Duty Free' : '';
    var recs = recommendedSuppliers(st.items);
    var fol = st.folios.filter(function (f) { return f.desc && f.desc.trim(); });
    var h = common.draftStampIfNeeded(st);
    h += '<table style="width:100%;border-collapse:collapse;font-size:11.5pt"><tr><td><b>File No: ' + esc(st.minfile || st.ref) + '</b></td><td style="text-align:right"><b>Sheet No: ' + esc(st.minsheet || '1a') + '</b></td></tr></table>';
    h += '<div class="ttl" style="margin-top:10pt">MINUTE SHEET</div>';
    if (fol.length) {
      h += '<table class="fol">';
      for (var i = 0; i < fol.length; i++) h += '<tr><td style="width:26pt;vertical-align:bottom">(' + (i + 1) + ')</td><td class="d1">' + esc(fol[i].desc) + '</td><td class="d2">' + esc(fol[i].date || '') + '</td></tr>';
      h += '</table>';
    }
    h += '<p style="margin:16pt 0 4pt">(1)</p>';
    h += '<p style="margin:0"><b>' + esc(st.minaddr || 'Permanent Secretary (Accounting Officer)') + '</b></p>';
    if (st.minufs) h += '<p style="margin:0 0 10pt">' + esc(st.minufs) + '</p>';
    if (fol.length) h += '<p>Folios (1) to (' + fol.length + ') for your attention please.</p>';
    var awardIntro = 'Approval is sought to incur expenditure in the total amount of <b>' + totWords + ' (' + fmtMoney(isNaN(gt) ? 0 : gt) + ')' + vatTag + '</b> in favour of ';
    if (recs.length === 1) {
      h += '<p>' + awardIntro + '<b>' + esc(recs[0].name) + '</b> for ' + esc(st.subjectProse || st.subject || 'the undermentioned requirement') + '.</p>';
    } else if (recs.length > 1) {
      h += '<p>' + awardIntro + 'the following suppliers for ' + esc(st.subjectProse || st.subject || 'the undermentioned requirement') + ':</p>';
      var aw = awardSummary(st.items);
      h += '<ol style="margin:0 0 11pt 40pt;padding:0">';
      for (var o = 0; o < aw.length; o++) {
        var s = aw[o];
        var amt = s.bad ? '[FIGURES INVALID]' : amountInWords(s.cents) + ' (' + fmtMoney(s.cents) + ')' + vatTag;
        h += '<li style="margin-bottom:4pt"><b>' + esc(s.name) + '</b> — ' + esc(joinAnd(s.items)) + ' — in the amount of ' + amt + '.</li>';
      }
      h += '</ol>';
    } else h += '<p>' + awardIntro + '<b>[no supplier recommended]</b>.</p>';
    var sup = allSuppliers(st.items), quoted = sup.filter(function (s) { return s.quoted; });
    if (st.method === 'Request for Quotation' && sup.length) {
      h += '<p>The ' + esc((st.minaddr || 'Permanent Secretary').replace(/\s*\(.*\)$/, '')) + ' is advised that' + (st.rfqdate ? ' on ' + fmtDateProse(st.rfqdate) : '') + ' Requests for Quotations were issued' + (st.deadline ? ' with a closing date of ' + fmtDateProse(st.deadline) : '') + '. The following suppliers were approached and ' + countWord(quoted.length) + ' (' + quoted.length + ') submitted quotations:</p>';
      h += '<ul class="rsn">' + sup.map(function (s) { return '<li>' + esc(s.name) + (s.quoted ? ' — (Submitted a Quotation)' : ''); }).join('</li>') + '</li></ul>';
    } else if (st.methodjust && st.methodjust.trim()) {
      h += '<p>' + esc(st.methodjust.trim()) + '</p>';
    }
    if (st.need && st.need.trim()) h += '<p>' + esc(st.need.trim()).replace(/\n+/g, '</p><p>') + '</p>';
    if (st.minextra && st.minextra.trim()) h += st.minextra.trim().split(/\n\s*\n/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('');
    var rp = common.recommendationParagraph(st);
    h += common.renderRecommendation(rp, null);
    h += '<p>The expenditure is to be met from the following vote:</p><p style="margin-left:24pt"><b>' + esc(st.vote || '[vote not entered]').replace(/\n/g, '<br>') + '</b></p>';
    h += '<p>Submitted for your consideration please.</p>';
    var msn = (st.minsigname && st.minsigname.trim()) ? st.minsigname.trim() : st.signame;
    var msp = (st.minsigpost && st.minsigpost.trim()) ? st.minsigpost.trim() : ((st.sigrank ? st.sigrank + ', ' : '') + (st.sigapp || ''));
    h += '<div class="sig"><div style="border-top:1px dotted #555;width:200pt;margin-bottom:2pt">&nbsp;</div><div><b>' + esc(msn) + '</b></div><div>' + esc(msp) + '</div>' + (st.date ? '<div>' + esc(fmtDateProse(st.date)) + '</div>' : '') + '</div>';
    return h;
  }

  return { buildMinute: buildMinute };
});
