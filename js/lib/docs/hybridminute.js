/* docs/hybridminute.js — the Ministry minute sheet in the hybrid house
   style of the signed samples (boxed meals; materials and supplies):
   File No / Vol / Sheet No header, folio register in the profile's numeral
   style, "Approval is hereby sought…", numbered paragraphs, per-date or
   per-supplier award tables, regulation 10 and 11, OPR depository line,
   funding vote block, the vote status table with computed balances, the
   transfer-of-funds line included automatically on a computed shortfall,
   and the submission and signature blocks.
   Every figure, amount-in-words, folio number and paragraph number is
   computed. Registers itself with the document dispatcher as
   'minute-hybrid'. Loads as MODPA.docs.hybridminute / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../money.js'), require('../words.js'),
      require('../textutil.js'), require('../compute.js'), require('../folio.js'),
      require('../styleprofile.js'), require('../evaluation.js'), require('../verbal.js'),
      require('../votestatus.js'), require('../verifycase.js'), require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.hybridminute = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute, root.MODPA.folio,
      root.MODPA.styleprofile, root.MODPA.evaluation, root.MODPA.verbal,
      root.MODPA.votestatus, root.MODPA.verifycase, root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute, folio, styleprofile, evaluation, verbal, votestatus, verifycase, documents) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney, amountInWords = words.amountInWords;
  var fill = styleprofile.fill;

  /* "May     , 2026" — month and year printed, day inserted by hand,
     exactly as both sample minutes are signed. */
  function monthYearHand(iso) {
    if (!iso) return '';
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return textutil.MONTHS[parseInt(m[2], 10) - 1] + '\u00A0\u00A0\u00A0\u00A0\u00A0, ' + m[1];
  }

  /* Where the money comes from: an evaluation award, a verbal quotation
     schedule, or the case's item/quote rows. */
  function awardData(caseFile) {
    if (caseFile.evaluation && caseFile.evaluation.items && caseFile.evaluation.items.length) {
      var bk = evaluation.breakdown(caseFile.evaluation);
      return {
        mode: 'evaluation', schedules: bk.schedules, bad: bk.bad,
        totalCents: bk.bad ? NaN : bk.grandTotalCents,
        lines: bk.schedules.map(function (s) { return { name: s.name, cents: s.totalCents }; })
      };
    }
    if (caseFile.verbal && caseFile.verbal.schedule && caseFile.verbal.schedule.length) {
      var sel = verbal.selectedContact(caseFile.verbal);
      var t = verbal.totalCents(caseFile.verbal);
      return {
        mode: 'verbal', schedules: null, bad: isNaN(t), totalCents: t,
        lines: sel ? [{ name: sel.name, cents: t }] : []
      };
    }
    var aw = compute.awardSummary(caseFile.docState.items);
    var gt = compute.grandTotal(caseFile.docState.items);
    return {
      mode: 'items', schedules: null, bad: isNaN(gt), totalCents: gt,
      lines: aw.map(function (a) { return { name: a.name, cents: a.bad ? NaN : a.cents }; })
    };
  }

  function purposeOf(caseFile) {
    var st = caseFile.docState;
    return (st.subjectProse || (caseFile.verbal && caseFile.verbal.purpose) || st.subject || 'the undermentioned requirement').trim();
  }

  function moneyPhrase(cents) {
    if (cents == null || isNaN(cents)) return '<b>[FIGURES INVALID]</b>';
    return '<b>' + amountInWords(cents) + ' (' + fmtMoney(cents) + ')</b>';
  }

  function build(caseFile, profile) {
    var st = caseFile.docState;
    var p = profile || styleprofile.get(caseFile.styleProfileId);
    var ph = p.phrases;
    var award = awardData(caseFile);
    var purpose = purposeOf(caseFile);
    var h = verifycase.draftStamp(caseFile);

    /* header */
    h += '<table style="width:100%;border-collapse:collapse;font-size:11.5pt"><tr>' +
      '<td><b>' + esc(p.header.fileNoLabel) + '\u00A0\u00A0 ' + esc(st.minfile || st.ref || '[file number]') + '\u00A0\u00A0 ' + esc(p.header.tempVol) + '</b></td>' +
      '<td style="text-align:right"><b>Sheet No:\u00A0 ' + esc(folio.sheetLabel(st.minsheet || '1a', caseFile.folioStart, caseFile.sheetNumbering)) + '</b></td></tr></table>';
    h += '<div class="ttl" style="margin-top:10pt">' + esc(p.header.title) + '</div>';

    /* folio register — numbering computed from folioStart in the profile style */
    h += folio.registerHTML(st.folios, caseFile.folioStart, p.folio.style);

    /* minute number, addressee, routing */
    h += '<p style="margin:16pt 0 4pt">(1)</p>';
    h += '<p style="margin:0"><b>' + esc(p.routing.addressee) + '</b></p>';
    for (var u = 0; u < p.routing.ufsLines.length; u++) {
      h += '<p style="margin:0">' + esc(p.routing.ufsLines[u]) + '</p>';
    }
    var range = folio.rangeText(st.folios, caseFile.folioStart, ph.folioRefer);
    if (range) h += '<p style="margin:10pt 0 10pt">' + esc(range) + '</p>';

    /* numbered paragraphs: the first is unnumbered, then 2. 3. 4. … */
    var n = 1;
    function para(text) {
      n++;
      return '<div class="np"><div class="no">' + n + '.</div><div style="flex:1"><p style="margin:0 0 11pt">' + text + '</p></div></div>';
    }
    function para1(text) {
      return '<p style="margin:0 0 11pt">' + text + '</p>';
    }

    /* 1 — approval sought */
    if (award.lines.length === 1) {
      h += para1(fill(ph.approvalSoughtSingle, {
        words: award.bad ? '[FIGURES INVALID]' : amountInWords(award.totalCents),
        figure: fmtMoney(award.bad ? 0 : award.totalCents),
        supplier: '<b>' + esc(award.lines[0].name) + '</b>',
        purpose: esc(purpose)
      }));
    } else if (award.lines.length > 1) {
      h += para1(fill(ph.approvalSoughtMultiLead, { purpose: esc(purpose) }));
      h += '<ul class="rsn">' + award.lines.map(function (l) {
        return '<li>' + fill(ph.approvalSoughtMultiLine, {
          words: isNaN(l.cents) ? '[FIGURES INVALID]' : amountInWords(l.cents),
          figure: fmtMoney(isNaN(l.cents) ? 0 : l.cents),
          supplier: '<b>' + esc(l.name) + '</b>'
        }) + '</li>';
      }).join('') + '</ul>';
    } else {
      h += para1(fill(ph.approvalSoughtSingle, {
        words: '[NO AWARD SELECTED]', figure: '$0.00',
        supplier: '<b>[no supplier]</b>', purpose: esc(purpose)
      }));
    }

    /* need / background paragraphs */
    if (st.need && st.need.trim()) {
      var needParas = st.need.trim().split(/\n\s*\n/);
      for (var np0 = 0; np0 < needParas.length; np0++) h += para(esc(needParas[np0]).replace(/\n/g, '<br>'));
    }

    /* method paragraph and its evidence */
    if (award.mode === 'verbal') {
      var contacts = caseFile.verbal.contacts;
      var sel = verbal.selectedContact(caseFile.verbal);
      var refs = [];
      var nForm = folio.numberOfTag(st.folios, caseFile.folioStart, 'verbal-form');
      if (nForm != null) refs.push(nForm);
      if (sel) {
        var nQuote = folio.numberOfTag(st.folios, caseFile.folioStart, 'quote:' + sel.name);
        if (nQuote != null) refs.push(nQuote);
      }
      var refText = folio.proseRef(refs);
      var contactedWord = textutil.countWord(contacts.length);
      contactedWord = contactedWord.charAt(0).toUpperCase() + contactedWord.slice(1);
      var sentence = fill(ph.verbalQuotation, {
        contactedWord: contactedWord,
        supplier: esc(sel ? sel.name : '[no supplier selected]'),
        folioRefs: refText
      });
      if (!refText) sentence = sentence.replace(/\s*\{?folioRefs\}?\s*refers\./, '').replace(/\s+refers\.\s*$/, '.');
      h += para(sentence);
      if (caseFile.verbal.schedule.length) {
        h += '<p style="margin:0 0 4pt">Table 1' + (caseFile.verbal.tableTitle ? ': ' + esc(caseFile.verbal.tableTitle) : '') + '</p>';
        h += verbal.scheduleTableHTML(caseFile.verbal);
      }
    } else if (award.mode === 'evaluation') {
      var ev = caseFile.evaluation;
      var invited = ev.suppliers.length;
      var quoted = ev.suppliers.filter(function (s) { return s.status === 'quoted'; }).length;
      h += para(fill(ph.quotationsRequested, {
        invitedWord: textutil.countWord(invited), invited: invited,
        quotedWord: textutil.countWord(quoted), quoted: quoted,
        purpose: esc(purpose)
      }));
      h += '<ul class="rsn">' + ev.suppliers.map(function (s) {
        return '<li>' + esc(s.name) + (s.status === 'quoted' ? '; Quoted' : ';') + '</li>';
      }).join('') + '</ul>';
      var evalFolio = folio.numberOfTag(st.folios, caseFile.folioStart, 'evaluation');
      var breakRef = evalFolio != null
        ? 'A break-down of the items and how they were selected is shown in ' + folio.proseRef(evalFolio) + '.'
        : '';
      var tableCount = award.schedules.length + (award.schedules.length > 1 ? 1 : 0);
      h += para('After a careful examination of the quotations received, it is recommended that the items be purchased from ' +
        textutil.joinAnd(award.lines.map(function (l) { return esc(l.name); })) +
        ', each item at the lowest compliant quotation unless an override with its justification is shown in the tables. ' +
        breakRef + ' A break-down of the cost per company is listed in the following table' + (tableCount === 1 ? '' : 's') + ' hereunder;');
      for (var si = 0; si < award.schedules.length; si++) {
        h += '<p style="margin:0 0 4pt">Table ' + (si + 1) + '.</p>';
        h += evaluation.awardTableHTML(ev, award.schedules[si]);
      }
      if (award.schedules.length > 1) {
        h += '<p style="margin:0 0 4pt">Table ' + (award.schedules.length + 1) + '.</p>';
        h += evaluation.breakdownTableHTML(ev);
      }
    } else if (st.method === 'Request for Quotation') {
      var sup = compute.allSuppliers(st.items);
      var q2 = sup.filter(function (s) { return s.quoted; });
      h += para(fill(ph.quotationsRequested, {
        invitedWord: textutil.countWord(sup.length), invited: sup.length,
        quotedWord: textutil.countWord(q2.length), quoted: q2.length,
        purpose: esc(purpose)
      }));
      h += '<ul class="rsn">' + sup.map(function (s) {
        return '<li>' + esc(s.name) + (s.quoted ? '; Quoted' : ';') + '</li>';
      }).join('') + '</ul>';
    } else if (st.methodjust && st.methodjust.trim()) {
      h += para(esc(st.methodjust.trim()));
    }

    /* extra minute paragraphs */
    if (st.minextra && st.minextra.trim()) {
      var extras = st.minextra.trim().split(/\n\s*\n/);
      for (var x = 0; x < extras.length; x++) h += para(esc(extras[x]));
    }

    /* regulation and OPR lines */
    h += para(ph.regulationLine);
    if (caseFile.oprRegistered && award.lines.length) {
      /* Both signed samples use "are" even for a single company (collective
         noun, house style): "…Ate6Ate Savor City Caterers Ltd are registered". */
      h += para(fill(ph.oprLine, {
        suppliers: textutil.joinAnd(award.lines.map(function (l) { return esc(l.name); })),
        isAre: 'are'
      }));
    }

    /* funding: words+figure computed, vote block, computed vote status */
    h += para(fill(ph.fundingLine, {
      words: award.bad ? '[FIGURES INVALID]' : amountInWords(award.totalCents),
      figure: fmtMoney(award.bad ? 0 : award.totalCents)
    }));
    if (caseFile.voteBlock) {
      var vb = caseFile.voteBlock;
      var rows = [['Head:', vb.head], ['Sub-Head:', vb.subHead], ['Item:', vb.item], ['Sub-Item:', vb.subItem]];
      h += '<table style="border-collapse:collapse;margin:0 0 11pt 24pt;font-size:12pt">';
      for (var r2 = 0; r2 < rows.length; r2++) {
        if (!rows[r2][1]) continue;
        h += '<tr><td style="padding-right:18pt"><b>' + esc(rows[r2][0]) + '</b></td><td style="padding-right:18pt">' + esc(rows[r2][1][0] || '') + '</td><td>' + esc(rows[r2][1][1] || '') + '</td></tr>';
      }
      h += '</table>';
    }
    if (caseFile.voteStatus) {
      h += '<p style="margin:0 0 6pt">' + esc(ph.voteStatusLead) + '</p>';
      h += votestatus.tableHTML(caseFile.voteStatus, p.voteStatusColumns);
      var short = votestatus.shortfallCents(caseFile.voteStatus, award.bad ? NaN : award.totalCents);
      if (short > 0) h += para(ph.transferLine);
    }

    /* submission */
    if (award.lines.length === 1) {
      h += para(fill(ph.submittedApprovalSingle, {
        words: award.bad ? '[FIGURES INVALID]' : amountInWords(award.totalCents),
        figure: fmtMoney(award.bad ? 0 : award.totalCents),
        supplier: '<b>' + esc(award.lines[0].name) + '</b>'
      }));
    } else if (award.lines.length > 1) {
      h += para(fill(ph.submittedApprovalMultiLead, { purpose: esc(purpose) }));
      h += '<ul class="rsn">' + award.lines.map(function (l) {
        return '<li>' + fill(ph.approvalSoughtMultiLine, {
          words: isNaN(l.cents) ? '[FIGURES INVALID]' : amountInWords(l.cents),
          figure: fmtMoney(isNaN(l.cents) ? 0 : l.cents),
          supplier: '<b>' + esc(l.name) + '</b>'
        }) + '</li>';
      }).join('') + '</ul>';
    }
    h += para(ph.submittedConsideration);

    /* signature */
    var signame = (st.minsigname && st.minsigname.trim()) ? st.minsigname.trim() : (st.signame || '');
    var sigpost = (st.minsigpost && st.minsigpost.trim()) ? st.minsigpost.trim() : (p.signature.post || '');
    h += '<div class="sig"><div style="border-top:1px dotted #555;width:200pt;margin-bottom:2pt">&nbsp;</div>' +
      '<div><b>' + esc(signame) + '</b>' + (sigpost ? ' ' + esc(sigpost) : '') + '</div>' +
      (st.date ? '<div>' + esc(p.signature.handwrittenDay ? monthYearHand(st.date) : textutil.fmtDateProse(st.date)) + '</div>' : '') +
      (p.signature.unitLine ? '<div>' + esc(p.signature.unitLine) + '</div>' : '') +
      '</div>';
    return h;
  }

  documents.registerBuilder('minute-hybrid', build);

  return { build: build, awardData: awardData, monthYearHand: monthYearHand, purposeOf: purposeOf };
});
