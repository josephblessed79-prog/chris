/* verify.js — the verification engine. Runs every control the supervisor
   would apply over the case data and returns a list of
   { id, name, result, detail, action } with result PASS / FAIL / WARN / INFO.
   Ported from Approvals_Composer.html check-for-check (C1–C22a); pathway
   modules contribute further checks through runExtraChecks.
   Loads in the browser as MODPA.verify and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./words.js'),
      require('./textutil.js'), require('./compute.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.verify = factory(root.MODPA.money, root.MODPA.words,
      root.MODPA.textutil, root.MODPA.compute);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil, compute) {
  'use strict';

  var parseMoney = money.parseMoney, fmtMoney = money.fmtMoney;
  var amountInWords = words.amountInWords;
  var countWord = textutil.countWord, fmtDateLong = textutil.fmtDateLong,
    fmtDateProse = textutil.fmtDateProse;
  var lineTotal = compute.lineTotal, grandTotal = compute.grandTotal,
    allSuppliers = compute.allSuppliers;

  function runChecks(st) {
    var R = [], items = st.items;
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    add('C1', 'File reference entered', st.ref ? 'PASS' : 'FAIL', st.ref || 'Missing', 'Enter the file reference on Case Details.');
    add('C2', 'Document date entered', st.date ? 'PASS' : 'FAIL', st.date ? fmtDateLong(st.date, st.handdate) : 'Missing', 'Enter the date on Case Details.');
    add('C3', 'Addressee entered', (st.addr && st.addr.trim()) ? 'PASS' : 'FAIL', '', 'Enter the addressee block.');
    add('C4', 'Subject / title entered', (st.subject && st.subject.trim()) ? 'PASS' : 'FAIL', '', 'Enter the subject on Case Details.');
    add('C5', 'Signature block complete (name and appointment)', (st.signame && st.sigapp) ? 'PASS' : 'FAIL', 'Rank is optional.', 'Complete name and appointment.');

    if (!items.length) { add('C6', 'At least one item entered', 'FAIL', 'No items.', 'Add an item on tab 2.'); }
    var noncomp = st.method === 'Direct Contracting' || st.method === 'Single / National Provider' || st.method === 'Emergency Procurement';
    for (var i = 0; i < items.length; i++) {
      var it = items[i], tag = 'Item ' + (i + 1) + (it.desc ? ' (' + it.desc + ')' : '');
      var amountMode = it.mode === 'amount';
      var itemComplete = amountMode ? !!it.desc : !!(it.desc && it.qty && parseFloat(it.qty) > 0);
      add('C6.' + (i + 1), tag + (amountMode ? ': description' : ': description and quantity'), itemComplete ? 'PASS' : 'FAIL', '',
        amountMode ? 'Enter the item / requirement description.' : 'Complete description and quantity.');
      if (!it.quotes.length) { add('C7.' + (i + 1), tag + ': supplier rows', 'FAIL', 'No supplier rows.', 'Add supplier rows including non-respondents.'); continue; }
      var recRows = it.quotes.filter(function (q) { return q.recommended; });
      add('C8.' + (i + 1), tag + ': recommended supplier selected', recRows.length ? 'PASS' : 'FAIL', '', 'Tick Recommended on the winning row.');
      if (recRows.length > 1 && !amountMode) {
        add('C8b.' + (i + 1), tag + ': one recommended supplier per priced item', 'FAIL',
          'This item has ' + recRows.length + ' recommended rows. In quantity mode every recommended row is costed at the full item quantity, so the award would be double-counted.',
          'Split the item: create a separate item for each supplier with that supplier’s own quantity, or switch the card to Amount mode and enter each supplier’s own amount.');
      }
      var arithBad = false, minC = null, badDetail = '';
      for (var j = 0; j < it.quotes.length; j++) {
        var q = it.quotes[j];
        if (q.status === 'Quoted') {
          var lt = lineTotal(q);
          if (isNaN(lt)) { arithBad = true; badDetail = 'Row ' + (j + 1) + ' (' + (q.supplier || 'unnamed') + ') has an invalid ' + (amountMode ? 'amount or VAT figure' : 'quantity, unit cost or VAT figure') + '.'; }
          else if (q.compliant !== 'No' && (minC === null || lt < minC)) minC = lt;
        }
        if (!q.supplier) { arithBad = true; badDetail = 'Row ' + (j + 1) + ' has no supplier name.'; }
      }
      add('C9.' + (i + 1), tag + ': figures valid and computable', arithBad ? 'FAIL' : 'PASS', badDetail, 'Correct the flagged row.');
      for (var j2 = 0; j2 < recRows.length; j2++) {
        var r = recRows[j2];
        if (r.status !== 'Quoted') add('C10.' + (i + 1), tag + ': recommended row has a quotation', 'FAIL', 'Recommended supplier ' + (r.supplier || '') + ' is marked ' + r.status + '.', 'A supplier without a quotation cannot be recommended.');
        else if (r.compliant === 'No') add('C10.' + (i + 1), tag + ': recommended row meets specification', 'FAIL', (r.supplier || '') + ' is marked non-compliant.', 'Change the recommendation or correct the compliance entry.');
        else {
          var lt2 = lineTotal(r);
          if (!isNaN(lt2) && minC !== null && lt2 > minC && !(st.notlowest && st.notlowest.trim()))
            add('C10.' + (i + 1), tag + ': lowest-cost rule', 'FAIL', 'Recommended total ' + fmtMoney(lt2) + ' exceeds the lowest compliant quote ' + fmtMoney(minC) + ' and no justification is given.', 'Justify the non-lowest recommendation on tab 3, or change the recommendation.');
          else
            add('C10.' + (i + 1), tag + ': lowest-cost rule', 'PASS', minC !== null ? ('Recommended ' + fmtMoney(lt2) + '; lowest compliant quote ' + fmtMoney(minC) + (lt2 > minC ? ' — justification recorded' : '')) : '', '');
        }
      }
    }
    var gt = grandTotal(items);
    if (isNaN(gt)) add('C11', 'Grand total computed', 'FAIL', 'A recommended row has invalid figures.', 'Fix the flagged rows.');
    else if (gt === 0) add('C11', 'Grand total computed', 'FAIL', 'No recommended lines carry a value.', 'Tick Recommended on the winning rows.');
    else add('C11', 'Grand total computed', 'PASS', fmtMoney(gt) + ' — ' + amountInWords(gt) + ' — figures and words generated from the same number, so they cannot disagree.', '');

    add('C12', 'VAT treatment stated', st.vat ? 'PASS' : 'FAIL', st.vat || '', 'Select the VAT treatment on tab 3.');
    if (st.vat === 'VAT Inclusive') {
      var dbl = false;
      for (var a = 0; a < items.length; a++) for (var b = 0; b < items[a].quotes.length; b++) {
        var vq = items[a].quotes[b];
        if (vq.status === 'Quoted' && vq.vat && parseMoney(vq.vat) > 0) dbl = true;
      }
      add('C13', 'No VAT double-count', dbl ? 'WARN' : 'PASS', dbl ? 'Treatment is VAT Inclusive but a separate VAT amount is also entered on a line — confirm the amount entered does not already include VAT.' : '', dbl ? 'If the amount is already VAT-inclusive, set the line VAT to 0.' : '');
    }
    add('C14', 'Procurement method justified', (!noncomp && st.urgency !== 'Urgent') || ((st.methodjust || '').trim()) ? 'PASS' : 'FAIL', noncomp ? ('Method is ' + st.method) : '', 'Non-competitive or urgent routes require a recorded justification on tab 3.');
    add('C15', 'Vote to be utilised entered', (st.vote && st.vote.trim()) ? 'PASS' : 'FAIL', '', 'Enter the vote on tab 3.');
    if (st.funds !== '' && st.funds != null) {
      var f = parseMoney(st.funds);
      if (f === null || isNaN(f)) add('C16', 'Available funds figure valid', 'FAIL', 'Unreadable figure: ' + st.funds, 'Enter a plain figure, e.g. 250000.00');
      else if (!isNaN(gt) && gt > 0) add('C16', 'Available funds cover the total', f >= gt ? 'PASS' : 'FAIL', 'Funds ' + fmtMoney(f) + ' vs total ' + fmtMoney(gt), (f >= gt ? '' : 'Confirm funding before submission or record the shortfall for decision.'));
    } else add('C16', 'Available funds', 'INFO', 'Not entered — the pack does not claim funds are available.', 'Optional: enter available funds for a cover check.');
    add('C17', 'Operational need stated', (st.need && st.need.trim()) ? 'PASS' : 'FAIL', '', 'Complete the background / operational need on tab 3.');
    var basisOk = (st.r_alt && st.r_alt.trim()) || st.r_comm || st.r_tech || st.r_low;
    add('C18', 'Basis of recommendation stated', basisOk ? 'PASS' : 'FAIL', '', 'Tick at least one reason or state an alternative basis.');

    var sup = allSuppliers(items), quoted = sup.filter(function (s) { return s.quoted; });
    add('C19', 'Competition recorded', sup.length ? 'PASS' : 'FAIL', sup.length ? (countWord(sup.length) + ' (' + sup.length + ') supplier(s) approached; ' + countWord(quoted.length) + ' (' + quoted.length + ') quoted.') : '', 'Enter all suppliers the RFQ was sent to, including non-respondents.');
    if (st.method === 'Request for Quotation' && sup.length > 0 && sup.length < 3)
      add('C19a', 'Breadth of competition', 'WARN', 'Only ' + sup.length + ' supplier(s) recorded for an RFQ. House practice is to invite several (the exemplar files invited five).', 'Confirm the full invitation list is recorded.');

    var att = st.attachments.filter(function (a) { return a && a.trim(); });
    var missA = [];
    for (var s2 = 0; s2 < quoted.length; s2++) {
      var nm = quoted[s2].name.trim().toLowerCase().replace(/\s+/g, ' '), found = false;
      for (var a2 = 0; a2 < att.length; a2++) {
        var line = att[a2].trim().toLowerCase().replace(/\s+/g, ' ');
        if (line.indexOf(nm) >= 0 && /quotation/i.test(att[a2])) { found = true; break; }
      }
      if (!found) missA.push(quoted[s2].name.trim());
    }
    add('C20', 'Attachments cover every quotation', att.length ? (missA.length ? 'FAIL' : 'PASS') : 'FAIL', missA.length ? ('No quotation attachment listed for: ' + missA.join('; ')) : (att.length ? att.length + ' attachment line(s).' : 'No attachments listed.'), 'Use Auto-build on tab 4, then verify against the physical file.');
    add('C21', 'Folio list present (minute sheet)', st.folios.filter(function (f) { return f.desc && f.desc.trim(); }).length ? 'PASS' : 'FAIL', '', 'Use Auto-build on tab 4 and set the folio dates.');
    /* chronology */
    if (st.rfqdate && st.deadline) {
      if (st.rfqdate > st.deadline) add('C22', 'Dates in order (issue before closing)', 'FAIL', 'Issue date ' + fmtDateProse(st.rfqdate) + ' is after the closing date ' + fmtDateProse(st.deadline) + '. This exact error has appeared in signed files.', 'Correct the dates on tab 3.');
      else add('C22', 'Dates in order (issue before closing)', 'PASS', 'Issued ' + fmtDateProse(st.rfqdate) + '; closed ' + fmtDateProse(st.deadline) + '.', '');
    }
    if (st.deadline && st.date && st.deadline > st.date) {
      add('C22a', 'Closing date not after the document date', 'WARN', 'The quotation closing date (' + fmtDateProse(st.deadline) + ') is after the date of this document (' + fmtDateProse(st.date) + '). An approval is normally written after quotations close.', 'Confirm the dates are correct.');
    }
    return R;
  }

  function checkStats(R) {
    var f = 0, w = 0;
    for (var i = 0; i < R.length; i++) { if (R[i].result === 'FAIL') f++; if (R[i].result === 'WARN') w++; }
    return { fail: f, warn: w };
  }

  return { runChecks: runChecks, checkStats: checkStats };
});
