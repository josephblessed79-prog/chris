/* docs/disposaldocs.js — the P4 disposal documents: inventory and
   valuation record, committee minute, and approval instrument.
   Every one of these carries the AWAITING FORMAT AUTHORITY banner: no
   sample disposal file has been provided, so the layouts are scaffolded
   from the Act's disposal provisions and the house minute style, and must
   be confirmed against a real signed disposal file before operational
   use. Registers 'disposal-inventory', 'disposal-minute',
   'disposal-instrument'. Loads as MODPA.docs.disposaldocs / require(). */
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

  var AUTHORITY_BANNER = '<div class="draftstamp" style="border-color:#9a6a00;color:#9a6a00">SCAFFOLD — AWAITING FORMAT AUTHORITY — no sample disposal file has been provided; this layout follows the Act’s disposal provisions and must be confirmed against a signed disposal file before operational use</div>';

  function header(caseFile, title) {
    var st = caseFile.docState;
    var h = AUTHORITY_BANNER + verifycase.draftStamp(caseFile);
    h += '<div class="ttl">' + esc(title) + '</div>';
    h += '<p style="text-align:center;margin-top:-6pt"><b>' + esc(st.subject || '[subject]') + '</b><br>File: ' + esc(st.minfile || st.ref || '[file number]') + (st.date ? ' &nbsp;·&nbsp; Date: ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    return h;
  }

  function inventoryTable(d) {
    var h = '<table class="cmp"><tr><th style="width:4%">No.</th><th>Description of property</th><th style="width:12%">Identification</th><th style="width:6%">Qty</th><th style="width:12%">Condition</th><th style="width:12%">Location</th><th style="width:12%">Valuation</th><th style="width:16%">Valuation basis / date</th></tr>';
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i];
      var v = disposal.itemValuationCents(it);
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td>' + esc(it.identification || '') + '</td><td class="ctr">' + esc(String(it.qty == null ? '' : it.qty)) + '</td><td>' + esc(it.condition || '') + '</td><td>' + esc(it.location || '') + '</td><td class="num">' + (isNaN(v) ? 'REJECTED: ' + esc(it.valuation || '') : fmtMoney(v)) + '</td><td>' + esc(it.valuationBasis || '') + (it.valuationDate ? ' — ' + esc(textutil.fmtDateShort(it.valuationDate)) : '') + '</td></tr>';
    }
    var t = disposal.totalValuationCents(d);
    h += '<tr><td colspan="6" class="num"><b>Total valuation</b></td><td class="num"><b>' + (isNaN(t) ? 'CHECK' : fmtMoney(t)) + '</b></td><td></td></tr>';
    h += '</table>';
    return h;
  }

  function buildInventory(caseFile) {
    var d = caseFile.disposal || disposal.newDisposal();
    var h = header(caseFile, 'DISPOSAL INVENTORY AND VALUATION RECORD');
    h += '<p>The undermentioned public property is presented to the Disposal Committee under the Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015. The valuation of each item is recorded with its basis; the total is computed.</p>';
    h += inventoryTable(d);
    h += '<p style="margin-top:22pt">Prepared by: ____________________________&nbsp;&nbsp;Post: ______________&nbsp;&nbsp;Date: ______________</p>';
    return h;
  }

  function buildMinute(caseFile, profile) {
    var d = caseFile.disposal || disposal.newDisposal();
    var st = caseFile.docState;
    var h = AUTHORITY_BANNER + verifycase.draftStamp(caseFile);
    h += '<table style="width:100%;border-collapse:collapse;font-size:11.5pt"><tr><td><b>File No:   ' + esc(st.minfile || st.ref || '[file number]') + '</b></td><td style="text-align:right"><b>Sheet No:  ' + esc(st.minsheet || '1a') + '</b></td></tr></table>';
    h += '<div class="ttl" style="margin-top:10pt">MINUTE SHEET — DISPOSAL COMMITTEE</div>';
    h += folio.registerHTML(st.folios, caseFile.folioStart, (profile && profile.folio && profile.folio.style) || 'dotted');
    var range = folio.rangeText(st.folios, caseFile.folioStart);
    if (range) h += '<p style="margin:10pt 0 10pt">' + esc(range) + '</p>';
    var t = disposal.totalValuationCents(d);
    h += '<p>Approval is hereby sought for the disposal of the public property listed hereunder, with a total recorded valuation of <b>' + (isNaN(t) ? '[FIGURES INVALID]' : words.amountInWords(t) + ' (' + fmtMoney(t) + ')') + '</b>, by the methods recommended by the Disposal Committee.</p>';
    if (d.narrative && d.narrative.trim()) h += '<p>' + esc(d.narrative.trim()) + '</p>';
    var groups = disposal.byMethod(d);
    for (var g = 0; g < groups.length; g++) {
      var grp = groups[g];
      h += '<p style="margin:0 0 4pt"><b>Recommended method: ' + esc(grp.method) + '</b> — ' + grp.items.length + ' item(s), valuation ' + (grp.bad ? 'CHECK' : fmtMoney(grp.cents)) + '</p>';
      h += '<table class="cmp"><tr><th style="width:5%">No.</th><th>Description</th><th style="width:12%">Condition</th><th style="width:14%">Valuation</th><th>Reason</th></tr>';
      for (var i = 0; i < grp.items.length; i++) {
        var it = grp.items[i];
        var v = disposal.itemValuationCents(it);
        h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(it.desc || '') + '</td><td>' + esc(it.condition || '') + '</td><td class="num">' + (isNaN(v) ? 'REJECTED' : fmtMoney(v)) + '</td><td>' + esc(it.methodReason || '') + '</td></tr>';
      }
      h += '</table>';
    }
    h += '<p>Submitted for your consideration and approval of the recommended methods of disposal.</p>';
    var committee = d.committee || [];
    if (committee.length) {
      h += '<p style="margin-top:18pt">The Disposal Committee:</p>';
      for (var m = 0; m < committee.length; m++) {
        h += '<p style="margin-top:16pt">____________________________<br><b>' + esc(committee[m].name) + '</b>' + (committee[m].post ? ' — ' + esc(committee[m].post) : '') + '</p>';
      }
    }
    return h;
  }

  function buildInstrument(caseFile) {
    var d = caseFile.disposal || disposal.newDisposal();
    var t = disposal.totalValuationCents(d);
    var h = header(caseFile, 'APPROVAL INSTRUMENT — DISPOSAL OF PUBLIC PROPERTY');
    h += '<p>Under the Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015, approval is granted for the disposal of the public property listed in the attached inventory (total recorded valuation ' + (isNaN(t) ? '[FIGURES INVALID]' : words.amountInWords(t) + ' (' + fmtMoney(t) + ')') + '), by the following methods:</p>';
    var groups = disposal.byMethod(d);
    h += '<ul class="rsn">';
    for (var g = 0; g < groups.length; g++) {
      h += '<li>' + esc(groups[g].method) + ' — ' + groups[g].items.length + ' item(s), valuation ' + (groups[g].bad ? 'CHECK' : fmtMoney(groups[g].cents)) + '</li>';
    }
    h += '</ul>';
    h += '<p>The disposal is to be carried out and evidenced in accordance with the Act and the guidelines of the Office of Procurement Regulation, and the proceeds (if any) brought to account.</p>';
    h += '<div class="sig"><div style="border-top:1px dotted #555;width:200pt;margin-bottom:2pt">&nbsp;</div><div><b>Permanent Secretary (Accounting Officer)</b></div><div>Ministry of Defence</div><div>Date: ______________</div></div>';
    return h;
  }

  documents.registerBuilder('disposal-inventory', buildInventory);
  documents.registerBuilder('disposal-minute', buildMinute);
  documents.registerBuilder('disposal-instrument', buildInstrument);

  return {
    AUTHORITY_BANNER: AUTHORITY_BANNER,
    buildInventory: buildInventory,
    buildMinute: buildMinute,
    buildInstrument: buildInstrument
  };
});
