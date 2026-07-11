/* main.js — application state and wiring: the open case, tab switching,
   edit synchronisation, save/load, autosave recovery, the shared-folder
   register, and document downloads. All computation lives in js/lib/.
   Browser-only. */
(function () {
  'use strict';

  var M = window.MODPA;

  window.APP = {
    caseFile: null,
    currentTab: 'start',
    currentDoc: null,
    ingestCandidates: [],
    ingestWarning: '',
    intakeMode: 'A',
    intakeAnalysis: null,
    registerIndex: null,
    registerTexts: {},
    autosaveEnabled: true,
    /* Guided Mode is the default for first-time users; the full form view
       ('expert') is one click away and fully interchangeable mid-case. */
    uiMode: 'guided',
    guideStep: 0,
    guideDoc: null
  };

  function el(id) { return document.getElementById(id); }

  /* ---------- tabs ---------- */
  function go(tab) {
    APP.currentTab = tab;
    document.body.classList.toggle('guided', tab === 'guide');
    var btns = document.querySelectorAll('nav.tabs button');
    for (var i = 0; i < btns.length; i++)

      btns[i].classList.toggle('active', btns[i].getAttribute('data-t') === tab);
    var panels = document.querySelectorAll('section.panel');
    for (var j = 0; j < panels.length; j++) {
      var showIt = panels[j].id === 'tab-' + tab;
      panels[j].classList.toggle('show', showIt);
      /* hidden panels are emptied: every panel is rebuilt on entry, and a
         stale hidden copy of the shared editors (or a duplicate #preview)
         must never shadow the live one */
      if (!showIt) panels[j].innerHTML = '';
    }
    render(tab);
    window.scrollTo(0, 0);
  }

  function render(tab) {
    var panel = el('tab-' + (tab || APP.currentTab));
    if (!panel) return;
    if ((tab || APP.currentTab) === 'guide') { GUIDE.render(panel); updatePill(); return; }
    var fn = PANELS[tab || APP.currentTab];
    if (fn) fn(panel);
    updatePill();
  }

  /* Re-render where the user actually is: the guided journey re-renders
     itself; the tab view re-renders the named tab. */
  function rerender(defTab) {
    render(APP.currentTab === 'guide' ? 'guide' : defTab);
  }

  /* ---------- global intake modal (available at any time) ---------- */
  function refreshIntake() {
    /* the intake results may be showing in the modal, in the guided
       papers step, or both — refresh whichever is live */
    var host = el('intakeBody');
    if (host && INGEST_UI && !el('intakeModal').hidden) INGEST_UI.renderIngest(host);
    if (APP.currentTab === 'guide') render('guide');
  }
  function openIntakeModal() {
    if (!APP.caseFile) { alert('Start or open a case first, then upload a document into it.'); return; }
    el('intakeModal').hidden = false;
    refreshIntake();
  }
  function closeIntakeModal() {
    el('intakeModal').hidden = true;
    /* refresh the current tab so any Imported badges / conflicts show */
    render(APP.currentTab);
    updatePill();
  }

  function enableTabs(enabled) {
    var btns = document.querySelectorAll('nav.tabs button');
    for (var i = 0; i < btns.length; i++) {
      var tab = btns[i].getAttribute('data-t');
      if (tab === 'start') continue;
      btns[i].disabled = !enabled;
      /* Module-scoped tabs: the vote book is a routine instrument; formal
         evaluation and disposal never see it. */
      if (tab === 'vote') {
        btns[i].style.display = (enabled && APP.caseFile && APP.caseFile.module !== 'routine') ? 'none' : '';
      }
    }
    el('btnSave').disabled = !enabled;
    el('btnIntake').disabled = !enabled;
    el('btnGuided').disabled = !enabled;
  }

  function updatePill() {
    var p = el('statusPill');
    if (!APP.caseFile) { p.textContent = 'NO CASE OPEN'; p.className = ''; return; }
    var s = M.verifycase.stats(APP.caseFile);
    if (s.fail) { p.textContent = s.fail + ' CHECK(S) FAILING'; p.className = 'bad'; }
    else if (s.warn) { p.textContent = 'CLEARED WITH CAUTION'; p.className = 'warn'; }
    else { p.textContent = 'ALL CHECKS PASSED'; p.className = 'ok'; }
  }

  /* ---------- case lifecycle ---------- */
  /* activity: a module id or (from the older start cards) a legacy
     pathway code; casemodel maps either onto the module structure. */
  function newCase(activity) {
    var profile = activity === 'P2' ? 'ttcg-formation' : 'ministry-dotted';
    APP.caseFile = M.casemodel.newCase(activity, profile);
    if (activity === 'P1') APP.caseFile.verbal = M.verbal.newVerbal();
    if (activity === 'P3') APP.caseFile.evaluation = M.evaluation.newEvaluation();
    if (APP.caseFile.module === 'disposal' && !APP.caseFile.disposal) APP.caseFile.disposal = M.disposal.newDisposal();
    if (APP.caseFile.module === 'formal-evaluation' && !APP.caseFile.formal) APP.caseFile.formal = M.formal.newFormal();
    APP.ingestCandidates = [];
    APP.ingestWarning = '';
    APP.guideStep = 0;
    APP.guideDoc = null;
    enableTabs(true);
    go(APP.uiMode === 'guided' ? 'guide' : 'case');
    touchAndAutosave();
  }

  function openCaseObject(obj, sourceName) {
    var loaded = M.casemodel.load(obj);
    if (!loaded.ok) {
      alert('Cannot open ' + (sourceName || 'the file') + ':\n' + loaded.errors.join('\n'));
      return;
    }
    APP.caseFile = loaded.caseFile;
    if (loaded.report.length) alert('Opened with notes:\n\n' + loaded.report.join('\n'));
    APP.ingestCandidates = [];
    APP.guideStep = 0;
    APP.guideDoc = null;
    enableTabs(true);
    go(APP.uiMode === 'guided' ? 'guide' : 'case');
    touchAndAutosave();
  }

  /* ---------- autosave (browser storage, recovery only) ---------- */
  function autosaveWrite() {
    if (!APP.autosaveEnabled || !APP.caseFile) return;
    try {
      localStorage.setItem(M.storage.AUTOSAVE_KEY, M.casemodel.serialize(APP.caseFile));
      el('autosaveNote').textContent = 'Autosaved to this computer at ' + new Date().toLocaleTimeString() + ' (recovery only — save the .json file as the record).';
    } catch (e) {
      el('autosaveNote').textContent = 'Autosave unavailable: ' + e.message;
    }
  }

  APP.autosavePeek = function () {
    try {
      var raw = localStorage.getItem(M.storage.AUTOSAVE_KEY);
      if (!raw) return null;
      var obj = JSON.parse(raw);
      return { when: (obj.meta && obj.meta.modifiedAt) || 'unknown time', subject: obj.docState && obj.docState.subject, obj: obj };
    } catch (e) { return null; }
  };

  function touchAndAutosave() {
    if (APP.caseFile) M.casemodel.touch(APP.caseFile);
    autosaveWrite();
    updatePill();
  }

  /* ---------- save / load ---------- */
  function downloadBlob(content, fname, type) {
    /* The UTF-8 BOM helps Word recognise .doc HTML but corrupts JSON —
       only Word documents get it. */
    var parts = /\.doc$/i.test(fname) ? ['﻿', content] : [content];
    var blob = new Blob(parts, { type: type || 'application/octet-stream' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function saveCase() {
    if (!APP.caseFile) return;
    M.casemodel.touch(APP.caseFile);
    downloadBlob(M.casemodel.serialize(APP.caseFile), M.storage.caseFileName(APP.caseFile), 'application/json');
  }

  el('btnSave').addEventListener('click', saveCase);
  el('btnIntake').addEventListener('click', openIntakeModal);
  el('btnIntakeClose').addEventListener('click', closeIntakeModal);
  el('intakeModal').addEventListener('click', function (e) { if (e.target && e.target.id === 'intakeModal') closeIntakeModal(); });
  el('loadFile').addEventListener('change', function () {
    var f = this.files[0];
    this.value = '';
    if (!f) return;
    var rd = new FileReader();
    rd.onload = function () {
      var obj;
      try { obj = JSON.parse(String(rd.result).replace(/^﻿/, '')); }
      catch (e) { alert('That file is not JSON.'); return; }
      openCaseObject(obj, f.name);
    };
    rd.readAsText(f);
  });

  /* ---------- documents ---------- */
  function docTitle() {
    return (APP.caseFile.docState.subject || 'Case') + '';
  }

  function downloadDoc(docType) {
    var body = M.documents.build(APP.caseFile, docType);
    var html = M.docs.common.wordWrap(body, docTitle());
    downloadBlob(html, M.storage.safeName(docTitle()) + '_' + docType + '.doc', 'application/msword');
  }

  function downloadAllDocs() {
    var brk = '<br clear="all" style="mso-special-character:line-break;page-break-before:always">';
    var docs = M.documents.availableDocs(APP.caseFile);
    var all = docs.map(function (d) { return M.documents.build(APP.caseFile, d.id); }).join(brk);
    downloadBlob(M.docs.common.wordWrap(all, docTitle()), M.storage.safeName(docTitle()) + '_All_Documents.doc', 'application/msword');
  }

  /* ---------- shared-folder register ---------- */
  function pickRegisterFolder() {
    el('registerDir').click();
  }

  function handleRegisterFiles(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var reads = files.filter(function (f) { return /\.json$/i.test(f.name); }).map(function (f) {
      return new Promise(function (resolve) {
        var rd = new FileReader();
        rd.onload = function () { resolve({ name: f.name, text: rd.result }); };
        rd.onerror = function () { resolve({ name: f.name, text: '' }); };
        rd.readAsText(f);
      });
    });
    Promise.all(reads).then(function (texts) {
      APP.registerTexts = {};
      texts.forEach(function (t) { APP.registerTexts[t.name] = t.text; });
      APP.registerIndex = M.storage.rebuildRegister(texts);
      render('settings');
    });
  }

  /* ---------- ingestion ---------- */
  function pickIngestFile() { el('ingestFile').click(); }

  function handleIngestFile(file) {
    var status = el('ingestStatus');
    var ext = M.ingestfiles.extOf(file.name);
    var protocol = (window.location && window.location.protocol) || 'file:';
    /* OCR / file:// handling (Phase 3): for an image (known to need OCR)
       abort gracefully with the exact message before any parsing. */
    if (['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'].indexOf(ext) >= 0) {
      var od = M.intake.ocrDecision(protocol, 'image');
      if (od.abort) { APP.ingestCandidates = []; APP.ingestWarning = od.message; APP.intakeAnalysis = null; refreshIntake(); return; }
    }
    if (status) status.textContent = 'Reading ' + file.name + '…';
    M.ingestfiles.ingestFile(file).then(function (res) {
      /* a PDF with no text layer comes back as 'pdf-scanned'; on file://
         OCR cannot run, so give the same exact plain-language warning. */
      if (res.kind === 'pdf-scanned') {
        var od2 = M.intake.ocrDecision(protocol, 'pdf-scanned');
        if (od2.abort) { APP.ingestCandidates = []; APP.ingestWarning = od2.message; APP.intakeAnalysis = null; refreshIntake(); return; }
      }
      APP.ingestCandidates = res.candidates;
      APP.ingestWarning = res.warning || '';
      APP.lastIngestFile = file; APP.lastIngestRes = res;
      /* seed each candidate's default target so the staging screen can show
         where each fact will go, and Apply can act without re-deriving it */
      (APP.ingestCandidates || []).forEach(function (c) { c.target = INGEST_UI.defaultTargetFor(c); });
      /* in the guided papers step, pre-tick the safe kinds (suppliers,
         dates, references) — figures and item lines are never pre-ticked;
         each amount is a human decision, ticked one by one */
      if (APP.currentTab === 'guide') {
        APP.ingestCandidates.forEach(function (c) {
          if (M.ingest.canBulkAccept(c) && M.ingest.canAccept(c)) c.accepted = true;
        });
      }
      buildIntakeAnalysis(file, res);
      refreshIntake();
    }).catch(function (e) {
      APP.ingestCandidates = [];
      APP.ingestWarning = '';
      APP.intakeAnalysis = null;
      refreshIntake();
      var s2 = el('ingestStatus');
      if (s2) s2.textContent = 'Could not import: ' + e.message;
    });
  }

  /* Turn a parsed import into an intake analysis for the chosen mode: the
     extraction summary and, for layout modes, the structure, the
     compliance-bounded layout plan and any conflicts. Nothing is applied
     here — the user reviews and confirms in the Import screen. */
  function buildIntakeAnalysis(file, res) {
    var cf = APP.caseFile;
    var mode = APP.intakeMode || 'A';
    var kind = res.kind || M.intake.fileKind(file.name, file.type);
    var extractionSummary = M.intake.summarizeExtraction((res.candidates || []).map(function (c) {
      return { kind: c.kind, label: c.kind, value: (c.canonical || (typeof c.value === 'string' ? c.value : JSON.stringify(c.value))), confidence: c.confidence };
    }));
    var layoutProfile = res.structure ? M.intake.analyzeStructure(res.structure) : null;
    var official = M.intake.officialStructureFor(cf.module);
    var layoutPlan = M.intake.planLayout(mode, kind, layoutProfile, official);
    /* Phase 6 — table-column and signature-order compliance, only when a
       layout mode is chosen and the document actually carries a table. */
    var tableCompliance = null, sigCompliance = null;
    if ((mode === 'B' || mode === 'C') && res.structure) {
      var layout = M.intake.extractTableLayout(res.structure);
      var officialCols = M.intake.officialTableFor(cf.module);
      var firstTable = layout.tables.filter(function (t) { return t.columns.length >= 2; })[0];
      if (firstTable && officialCols) tableCompliance = M.intake.checkTableCompliance(firstTable.columns, officialCols);
      if (layout.signatureOrder && layout.signatureOrder.length) sigCompliance = M.intake.signatureCompliance(layout.signatureOrder);
    }
    APP.intakeAnalysis = {
      fileName: file.name, kind: kind, support: M.intake.supportFor(kind),
      mode: mode, extractionSummary: extractionSummary,
      layoutProfile: layoutProfile, layoutPlan: layoutPlan, official: official,
      tableCompliance: tableCompliance, sigCompliance: sigCompliance,
      recorded: false
    };
  }

  /* Record the intake decision on the case (audit) and, if the user chose
     to apply layout guidance, switch the output profile to Enhanced. This
     IS the user confirmation — nothing official changes before it. */
  function recordIntake(applyLayout) {
    var cf = APP.caseFile, a = APP.intakeAnalysis;
    if (!cf || !a) return;
    var accepted = (APP.ingestCandidates || []).filter(function (c) { return c.accepted; })
      .map(function (c) { return { kind: c.kind, value: c.canonical || c.value, to: c.appliedTo || '' }; });
    var plan = a.layoutPlan;
    if (applyLayout && plan && plan.applied) {
      cf.outputProfile = 'enhanced';
    }
    var rec = M.intake.buildRecord({
      at: new Date().toISOString(), fileName: a.fileName, fileKind: a.kind, mode: a.mode,
      extractionSummary: a.extractionSummary, layoutDecision: plan, appliedFacts: accepted, confirmed: true
    });
    rec.layoutApplied = !!(applyLayout && plan && plan.applied);
    /* Phase 6 — record the compliance outcomes. A rejected table layout or
       signature order is logged here (the case audit trail); the official
       form is always kept. */
    rec.tableCompliance = a.tableCompliance || null;
    rec.sigCompliance = a.sigCompliance || null;
    if (a.tableCompliance && !a.tableCompliance.compliant) rec.tableRejectedReason = a.tableCompliance.reason;
    if (a.sigCompliance && !a.sigCompliance.ok) rec.signatureRejectedReason = a.sigCompliance.reason;
    if (!Array.isArray(cf.intake)) cf.intake = [];
    cf.intake.push(rec);
    var extra = (rec.tableRejectedReason ? '; table layout rejected (official kept)' : '') + (rec.signatureRejectedReason ? '; signature order rejected (official kept)' : '');
    cf.meta.history.push({ at: rec.at, event: 'intake', detail: 'Document "' + a.fileName + '" used (' + rec.modeLabel + ')' + (rec.layoutApplied ? '; Enhanced layout applied' : '') + (a.mode !== 'A' && !rec.layoutApplied ? '; approved layout kept' : '') + extra });
    a.recorded = true;
    touchAndAutosave();
    refreshIntake();
  }

  /* Field-target strings that map to a single case field path (the rest
     append to lists and are handled by INGEST_UI.applyCandidate). */
  var FIELD_TARGET_PATH = {
    'ref-minfile': 'docState.minfile', 'ref-letter': 'docState.ref',
    'formal-rfpnum': 'formal.rfpNumber', 'disp-ref': 'disposal.requestRef',
    'date-doc': 'docState.date', 'date-rfq': 'docState.rfqdate', 'date-deadline': 'docState.deadline',
    'fig-funds': 'docState.funds', 'disp-transferee': 'disposal.transfer.toOrg'
  };

  /* Phase 5 — apply every staged (accepted) fact to the case. Simple-field
     facts go through the conflict-aware engine; list facts append. Then
     re-render everything, show Imported badges / conflict triangles, and
     raise the cross-tab toast. */
  function applyIntakeFacts() {
    var cf = APP.caseFile;
    var accepted = (APP.ingestCandidates || []).filter(function (c) { return c.accepted && !c.rejected && !c.applied; });
    if (!accepted.length) { alert('Accept at least one item first (each figure individually).'); return; }
    if (cf.module === 'disposal') M.disposal.upgrade(cf.disposal);
    var fieldFacts = [], appendCount = 0;
    accepted.forEach(function (c) {
      var target = c.target || INGEST_UI.defaultTargetFor(c);
      var path = FIELD_TARGET_PATH[target];
      if (path) {
        fieldFacts.push({ path: path, value: (c.canonical || c.value), kind: c.kind, source: c.snippet || '' });
      } else if (target && target !== 'fig-note') {
        INGEST_UI.applyCandidate(c, target); appendCount++;
      }
      c.applied = true;
      c.appliedTo = c.target || '';
    });
    var result = M.intake.applyAcceptedFacts(cf, fieldFacts);
    recordIntakeFromApply(result, accepted, appendCount);
    var summary = M.intake.summarizeUpdate(result.byTab, APP.currentTab);
    showApplyToast(result, summary, appendCount);
    touchAndAutosave();
    refreshIntake();
    render(APP.currentTab);
  }

  function recordIntakeFromApply(result, accepted, appendCount) {
    var cf = APP.caseFile, a = APP.intakeAnalysis || {};
    var appliedFacts = accepted.map(function (c) { return { kind: c.kind, value: c.canonical || c.value, to: c.target || '' }; });
    var rec = M.intake.buildRecord({
      at: new Date().toISOString(), fileName: a.fileName || '', fileKind: a.kind || 'unknown', mode: a.mode || 'A',
      extractionSummary: a.extractionSummary || null, layoutDecision: a.layoutPlan || null, appliedFacts: appliedFacts, confirmed: true
    });
    rec.fieldsUpdated = result.updated.length;
    rec.fieldConflicts = result.conflicts.slice();
    rec.rejectedFigures = result.rejected.length;
    rec.listItemsAdded = appendCount;
    if (!Array.isArray(cf.intake)) cf.intake = [];
    cf.intake.push(rec);
    cf.meta.history.push({ at: rec.at, event: 'intake-apply', detail: result.updated.length + ' field(s) updated, ' + result.conflicts.length + ' conflict(s), ' + appendCount + ' list item(s), from "' + (a.fileName || 'upload') + '"' });
  }

  /* ---------- toasts ---------- */
  function showToast(html, autohide) {
    var host = el('toastHost');
    if (!host) return;
    var n = document.createElement('div');
    n.className = 'toast';
    n.innerHTML = '<span class="x" data-action="toast-close">✕</span>' + html;
    host.appendChild(n);
    if (autohide !== false) setTimeout(function () { if (n.parentNode) n.remove(); }, 11000);
  }
  function closeToasts() { var h = el('toastHost'); if (h) h.innerHTML = ''; }
  function showApplyToast(result, summary, appendCount) {
    var esc = M.textutil.esc;
    var parts = ['<b>' + esc(summary.text) + '</b>'];
    if (appendCount) parts.push(appendCount + ' item(s) added to lists.');
    if (result.conflicts.length) parts.push(result.conflicts.length + ' field(s) need a choice — see the yellow triangle beside the field.');
    if (result.rejected.length) parts.push(result.rejected.length + ' malformed figure(s) were not applied.');
    var link = (summary.others > 0 && summary.earliestTab) ? ' <a data-action="toast-goto" data-tab="' + summary.earliestTab + '">Go to ' + esc(summary.earliestTabLabel) + '</a>' : '';
    showToast(parts.join(' ') + link);
  }

  /* ---------- edit synchronisation (event delegation) ---------- */
  function num(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }

  function ensureCell(ev, item, supplier) {
    var c = M.evaluation.cellAt(ev, item, supplier);
    if (!c) {
      c = { item: item, supplier: supplier, unit: '', vatable: false, quotedQty: null, packSize: null, note: '', compliant: true, complianceNote: '' };
      ev.cells.push(c);
    }
    return c;
  }

  function dropEmptyCell(ev, item, supplier) {
    var c = M.evaluation.cellAt(ev, item, supplier);
    if (c && !String(c.unit).trim() && c.quotedQty == null && c.packSize == null) {
      ev.cells.splice(ev.cells.indexOf(c), 1);
    }
  }

  function handleEdit(target) {
    var cf = APP.caseFile;
    if (!cf) return;
    var st = cf.docState;
    var v = target.type === 'checkbox' ? target.checked : target.value;
    var attr;

    if ((attr = target.getAttribute('data-path'))) {
      PANELS.setPath(cf, attr, v);
      return true;
    }
    if ((attr = target.getAttribute('data-special'))) {
      if (attr === 'folioStart') { cf.folioStart = Math.max(1, num(v) || 1); return true; }
      if (attr === 'presentation') {
        if (v !== cf.presentation) {
          M.casemodel.setPresentation(cf, v, 'Changed by the officer');
          if (APP.currentTab === 'guide') rerender('guide'); else go('case');
        }
        return true;
      }
      if (attr === 'guide-doc') { APP.guideDoc = v; return true; }
      if (attr === 'routine-papers') {
        if (v === 'verbal' && !cf.verbal) cf.verbal = M.verbal.newVerbal();
        if (v === 'items') cf.verbal = null;
        if (v === 'worksheet' && !cf.evaluation) cf.evaluation = M.evaluation.newEvaluation();
        rerender('work');
        return true;
      }
      if (attr === 'intake-mode') {
        APP.intakeMode = v;
        if (APP.lastIngestFile && APP.lastIngestRes) buildIntakeAnalysis(APP.lastIngestFile, APP.lastIngestRes);
        refreshIntake();
        return true;
      }
      if (attr === 'outputProfile') {
        cf.outputProfile = (v === 'enhanced') ? 'enhanced' : 'approved';
        cf.meta.history.push({ at: new Date().toISOString(), event: 'output-profile', detail: 'Output profile set to ' + cf.outputProfile });
        rerender('case');
        return true;
      }
      return true;
    }
    if ((attr = target.getAttribute('data-item'))) {
      var p = attr.split(':');
      st.items[+p[0]][p[1]] = v;
      if (p[1] === 'mode' || p[1] === 'qty') st.items[+p[0]].quotes.forEach(function (q) { q.mode = st.items[+p[0]].mode; q.qty = st.items[+p[0]].qty; });
      return true;
    }
    if ((attr = target.getAttribute('data-quote'))) {
      var pq = attr.split(':');
      var q2 = st.items[+pq[0]].quotes[+pq[1]];
      q2[pq[2]] = target.type === 'checkbox' ? target.checked : v;
      return true;
    }
    if ((attr = target.getAttribute('data-vcontact'))) {
      var pc = attr.split(':');
      cf.verbal.contacts[+pc[0]][pc[1]] = v;
      return true;
    }
    if (target.hasAttribute('data-vcontact-sel')) {
      cf.verbal.selected = +target.getAttribute('data-vcontact-sel');
      return true;
    }
    if ((attr = target.getAttribute('data-vsched'))) {
      var ps = attr.split(':');
      var row = cf.verbal.schedule[+ps[0]];
      row[ps[1]] = ps[1] === 'qty' ? (num(v) || 0) : v;
      return true;
    }
    if ((attr = target.getAttribute('data-esup'))) {
      var pe = attr.split(':');
      cf.evaluation.suppliers[+pe[0]][pe[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-eitem'))) {
      var pi = attr.split(':');
      var itv = cf.evaluation.items[+pi[0]];
      itv[pi[1]] = pi[1] === 'qty' ? (num(v) || 0) : v;
      if (pi[1] === 'qtyText' && !v.trim()) delete itv.qtyText;
      return true;
    }
    if ((attr = target.getAttribute('data-ecell'))) {
      var pcell = attr.split(':');
      var cell = ensureCell(cf.evaluation, +pcell[0], +pcell[1]);
      if (pcell[2] === 'vatable' || pcell[2] === 'compliant') cell[pcell[2]] = target.checked;
      else if (pcell[2] === 'quotedQty' || pcell[2] === 'packSize') cell[pcell[2]] = num(v);
      else cell[pcell[2]] = v;
      dropEmptyCell(cf.evaluation, +pcell[0], +pcell[1]);
      return true;
    }
    if ((attr = target.getAttribute('data-esel'))) {
      var psel = attr.split(':');
      var itemIdx = +psel[0];
      var sel0 = null;
      for (var i = 0; i < cf.evaluation.selections.length; i++) if (cf.evaluation.selections[i].item === itemIdx) sel0 = cf.evaluation.selections[i];
      if (psel[1] === 'supplier') {
        if (v === '') {
          if (sel0) cf.evaluation.selections.splice(cf.evaluation.selections.indexOf(sel0), 1);
        } else {
          if (!sel0) { sel0 = { item: itemIdx, supplier: +v, justification: '', tieNote: '' }; cf.evaluation.selections.push(sel0); }
          else sel0.supplier = +v;
        }
      } else {
        if (!sel0) { sel0 = { item: itemIdx, supplier: null, justification: '', tieNote: '' }; cf.evaluation.selections.push(sel0); }
        sel0[psel[1]] = v;
      }
      return true;
    }
    if ((attr = target.getAttribute('data-dcomm'))) {
      var pd = attr.split(':');
      cf.disposal.committee[+pd[0]][pd[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-ditem'))) {
      var pdi = attr.split(':');
      cf.disposal.items[+pdi[0]][pdi[1]] = pdi[1] === 'qty' ? (num(v) || '') : v;
      return true;
    }
    if ((attr = target.getAttribute('data-dpdac'))) {
      var pdp = attr.split(':');
      cf.disposal.pdac[+pdp[0]][pdp[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-dspend'))) {
      var pds = attr.split(':');
      cf.disposal.strategy.expenditure[+pds[0]][pds[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-dstake'))) {
      var pdt = attr.split(':');
      cf.disposal.strategy.stakeholders[+pdt[0]][pdt[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-dtrans'))) {
      var pdtr = attr.split(':');
      cf.disposal.transfer.items[+pdtr[0]][pdtr[1]] = pdtr[1] === 'quantity' ? (num(v) || '') : v;
      return true;
    }
    if ((attr = target.getAttribute('data-fmember'))) {
      var pfm = attr.split(':');
      cf.formal.committee[+pfm[0]][pfm[1]] = target.type === 'checkbox' ? target.checked : v;
      return true;
    }
    if ((attr = target.getAttribute('data-fmand'))) {
      cf.formal.mandatoryCriteria[+attr].name = v;
      return true;
    }
    if ((attr = target.getAttribute('data-fcrit'))) {
      var pfc = attr.split(':');
      cf.formal.criteria[+pfc[0]][pfc[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-fprop'))) {
      var pfp = attr.split(':');
      cf.formal.proponents[+pfp[0]][pfp[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-fscore'))) {
      cf.formal.techScores[attr] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-fprice'))) {
      var pfr = attr.split(':');
      if (!cf.formal.prices[+pfr[0]]) cf.formal.prices[+pfr[0]] = M.formal.blankPrice();
      cf.formal.prices[+pfr[0]][pfr[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-fclar'))) {
      var pfl = attr.split(':');
      cf.formal.clarifications[+pfl[0]][pfl[1]] = pfl[1] === 'proponent' ? (v === '' ? null : +v) : v;
      return true;
    }
    if (target.hasAttribute('data-frec')) {
      cf.formal.recommendedProponent = target.value === '' ? null : +target.value;
      return true;
    }
    if ((attr = target.getAttribute('data-folio'))) {
      var pf = attr.split(':');
      st.folios[+pf[0]][pf[1]] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-att'))) {
      st.attachments[+attr] = v;
      return true;
    }
    if ((attr = target.getAttribute('data-vblock'))) {
      var pv = attr.split(':');
      if (!cf.voteBlock) cf.voteBlock = { head: ['', ''], subHead: ['', ''], item: ['', ''], subItem: ['', ''] };
      if (!cf.voteBlock[pv[0]]) cf.voteBlock[pv[0]] = ['', ''];
      cf.voteBlock[pv[0]][+pv[1]] = v;
      return true;
    }
    if (target.hasAttribute('data-vstatus-base')) {
      if (cf.voteStatus) cf.voteStatus.provisionBase = target.value;
      return true;
    }
    if (target.hasAttribute('data-sheetnum')) {
      cf.sheetNumbering = target.value;
      return true;
    }
    if ((attr = target.getAttribute('data-vstatus'))) {
      if (!cf.voteStatus) cf.voteStatus = { originalProvision: '', revisedAllocation: '', releasesToDate: '', expenditureToDate: '', commitment: '' };
      cf.voteStatus[attr] = v;
      var allEmpty = M.votestatus.INPUT_FIELDS.every(function (f) { return !String(cf.voteStatus[f[0]] || '').trim(); });
      if (allEmpty) cf.voteStatus = null;
      return true;
    }
    if (target.id === 'docSel') { APP.currentDoc = v; render('docs'); return true; }
    if (target.id === 'autosaveToggle') { APP.autosaveEnabled = target.checked; return true; }
    if (target.id === 'registerDir') { handleRegisterFiles(target.files); return false; }
    if (target.id === 'ingestFile' || target.id === 'guideFile') { if (target.files[0]) handleIngestFile(target.files[0]); target.value = ''; return false; }
    if (target.hasAttribute('data-gcand')) {
      var gc = APP.ingestCandidates[+target.getAttribute('data-gcand')];
      if (gc) gc.accepted = target.checked;
      return true;
    }
    return false;
  }

  /* Before a re-render, capture EVERY bound field in the panel — a value
     can be typed without its change event having fired yet (focus is still
     in the field when another control triggers the render). Losing it
     would silently drop typed data, which this system must never do. */
  var SYNC_SELECTOR = ['[data-path]', '[data-item]', '[data-quote]', '[data-vcontact]',
    '[data-vsched]', '[data-esup]', '[data-eitem]', '[data-ecell]', '[data-esel]',
    '[data-dcomm]', '[data-ditem]', '[data-dpdac]', '[data-dspend]', '[data-dstake]', '[data-dtrans]',
    '[data-fmember]', '[data-fmand]', '[data-fcrit]', '[data-fprop]', '[data-fscore]',
    '[data-fprice]', '[data-fclar]', '[data-frec]',
    '[data-folio]', '[data-att]', '[data-vblock]', '[data-vstatus]'].join(',');

  function syncPanelFromDOM() {
    var panel = el('tab-' + APP.currentTab);
    if (!panel || !APP.caseFile) return;
    var els = panel.querySelectorAll(SYNC_SELECTOR);
    for (var i = 0; i < els.length; i++) {
      if (els[i].type === 'radio' && !els[i].checked) continue;
      handleEdit(els[i]);
    }
    /* checked radios with special semantics */
    var sel = panel.querySelector('[data-vcontact-sel]:checked');
    if (sel) handleEdit(sel);
  }

  /* Text typing: state syncs on every keystroke; computed displays update
     in place; nothing is re-rendered, so no field is ever destroyed while
     someone is typing in it or about to click into another. */
  var autosaveTimer = null;
  document.body.addEventListener('input', function (e) {
    var t = e.target;
    if (t.type === 'checkbox' || t.type === 'radio' || t.tagName === 'SELECT') return;
    if (handleEdit(t)) {
      PANELS.lightUpdate(el('tab-' + APP.currentTab));
      updatePill();
      if (autosaveTimer) clearTimeout(autosaveTimer);
      autosaveTimer = setTimeout(touchAndAutosave, 800);
    }
  });

  /* Click-complete controls (selects, checkboxes, radios, file inputs and
     date pickers) may change the panel structure — re-render, after first
     capturing every bound field so nothing typed is lost. */
  document.body.addEventListener('change', function (e) {
    var t = e.target;
    /* modal staging: the per-row target select just records the target;
       do not touch the case or re-render the tab underneath. */
    if (t.hasAttribute && t.hasAttribute('data-cand-target')) {
      var ci = +t.getAttribute('data-cand-target');
      if (APP.ingestCandidates[ci]) APP.ingestCandidates[ci].target = t.value;
      return;
    }
    var structural = t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'radio' || t.type === 'file';
    if (handleEdit(t)) {
      syncPanelFromDOM();
      touchAndAutosave();
      if (structural && ['work', 'vote', 'fol', 'ver', 'docs', 'guide'].indexOf(APP.currentTab) >= 0) {
        render(APP.currentTab);
      } else {
        PANELS.lightUpdate(el('tab-' + APP.currentTab));
        updatePill();
      }
    }
  });

  /* The composer writes into a field chosen by path; the wording style and
     the human label are derived from the path's last segment. */
  /* Human labels keyed by the full destination path (leaf names collide —
     both disposal and formal have a "background" field). */
  var COMPOSER_FIELDS = {
    'docState.need': 'Background / operational need',
    'docState.methodjust': 'Method justification',
    'docState.minextra': 'Extra minute paragraphs',
    'disposal.strategy.background': 'Disposal strategy — Background',
    'disposal.strategy.objectives': 'Disposal strategy — Objectives',
    'disposal.strategy.recommendation': 'Disposal strategy — Recommendation',
    'formal.introduction': 'Report — Introduction',
    'formal.background': 'Report — Background',
    'formal.recommendationNote': 'Report — Recommendation note'
  };
  /* Legacy composer targets were bare field names (need/methodjust/minextra);
     v3 targets are full paths. Normalise a bare code to its docState path. */
  function composerPath(target) {
    var t = target || 'docState.need';
    return t.indexOf('.') >= 0 ? t : 'docState.' + t;
  }
  function composerLeaf(path) { var p = String(path || '').split('.'); return p[p.length - 1]; }
  function composerStyle(path) {
    var leaf = composerLeaf(path);
    /* only the routine method/extra fields use a non-background wording
       style; every other narrative field uses the background style */
    return leaf === 'methodjust' ? 'methodjust' : leaf === 'minextra' ? 'minextra' : 'need';
  }
  function composerLabel(path) { return COMPOSER_FIELDS[composerPath(path)] || composerLeaf(path); }

  /* ---------- click actions ---------- */
  var actions = {
    'new-case': function (t) { newCase(t.getAttribute('data-activity') || t.getAttribute('data-pathway')); },
    'autosave-restore': function () {
      var saved = APP.autosavePeek();
      if (saved) openCaseObject(saved.obj, 'the autosave');
    },
    'autosave-discard': function () {
      try { localStorage.removeItem(M.storage.AUTOSAVE_KEY); } catch (e) { }
      render('start');
    },
    'item-add': function () { APP.caseFile.docState.items.push({ desc: '', qty: '', unitname: '', mode: 'qty', quotes: [] }); rerender('work'); },
    'item-del': function (t) { if (confirm('Delete this item and its supplier rows?')) { APP.caseFile.docState.items.splice(+t.getAttribute('data-i'), 1); rerender('work'); } },
    'quote-add': function (t) {
      var it = APP.caseFile.docState.items[+t.getAttribute('data-i')];
      it.quotes.push({ supplier: '', status: 'Quoted', qty: it.qty, unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: it.mode });
      rerender('work');
    },
    'quote-del': function (t) { APP.caseFile.docState.items[+t.getAttribute('data-i')].quotes.splice(+t.getAttribute('data-j'), 1); rerender('work'); },
    'vcontact-add': function () { APP.caseFile.verbal.contacts.push({ name: '', phone: '', date: '', spokeTo: '', officer: '', outcome: 'quoted', amount: '' }); rerender('work'); },
    'vcontact-del': function (t) {
      var i = +t.getAttribute('data-i');
      var vb = APP.caseFile.verbal;
      vb.contacts.splice(i, 1);
      if (vb.selected === i) vb.selected = null;
      else if (vb.selected > i) vb.selected--;
      rerender('work');
    },
    'vsched-add': function () { APP.caseFile.verbal.schedule.push({ date: '', desc: '', qty: 1, rate: '', kind: 'line' }); rerender('work'); },
    'vsched-del': function (t) { APP.caseFile.verbal.schedule.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'esup-add': function () { APP.caseFile.evaluation.suppliers.push({ name: '', address: '', status: 'quoted' }); rerender('work'); },
    'esup-del': function (t) {
      var i = +t.getAttribute('data-i');
      var ev = APP.caseFile.evaluation;
      if (!confirm('Delete this supplier and every price recorded for it?')) return;
      ev.suppliers.splice(i, 1);
      ev.cells = ev.cells.filter(function (c) { return c.supplier !== i; });
      ev.cells.forEach(function (c) { if (c.supplier > i) c.supplier--; });
      ev.selections = ev.selections.filter(function (s) { return s.supplier !== i; });
      ev.selections.forEach(function (s) { if (s.supplier > i) s.supplier--; });
      rerender('work');
    },
    'eitem-add': function () { APP.caseFile.evaluation.items.push({ desc: '', variant: '', qty: 1, unitName: '' }); rerender('work'); },
    'eitem-del': function (t) {
      var i = +t.getAttribute('data-i');
      var ev = APP.caseFile.evaluation;
      if (!confirm('Delete this item and every price recorded for it?')) return;
      ev.items.splice(i, 1);
      ev.cells = ev.cells.filter(function (c) { return c.item !== i; });
      ev.cells.forEach(function (c) { if (c.item > i) c.item--; });
      ev.selections = ev.selections.filter(function (s) { return s.item !== i; });
      ev.selections.forEach(function (s) { if (s.item > i) s.item--; });
      rerender('work');
    },
    'adopt-internal': function () {
      var cf = APP.caseFile;
      if (cf.presentation !== 'internal') M.casemodel.setPresentation(cf, 'internal', 'Comparison result adopted into the Ministry internal minute');
      if (APP.currentTab === 'guide') rerender('guide'); else go('case');
    },
    'adopt-formation': function () {
      var cf = APP.caseFile;
      if (cf.presentation !== 'formation') M.casemodel.setPresentation(cf, 'formation', 'Comparison result adopted into a formation approval');
      /* the formation letter reads docState items; project the award without retyping */
      cf.docState.items = M.evaluation.toDocItems(cf.evaluation);
      if (APP.currentTab === 'guide') rerender('guide'); else go('case');
    },
    'worksheet-discard': function () {
      if (!confirm('Discard the supplier comparison worksheet? Every recorded price and selection on it is removed from this case. The case itself, its items and its documents remain.')) return;
      APP.caseFile.evaluation = null;
      rerender('work');
    },
    'dcomm-add': function () { APP.caseFile.disposal.committee.push({ name: '', post: '' }); rerender('work'); },
    'dcomm-del': function (t) { APP.caseFile.disposal.committee.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'dpdac-add': function () { APP.caseFile.disposal.pdac.push({ name: '', post: '' }); rerender('work'); },
    'dpdac-del': function (t) { APP.caseFile.disposal.pdac.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'ditem-add': function () { APP.caseFile.disposal.items.push(M.disposal.blankItem()); rerender('work'); },
    'ditem-del': function (t) { APP.caseFile.disposal.items.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'dspend-add': function () { APP.caseFile.disposal.strategy.expenditure.push({ detail: '', amount: '' }); rerender('work'); },
    'dspend-del': function (t) { APP.caseFile.disposal.strategy.expenditure.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'dstake-add': function () { APP.caseFile.disposal.strategy.stakeholders.push({ name: '', interest: '' }); rerender('work'); },
    'dstake-del': function (t) { APP.caseFile.disposal.strategy.stakeholders.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'dtrans-add': function () { APP.caseFile.disposal.transfer.items.push(M.disposal.blankTransferItem()); rerender('work'); },
    'dtrans-del': function (t) { APP.caseFile.disposal.transfer.items.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'fmember-add': function () { APP.caseFile.formal.committee.push(M.formal.blankMember()); rerender('work'); },
    'fmember-del': function (t) { APP.caseFile.formal.committee.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'fmand-add': function () { APP.caseFile.formal.mandatoryCriteria.push({ name: '' }); rerender('work'); },
    'fmand-del': function (t) { APP.caseFile.formal.mandatoryCriteria.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'fcrit-add': function () { APP.caseFile.formal.criteria.push(M.formal.blankCriterion()); rerender('work'); },
    'fcrit-del': function (t) {
      var i = +t.getAttribute('data-i');
      var f = APP.caseFile.formal;
      f.criteria.splice(i, 1);
      /* renumber the technical-score map: drop column i, shift the rest down */
      var next = {};
      Object.keys(f.techScores).forEach(function (k) {
        var pc = k.split(':'), pp = +pc[0], cc = +pc[1];
        if (cc === i) return;
        next[pp + ':' + (cc > i ? cc - 1 : cc)] = f.techScores[k];
      });
      f.techScores = next;
      rerender('work');
    },
    'fprop-add': function () {
      var f = APP.caseFile.formal;
      f.proponents.push(M.formal.blankProponent());
      f.prices.push(M.formal.blankPrice());
      rerender('work');
    },
    'fprop-del': function (t) {
      var i = +t.getAttribute('data-i');
      var f = APP.caseFile.formal;
      if (!confirm('Delete this proponent and its scores and price?')) return;
      f.proponents.splice(i, 1);
      f.prices.splice(i, 1);
      if (f.recommendedProponent === i) f.recommendedProponent = null;
      else if (f.recommendedProponent > i) f.recommendedProponent--;
      /* renumber the technical-score map: drop row i, shift the rest up */
      var next = {};
      Object.keys(f.techScores).forEach(function (k) {
        var pc = k.split(':'), pp = +pc[0], cc = +pc[1];
        if (pp === i) return;
        next[(pp > i ? pp - 1 : pp) + ':' + cc] = f.techScores[k];
      });
      f.techScores = next;
      f.clarifications = f.clarifications.filter(function (c) { return c.proponent !== i; });
      f.clarifications.forEach(function (c) { if (c.proponent > i) c.proponent--; });
      rerender('work');
    },
    'fclar-add': function () { APP.caseFile.formal.clarifications.push({ proponent: null, issued: '', received: '', summary: '' }); rerender('work'); },
    'fclar-del': function (t) { APP.caseFile.formal.clarifications.splice(+t.getAttribute('data-i'), 1); rerender('work'); },
    'folio-add': function () { APP.caseFile.docState.folios.push({ desc: '', date: '', tag: '' }); rerender('fol'); },
    'folio-del': function (t) { APP.caseFile.docState.folios.splice(+t.getAttribute('data-i'), 1); rerender('fol'); },
    'att-add': function () { APP.caseFile.docState.attachments.push(''); rerender('fol'); },
    'att-del': function (t) { APP.caseFile.docState.attachments.splice(+t.getAttribute('data-i'), 1); rerender('fol'); },
    'att-auto': function () {
      var st = APP.caseFile.docState;
      var out = [];
      var sup = M.compute.allSuppliers(st.items);
      sup.forEach(function (s) { if (s.quoted) out.push('Quotation received from ' + s.name); });
      sup.forEach(function (s) { out.push('Request for Quotation sent to ' + s.name); });
      st.attachments = out;
      rerender('fol');
    },
    'fix': function (t) { go(t.getAttribute('data-tab')); },
    /* ---- offline narrative composer (engine: js/lib/narrative.js) ---- */
    'da-compose': function () {
      var st = APP.caseFile.docState;
      var path = composerPath(st.da_target);
      var style = composerStyle(path);
      var itemsLine = (st.items || []).map(function (it) { return it.desc; }).filter(function (d) { return d && d.trim(); }).join('; ');
      var out = M.narrative.composeOffline(style,
        { activity: st.da_activity, who: st.da_who, when: st.da_when, cons: st.da_cons, notes: st.da_notes },
        { subject: st.subject, method: st.method, itemsLine: itemsLine });
      var status = el('daStatus'), preview = el('daPreview'), acts = el('daActions');
      if (!out) {
        APP.daDraft = '';
        if (preview) preview.style.display = 'none';
        if (acts) acts.style.display = 'none';
        if (status) status.textContent = style === 'minextra'
          ? 'Enter the paragraphs in Rough notes first.'
          : 'Enter at least the activity, or write your points into Rough notes.';
        return;
      }
      APP.daDraft = out;
      if (preview) {
        preview.style.display = 'block';
        preview.innerHTML = out.split(/\n\s*\n/).map(function (p) {
          return '<p style="margin:0 0 8px">' + M.textutil.esc(p) + '</p>';
        }).join('');
      }
      if (acts) acts.style.display = 'block';
      if (status) status.textContent = 'First draft below. Read it, then Insert to place it in the field — or Discard and try again.';
    },
    'da-insert': function () {
      if (!APP.daDraft) return;
      var cf = APP.caseFile;
      var path = composerPath(cf.docState.da_target);
      var existing = (PANELS.getPath(cf, path) || '');
      var merged = String(existing).trim() ? (String(existing).trim() + '\n\n' + APP.daDraft) : APP.daDraft;
      PANELS.setPath(cf, path, merged);
      var input = document.querySelector('[data-path="' + path + '"]');
      if (input) input.value = merged;
      APP.daDraft = '';
      var preview = el('daPreview'), acts = el('daActions'), status = el('daStatus');
      if (preview) preview.style.display = 'none';
      if (acts) acts.style.display = 'none';
      if (status) status.textContent = 'Inserted into "' + composerLabel(path) + '"' + (input ? '. Edit it there as any other field.' : ' — see the Working Papers tab, where that field is shown.');
      touchAndAutosave();
    },
    'da-discard': function () {
      APP.daDraft = '';
      var preview = el('daPreview'), acts = el('daActions'), status = el('daStatus');
      if (preview) preview.style.display = 'none';
      if (acts) acts.style.display = 'none';
      if (status) status.textContent = 'Discarded.';
    },
    'doc-print': function () { window.print(); },
    'doc-download': function () { downloadDoc(APP.currentDoc); },
    'doc-download-all': function () { downloadAllDocs(); },
    'save-case': saveCase,
    'register-pick': pickRegisterFolder,
    'register-export': function () {
      if (APP.registerIndex) downloadBlob(M.storage.serializeRegister(APP.registerIndex), 'register-index.json', 'application/json');
    },
    'register-open': function (t) {
      var entry = APP.registerIndex.cases[+t.getAttribute('data-i')];
      var text = APP.registerTexts[entry.fileName];
      if (!text) { alert('The file content is no longer available — choose the folder again.'); return; }
      openCaseObject(JSON.parse(text), entry.fileName);
    },
    'ingest-pick': pickIngestFile,
    'ingest-accept-safe': function () {
      /* Bulk-accept the safe kinds only (suppliers / dates / references).
         Figures and item lines are never bulk-accepted (Phase 4). */
      APP.ingestCandidates.forEach(function (c) {
        if (!c.accepted && !c.rejected && M.ingest.canBulkAccept(c) && M.ingest.canAccept(c)) c.accepted = true;
      });
      refreshIntake();
    },
    'cand-accept': function (t) {
      var i = +t.getAttribute('data-i');
      var c = APP.ingestCandidates[i];
      if (!M.ingest.canAccept(c)) return;   /* malformed figure: blocked until edited */
      var sel = document.querySelector('[data-cand-target="' + i + '"]');
      if (sel) c.target = sel.value;
      c.accepted = true;                     /* stage only; applied on "Apply Accepted Data" */
      refreshIntake();
    },
    'cand-target': function (t) {
      APP.ingestCandidates[+t.getAttribute('data-i')].target = t.value;
    },
    /* Phase 5 — apply every staged fact to the case, with cross-tab
       injection, conflict detection, badges and the toast. */
    'intake-apply-facts': applyIntakeFacts,
    'cand-edit': function (t) {
      var c = APP.ingestCandidates[+t.getAttribute('data-i')];
      var cur = c.kind === 'item-line' ? JSON.stringify(c.value) : String(c.value);
      var next = prompt('Edit the value exactly as the source document says:', cur);
      if (next == null) return;
      if (c.kind === 'figure') {
        var p = M.money.parseStrict(next);
        c.value = next;
        c.canonical = p.ok ? p.canonical : null;
        c.note = p.ok ? 'Edited by hand; confirm against the folio.' : 'Still rejected: ' + p.hint;
        c.edited = true;
      } else if (c.kind === 'item-line') {
        try { c.value = JSON.parse(next); c.edited = true; } catch (e) { alert('Not valid JSON.'); }
      } else {
        c.value = next; c.canonical = next; c.edited = true;
      }
      refreshIntake();
    },
    'cand-reject': function (t) { APP.ingestCandidates[+t.getAttribute('data-i')].rejected = true; refreshIntake(); },
    'cand-unreject': function (t) { APP.ingestCandidates[+t.getAttribute('data-i')].rejected = false; refreshIntake(); },
    'intake-apply-layout': function () { recordIntake(true); },
    'intake-keep-layout': function () { recordIntake(false); },
    'intake-record': function () { recordIntake(false); },
    /* conflict resolution beside a field (Phase 5) */
    'conflict-keep': function (t) { M.intake.resolveConflict(APP.caseFile, t.getAttribute('data-path'), 'manual'); render(APP.currentTab); touchAndAutosave(); },
    'conflict-accept': function (t) { M.intake.resolveConflict(APP.caseFile, t.getAttribute('data-path'), 'imported'); render(APP.currentTab); touchAndAutosave(); },
    'toast-goto': function (t) { closeToasts(); closeIntakeModal(); if (APP.currentTab === 'guide') render('guide'); else go(t.getAttribute('data-tab')); },
    'toast-close': function (t) { var n = t.closest('.toast'); if (n) n.remove(); },
    /* ---- Guided Mode navigation and actions ---- */
    'guide-next': function () { APP.guideStep = (APP.guideStep || 0) + 1; render('guide'); window.scrollTo(0, 0); },
    'guide-back': function () { APP.guideStep = Math.max(0, (APP.guideStep || 0) - 1); render('guide'); window.scrollTo(0, 0); },
    'guide-goto': function (t) { APP.guideStep = +t.getAttribute('data-i'); render('guide'); window.scrollTo(0, 0); },
    'guide-fix': function (t) {
      var stepId = GUIDE.stepForCheck(APP.caseFile.module, t.getAttribute('data-check'));
      APP.guideStep = GUIDE.stepIndex(APP.caseFile.module, stepId);
      render('guide');
      window.scrollTo(0, 0);
    },
    'guide-expert': function () { APP.uiMode = 'expert'; go('case'); },
    'guide-start': function () { go('start'); },
    'to-guided': function () { APP.uiMode = 'guided'; go('guide'); },
    'guide-pick': function () { var f = el('guideFile'); if (f) f.click(); },
    'open-intake-modal': function () { openIntakeModal(); },
    'guide-preview-doc': function (t) { APP.guideDoc = t.getAttribute('data-doc'); render('guide'); },
    'guide-download': function (t) { downloadDoc(t.getAttribute('data-doc')); },
    'guide-download-all': function () { downloadAllDocs(); }
  };

  document.body.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var fn = actions[t.getAttribute('data-action')];
    if (fn) { fn(t); }
  });

  el('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && !b.disabled && b.getAttribute('data-t')) {
      var t = b.getAttribute('data-t');
      if (t !== 'start') APP.uiMode = 'expert'; /* using a case tab IS choosing the full view */
      go(t);
    }
  });

  /* minimal surface for Guided Mode (drag-and-drop upload) */
  window.MAIN = { handleIngestFile: handleIngestFile };

  /* ---------- boot ---------- */
  render('start');
})();
