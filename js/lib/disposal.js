/* disposal.js — Disposal Committee pathway (P4), scaffolded under the
   Public Procurement and Disposal of Public Property Act, Act No. 1 of
   2015 (the Act governs the disposal of public property alongside
   procurement; the operational methods below follow the practice the
   Office of Procurement Regulation recognises).

   *** SCAFFOLD — AWAITING FORMAT AUTHORITY ***
   No sample disposal file has been provided to this project. The document
   layouts in docs/disposaldocs.js follow the Act's disposal provisions
   and the house minute style, and every generated disposal document
   carries a visible banner saying exactly that. Before operational use,
   a real signed disposal file must be supplied and these formats
   confirmed against it. Ask before deviating: this is recorded in
   ASSUMPTIONS.md.

   Data model (figures typed once, totals computed):
     disposal = {
       committee: [{name, post}],
       items: [{ desc, identification, qty, condition, location,
                 acquisitionCost ('' or figure), valuation (figure),
                 valuationBasis, valuationDate,
                 method (one of METHODS), methodReason }],
       narrative: ''
     }
   Loads as MODPA.disposal / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.disposal = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var fmtMoney = money.fmtMoney;

  /* The recognised disposal routes. Data, not code: extend the list here
     and the forms, checks and documents follow. */
  var METHODS = [
    'Transfer to another public body',
    'Sale by public auction',
    'Sale by tender',
    'Trade-in',
    'Donation',
    'Destruction',
    'Recycling'
  ];

  /* Methods that demand a recorded reason in every case (the value is
     leaving public hands, or being destroyed, without sale proceeds). */
  var REASON_MANDATORY = ['Donation', 'Destruction'];

  function newDisposal() {
    return { committee: [], items: [], narrative: '' };
  }

  function itemValuationCents(item) {
    var p = money.parseStrict(item.valuation);
    return p.ok ? p.cents : NaN;
  }

  function totalValuationCents(d) {
    var t = 0;
    for (var i = 0; i < d.items.length; i++) {
      var v = itemValuationCents(d.items[i]);
      if (isNaN(v)) return NaN;
      t += v;
    }
    return t;
  }

  /* Items grouped by recommended method, with computed subtotals. */
  function byMethod(d) {
    var map = {}, order = [];
    for (var i = 0; i < d.items.length; i++) {
      var m = d.items[i].method || '[no method]';
      if (!map[m]) { map[m] = { method: m, items: [], cents: 0, bad: false }; order.push(m); }
      map[m].items.push(d.items[i]);
      var v = itemValuationCents(d.items[i]);
      if (isNaN(v)) map[m].bad = true; else map[m].cents += v;
    }
    return order.map(function (k) { return map[k]; });
  }

  /* D-series verification checks. */
  function runDisposalChecks(d) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    if (!d) { add('D1', 'Disposal record', 'FAIL', 'No disposal record on a P4 case.', 'Complete the disposal inventory.'); return R; }
    add('D0', 'Format authority', 'WARN',
      'Disposal document formats are scaffolded from the Act — no sample disposal file has been provided. Documents carry the AWAITING FORMAT AUTHORITY banner until a signed sample is supplied and the formats confirmed.',
      'Provide a sample disposal file to confirm the formats.');
    add('D1', 'Committee recorded', d.committee.length ? 'PASS' : 'FAIL',
      d.committee.length ? d.committee.length + ' member(s).' : '', 'Record the Disposal Committee members.');
    if (d.committee.length > 0 && d.committee.length < 3) {
      add('D1a', 'Committee strength', 'WARN', 'Fewer than three members recorded.', 'Confirm the committee composition.');
    }
    add('D2', 'Inventory has items', d.items.length ? 'PASS' : 'FAIL', '', 'Add the property to be disposed of.');
    for (var i = 0; i < d.items.length; i++) {
      var it = d.items[i], tag = 'Item ' + (i + 1) + (it.desc ? ' (' + it.desc + ')' : '');
      if (!it.desc || !String(it.desc).trim()) add('D3.' + (i + 1), tag + ': description', 'FAIL', '', 'Describe the property.');
      if (!it.condition || !String(it.condition).trim()) add('D3.' + (i + 1) + 'c', tag + ': condition', 'FAIL', '', 'Record the condition (e.g. beyond economic repair).');
      var v = money.parseStrict(it.valuation);
      if (!v.ok) add('D4.' + (i + 1), tag + ': valuation figure', 'FAIL', 'Valuation "' + (it.valuation || '') + '" rejected: ' + v.hint, 'Enter the valuation exactly as assessed.');
      else if (!it.valuationBasis || !String(it.valuationBasis).trim()) add('D4.' + (i + 1) + 'b', tag + ': valuation basis', 'FAIL', 'A figure without its basis cannot be verified.', 'Record who valued it and how (e.g. Board of Survey).');
      if (!it.method) add('D5.' + (i + 1), tag + ': method of disposal', 'FAIL', '', 'Select the recommended method.');
      else if (METHODS.indexOf(it.method) < 0) add('D5.' + (i + 1), tag + ': method recognised', 'FAIL', '"' + it.method + '" is not a recognised route.', 'Select a method from the list.');
      else if (REASON_MANDATORY.indexOf(it.method) >= 0 && !(it.methodReason || '').trim()) {
        add('D5.' + (i + 1) + 'r', tag + ': ' + it.method.toLowerCase() + ' justified', 'FAIL',
          it.method + ' requires a recorded reason.', 'Record why this route is recommended.');
      }
    }
    var t = totalValuationCents(d);
    if (d.items.length) {
      if (isNaN(t)) add('D6', 'Total valuation computable', 'FAIL', 'An item has an invalid valuation figure.', 'Correct the flagged items.');
      else add('D6', 'Total valuation computable', 'PASS', fmtMoney(t) + '.', '');
    }
    return R;
  }

  return {
    METHODS: METHODS,
    REASON_MANDATORY: REASON_MANDATORY,
    newDisposal: newDisposal,
    itemValuationCents: itemValuationCents,
    totalValuationCents: totalValuationCents,
    byMethod: byMethod,
    runDisposalChecks: runDisposalChecks
  };
});
