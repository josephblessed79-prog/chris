/* evaluation.js — the Evaluation Committee worksheet engine (pathway P3).
   Replicates and hardens what the staff do by hand in the pantry-supplies
   and minor-equipment sheets: items down the side, suppliers across the
   top, a V/NV (VAT-applicable / not applicable) flag per cell, per-supplier
   NV subtotal, V subtotal, VAT and grand total; a did-not-quote register;
   pack-size conversion (priced by the case against a requirement in
   bottles) computed, never left in a text note; automatic lowest-compliant
   recommendation per item with exact rational price comparison; and manual
   overrides that always require a recorded justification, display visibly,
   and never break the arithmetic.

   Data model (all figures typed once, everything else computed):
     evaluation = {
       vatRate: {num,den,label},          // data, default 12.5%
       items:     [{desc, variant, qty, unitName}],
       suppliers: [{name, address, status}],   // status: quoted | did-not-quote | no-response
       cells:     [{item, supplier, unit, vatable, quotedQty, packSize,
                    note, compliant, complianceNote}],
       selections:[{item, supplier, justification, tieNote}]  // manual picks only
     }

   Rules (verified against the signed samples):
   - extended = qty × unit; with packSize: packs = ceil(qty/packSize),
     extended = packs × unit; with quotedQty: extended = quotedQty × unit.
   - price comparison uses the exact rational unit rate (cross-multiplied),
     never a rounded figure.
   - a quantity-shortfall quote (quotedQty < required) or a non-compliant
     quote is excluded from the automatic recommendation; choosing one is an
     override and an override without a justification is a verification FAIL.
   - a price tie requires a recorded committee selection.
   Loads in the browser as MODPA.evaluation and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./words.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.evaluation = factory(root.MODPA.money, root.MODPA.words, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, words, textutil) {
  'use strict';

  var fmtMoney = money.fmtMoney, parseStrict = money.parseStrict;
  var esc = textutil.esc;

  function newEvaluation() {
    return {
      vatRate: { num: money.VAT_RATE.num, den: money.VAT_RATE.den, label: money.VAT_RATE.label },
      items: [],
      suppliers: [],
      cells: [],
      selections: []
    };
  }

  function cellAt(ev, itemIdx, supIdx) {
    for (var i = 0; i < ev.cells.length; i++) {
      if (ev.cells[i].item === itemIdx && ev.cells[i].supplier === supIdx) return ev.cells[i];
    }
    return null;
  }

  function selectionAt(ev, itemIdx) {
    for (var i = 0; i < ev.selections.length; i++) {
      if (ev.selections[i].item === itemIdx) return ev.selections[i];
    }
    return null;
  }

  /* One cell, fully computed. Never throws; carries its errors. */
  function computeCell(ev, itemIdx, supIdx) {
    var item = ev.items[itemIdx], cell = cellAt(ev, itemIdx, supIdx);
    var out = {
      exists: !!cell, itemIdx: itemIdx, supIdx: supIdx,
      unitCents: null, extendedCents: null, packs: null, effectiveQty: null,
      vatable: false, rate: null, shortfall: false, compliant: true,
      note: '', errors: [], warnings: []
    };
    if (!cell) return out;
    out.vatable = !!cell.vatable;
    out.compliant = cell.compliant !== false;
    out.note = cell.note || '';
    var p = parseStrict(cell.unit);
    if (!p.ok) {
      out.errors.push('Unit figure "' + cell.unit + '" for ' + (item ? item.desc : 'item ' + (itemIdx + 1)) +
        ' / ' + (ev.suppliers[supIdx] ? ev.suppliers[supIdx].name : 'supplier ' + (supIdx + 1)) + ' rejected: ' + p.hint);
      return out;
    }
    out.unitCents = p.cents;
    var qty = item ? item.qty : null;
    if (!(Number.isInteger(qty) && qty > 0)) {
      out.errors.push('Item ' + (itemIdx + 1) + ' has no whole-number quantity.');
      return out;
    }
    if (cell.packSize != null) {
      if (!(Number.isInteger(cell.packSize) && cell.packSize > 0)) {
        out.errors.push('Pack size for ' + item.desc + ' must be a whole number.');
        return out;
      }
      out.packs = Math.ceil(qty / cell.packSize);
      out.effectiveQty = out.packs * cell.packSize;
      out.extendedCents = out.packs * p.cents;
      out.rate = { num: p.cents, den: cell.packSize };  // exact price per required unit
      if (out.effectiveQty > qty) {
        out.warnings.push('Pack conversion: ' + out.packs + ' × ' + cell.packSize +
          ' = ' + out.effectiveQty + ' against a requirement of ' + qty + ' ' + (item.unitName || 'units') + '.');
      }
    } else if (cell.quotedQty != null) {
      if (!(Number.isInteger(cell.quotedQty) && cell.quotedQty > 0)) {
        out.errors.push('Quoted quantity for ' + item.desc + ' must be a whole number.');
        return out;
      }
      out.effectiveQty = cell.quotedQty;
      out.extendedCents = cell.quotedQty * p.cents;
      out.rate = { num: p.cents, den: 1 };
      if (cell.quotedQty < qty) {
        out.shortfall = true;
        out.warnings.push('Quantity variance: quoted for ' + cell.quotedQty + ' against a requirement of ' + qty + '.');
      } else if (cell.quotedQty > qty) {
        out.warnings.push('Quoted for ' + cell.quotedQty + ' against a requirement of ' + qty + '.');
      }
    } else {
      out.effectiveQty = qty;
      out.extendedCents = qty * p.cents;
      out.rate = { num: p.cents, den: 1 };
    }
    /* Exactness guard: the arithmetic in this system is integer-exact or
       it is an error — never a silently imprecise float. */
    if (out.extendedCents != null && !Number.isSafeInteger(out.extendedCents)) {
      out.errors.push('The extended total for ' + (item ? item.desc : 'this item') + ' is too large to compute exactly. Check the quantity and unit figure.');
      out.extendedCents = null;
    }
    return out;
  }

  /* All computed cells for an item. */
  function itemCells(ev, itemIdx) {
    var out = [];
    for (var s = 0; s < ev.suppliers.length; s++) {
      var c = computeCell(ev, itemIdx, s);
      if (c.exists) out.push(c);
    }
    return out;
  }

  /* Automatic recommendation for one item.
     Returns { lowest: supIdx|null, tied: [supIdx…], excluded: [{supIdx, reason}], reason } */
  function recommendItem(ev, itemIdx) {
    var cells = itemCells(ev, itemIdx);
    var candidates = [], excluded = [];
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.errors.length) { excluded.push({ supIdx: c.supIdx, reason: 'figures rejected' }); continue; }
      if (!c.compliant) { excluded.push({ supIdx: c.supIdx, reason: 'does not meet specification' }); continue; }
      if (c.shortfall) { excluded.push({ supIdx: c.supIdx, reason: 'quantity shortfall' }); continue; }
      candidates.push(c);
    }
    if (!candidates.length) return { lowest: null, tied: [], excluded: excluded, reason: 'no compliant computable quotation' };
    var best = [candidates[0]];
    for (var j = 1; j < candidates.length; j++) {
      var cmp = money.cmpUnitRate(candidates[j].rate.num, candidates[j].rate.den, best[0].rate.num, best[0].rate.den);
      if (cmp < 0) best = [candidates[j]];
      else if (cmp === 0) best.push(candidates[j]);
    }
    if (best.length > 1) return { lowest: null, tied: best.map(function (c) { return c.supIdx; }), excluded: excluded, reason: 'tied lowest price' };
    return { lowest: best[0].supIdx, tied: [], excluded: excluded, reason: 'lowest compliant price' };
  }

  /* The selection that actually applies to an item: the manual pick when
     recorded, otherwise the automatic lowest. Flags overrides and ties.
     { supIdx|null, source: 'auto'|'manual', override, tie,
       justification, tieNote, needsJustification, auto } */
  function effectiveSelection(ev, itemIdx) {
    var rec = recommendItem(ev, itemIdx);
    var manual = selectionAt(ev, itemIdx);
    if (manual && Number.isInteger(manual.supplier) && cellAt(ev, itemIdx, manual.supplier)) {
      var isTiePick = rec.tied.indexOf(manual.supplier) >= 0;
      var isAuto = rec.lowest === manual.supplier;
      var override = !isAuto && !isTiePick;
      return {
        supIdx: manual.supplier, source: 'manual',
        override: override, tie: isTiePick,
        justification: manual.justification || '', tieNote: manual.tieNote || '',
        needsJustification: override && !(manual.justification || '').trim(),
        auto: rec
      };
    }
    if (rec.lowest != null) {
      return { supIdx: rec.lowest, source: 'auto', override: false, tie: false, justification: '', tieNote: '', needsJustification: false, auto: rec };
    }
    return { supIdx: null, source: 'none', override: false, tie: rec.tied.length > 1, justification: '', tieNote: '', needsJustification: false, auto: rec };
  }

  function vatOn(ev, cents) {
    var rate = ev.vatRate || money.VAT_RATE;
    return money.vatCents(cents, rate);
  }

  /* NV / V / VAT / total over a set of computed cells. */
  function totalsOver(ev, cells) {
    var nv = 0, v = 0, bad = false;
    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (!c.exists) continue;
      if (c.errors.length || c.extendedCents == null) { bad = true; continue; }
      if (c.vatable) v += c.extendedCents; else nv += c.extendedCents;
    }
    var vat = vatOn(ev, v);
    return { nvCents: nv, vCents: v, vatCents: vat, totalCents: nv + v + vat, bad: bad };
  }

  /* Full-quote totals for one supplier (the top comparison sheet). */
  function supplierTotals(ev, supIdx) {
    var cells = [];
    for (var i = 0; i < ev.items.length; i++) {
      var c = computeCell(ev, i, supIdx);
      if (c.exists) cells.push(c);
    }
    return totalsOver(ev, cells);
  }

  /* Award schedule per supplier over the effective selections
     (the "Breakdown of Price per Company" and per-supplier tables). */
  function awardSchedules(ev) {
    var bySup = {}, order = [];
    for (var i = 0; i < ev.items.length; i++) {
      var sel = effectiveSelection(ev, i);
      if (sel.supIdx == null) continue;
      var c = computeCell(ev, i, sel.supIdx);
      if (!bySup[sel.supIdx]) { bySup[sel.supIdx] = { supIdx: sel.supIdx, name: ev.suppliers[sel.supIdx].name, rows: [], cells: [] }; order.push(sel.supIdx); }
      bySup[sel.supIdx].cells.push(c);
      bySup[sel.supIdx].rows.push({
        itemIdx: i,
        desc: ev.items[i].desc,
        variant: ev.items[i].variant || '',
        qtyText: ev.items[i].qtyText || (ev.items[i].qty + (ev.items[i].unitName ? ' ' + ev.items[i].unitName : '')),
        unitCents: c.unitCents,
        packs: c.packs,
        packSize: cellAt(ev, i, sel.supIdx) && cellAt(ev, i, sel.supIdx).packSize || null,
        effectiveQty: c.effectiveQty,
        extendedCents: c.extendedCents,
        vatable: c.vatable,
        override: sel.override, tie: sel.tie,
        justification: sel.justification, tieNote: sel.tieNote,
        note: c.note
      });
    }
    return order.map(function (k) {
      var s = bySup[k];
      var t = totalsOver(ev, s.cells);
      return { supIdx: s.supIdx, name: s.name, rows: s.rows, nvCents: t.nvCents, vCents: t.vCents, vatCents: t.vatCents, totalCents: t.totalCents, bad: t.bad };
    });
  }

  /* Grand total over every awarded supplier. */
  function breakdown(ev) {
    var sch = awardSchedules(ev);
    var grand = 0, bad = false;
    for (var i = 0; i < sch.length; i++) { grand += sch[i].totalCents; if (sch[i].bad) bad = true; }
    return { schedules: sch, grandTotalCents: grand, bad: bad };
  }

  function didNotQuote(ev) {
    var out = [];
    for (var s = 0; s < ev.suppliers.length; s++) {
      if (ev.suppliers[s].status !== 'quoted') out.push(ev.suppliers[s].name);
    }
    return out;
  }

  /* The E-series verification checks for an evaluation. Same result shape
     as the main verification engine so certificates merge them. */
  function runEvalChecks(ev) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    add('E1', 'Evaluation has items', ev.items.length ? 'PASS' : 'FAIL', ev.items.length ? ev.items.length + ' item(s).' : '', 'Add the items requested.');
    var quoted = ev.suppliers.filter(function (s) { return s.status === 'quoted'; });
    add('E2', 'Evaluation has quoting suppliers', quoted.length ? 'PASS' : 'FAIL', quoted.length + ' of ' + ev.suppliers.length + ' supplier(s) quoted.', 'Record every supplier approached, including non-respondents.');
    var i, s;
    for (i = 0; i < ev.items.length; i++) {
      if (!(Number.isInteger(ev.items[i].qty) && ev.items[i].qty > 0)) {
        add('E3.' + (i + 1), 'Item ' + (i + 1) + ' (' + (ev.items[i].desc || 'unnamed') + '): quantity', 'FAIL', 'Quantity must be a whole number above zero.', 'Correct the quantity.');
      }
    }
    for (var ci = 0; ci < ev.cells.length; ci++) {
      var cell = ev.cells[ci];
      var c = computeCell(ev, cell.item, cell.supplier);
      var label = 'Cell: ' + (ev.items[cell.item] ? ev.items[cell.item].desc : 'item ' + (cell.item + 1)) + ' / ' + (ev.suppliers[cell.supplier] ? ev.suppliers[cell.supplier].name : 'supplier ' + (cell.supplier + 1));
      if (c.errors.length) add('E4.' + (ci + 1), label + ': figure valid', 'FAIL', c.errors.join(' '), 'Re-enter the figure exactly as printed on the quotation.');
      for (var w = 0; w < c.warnings.length; w++) add('E4w.' + (ci + 1), label + ': noted', 'WARN', c.warnings[w], 'Confirm against the quotation.');
      if (ev.suppliers[cell.supplier] && ev.suppliers[cell.supplier].status !== 'quoted') {
        add('E5.' + (ci + 1), label + ': supplier consistency', 'FAIL', 'A price is entered for a supplier recorded as not having quoted.', 'Correct the supplier status or remove the cell.');
      }
    }
    for (i = 0; i < ev.items.length; i++) {
      var sel = effectiveSelection(ev, i);
      var tag = 'Item ' + (i + 1) + ' (' + (ev.items[i].desc || 'unnamed') + ')';
      if (sel.supIdx == null) {
        if (sel.auto.tied.length > 1) {
          add('E6.' + (i + 1), tag + ': tied lowest price resolved', 'FAIL',
            'Suppliers ' + sel.auto.tied.map(function (x) { return ev.suppliers[x].name; }).join(' and ') + ' are tied at the lowest price. The committee must record its selection.',
            'Select the supplier on the worksheet and note the basis.');
        } else {
          add('E6.' + (i + 1), tag + ': recommendation possible', 'FAIL',
            'No compliant, computable quotation (' + sel.auto.excluded.map(function (x) { return ev.suppliers[x.supIdx].name + ' — ' + x.reason; }).join('; ') + ').',
            'Record a committee selection with a justification, or correct the cells.');
        }
        continue;
      }
      if (sel.override) {
        if (sel.needsJustification) {
          add('E7.' + (i + 1), tag + ': override justified', 'FAIL',
            'The committee selected ' + ev.suppliers[sel.supIdx].name + ' over the computed lowest' + (sel.auto.lowest != null ? ' (' + ev.suppliers[sel.auto.lowest].name + ')' : '') + ' without a recorded justification.',
            'Record the justification on the worksheet — an override without one cannot clear verification.');
        } else {
          add('E7.' + (i + 1), tag + ': override justified', 'PASS',
            'OVERRIDE — ' + ev.suppliers[sel.supIdx].name + ' selected over the computed lowest' + (sel.auto.lowest != null ? ' (' + ev.suppliers[sel.auto.lowest].name + ')' : '') + '. Justification: ' + sel.justification, '');
        }
        var oc = computeCell(ev, i, sel.supIdx);
        if (!oc.compliant) add('E8.' + (i + 1), tag + ': selected quotation meets specification', 'FAIL', ev.suppliers[sel.supIdx].name + ' is recorded as not meeting the specification.', 'A non-compliant quotation cannot be selected; correct the compliance entry or the selection.');
      }
      if (sel.tie && !(sel.tieNote || '').trim()) {
        add('E6.' + (i + 1), tag + ': tie selection noted', 'WARN', 'Selected from a price tie without a recorded basis.', 'Note the basis for the tie selection.');
      }
    }
    var bk = breakdown(ev);
    if (bk.bad) add('E9', 'Award totals computable', 'FAIL', 'An awarded cell has invalid figures.', 'Correct the flagged cells.');
    else if (bk.schedules.length) add('E9', 'Award totals computable', 'PASS', 'Grand total ' + fmtMoney(bk.grandTotalCents) + ' — ' + words.amountInWords(bk.grandTotalCents) + '.', '');
    return R;
  }

  /* ---------- rendering ---------- */

  function unitCellText(ev, itemIdx, supIdx) {
    var cell = cellAt(ev, itemIdx, supIdx);
    var c = computeCell(ev, itemIdx, supIdx);
    if (!cell) return '';
    if (c.errors.length) return 'REJECTED: ' + esc(cell.unit);
    var txt = fmtMoney(c.unitCents);
    if (cell.packSize) {
      txt += ' — ' + c.packs + ' case' + (c.packs === 1 ? '' : 's') + ' = ' + c.effectiveQty + ' (' + cell.packSize + '/case)';
    } else if (cell.quotedQty != null) {
      txt += ' (quoted for ' + cell.quotedQty + ')';
    }
    if (cell.note) txt += ' — ' + cell.note;
    return esc(txt);
  }

  /* The evaluation worksheet: the sample grid, hardened. */
  function worksheetHTML(ev) {
    var h = '<table class="cmp"><tr><th style="width:4%">No.</th><th>Items Requested</th><th style="width:10%">Quantity Requested</th>';
    var s, i;
    for (s = 0; s < ev.suppliers.length; s++) {
      if (ev.suppliers[s].status !== 'quoted') continue;
      h += '<th colspan="2">' + esc(ev.suppliers[s].name) + '</th>';
    }
    h += '</tr><tr><th></th><th></th><th></th>';
    for (s = 0; s < ev.suppliers.length; s++) {
      if (ev.suppliers[s].status !== 'quoted') continue;
      h += '<th>Unit</th><th>Total</th>';
    }
    h += '</tr>';
    for (i = 0; i < ev.items.length; i++) {
      var sel = effectiveSelection(ev, i);
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(ev.items[i].desc) + (ev.items[i].variant ? '<br>' + esc(ev.items[i].variant) : '') + '</td><td class="ctr">' + esc(ev.items[i].qtyText || (ev.items[i].qty + (ev.items[i].unitName ? ' ' + ev.items[i].unitName : ''))) + '</td>';
      for (s = 0; s < ev.suppliers.length; s++) {
        if (ev.suppliers[s].status !== 'quoted') continue;
        var c = computeCell(ev, i, s);
        if (!c.exists) { h += '<td class="ctr" colspan="2">—</td>'; continue; }
        var mark = '';
        if (sel.supIdx === s) {
          mark = sel.override ? ' <b>[OVERRIDE — see justification]</b>' : sel.tie ? ' <b>[SELECTED — tied lowest]</b>' : ' <b>[LOWEST]</b>';
        }
        var totalTxt = c.errors.length ? 'CHECK' : fmtMoney(c.extendedCents) + (c.vatable ? ' <b>V</b>' : '');
        var flags = '';
        if (!c.compliant) flags += ' <b>[NOT TO SPEC]</b>';
        if (c.shortfall) flags += ' <b>[QTY SHORTFALL]</b>';
        h += '<td class="num">' + unitCellText(ev, i, s) + flags + '</td><td class="num">' + totalTxt + mark + '</td>';
      }
      h += '</tr>';
    }
    /* per-supplier totals (full quote) */
    var labels = [['Sub Total (NV)', 'nvCents'], ['Sub Total (V)', 'vCents'], ['Vat', 'vatCents'], ['Total', 'totalCents']];
    for (var li = 0; li < labels.length; li++) {
      h += '<tr><td></td><td class="num"><b>' + labels[li][0] + '</b></td><td></td>';
      for (s = 0; s < ev.suppliers.length; s++) {
        if (ev.suppliers[s].status !== 'quoted') continue;
        var t0 = supplierTotals(ev, s);
        h += '<td></td><td class="num"><b>' + (t0.bad ? 'CHECK' : fmtMoney(t0[labels[li][1]])) + '</b></td>';
      }
      h += '</tr>';
    }
    h += '</table>';
    var dnq = didNotQuote(ev);
    if (dnq.length) {
      h += '<table class="cmp" style="width:60%"><tr><th style="width:10%">No.</th><th>Suppliers that Did Not Quote</th></tr>';
      for (var d = 0; d < dnq.length; d++) h += '<tr><td class="ctr">' + (d + 1) + '.</td><td>' + esc(dnq[d]) + '</td></tr>';
      h += '</table>';
    }
    return h;
  }

  /* Per-supplier award table (the sample "Table 1 / Table 2 / Table 3"). */
  function awardTableHTML(ev, schedule) {
    var hasNV = schedule.rows.some(function (r) { return !r.vatable; });
    var hasV = schedule.rows.some(function (r) { return r.vatable; });
    var h = '<table class="cmp"><tr><th style="width:5%">No.</th><th>Items Requested</th><th style="width:14%">Quantity Requested</th><th colspan="2">' + esc(schedule.name) + '</th></tr>';
    h += '<tr><th></th><th></th><th></th><th style="width:16%">Unit</th><th style="width:16%">Total</th></tr>';
    for (var i = 0; i < schedule.rows.length; i++) {
      var r = schedule.rows[i];
      var unitTxt = fmtMoney(r.unitCents);
      if (r.packSize) unitTxt += ' — ' + r.packs + ' case' + (r.packs === 1 ? '' : 's') + ' = ' + r.effectiveQty + ' (' + r.packSize + '/case)';
      else if (r.effectiveQty !== null && String(r.effectiveQty) !== String(ev.items[r.itemIdx].qty)) unitTxt += ' (quoted for ' + r.effectiveQty + ')';
      var flag = r.override ? ' <b>[OVERRIDE: ' + esc(r.justification || 'JUSTIFICATION MISSING') + ']</b>' : r.tie ? ' <b>[tied lowest' + (r.tieNote ? ' — ' + esc(r.tieNote) : '') + ']</b>' : '';
      h += '<tr><td class="ctr">' + (i + 1) + '.</td><td>' + esc(r.desc) + (r.variant ? '<br>' + esc(r.variant) : '') + flag + '</td><td class="ctr">' + esc(r.qtyText) + '</td><td class="num">' + esc(unitTxt) + '</td><td class="num">' + fmtMoney(r.extendedCents) + (r.vatable ? ' <b>V</b>' : '') + '</td></tr>';
    }
    if (hasNV && hasV) {
      h += '<tr><td></td><td class="num" colspan="3"><b>Sub Total (NV)</b></td><td class="num"><b>' + fmtMoney(schedule.nvCents) + '</b></td></tr>';
      h += '<tr><td></td><td class="num" colspan="3"><b>Sub Total (V)</b></td><td class="num"><b>' + fmtMoney(schedule.vCents) + '</b></td></tr>';
    } else {
      h += '<tr><td></td><td class="num" colspan="3"><b>Sub Total</b></td><td class="num"><b>' + fmtMoney(schedule.nvCents + schedule.vCents) + '</b></td></tr>';
    }
    h += '<tr><td></td><td class="num" colspan="3"><b>Vat</b></td><td class="num"><b>' + fmtMoney(schedule.vatCents) + '</b></td></tr>';
    h += '<tr><td></td><td class="num" colspan="3"><b>Total</b></td><td class="num"><b>' + fmtMoney(schedule.totalCents) + '</b></td></tr>';
    h += '</table>';
    return h;
  }

  /* "Breakdown of Price per Company" with the computed grand total. */
  function breakdownTableHTML(ev) {
    var bk = breakdown(ev);
    var anyNV = bk.schedules.some(function (s) { return s.nvCents > 0; });
    var h = '<table class="cmp"><tr><th colspan="' + (anyNV ? 5 : 4) + '">Breakdown of Price per Company</th></tr>';
    h += '<tr><th>Suppliers</th>' + (anyNV ? '<th>Sub Total (NV)</th><th>Sub Total (V)</th>' : '<th>Sub Total</th>') + '<th>Vat</th><th>Total</th></tr>';
    for (var i = 0; i < bk.schedules.length; i++) {
      var s = bk.schedules[i];
      h += '<tr><td>' + esc(s.name) + '</td>' +
        (anyNV ? '<td class="num">' + fmtMoney(s.nvCents) + '</td><td class="num">' + fmtMoney(s.vCents) + '</td>'
          : '<td class="num">' + fmtMoney(s.nvCents + s.vCents) + '</td>') +
        '<td class="num">' + fmtMoney(s.vatCents) + '</td><td class="num">' + fmtMoney(s.totalCents) + '</td></tr>';
    }
    h += '<tr><td></td>' + (anyNV ? '<td></td><td></td>' : '<td></td>') + '<td class="num"><b>Total</b></td><td class="num"><b>' + (bk.bad ? 'CHECK' : fmtMoney(bk.grandTotalCents)) + '</b></td></tr>';
    h += '</table>';
    return h;
  }

  /* Project the award into docState items for carry-over to P1/P2.
     One amount-mode item per awarded supplier, so the carried totals equal
     the evaluation totals exactly (per-line VAT re-rounding could otherwise
     move a cent). The per-item detail stays in the evaluation documents. */
  function toDocItems(ev) {
    var bk = breakdown(ev);
    return bk.schedules.map(function (s) {
      var names = s.rows.map(function (r) { return r.desc; });
      return {
        desc: textutil.joinAnd(names),
        qty: '', unitname: '', mode: 'amount',
        quotes: [{
          supplier: s.name, status: 'Quoted', qty: '', unit: '',
          sub: fmtMoney(s.nvCents + s.vCents).replace('$', ''),
          vat: fmtMoney(s.vatCents).replace('$', ''),
          compliant: 'Yes', recommended: true,
          address: (ev.suppliers[s.supIdx] && ev.suppliers[s.supIdx].address) || '',
          mode: 'amount'
        }]
      };
    });
  }

  return {
    newEvaluation: newEvaluation,
    cellAt: cellAt,
    computeCell: computeCell,
    recommendItem: recommendItem,
    effectiveSelection: effectiveSelection,
    supplierTotals: supplierTotals,
    awardSchedules: awardSchedules,
    breakdown: breakdown,
    didNotQuote: didNotQuote,
    runEvalChecks: runEvalChecks,
    worksheetHTML: worksheetHTML,
    awardTableHTML: awardTableHTML,
    breakdownTableHTML: breakdownTableHTML,
    toDocItems: toDocItems
  };
});
