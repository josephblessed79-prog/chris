/* compute.js — computation over the case items: line totals, grand total,
   award grouping. Ported from Approvals_Composer.html; the parity test holds
   every function to the legacy output.
   Loads in the browser as MODPA.compute and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.compute = factory(root.MODPA.money);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money) {
  'use strict';

  var parseMoney = money.parseMoney;

  /* One supplier row -> total cents, or null (no quotation) or NaN (bad figures).
     Two entry modes: 'qty' (quantity × unit cost + VAT) and 'amount'
     (subtotal + VAT, where the supplier gave a single overall figure). */
  function lineTotal(q) {
    if (q.status !== 'Quoted') return null;
    var v = q.vat === '' || q.vat == null ? 0 : parseMoney(q.vat);
    if (v === null || isNaN(v)) return NaN;
    if (q.mode === 'amount') {
      var sub = parseMoney(q.sub);
      if (sub === null || isNaN(sub)) return NaN;
      return sub + v;
    }
    var qty = parseFloat(q.qty), u = parseMoney(q.unit);
    if (isNaN(qty) || qty <= 0 || u === null || isNaN(u)) return NaN;
    return Math.round(qty * u) + v;
  }

  /* Sum of every recommended row. NaN if any recommended row is bad. */
  function grandTotal(items) {
    var t = 0, any = false;
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      for (var j = 0; j < it.quotes.length; j++) {
        var q = it.quotes[j];
        if (q.recommended) {
          var lt = lineTotal(q);
          if (lt === null || isNaN(lt)) return NaN;
          t += lt; any = true;
        }
      }
    }
    return any ? t : 0;
  }

  /* Unique recommended suppliers, in first-appearance order, with addresses. */
  function recommendedSuppliers(items) {
    var seen = {}, out = [];
    for (var i = 0; i < items.length; i++) for (var j = 0; j < items[i].quotes.length; j++) {
      var q = items[i].quotes[j];
      var nm = (q.supplier || '').trim();
      if (q.recommended && nm && !seen[nm.toLowerCase()]) {
        seen[nm.toLowerCase()] = 1;
        out.push({ name: nm, address: q.address || '' });
      }
    }
    return out;
  }

  /* Item label for the award schedule: "Black Shoes (120 pairs)". */
  function awardItemLabel(it) {
    if (it.mode === 'amount' || !it.qty) return it.desc || '[item]';
    return (it.desc || '[item]') + ' (' + it.qty + (it.unitname ? ' ' + it.unitname : '') + ')';
  }

  /* Recommended rows grouped by supplier: name, address, items, total cents.
     bad=true marks a supplier whose figures do not compute. */
  function awardSummary(items) {
    var map = {}, order = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      for (var j = 0; j < it.quotes.length; j++) {
        var q = it.quotes[j];
        if (!q.recommended) continue;
        var k = (q.supplier || '').trim().toLowerCase();
        if (!k) continue;
        if (!map[k]) { map[k] = { name: q.supplier.trim(), address: q.address || '', cents: 0, bad: false, items: [] }; order.push(k); }
        if (!map[k].address && q.address) map[k].address = q.address;
        var lt = lineTotal(q);
        if (lt === null || isNaN(lt)) map[k].bad = true; else map[k].cents += lt;
        map[k].items.push(awardItemLabel(it));
      }
    }
    return order.map(function (k) { return map[k]; });
  }

  /* Every supplier that appears anywhere, with a quoted/did-not-quote flag. */
  function allSuppliers(items) {
    var map = {}, order = [];
    for (var i = 0; i < items.length; i++) for (var j = 0; j < items[i].quotes.length; j++) {
      var q = items[i].quotes[j];
      var nm = (q.supplier || '').trim();
      if (!nm) continue;
      var k = nm.toLowerCase().replace(/\s+/g, ' ');
      if (!map[k]) { map[k] = { name: nm, quoted: false }; order.push(k); }
      if (q.status === 'Quoted') map[k].quoted = true;
    }
    return order.map(function (k) { return map[k]; });
  }

  return {
    lineTotal: lineTotal,
    grandTotal: grandTotal,
    recommendedSuppliers: recommendedSuppliers,
    awardItemLabel: awardItemLabel,
    awardSummary: awardSummary,
    allSuppliers: allSuppliers
  };
});
