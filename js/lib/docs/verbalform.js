/* docs/verbalform.js — the verbal quotation form and the telephone-contact
   register for micro-procurement (pathway P1). The form is the folio the
   minute cites ("A verbal quotation form was used as a means of micro
   procurement"); the register evidences who was telephoned, when, and what
   each said. Registers 'verbal-form' and 'phone-register' with the
   dispatcher. Loads as MODPA.docs.verbalform / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../verbal.js'), require('../verifycase.js'),
      require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.verbalform = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.verbal, root.MODPA.verifycase,
      root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, verbal, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  function outcomeText(c) {
    if (c.outcome === 'quoted') {
      var q = verbal.contactQuoteCents(c);
      return (q != null && !isNaN(q)) ? ('Quoted ' + fmtMoney(q)) : 'Quoted — FIGURE REJECTED: ' + esc(c.amount || '');
    }
    if (c.outcome === 'declined') return 'Declined to quote';
    return 'No answer / no quotation';
  }

  function buildVerbalForm(caseFile) {
    var v = caseFile.verbal || verbal.newVerbal();
    var st = caseFile.docState;
    var sel = verbal.selectedContact(v);
    var t = verbal.totalCents(v);
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">VERBAL QUOTATION FORM — MICRO PROCUREMENT</div>';
    h += '<p style="text-align:center;margin-top:-6pt">File: ' + esc(st.minfile || st.ref || '[file number]') + (st.date ? ' &nbsp;·&nbsp; Date: ' + esc(textutil.fmtDateProse(st.date)) : '') + '</p>';
    h += '<p><b>Requirement:</b> ' + esc(v.purpose || st.subject || '[purpose not stated]') + '</p>';
    h += '<p>The following companies were contacted by telephone and asked to quote verbally. The figures below are as given verbally; the written confirmation (where obtained) is filed at the folio noted in the minute.</p>';
    h += '<table class="cert"><tr><th style="width:5%">No.</th><th>Company</th><th style="width:14%">Telephone</th><th style="width:13%">Date</th><th style="width:18%">Spoke to</th><th style="width:20%">Outcome</th></tr>';
    for (var i = 0; i < v.contacts.length; i++) {
      var c = v.contacts[i];
      h += '<tr><td class="r">' + (i + 1) + '</td><td>' + esc(c.name) + (v.selected === i ? ' <b>[SELECTED]</b>' : '') + '</td><td>' + esc(c.phone || '') + '</td><td>' + esc(textutil.fmtDateShort(c.date) || '') + '</td><td>' + esc(c.spokeTo || '') + '</td><td>' + outcomeText(c) + '</td></tr>';
    }
    h += '</table>';
    if (sel) {
      h += '<p><b>Recommendation:</b> ' + esc(sel.name) + ' — ' + esc(v.selectionBasis || 'basis not stated') + '.' +
        ((v.notLowestJustification || '').trim() ? ' <b>Justification (not the lowest):</b> ' + esc(v.notLowestJustification.trim()) : '') + '</p>';
    } else {
      h += '<p><b>Recommendation:</b> [no supplier selected]</p>';
    }
    if (v.schedule.length) {
      h += '<p style="margin:0 0 4pt"><b>Schedule' + (v.tableTitle ? ' — ' + esc(v.tableTitle) : '') + '</b></p>';
      h += verbal.scheduleTableHTML(v);
      if (!isNaN(t)) h += '<p><b>Total:</b> ' + words.amountInWords(t) + ' (' + fmtMoney(t) + ') — words and figure generated from the same number.</p>';
    }
    h += '<p style="margin-top:22pt">Prepared by: ____________________________&nbsp;&nbsp;Post: ______________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p>Checked by: ____________________________&nbsp;&nbsp;Post: ______________&nbsp;&nbsp;Date: ______________</p>';
    return h;
  }

  function buildPhoneRegister(caseFile) {
    var v = caseFile.verbal || verbal.newVerbal();
    var st = caseFile.docState;
    var h = verifycase.draftStamp(caseFile);
    h += '<div class="ttl">TELEPHONE-CONTACT REGISTER</div>';
    h += '<p style="text-align:center;margin-top:-6pt">File: ' + esc(st.minfile || st.ref || '[file number]') + '</p>';
    h += '<table class="cert"><tr><th style="width:5%">No.</th><th>Company</th><th style="width:14%">Telephone</th><th style="width:13%">Date</th><th style="width:16%">Officer calling</th><th style="width:16%">Spoke to</th><th>Outcome</th></tr>';
    for (var i = 0; i < v.contacts.length; i++) {
      var c = v.contacts[i];
      h += '<tr><td class="r">' + (i + 1) + '</td><td>' + esc(c.name) + '</td><td>' + esc(c.phone || '') + '</td><td>' + esc(textutil.fmtDateShort(c.date) || '') + '</td><td>' + esc(c.officer || '') + '</td><td>' + esc(c.spokeTo || '') + '</td><td>' + outcomeText(c) + '</td></tr>';
    }
    h += '</table>';
    h += '<p style="font-size:10.5pt">Every company contacted is recorded, including those that did not quote. Verbal figures are confirmed against written quotations where obtained; the verification certificate requires each figure to be checked against its folio.</p>';
    return h;
  }

  documents.registerBuilder('verbal-form', buildVerbalForm);
  documents.registerBuilder('phone-register', buildPhoneRegister);

  return { buildVerbalForm: buildVerbalForm, buildPhoneRegister: buildPhoneRegister };
});
