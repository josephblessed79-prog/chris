/* docs/common.js — shared pieces of the document builders: the DRAFT stamp,
   letterhead, comparison table, method and recommendation paragraphs, and the
   Word-compatible file wrapper. Ported from Approvals_Composer.html; the
   parity test holds the output byte-for-byte to the legacy builders.
   Loads in the browser as MODPA.docs.common and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../compute.js'), require('../verify.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.common = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute, root.MODPA.verify);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute, verify) {
  'use strict';

  var parseMoney = money.parseMoney, fmtMoney = money.fmtMoney;
  var amountInWords = words.amountInWords;
  var esc = textutil.esc, countWord = textutil.countWord, joinAnd = textutil.joinAnd,
    fmtDateProse = textutil.fmtDateProse;
  var lineTotal = compute.lineTotal, allSuppliers = compute.allSuppliers,
    recommendedSuppliers = compute.recommendedSuppliers, awardSummary = compute.awardSummary;

  /* Any document generated while checks fail carries the DRAFT stamp. */
  function draftStampIfNeeded(st) {
    var R = verify.runChecks(st), s = verify.checkStats(R);
    return s.fail > 0 ? '<div class="draftstamp">DRAFT — NOT CLEARED — ' + s.fail + ' VERIFICATION CHECK' + (s.fail === 1 ? '' : 'S') + ' FAILED</div>' : '';
  }

  function letterheadHTML(st) {
    if (st.prelh) return '<div style="height:96pt"></div>';
    var lines = (st.lhlines || '').split(/\n/).map(function (l) { return esc(l.trim()); }).filter(Boolean).join('<br>');
    return '<div class="lh"><div class="f1">' + esc(st.formation) + '</div><div class="f2">' + lines + '</div></div><hr style="border:none;border-top:1.5px solid #000;margin:6pt 0 10pt">';
  }

  function vatCellText(st, q) {
    var v = q.vat === '' || q.vat == null ? 0 : parseMoney(q.vat);
    if (v && v > 0) return fmtMoney(v).replace('$', '');
    if (st.vat === 'VAT and Duty Free') return 'VAT/DUTY FREE';
    if (st.vat === 'VAT Not Applicable') return 'N/A';
    return '—';
  }

  function comparisonTableHTML(st) {
    var h = '<table class="cmp"><tr><th style="width:5%">Ser.</th><th style="width:9%">Qty</th><th style="width:17%">Description</th><th style="width:20%">Supplier</th><th style="width:11%">Unit / Amount $</th><th style="width:11%">V.A.T $</th><th style="width:12%">Total Cost $</th><th style="width:15%">Recommended Supplier</th></tr>';
    for (var i = 0; i < st.items.length; i++) {
      var it = st.items[i], rows = it.quotes.length || 1, rec = null;
      for (var r0 = 0; r0 < it.quotes.length; r0++) if (it.quotes[r0].recommended) { rec = it.quotes[r0]; break; }
      var recTxt = '';
      if (rec) {
        var basis = (st.r_alt && st.r_alt.trim()) ? esc(st.r_alt.trim())
          : (st.r_low ? 'the lowest cost supplier that met all specifications' : 'the recommended supplier');
        recTxt = '<b>' + esc(rec.supplier) + '</b> — ' + basis;
      }
      var amountMode = it.mode === 'amount';
      for (var j = 0; j < Math.max(1, it.quotes.length); j++) {
        var q = it.quotes[j] || {};
        h += '<tr>';
        if (j === 0) {
          h += '<td class="ctr" rowspan="' + rows + '">' + (i + 1) + '.</td>';
          h += '<td class="ctr" rowspan="' + rows + '">' + (amountMode ? '&mdash;' : (esc(it.qty) + (it.unitname ? ' ' + esc(it.unitname) : ''))) + '</td>';
          h += '<td rowspan="' + rows + '">' + esc(it.desc) + '</td>';
        }
        if (q.status === 'Quoted') {
          var lt = lineTotal(q);
          var amtCell = amountMode
            ? esc(String(fmtMoney(parseMoney(q.sub)).replace('$', '')))
            : esc(String(fmtMoney(parseMoney(q.unit)).replace('$', '')));
          h += '<td>' + esc(q.supplier) + '</td><td class="num">' + amtCell + '</td><td class="num">' + vatCellText(st, q) + '</td><td class="num">' + (isNaN(lt) ? 'CHECK' : fmtMoney(lt).replace('$', '')) + '</td>';
        } else {
          h += '<td>' + esc(q.supplier || '') + '</td><td class="ctr" colspan="3">' + (q.status === 'No Response' ? 'No response' : 'Did not quote') + '</td>';
        }
        if (j === 0) h += '<td rowspan="' + rows + '">' + recTxt + '</td>';
        h += '</tr>';
      }
    }
    h += '</table>';
    return h;
  }

  function methodParagraph(st) {
    var sup = allSuppliers(st.items), quoted = sup.filter(function (s) { return s.quoted; });
    var non = sup.filter(function (s) { return !s.quoted; }).map(function (s) { return s.name; });
    var p = 'In line with the ' + esc(st.act || 'Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015') + ', ';
    if (st.method === 'Request for Quotation') {
      p += 'requests for quotations were sent to ' + countWord(sup.length) + ' (' + sup.length + ') suppliers' + (st.rfqdate ? ' on ' + fmtDateProse(st.rfqdate) : '') + (st.deadline ? ' with a closing date of ' + fmtDateProse(st.deadline) : '') + ', of which ' + countWord(quoted.length) + ' (' + quoted.length + ') submitted quotations.';
      if (non.length) p += ' ' + esc(non.join(', ')) + ' did not submit quotes.';
    } else if (st.method === 'Single / National Provider' || st.method === 'Direct Contracting' || st.method === 'Emergency Procurement') {
      p += 'the procurement was conducted by way of ' + esc(st.method) + '. ' + esc((st.methodjust || '').trim());
    } else {
      p += 'an invitation was issued by way of ' + esc(st.method) + (st.rfqdate ? ' on ' + fmtDateProse(st.rfqdate) : '') + (st.deadline ? ' with a closing date of ' + fmtDateProse(st.deadline) : '') + '. ' + countWord(quoted.length) + ' (' + quoted.length + ') submission(s) were received.';
    }
    return p;
  }

  function recommendationParagraph(st) {
    var recs = recommendedSuppliers(st.items);
    if (recs.length <= 1) {
      var names = recs.map(function (r) { return '<b>Messrs. ' + esc(r.name) + '</b>' + (r.address ? ' of ' + esc(r.address) : ''); });
      var joined = names[0] || '<b>[no supplier recommended]</b>';
      var p = 'It is therefore recommended that the purchase of the above mentioned items be awarded to ' + joined;
      if (st.r_alt && st.r_alt.trim()) { p += ' since ' + esc(st.r_alt.trim()) + '.'; return { p: p, schedule: [], lead: '', bullets: [] }; }
      var bullets = [];
      if (st.r_comm) bullets.push('The company met the commercial criteria');
      if (st.r_tech) bullets.push('The company met the technical criteria');
      if (st.r_low) bullets.push('The company proposed the lowest cost');
      if (st.notlowest && st.notlowest.trim()) bullets.push(esc(st.notlowest.trim()));
      p += ' for the following reasons:';
      return { p: p, schedule: [], lead: '', bullets: bullets };
    }
    var aw = awardSummary(st.items);
    var p2 = 'It is therefore recommended that the procurement be awarded as follows:';
    var schedule = aw.map(function (s) {
      var amt = s.bad ? '[FIGURES INVALID]' : amountInWords(s.cents) + ' (' + fmtMoney(s.cents) + ')';
      return '<b>Messrs. ' + esc(s.name) + '</b>' + (s.address ? ' of ' + esc(s.address) : '') + ' — ' + esc(joinAnd(s.items)) + ' — ' + amt;
    });
    if (st.r_alt && st.r_alt.trim()) {
      return { p: p2, schedule: schedule, lead: 'The awards are recommended since ' + esc(st.r_alt.trim()) + '.', bullets: [] };
    }
    var bullets2 = [];
    if (st.r_comm) bullets2.push('The recommended suppliers met the commercial criteria');
    if (st.r_tech) bullets2.push('The recommended suppliers met the technical criteria');
    if (st.r_low) bullets2.push('Each recommended supplier proposed the lowest cost for the item(s) awarded to it');
    if (st.notlowest && st.notlowest.trim()) bullets2.push(esc(st.notlowest.trim()));
    return { p: p2, schedule: schedule, lead: bullets2.length ? 'The awards are recommended for the following reasons:' : '', bullets: bullets2 };
  }

  function renderRecommendation(rp, np) {
    var h = np ? np(rp.p) : '<p>' + rp.p + '</p>';
    if (rp.schedule.length) h += '<ol class="rsn" style="margin:0 0 11pt 40pt;padding:0">' + rp.schedule.map(function (s) { return '<li style="margin-bottom:4pt">' + s + '</li>'; }).join('') + '</ol>';
    if (rp.lead) h += '<p style="margin:0 0 6pt">' + rp.lead + '</p>';
    if (rp.bullets.length) h += '<ul class="rsn">' + rp.bullets.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>';
    return h;
  }

  /* Wrap a document body as a Word-compatible .doc (HTML that Word opens
     natively — no macros, no build step, works offline). */
  function wordWrap(bodyHtml, title) {
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(title) + '</title>' +
      '<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->' +
      '<style>@page Sec1{size:8.5in 11.0in;margin:1.0in 1.0in 1.0in 1.0in;} div.Sec1{page:Sec1;} body{font-family:"Times New Roman",serif;font-size:12pt;line-height:1.42;} ' +
      'p{margin:0 0 11pt;text-align:justify} .lh{text-align:center;line-height:1.15} .lh .f1{font-weight:bold;font-size:13pt} .lh .f2{font-size:9.5pt} ' +
      '.ttl{text-align:center;font-weight:bold;text-decoration:underline;margin:14pt 0 12pt;text-transform:uppercase} ' +
      'table.cmp,table.cert{border-collapse:collapse;width:100%;font-size:10pt} table.cmp th,table.cmp td,table.cert th,table.cert td{border:1px solid #000;padding:4pt 5pt;vertical-align:top} table.cmp th,table.cert th{background:#dbe3ec;text-align:center} ' +
      'td.num{text-align:right} td.ctr,td.r{text-align:center} .uhead{font-weight:bold;text-decoration:underline;margin:12pt 0 6pt} ' +
      'ul.rsn{margin:0 0 11pt 40pt} ol.att{margin:4pt 0 0 40pt;font-size:11pt} .np{margin:0} ' +
      'table.fol{width:100%;border-collapse:collapse;font-size:11.5pt} table.fol td{padding:2pt 0;vertical-align:bottom} td.d1{border-bottom:1px dotted #000} td.d2{padding-left:8pt} ' +
      '.draftstamp{border:2.5pt solid #b3261e;color:#b3261e;font-family:Arial;font-weight:bold;text-align:center;padding:6pt;margin-bottom:14pt;letter-spacing:1pt} .sig{margin-top:34pt}</style></head>' +
      '<body><div class="Sec1">' + bodyHtml + '</div></body></html>';
  }

  function safeName(s) {
    return (s || 'Approval').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'Approval';
  }

  return {
    draftStampIfNeeded: draftStampIfNeeded,
    letterheadHTML: letterheadHTML,
    vatCellText: vatCellText,
    comparisonTableHTML: comparisonTableHTML,
    methodParagraph: methodParagraph,
    recommendationParagraph: recommendationParagraph,
    renderRecommendation: renderRecommendation,
    wordWrap: wordWrap,
    safeName: safeName
  };
});
