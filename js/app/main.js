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
    registerIndex: null,
    registerTexts: {},
    autosaveEnabled: true
  };

  function el(id) { return document.getElementById(id); }

  /* ---------- tabs ---------- */
  function go(tab) {
    APP.currentTab = tab;
    var btns = document.querySelectorAll('nav.tabs button');
    for (var i = 0; i < btns.length; i++)

      btns[i].classList.toggle('active', btns[i].getAttribute('data-t') === tab);
    var panels = document.querySelectorAll('section.panel');
    for (var j = 0; j < panels.length; j++) panels[j].classList.toggle('show', panels[j].id === 'tab-' + tab);
    render(tab);
    window.scrollTo(0, 0);
  }

  function render(tab) {
    var panel = el('tab-' + (tab || APP.currentTab));
    if (!panel) return;
    if ((tab || APP.currentTab) === 'ingest') { INGEST_UI.renderIngest(panel); return; }
    var fn = PANELS[tab || APP.currentTab];
    if (fn) fn(panel);
    updatePill();
  }

  function enableTabs(enabled) {
    var btns = document.querySelectorAll('nav.tabs button');
    for (var i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute('data-t') !== 'start') btns[i].disabled = !enabled;
    }
    el('btnSave').disabled = !enabled;
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
    APP.ingestCandidates = [];
    APP.ingestWarning = '';
    enableTabs(true);
    go('case');
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
    enableTabs(true);
    go('case');
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
    if (status) status.textContent = 'Reading ' + file.name + '…';
    M.ingestfiles.ingestFile(file).then(function (res) {
      APP.ingestCandidates = res.candidates;
      APP.ingestWarning = res.warning || '';
      render('ingest');
    }).catch(function (e) {
      APP.ingestCandidates = [];
      APP.ingestWarning = '';
      render('ingest');
      var s2 = el('ingestStatus');
      if (s2) s2.textContent = 'Could not import: ' + e.message;
    });
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
        if (v !== cf.presentation) { M.casemodel.setPresentation(cf, v, 'Changed on Case Details'); go('case'); }
        return true;
      }
      if (attr === 'routine-papers') {
        if (v === 'verbal' && !cf.verbal) cf.verbal = M.verbal.newVerbal();
        if (v === 'items') cf.verbal = null;
        if (v === 'worksheet' && !cf.evaluation) cf.evaluation = M.evaluation.newEvaluation();
        render('work');
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
    if (target.id === 'ingestFile') { if (target.files[0]) handleIngestFile(target.files[0]); target.value = ''; return false; }
    return false;
  }

  /* Before a re-render, capture EVERY bound field in the panel — a value
     can be typed without its change event having fired yet (focus is still
     in the field when another control triggers the render). Losing it
     would silently drop typed data, which this system must never do. */
  var SYNC_SELECTOR = ['[data-path]', '[data-item]', '[data-quote]', '[data-vcontact]',
    '[data-vsched]', '[data-esup]', '[data-eitem]', '[data-ecell]', '[data-esel]',
    '[data-dcomm]', '[data-ditem]', '[data-folio]', '[data-att]', '[data-vblock]',
    '[data-vstatus]'].join(',');

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
    var structural = t.tagName === 'SELECT' || t.type === 'checkbox' || t.type === 'radio' || t.type === 'file';
    if (handleEdit(t)) {
      syncPanelFromDOM();
      touchAndAutosave();
      if (structural && ['work', 'vote', 'fol', 'ver', 'docs'].indexOf(APP.currentTab) >= 0) {
        render(APP.currentTab);
      } else {
        PANELS.lightUpdate(el('tab-' + APP.currentTab));
        updatePill();
      }
    }
  });

  /* ---------- click actions ---------- */
  var actions = {
    'new-case': function (t) { newCase(t.getAttribute('data-pathway')); },
    'autosave-restore': function () {
      var saved = APP.autosavePeek();
      if (saved) openCaseObject(saved.obj, 'the autosave');
    },
    'autosave-discard': function () {
      try { localStorage.removeItem(M.storage.AUTOSAVE_KEY); } catch (e) { }
      render('start');
    },
    'item-add': function () { APP.caseFile.docState.items.push({ desc: '', qty: '', unitname: '', mode: 'qty', quotes: [] }); render('work'); },
    'item-del': function (t) { if (confirm('Delete this item and its supplier rows?')) { APP.caseFile.docState.items.splice(+t.getAttribute('data-i'), 1); render('work'); } },
    'quote-add': function (t) {
      var it = APP.caseFile.docState.items[+t.getAttribute('data-i')];
      it.quotes.push({ supplier: '', status: 'Quoted', qty: it.qty, unit: '', sub: '', vat: '', compliant: 'Yes', recommended: false, address: '', mode: it.mode });
      render('work');
    },
    'quote-del': function (t) { APP.caseFile.docState.items[+t.getAttribute('data-i')].quotes.splice(+t.getAttribute('data-j'), 1); render('work'); },
    'vcontact-add': function () { APP.caseFile.verbal.contacts.push({ name: '', phone: '', date: '', spokeTo: '', officer: '', outcome: 'quoted', amount: '' }); render('work'); },
    'vcontact-del': function (t) {
      var i = +t.getAttribute('data-i');
      var vb = APP.caseFile.verbal;
      vb.contacts.splice(i, 1);
      if (vb.selected === i) vb.selected = null;
      else if (vb.selected > i) vb.selected--;
      render('work');
    },
    'vsched-add': function () { APP.caseFile.verbal.schedule.push({ date: '', desc: '', qty: 1, rate: '', kind: 'line' }); render('work'); },
    'vsched-del': function (t) { APP.caseFile.verbal.schedule.splice(+t.getAttribute('data-i'), 1); render('work'); },
    'esup-add': function () { APP.caseFile.evaluation.suppliers.push({ name: '', address: '', status: 'quoted' }); render('work'); },
    'esup-del': function (t) {
      var i = +t.getAttribute('data-i');
      var ev = APP.caseFile.evaluation;
      if (!confirm('Delete this supplier and every price recorded for it?')) return;
      ev.suppliers.splice(i, 1);
      ev.cells = ev.cells.filter(function (c) { return c.supplier !== i; });
      ev.cells.forEach(function (c) { if (c.supplier > i) c.supplier--; });
      ev.selections = ev.selections.filter(function (s) { return s.supplier !== i; });
      ev.selections.forEach(function (s) { if (s.supplier > i) s.supplier--; });
      render('work');
    },
    'eitem-add': function () { APP.caseFile.evaluation.items.push({ desc: '', variant: '', qty: 1, unitName: '' }); render('work'); },
    'eitem-del': function (t) {
      var i = +t.getAttribute('data-i');
      var ev = APP.caseFile.evaluation;
      if (!confirm('Delete this item and every price recorded for it?')) return;
      ev.items.splice(i, 1);
      ev.cells = ev.cells.filter(function (c) { return c.item !== i; });
      ev.cells.forEach(function (c) { if (c.item > i) c.item--; });
      ev.selections = ev.selections.filter(function (s) { return s.item !== i; });
      ev.selections.forEach(function (s) { if (s.item > i) s.item--; });
      render('work');
    },
    'adopt-internal': function () {
      var cf = APP.caseFile;
      if (cf.presentation !== 'internal') M.casemodel.setPresentation(cf, 'internal', 'Comparison result adopted into the Ministry internal minute');
      go('case');
    },
    'adopt-formation': function () {
      var cf = APP.caseFile;
      if (cf.presentation !== 'formation') M.casemodel.setPresentation(cf, 'formation', 'Comparison result adopted into a formation approval');
      /* the formation letter reads docState items; project the award without retyping */
      cf.docState.items = M.evaluation.toDocItems(cf.evaluation);
      go('case');
    },
    'worksheet-discard': function () {
      if (!confirm('Discard the supplier comparison worksheet? Every recorded price and selection on it is removed from this case. The case itself, its items and its documents remain.')) return;
      APP.caseFile.evaluation = null;
      render('work');
    },
    'dcomm-add': function () { APP.caseFile.disposal.committee.push({ name: '', post: '' }); render('work'); },
    'dcomm-del': function (t) { APP.caseFile.disposal.committee.splice(+t.getAttribute('data-i'), 1); render('work'); },
    'ditem-add': function () { APP.caseFile.disposal.items.push({ desc: '', identification: '', qty: 1, condition: '', location: '', acquisitionCost: '', valuation: '', valuationBasis: '', valuationDate: '', method: '', methodReason: '' }); render('work'); },
    'ditem-del': function (t) { APP.caseFile.disposal.items.splice(+t.getAttribute('data-i'), 1); render('work'); },
    'folio-add': function () { APP.caseFile.docState.folios.push({ desc: '', date: '', tag: '' }); render('fol'); },
    'folio-del': function (t) { APP.caseFile.docState.folios.splice(+t.getAttribute('data-i'), 1); render('fol'); },
    'att-add': function () { APP.caseFile.docState.attachments.push(''); render('fol'); },
    'att-del': function (t) { APP.caseFile.docState.attachments.splice(+t.getAttribute('data-i'), 1); render('fol'); },
    'att-auto': function () {
      var st = APP.caseFile.docState;
      var out = [];
      var sup = M.compute.allSuppliers(st.items);
      sup.forEach(function (s) { if (s.quoted) out.push('Quotation received from ' + s.name); });
      sup.forEach(function (s) { out.push('Request for Quotation sent to ' + s.name); });
      st.attachments = out;
      render('fol');
    },
    'fix': function (t) { go(t.getAttribute('data-tab')); },
    /* ---- offline narrative composer (engine: js/lib/narrative.js) ---- */
    'da-compose': function () {
      var st = APP.caseFile.docState;
      var target = st.da_target || 'need';
      var itemsLine = (st.items || []).map(function (it) { return it.desc; }).filter(function (d) { return d && d.trim(); }).join('; ');
      var out = M.narrative.composeOffline(target,
        { activity: st.da_activity, who: st.da_who, when: st.da_when, cons: st.da_cons, notes: st.da_notes },
        { subject: st.subject, method: st.method, itemsLine: itemsLine });
      var status = el('daStatus'), preview = el('daPreview'), acts = el('daActions');
      if (!out) {
        APP.daDraft = '';
        if (preview) preview.style.display = 'none';
        if (acts) acts.style.display = 'none';
        if (status) status.textContent = target === 'minextra'
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
      var st = APP.caseFile.docState;
      var target = st.da_target || 'need';
      var field = target === 'methodjust' ? 'methodjust' : target === 'minextra' ? 'minextra' : 'need';
      st[field] = (st[field] || '').trim() ? (st[field].trim() + '\n\n' + APP.daDraft) : APP.daDraft;
      var input = document.querySelector('[data-path="docState.' + field + '"]');
      if (input) input.value = st[field];
      APP.daDraft = '';
      var preview = el('daPreview'), acts = el('daActions'), status = el('daStatus');
      if (preview) preview.style.display = 'none';
      if (acts) acts.style.display = 'none';
      if (status) status.textContent = 'Inserted into "' + (field === 'need' ? 'Background / operational need' : field === 'methodjust' ? 'Method justification' : 'Extra minute paragraphs') + '". Edit it there as any other field.';
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
      APP.ingestCandidates.forEach(function (c) {
        if (!c.accepted && !c.rejected && M.ingest.canBulkAccept(c) && M.ingest.canAccept(c)) {
          /* bulk accept keeps safe kinds on the list marked accepted for
             reference — they are applied individually where a target matters */
          c.accepted = true;
          c.appliedTo = 'kept for reference (apply individually to place it)';
        }
      });
      render('ingest');
      touchAndAutosave();
    },
    'cand-accept': function (t) {
      var i = +t.getAttribute('data-i');
      var c = APP.ingestCandidates[i];
      if (!M.ingest.canAccept(c)) return;
      var sel = document.querySelector('[data-cand-target="' + i + '"]');
      var target = sel ? sel.value : '';
      c.accepted = true;
      c.appliedTo = INGEST_UI.applyCandidate(c, target);
      render('ingest');
      touchAndAutosave();
    },
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
      render('ingest');
    },
    'cand-reject': function (t) { APP.ingestCandidates[+t.getAttribute('data-i')].rejected = true; render('ingest'); },
    'cand-unreject': function (t) { APP.ingestCandidates[+t.getAttribute('data-i')].rejected = false; render('ingest'); }
  };

  document.body.addEventListener('click', function (e) {
    var t = e.target.closest('[data-action]');
    if (!t) return;
    var fn = actions[t.getAttribute('data-action')];
    if (fn) { fn(t); }
  });

  el('tabs').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && !b.disabled) go(b.getAttribute('data-t'));
  });

  /* ---------- boot ---------- */
  render('start');
})();
