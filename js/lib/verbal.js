/* verbal.js — micro-procurement by verbal quotation (pathway P1).
   The telephone-contact register, the per-date schedule (boxed meals per
   day with delivery lines), the computed total, and the V-series checks.
   Everything the minute prints is computed from this data.
   Loads in the browser as MODPA.verbal and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.verbal = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var esc = textutil.esc, fmtMoney = money.fmtMoney;

  /* verbal = {
       purpose: 'the provision of Boxed Meals for the Human Resource Training Workshop',
       contacts: [{ name, phone, date, spokeTo, outcome: 'quoted'|'no-answer'|'declined',
                    amount: '1,200.00' (total quoted, as given verbally) }],
       selected: contactIndex,
       selectionBasis: 'best option based on price',
       notLowestJustification: '',
       schedule: [{ date: '2026-05-19', desc, qty, rate: '60.00', kind: 'line'|'delivery' }],
       tableTitle: 'Boxed Meals'
     } */
  function newVerbal() {
    return {
      purpose: '', contacts: [], selected: null, selectionBasis: 'best option based on price',
      notLowestJustification: '', schedule: [], tableTitle: ''
    };
  }

  function rowTotalCents(row) {
    var p = money.parseStrict(row.rate);
    if (!p.ok) return NaN;
    if (!(Number.isInteger(row.qty) && row.qty > 0)) return NaN;
    return row.qty * p.cents;
  }

  function totalCents(verbal) {
    var t = 0;
    for (var i = 0; i < verbal.schedule.length; i++) {
      var r = rowTotalCents(verbal.schedule[i]);
      if (isNaN(r)) return NaN;
      t += r;
    }
    return t;
  }

  function contactQuoteCents(c) {
    if (c.outcome !== 'quoted') return null;
    var p = money.parseStrict(c.amount);
    return p.ok ? p.cents : NaN;
  }

  function selectedContact(verbal) {
    if (verbal.selected == null) return null;
    return verbal.contacts[verbal.selected] || null;
  }

  /* Quantity display in the sample style: "Five (5)" for supply lines,
     "(1)" for delivery lines. */
  function qtyDisplay(row) {
    if (row.kind === 'delivery') return '(' + row.qty + ')';
    var w = textutil.countWord(row.qty);
    return w.charAt(0).toUpperCase() + w.slice(1) + ' (' + row.qty + ')';
  }

  /* The per-date schedule table (Table 1 of the boxed-meals minute). */
  function scheduleTableHTML(verbal) {
    var sel = selectedContact(verbal);
    var h = '<table class="cmp"><thead><tr><th>Supplier</th><th>Date</th><th>Description</th><th>Quantity</th><th>Rate</th><th>Total</th></tr></thead>';
    for (var i = 0; i < verbal.schedule.length; i++) {
      var r = verbal.schedule[i];
      var rt = rowTotalCents(r);
      var p = money.parseStrict(r.rate);
      h += '<tr><td>' + (i === 0 ? esc(sel ? sel.name : '[no supplier selected]') : '') + '</td>' +
        '<td>' + esc(textutil.fmtDateDots(r.date)) + '</td>' +
        '<td>' + esc(r.desc) + '</td>' +
        '<td class="ctr">' + esc(qtyDisplay(r)) + '</td>' +
        '<td class="num">' + (p.ok ? fmtMoney(p.cents) : 'REJECTED') + '</td>' +
        '<td class="num">' + (isNaN(rt) ? 'CHECK' : fmtMoney(rt)) + '</td></tr>';
    }
    var t = totalCents(verbal);
    h += '<tr><td colspan="5" class="num"><b>Total</b></td><td class="num"><b>' + (isNaN(t) ? 'CHECK' : fmtMoney(t)) + '</b></td></tr>';
    h += '</table>';
    return h;
  }

  /* The V-series verification checks. */
  function runVerbalChecks(verbal) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    if (!verbal) { add('V1', 'Verbal quotation data', 'FAIL', 'No verbal-quotation record on a micro-procurement case.', 'Complete the verbal quotation form.'); return R; }
    add('V1', 'Purpose stated', (verbal.purpose || '').trim() ? 'PASS' : 'FAIL', '', 'State what is being procured and for what.');
    var quoted = verbal.contacts.filter(function (c) { return c.outcome === 'quoted'; });
    add('V2', 'Telephone contacts recorded', verbal.contacts.length ? 'PASS' : 'FAIL',
      verbal.contacts.length ? (textutil.countWord(verbal.contacts.length) + ' (' + verbal.contacts.length + ') contacted; ' + textutil.countWord(quoted.length) + ' (' + quoted.length + ') gave verbal quotations.') : '',
      'Record every company contacted, including those that did not quote.');
    if (verbal.contacts.length > 0 && verbal.contacts.length < 3) {
      add('V2a', 'Breadth of contact', 'WARN', 'Only ' + verbal.contacts.length + ' compan' + (verbal.contacts.length === 1 ? 'y' : 'ies') + ' contacted — the sample practice is three.', 'Confirm the full contact list is recorded.');
    }
    for (var i = 0; i < verbal.contacts.length; i++) {
      var c = verbal.contacts[i];
      if (!c.name || !String(c.name).trim()) add('V3.' + (i + 1), 'Contact ' + (i + 1) + ': name', 'FAIL', '', 'Enter the company name.');
      if (c.outcome === 'quoted') {
        var q = contactQuoteCents(c);
        if (q === null || isNaN(q)) add('V3.' + (i + 1), 'Contact ' + (i + 1) + ' (' + (c.name || '') + '): quoted amount valid', 'FAIL', 'Amount "' + (c.amount || '') + '" rejected.', 'Enter the verbally quoted amount as a plain figure.');
      }
    }
    var sel = selectedContact(verbal);
    if (!sel) add('V4', 'Supplier selected', 'FAIL', '', 'Select the recommended company on the verbal quotation form.');
    else if (sel.outcome !== 'quoted') add('V4', 'Selected supplier gave a quotation', 'FAIL', sel.name + ' is recorded as ' + sel.outcome + '.', 'A company that did not quote cannot be selected.');
    else {
      add('V4', 'Supplier selected', 'PASS', sel.name + ' — ' + (verbal.selectionBasis || 'basis not stated') + '.', '');
      var selCents = contactQuoteCents(sel);
      var lowest = null;
      for (var j = 0; j < quoted.length; j++) {
        var qc = contactQuoteCents(quoted[j]);
        if (qc != null && !isNaN(qc) && (lowest === null || qc < lowest)) lowest = qc;
      }
      if (selCents != null && !isNaN(selCents) && lowest !== null) {
        if (selCents > lowest && !(verbal.notLowestJustification || '').trim()) {
          add('V5', 'Lowest verbal quotation rule', 'FAIL', 'Selected ' + fmtMoney(selCents) + ' exceeds the lowest verbal quotation ' + fmtMoney(lowest) + ' and no justification is recorded.', 'Record the justification or change the selection.');
        } else {
          add('V5', 'Lowest verbal quotation rule', 'PASS', 'Selected ' + fmtMoney(selCents) + '; lowest ' + fmtMoney(lowest) + (selCents > lowest ? ' — justification recorded.' : '.'), '');
        }
      }
    }
    add('V6', 'Schedule present', verbal.schedule.length ? 'PASS' : 'FAIL', '', 'Enter the per-date schedule (what is delivered, when, at what rate).');
    for (var k = 0; k < verbal.schedule.length; k++) {
      var r = verbal.schedule[k];
      if (isNaN(rowTotalCents(r))) {
        add('V7.' + (k + 1), 'Schedule line ' + (k + 1) + ' computable', 'FAIL', 'Line "' + (r.desc || '') + '" has an invalid quantity or rate.', 'Correct the line.');
      }
    }
    var t = totalCents(verbal);
    if (!isNaN(t) && verbal.schedule.length && sel) {
      var sq = contactQuoteCents(sel);
      if (sq != null && !isNaN(sq) && sq !== t) {
        add('V8', 'Schedule total equals the verbal quotation', 'WARN', 'Schedule total ' + fmtMoney(t) + ' differs from the amount quoted verbally ' + fmtMoney(sq) + '.', 'Confirm which is correct before the minute is carried.');
      } else if (sq === t) {
        add('V8', 'Schedule total equals the verbal quotation', 'PASS', fmtMoney(t) + '.', '');
      }
    }
    return R;
  }

  return {
    newVerbal: newVerbal,
    rowTotalCents: rowTotalCents,
    totalCents: totalCents,
    contactQuoteCents: contactQuoteCents,
    selectedContact: selectedContact,
    qtyDisplay: qtyDisplay,
    scheduleTableHTML: scheduleTableHTML,
    runVerbalChecks: runVerbalChecks
  };
});
