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
    var cf = APP.caseFile;
    var mode = APP.intakeMode || 'A';
    var h = '<h2 class="p">Import / Upload a Document</h2>';
    h += '<p class="hint">Importing is an accelerator, not an authority. The system proposes; only you commit. Whatever route a figure took into the case, the verification certificate still requires a person to check it against its folio. The official templates and the law always come first — an uploaded document can never silently replace them.</p>';

    /* Step 1 — choose how the document should be used (plain language). */
    h += '<fieldset class="box"><legend>1. How should the system use this document?</legend>';
    ['A', 'B', 'C'].forEach(function (k) {
      var m = M.intake.MODES[k];
      h += '<label class="f" style="display:block;margin:4px 0"><input type="radio" name="intakeMode" data-special="intake-mode" value="' + k + '"' + (mode === k ? ' checked' : '') + '> <b>' + esc(m.label) + '</b><br><span class="hint" style="margin-left:22px">' + esc(m.plain) + '</span></label>';
    });
    h += '</fieldset>';

    /* Step 2 — the honest support matrix. */
    h += '<fieldset class="box"><legend>2. What this installation can read right now</legend><ul>';
    [['Word (.docx)', 'facts + layout/structure', caps.docx],
     ['PDF with selectable text', 'facts + limited structure', caps.pdf],
     ['Scanned / image-only PDF or image', 'needs OCR', caps.ocr],
     ['Excel (.xlsx)', 'tabular facts only', caps.xlsx],
     ['CSV / plain text', 'tabular / text facts', caps.csv]].forEach(function (row) {
      h += '<li><b>' + row[0] + ':</b> ' + esc(row[1]) + ' — ' + (row[2].available ? '<span style="color:var(--green)">available</span>' : '<b style="color:var(--red)">not available</b>') + (row[2].reason ? ' <span class="hint">(' + esc(row[2].reason) + ')</span>' : '') + '</li>';
    });
    h += '</ul></fieldset>';

    h += '<input type="file" id="ingestFile" style="display:none" accept=".pdf,.docx,.xlsx,.xls,.csv,.txt,.png,.jpg,.jpeg,.bmp,.tif,.tiff">';
    h += '<button class="btn" data-action="ingest-pick">Choose a file…</button> <span id="ingestStatus" class="hint"></span>';
    if (APP.ingestWarning) h += '<div class="notice" style="margin-top:10px">' + esc(APP.ingestWarning) + '</div>';

    /* Step 3 — the intake analysis (what was found + the layout decision). */
    h += intakeAnalysisHTML();

    /* Step 4 — the staging review table (human-in-the-loop). */
    var cands = APP.ingestCandidates || [];
    if (cands.length) {
      var pending = cands.filter(function (c) { return !c.accepted && !c.rejected; }).length;
      var acceptedCount = cands.filter(function (c) { return c.accepted && !c.applied; }).length;
      h += '<fieldset class="box" style="margin-top:12px"><legend>4. Review what was found — accept, edit or reject each item</legend>';
      h += '<p class="hint">Nothing enters the case until you accept it and then click <b>Apply Accepted Data to Case</b>. Figures are accepted one at a time. A figure the parser rejected (highlighted red) cannot be accepted until you Edit it to a valid amount.</p>';
      h += '<div style="margin-bottom:8px"><button class="btn sec small" data-action="ingest-accept-safe">Accept all suppliers / dates / references</button> <span class="hint">Figures and item lines are never bulk-accepted.</span></div>';
      h += '<div style="overflow-x:auto"><table class="stagetbl"><thead><tr><th style="width:20%">Value</th><th>Source (from the document)</th><th style="width:9%">Confidence</th><th style="width:22%">Goes to</th><th style="width:16%">Action</th></tr></thead><tbody>';
      for (var i = 0; i < cands.length; i++) {
        var c = cands[i];
        var malformed = c.kind === 'figure' && !M.ingest.canAccept(c);
        var rowCls = c.accepted ? 'accepted' : c.rejected ? 'rejected' : malformed ? 'bad' : '';
        var valueText = c.kind === 'item-line'
          ? esc(c.value.desc) + ' — qty ' + esc(String(c.value.qty == null ? c.value.qtyRaw : c.value.qty)) + ' × ' + esc(c.value.unit || '?') + (c.value.total ? ' = ' + esc(c.value.total) : '')
          : esc(typeof c.value === 'string' ? c.value : JSON.stringify(c.value));
        h += '<tr class="' + rowCls + '"><td><b>' + valueText + '</b>' +
          (c.canonical && c.canonical !== c.value ? ' <span class="hint">→ ' + esc(c.canonical) + '</span>' : '') +
          '<div class="hint">' + esc(c.kind) + '</div></td>' +
          '<td><span class="snip">' + esc(c.snippet || '') + '</span>' + (c.note ? '<div class="hint">' + esc(c.note) + '</div>' : '') + '</td>' +
          '<td><span class="conf ' + esc(c.confidence || 'review') + '">' + esc(c.confidence || 'review') + '</span></td>' +
          '<td>' + (c.rejected ? '<span class="hint">—</span>' : targetSelect(c, i)) + '</td>' +
          '<td>' + rowActions(c, i, malformed) + '</td></tr>';
      }
      h += '</tbody></table></div>';
      h += '<div style="margin-top:12px;display:flex;gap:10px;align-items:center">' +
        '<button class="btn" data-action="intake-apply-facts"' + (acceptedCount ? '' : ' disabled') + '>Apply Accepted Data to Case</button>' +
        '<span class="hint">' + acceptedCount + ' item(s) accepted and ready. ' + pending + ' still awaiting a decision.</span></div>';
      h += '</fieldset>';
    }
    panel.innerHTML = h;
  }

  function rowActions(c, i, malformed) {
    if (c.applied) return '<b style="color:var(--green)">applied ✓</b>';
    if (c.accepted) return '<b style="color:var(--green)">accepted</b> <button class="btn sec small" data-action="cand-reject" data-i="' + i + '">undo</button>';
    if (c.rejected) return '<b>rejected</b> <button class="btn sec small" data-action="cand-unreject" data-i="' + i + '">undo</button>';
    var acceptBtn = '<button class="btn small" data-action="cand-accept" data-i="' + i + '"' +
      (malformed ? ' disabled title="Edit the figure to a valid amount first"' : '') + '>Accept</button>';
    return acceptBtn + ' <button class="btn sec small" data-action="cand-edit" data-i="' + i + '">Edit</button> ' +
      '<button class="btn danger small" data-action="cand-reject" data-i="' + i + '">Reject</button>';
  }

  /* The default target string for a candidate (the first offered option). */
  function defaultTargetFor(c) {
    var m = targetOptions(c);
    return m.length ? m[0][0] : 'fig-note';
  }

  /* The intake analysis for the last uploaded document: what facts were
     found, and (for layout modes) what the system can and cannot follow
     from its structure, with the official template always winning. Ends
     with the confirmation the user must give before anything is applied. */
  function intakeAnalysisHTML() {
    var a = APP.intakeAnalysis;
    if (!a) return '';
    var cf = APP.caseFile;
    var h = '<fieldset class="box" style="margin-top:14px"><legend>3. What the system found in “' + esc(a.fileName) + '”</legend>';
    h += '<p class="hint">' + esc(a.support.note) + '</p>';

    /* extraction summary */
    var es = a.extractionSummary || { facts: [], uncertain: [], summaryText: '' };
    h += '<p><b>Information:</b> ' + esc(es.summaryText) + ' The facts appear below as candidates — nothing enters the case until you accept each one.</p>';
    if (es.uncertain.length) {
      h += '<div class="notice" style="margin:6px 0"><b>Held for your review (not filled in):</b> ' +
        es.uncertain.map(function (u) { return esc(u.label) + ' “' + esc(String(u.value)) + '”'; }).join('; ') +
        '. The system is not sure about these, so it will not guess — check them yourself.</div>';
    }

    /* layout guidance (B/C) */
    if (a.mode === 'B' || a.mode === 'C') {
      var plan = a.layoutPlan || {};
      h += '<div style="border-top:1px solid var(--line);margin:10px 0;padding-top:8px"><b>Layout / structure:</b> ';
      if (!plan.applied) {
        h += esc(plan.note || 'No layout guidance could be applied.') + '</div>';
      } else {
        h += 'The official ' + esc((a.official && a.official.label) || 'form') + ' stays in full. Your document’s look can guide the <b>Enhanced professional profile</b>' +
          (plan.applicableItems && plan.applicableItems.length ? ' (' + esc(plan.applicableItems.join(', ')) + ')' : '') + '.';
        if (a.layoutProfile && a.layoutProfile.sectionOrder.length) {
          h += '<div class="hint" style="margin-top:4px">Sections detected in your document: ' + esc(a.layoutProfile.sectionOrder.slice(0, 12).join(' · ')) + '</div>';
        }
        h += '</div>';
        /* conflicts */
        var conflicts = plan.conflicts || [];
        var blocks = conflicts.filter(function (c) { return c.severity === 'block'; });
        var notes = conflicts.filter(function (c) { return c.severity === 'note'; });
        if (blocks.length) {
          h += '<div class="notice red" style="margin:6px 0"><b>Where your document and the official form clash (official form wins):</b><ul style="margin:4px 0">' +
            blocks.map(function (c) { return '<li>' + esc(c.plain) + '</li>'; }).join('') + '</ul></div>';
        }
        if (notes.length) {
          h += '<div class="notice" style="margin:6px 0"><b>Extra parts in your document (kept for information, not added to the form):</b><ul style="margin:4px 0">' +
            notes.map(function (c) { return '<li>' + esc(c.plain) + '</li>'; }).join('') + '</ul></div>';
        }
        /* Phase 6 — table-column and signature-order compliance */
        if (a.tableCompliance) {
          if (a.tableCompliance.compliant) {
            h += '<div class="notice green" style="margin:6px 0"><b>Table layout:</b> your table keeps the columns the official form requires, so its column arrangement may guide the output.</div>';
          } else {
            h += '<div class="notice red" style="margin:6px 0"><b>Table layout not used:</b> ' + esc(a.tableCompliance.reason) + '</div>';
          }
        }
        if (a.sigCompliance && !a.sigCompliance.ok) {
          h += '<div class="notice red" style="margin:6px 0"><b>Signature order not used:</b> ' + esc(a.sigCompliance.reason) + '</div>';
        }
      }
    }

    /* the confirmation gate */
    if (a.recorded) {
      h += '<div class="notice green" style="margin-top:8px"><b>Recorded on this case.</b> This document intake is saved for the audit trail' +
        (cf.outputProfile === 'enhanced' ? ', and the Enhanced professional layout is now in use for the documents that support it.' : '.') + '</div>';
    } else if (a.mode === 'A') {
      h += '<div style="margin-top:8px"><button class="btn" data-action="intake-record">Record this document intake</button> <span class="hint">Records that you used this document for information. The official layout does not change.</span></div>';
    } else {
      var canApply = a.layoutPlan && a.layoutPlan.applied;
      h += '<div style="margin-top:8px">';
      if (canApply) h += '<button class="btn" data-action="intake-apply-layout">Apply layout guidance (use the Enhanced professional layout)</button> ';
      h += '<button class="btn sec" data-action="intake-keep-layout">Keep the approved / official layout</button>';
      h += '<div class="hint" style="margin-top:4px">Your choice is recorded on the case. The Enhanced profile refines presentation only — it never changes a mandated form’s structure or removes required content.</div></div>';
    }
    h += '</fieldset>';
    return h;
  }

  /* Where can each kind of candidate go? Options depend on the module
     and the sections the case actually carries. */
  /* Where a candidate may go, by module and the sections the case carries. */
  function targetOptions(c) {
    var cf = APP.caseFile;
    var opts = [];
    var routine = cf.module === 'routine', formal = cf.module === 'formal-evaluation', disposal = cf.module === 'disposal';
    if (c.kind === 'supplier') {
      if (routine && cf.evaluation) opts.push(['eval-supplier', 'Comparison-worksheet suppliers']);
      if (routine && cf.verbal) opts.push(['verbal-contact', 'Telephone contacts']);
      if (routine) opts.push(['item-supplier-row', 'Supplier row on the last item']);
      if (formal) opts.push(['formal-proponent', 'Proponent (firm that submitted)']);
      if (disposal) opts.push(['disp-transferee', 'Form G requesting organisation']);
    } else if (c.kind === 'date') {
      opts.push(['date-doc', 'Document date']);
      if (routine) opts.push(['date-rfq', 'RFQ issued date'], ['date-deadline', 'Closing date']);
    } else if (c.kind === 'reference') {
      if (formal) opts.push(['formal-rfpnum', 'RFP / ITB number']);
      if (disposal) opts.push(['disp-ref', 'Disposal request reference']);
      opts.push(['ref-minfile', 'File number']);
      if (routine) opts.push(['ref-letter', 'Letter reference']);
    } else if (c.kind === 'figure') {
      if (routine) opts.push(['fig-funds', 'Available funds (cover check)']);
      opts.push(['fig-note', 'Keep on the staging list for reference']);
    } else if (c.kind === 'item-line') {
      if (routine && cf.evaluation) opts.push(['eval-item', 'Comparison-worksheet item']);
      if (routine) opts.push(['case-item', 'Case item with a supplier row']);
      if (disposal) opts.push(['disp-item', 'Disposal property item (Form A/B)']);
    }
    if (!opts.length) opts.push(['fig-note', 'Keep on the staging list for reference']);
    return opts;
  }

  function targetSelect(c, i) {
    var opts = targetOptions(c);
    var current = c.target || opts[0][0];
    return '<select data-cand-target="' + i + '">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === current ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
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
    /* formal-evaluation targets */
    if (target === 'formal-proponent') {
      if (!cf.formal) cf.formal = M.formal.newFormal();
      cf.formal.proponents.push({ name: c.canonical || c.value, compliant: '', complianceNote: '' });
      cf.formal.prices.push(M.formal.blankPrice());
      return 'proponents (formal)';
    }
    if (target === 'formal-rfpnum') { if (!cf.formal) cf.formal = M.formal.newFormal(); cf.formal.rfpNumber = c.canonical || c.value; return 'RFP / ITB number'; }
    /* disposal targets */
    if (target === 'disp-transferee') { if (!cf.disposal) cf.disposal = M.disposal.newDisposal(); M.disposal.upgrade(cf.disposal); cf.disposal.transfer.toOrg = c.canonical || c.value; return 'Form G requesting organisation'; }
    if (target === 'disp-ref') { if (!cf.disposal) cf.disposal = M.disposal.newDisposal(); cf.disposal.requestRef = c.canonical || c.value; return 'disposal request reference'; }
    if (target === 'disp-item') {
      if (!cf.disposal) cf.disposal = M.disposal.newDisposal();
      M.disposal.upgrade(cf.disposal);
      var di = M.disposal.blankItem();
      di.desc = c.value.desc; di.qty = c.value.qty != null ? c.value.qty : 1;
      if (c.value.unit) di.originalUnitPrice = c.value.unit;
      cf.disposal.items.push(di);
      return 'disposal property item ' + cf.disposal.items.length;
    }
    return 'nowhere (unknown target)';
  }

  window.INGEST_UI = { renderIngest: renderIngest, applyCandidate: applyCandidate, defaultTargetFor: defaultTargetFor };
})();
