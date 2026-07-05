/* ingest-ui.js — the Import Documents tab: the staging review screen.
   Every candidate found in an imported file is shown with its source
   snippet, a confidence note, and a target; the officer accepts, edits or
   rejects each one. Nothing enters the case until accepted; figures and
   item lines are deliberately excluded from Accept-all. OCR-derived
   candidates say plainly that OCR is error-prone.
   Browser-only. */
(function () {
  'use strict';

  var M = window.MODPA;
  var esc = M.textutil.esc;

  function renderIngest(panel) {
    var caps = M.ingestfiles.capabilities();
    var h = '<h2 class="p">Import Documents</h2>';
    h += '<p class="hint">Importing is an accelerator for typing, not an authority. The system proposes; only you commit. Whatever the route a figure took into the case, the verification certificate still requires it to be checked against its folio by a person.</p>';
    h += '<fieldset class="box"><legend>What this installation can read right now</legend><ul>';
    [['PDF (text layer)', caps.pdf], ['.docx', caps.docx], ['.xlsx spreadsheets', caps.xlsx], ['.csv / plain text', caps.csv], ['Scans and images (OCR, English)', caps.ocr]].forEach(function (row) {
      h += '<li><b>' + row[0] + ':</b> ' + (row[1].available ? 'available' : '<b style="color:var(--red)">not available</b>') + (row[1].reason ? ' — ' + esc(row[1].reason) : '') + '</li>';
    });
    h += '</ul></fieldset>';
    h += '<input type="file" id="ingestFile" style="display:none" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.bmp,.tif,.tiff">';
    h += '<button class="btn" data-action="ingest-pick">Import a file…</button> <span id="ingestStatus" class="hint"></span>';
    if (APP.ingestWarning) h += '<div class="notice" style="margin-top:10px">' + esc(APP.ingestWarning) + '</div>';
    var cands = APP.ingestCandidates || [];
    if (cands.length) {
      var pending = cands.filter(function (c) { return !c.accepted && !c.rejected; }).length;
      h += '<div class="notice" style="margin-top:12px"><b>' + cands.length + '</b> candidate(s) found; <b>' + pending + '</b> awaiting a decision. ' +
        '<button class="btn sec small" data-action="ingest-accept-safe">Accept all suppliers / dates / references</button> ' +
        '<span class="hint">Figures and item lines are never bulk-accepted — each must be confirmed on its own.</span></div>';
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        var stateCls = c.accepted ? ' accepted' : c.rejected ? ' rejected' : '';
        var valueText = c.kind === 'item-line'
          ? esc(c.value.desc) + ' — qty ' + esc(String(c.value.qty == null ? c.value.qtyRaw : c.value.qty)) + ' × ' + esc(c.value.unit || '?') + (c.value.total ? ' = ' + esc(c.value.total) : '')
          : esc(typeof c.value === 'string' ? c.value : JSON.stringify(c.value));
        h += '<div class="cand' + stateCls + '">' +
          '<div class="kind">' + esc(c.kind) + '</div>' +
          '<div class="body"><div class="v">' + valueText + (c.canonical && c.canonical !== c.value ? ' <span class="hint">→ ' + esc(c.canonical) + '</span>' : '') + '</div>' +
          '<div class="snip">' + esc(c.snippet) + '</div>' +
          (c.note ? '<div class="note">' + esc(c.note) + '</div>' : '') + '</div>' +
          '<span class="conf ' + c.confidence + '">' + c.confidence + '</span>' +
          '<div class="rowbtns">' +
          (c.accepted ? '<b style="color:var(--green)">ACCEPTED → ' + esc(c.appliedTo || '') + '</b>'
            : c.rejected ? '<b>rejected</b> <button class="btn sec small" data-action="cand-unreject" data-i="' + i + '">undo</button>'
              : targetSelect(c, i) + ' <button class="btn small" data-action="cand-accept" data-i="' + i + '"' + (M.ingest.canAccept(c) ? '' : ' disabled title="Edit the value first — it was rejected by the figure parser."') + '>Accept</button> ' +
              '<button class="btn sec small" data-action="cand-edit" data-i="' + i + '">Edit</button> ' +
              '<button class="btn danger small" data-action="cand-reject" data-i="' + i + '">Reject</button>') +
          '</div></div>';
      }
    }
    panel.innerHTML = h;
  }

  /* Where can each kind of candidate go? Options depend on the module
     and the sections the case actually carries. */
  function targetSelect(c, i) {
    var cf = APP.caseFile;
    var opts = [];
    if (c.kind === 'supplier') {
      if (cf.module === 'routine' && cf.evaluation) opts.push(['eval-supplier', 'Add to comparison-worksheet suppliers']);
      if (cf.verbal) opts.push(['verbal-contact', 'Add to telephone contacts']);
      opts.push(['item-supplier-row', 'Add a supplier row to the last item']);
    } else if (c.kind === 'date') {
      opts.push(['date-doc', 'Document date'], ['date-rfq', 'RFQ issued date'], ['date-deadline', 'Closing date']);
    } else if (c.kind === 'reference') {
      opts.push(['ref-minfile', 'Minute file number'], ['ref-letter', 'Letter reference']);
    } else if (c.kind === 'figure') {
      opts.push(['fig-funds', 'Available funds (cover check)'], ['fig-note', 'Keep on the staging list for reference']);
    } else if (c.kind === 'item-line') {
      if (cf.module === 'routine' && cf.evaluation) opts.push(['eval-item', 'Add as comparison-worksheet item (price goes to the named supplier)']);
      opts.push(['case-item', 'Add as case item with a supplier row']);
    }
    return '<select data-cand-target="' + i + '">' + opts.map(function (o) {
      return '<option value="' + o[0] + '">' + esc(o[1]) + '</option>';
    }).join('') + '</select>';
  }

  /* Apply an accepted candidate to its chosen target. Returns a short
     description of where it went (shown beside ACCEPTED). */
  function applyCandidate(c, target) {
    var cf = APP.caseFile;
    var st = cf.docState;
    if (target === 'eval-supplier') {
      if (!cf.evaluation) cf.evaluation = M.evaluation.newEvaluation();
      cf.evaluation.suppliers.push({ name: c.canonical || c.value, address: '', status: 'quoted' });
      return 'evaluation suppliers';
    }
    if (target === 'verbal-contact') {
      cf.verbal.contacts.push({ name: c.canonical || c.value, phone: '', date: '', spokeTo: '', officer: '', outcome: 'quoted', amount: '' });
      return 'telephone contacts';
    }
    if (target === 'item-supplier-row') {
      if (!st.items.length) st.items.push({ desc: '', qty: '', unitname: '', mode: 'qty', quotes: [] });
      var it = st.items[st.items.length - 1];
      it.quotes.push({ supplier: c.canonical || c.value, status: 'Quoted', qty: it.qty, unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: it.mode });
      return 'supplier row on item ' + st.items.length;
    }
    if (target === 'date-doc') { st.date = c.canonical; return 'document date'; }
    if (target === 'date-rfq') { st.rfqdate = c.canonical; return 'RFQ issued date'; }
    if (target === 'date-deadline') { st.deadline = c.canonical; return 'closing date'; }
    if (target === 'ref-minfile') { st.minfile = c.canonical || c.value; return 'minute file number'; }
    if (target === 'ref-letter') { st.ref = c.canonical || c.value; return 'letter reference'; }
    if (target === 'fig-funds') { st.funds = String(c.canonical || c.value).replace(/^\$/, ''); return 'available funds'; }
    if (target === 'fig-note') { return 'kept for reference'; }
    if (target === 'eval-item') {
      if (!cf.evaluation) cf.evaluation = M.evaluation.newEvaluation();
      var ev = cf.evaluation;
      ev.items.push({ desc: c.value.desc, variant: '', qty: c.value.qty || 1, unitName: '' });
      var supIdx = -1;
      if (c.value.supplier) {
        for (var s = 0; s < ev.suppliers.length; s++) if (ev.suppliers[s].name === c.value.supplier) supIdx = s;
        if (supIdx < 0) { ev.suppliers.push({ name: c.value.supplier, address: '', status: 'quoted' }); supIdx = ev.suppliers.length - 1; }
      } else if (ev.suppliers.length === 1) supIdx = 0;
      if (supIdx >= 0 && c.value.unit) {
        ev.cells.push({ item: ev.items.length - 1, supplier: supIdx, unit: c.value.unit, vatable: false, quotedQty: null, packSize: null, note: 'Imported — confirm against the quotation.', compliant: true });
      }
      return 'evaluation item ' + ev.items.length;
    }
    if (target === 'case-item') {
      st.items.push({
        desc: c.value.desc, qty: c.value.qty != null ? String(c.value.qty) : '', unitname: '', mode: 'qty',
        quotes: c.value.supplier || c.value.unit ? [{ supplier: c.value.supplier || '', status: 'Quoted', qty: c.value.qty != null ? String(c.value.qty) : '', unit: c.value.unit || '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: 'qty' }] : []
      });
      return 'case item ' + st.items.length;
    }
    return 'nowhere (unknown target)';
  }

  window.INGEST_UI = { renderIngest: renderIngest, applyCandidate: applyCandidate };
})();
