/* panels.js — renders each tab of the application from the open case file
   and syncs edits back. All arithmetic, totals, words and folio numbers
   shown here are computed by the engine modules (js/lib/); this file only
   moves values between the screen and the case file.
   Browser-only. Depends on the MODPA engine namespace and APP (main.js). */
(function () {
  'use strict';

  var M = window.MODPA;
  var esc = M.textutil.esc;
  var fmtMoney = M.money.fmtMoney;

  function el(id) { return document.getElementById(id); }

  /* ---------- generic path binding ---------- */
  function getPath(obj, path) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length; i++) {
      if (cur == null) return undefined;
      cur = cur[parts[i]];
    }
    return cur;
  }
  function setPath(obj, path, value) {
    var parts = path.split('.');
    var cur = obj;
    for (var i = 0; i < parts.length - 1; i++) {
      if (cur[parts[i]] == null) cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = value;
  }

  function bindInputs(panel) {
    var els = panel.querySelectorAll('[data-path]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i];
      var v = getPath(APP.caseFile, e.getAttribute('data-path'));
      if (e.type === 'checkbox') e.checked = !!v;
      else e.value = v == null ? '' : v;
    }
  }

  function fieldHTML(label, path, opts) {
    opts = opts || {};
    var type = opts.type || 'text';
    var wide = opts.wide ? ' wide' : '';
    var req = opts.req ? ' <span class="req">*</span>' : '';
    if (type === 'textarea') {
      return '<label class="f' + wide + '">' + esc(label) + req + '<textarea data-path="' + esc(path) + '" placeholder="' + esc(opts.placeholder || '') + '"></textarea></label>';
    }
    if (type === 'checkbox') {
      return '<label class="f' + wide + '"><input type="checkbox" data-path="' + esc(path) + '"> ' + esc(label) + '</label>';
    }
    if (type === 'select') {
      var oh = (opts.options || []).map(function (o) {
        return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>';
      }).join('');
      return '<label class="f' + wide + '">' + esc(label) + req + '<select data-path="' + esc(path) + '">' + oh + '</select></label>';
    }
    return '<label class="f' + wide + '">' + esc(label) + req + '<input type="' + type + '" data-path="' + esc(path) + '" placeholder="' + esc(opts.placeholder || '') + '"></label>';
  }

  /* ================= START ================= */
  function renderStart(panel) {
    var h = '<h2 class="p">What are you doing today?</h2>';
    h += '<p class="hint">Choose the activity before entering any data. The three activities are separate workflows — each has its own forms, questions, checks and documents, and none borrows from the others. Choices inside an activity (who the papers are for, how suppliers were contacted, which working paper to use) are asked where they arise, not here.</p>';
    var cards = [
      ['routine', 'Routine / daily procurement', 'The everyday travelling file: purchase requisition, vote and funds check, written or telephone quotations, supplier comparison, minute sheet ("Approval is hereby sought…"), formation letter where an outside formation asked, checklist and verification certificate.'],
      ['formal-evaluation', 'Formal tender / RFP / ITB evaluation', 'An Evaluation Committee reporting on a formal solicitation: conflict-of-interest and confidentiality declarations, preliminary examination, technical and financial evaluation against the published criteria, ranking, and the OPR-format Evaluation Report. (Module being fitted.)'],
      ['disposal', 'Disposal of public property', 'Disposal under the 2015 Act: inventory and condition, valuation with its recorded basis, Disposal Committee recommendation of a method, committee minute and approval instrument.']
    ];
    for (var i = 0; i < cards.length; i++) {
      h += '<div class="pathcard" data-action="new-case" data-activity="' + cards[i][0] + '"><h3>' + esc(cards[i][1]) + '</h3><p>' + esc(cards[i][2]) + '</p></div>';
    }
    var saved = APP.autosavePeek();
    if (saved) {
      h += '<div class="notice"><b>Unsaved work found on this computer</b> (autosaved ' + esc(saved.when) + ' — ' + esc(saved.subject || 'no subject') + ').&nbsp; ' +
        '<button class="btn small" data-action="autosave-restore">Restore it</button> ' +
        '<button class="btn sec small" data-action="autosave-discard">Discard it</button></div>';
    }
    h += '<div class="notice green"><b>The rule of the tool.</b> Every name, quantity, price and vote figure is typed once, straight from the document in the file (or accepted from an imported document on the staging screen). The system does all the arithmetic, writes every amount in words from the same number as the figure, numbers every folio from the register, and stamps anything unverified DRAFT — NOT CLEARED. It invents nothing, and nothing leaves this computer.</div>';
    panel.innerHTML = h;
  }

  /* ================= CASE DETAILS ================= */
  function renderCase(panel) {
    var cf = APP.caseFile;
    var profiles = M.styleprofile.list().map(function (p) { return [p.id, p.name]; });
    var h = '<h2 class="p">Case Details — ' + esc(M.casemodel.activityLabel(cf)) + '</h2>';
    h += '<p class="hint">Fields here appear on every document. The style profile controls presentation only (letterhead, folio numerals, routing lines, phrases); the figures and checks are the same for every profile. The activity was chosen on the Start screen and is recorded on the case.</p>';
    h += '<fieldset class="box"><legend>Presentation</legend><div class="grid">';
    h += fieldHTML('Style profile', 'styleProfileId', { type: 'select', options: profiles });
    h += '<label class="f">Starting folio number (the register numbers from here)<input type="number" min="1" step="1" data-special="folioStart" value="' + esc(String(cf.folioStart)) + '"></label>';
    if (cf.module === 'routine') {
      h += '<label class="f">Papers presented for<select data-special="presentation">' + Object.keys(M.casemodel.PRESENTATIONS).map(function (p) {
        return '<option value="' + p + '"' + (cf.presentation === p ? ' selected' : '') + '>' + esc(M.casemodel.PRESENTATIONS[p]) + '</option>';
      }).join('') + '</select></label>';
    }
    h += '</div>';
    /* The sheet-numbering question lives in a computed container: it is
       asked ONLY while the starting folio is above 1 — with folio start 1
       the sheet number already aligns and there is nothing to decide. */
    h += '<div data-compute="sheet-number-box">' + sheetNumberBoxHTML(cf) + '</div>';
    h += '</fieldset>';
    h += '<fieldset class="box"><legend>Reference and subject</legend><div class="grid">';
    h += fieldHTML('Minute file number (File No)', 'docState.minfile', { req: true, placeholder: 'e.g. MOD/PROC: 22/18/7:2026' });
    h += fieldHTML('Sheet number', 'docState.minsheet', { placeholder: '1a' });
    h += fieldHTML('Document date', 'docState.date', { type: 'date', req: true });
    h += fieldHTML('Subject / title', 'docState.subject', { wide: true, req: true, placeholder: 'e.g. The Provision of Boxed Meals' });
    h += fieldHTML('Purpose as it should read in a sentence (optional — e.g. "the provision of Boxed Meals for the Human Resource Training Workshop")', 'docState.subjectProse', { wide: true });
    h += fieldHTML('Background / operational need (each blank-line-separated paragraph becomes a numbered minute paragraph)', 'docState.need', { type: 'textarea', wide: true });
    h += fieldHTML('The suppliers are registered with the OPR’s Procurement Depository (prints the advisory line)', 'oprRegistered', { type: 'checkbox', wide: true });
    h += '</div></fieldset>';
    if (cf.module === 'routine' && cf.presentation === 'formation') {
      h += '<fieldset class="box"><legend>Formation letter (external formation)</legend><div class="grid">';
      h += fieldHTML('Letter file reference', 'docState.ref', { placeholder: 'e.g. CG: 5/4/7' });
      h += fieldHTML('Formation name (letterhead)', 'docState.formation', {});
      h += fieldHTML('Letterhead lines (one per line)', 'docState.lhlines', { type: 'textarea' });
      h += fieldHTML('Pre-printed letterhead (leave space instead of printing one)', 'docState.prelh', { type: 'checkbox' });
      h += fieldHTML('Addressee block (one line per line)', 'docState.addr', { type: 'textarea', wide: true });
      h += fieldHTML('Signature — name', 'docState.signame', {});
      h += fieldHTML('Signature — rank (optional)', 'docState.sigrank', {});
      h += fieldHTML('Signature — appointment', 'docState.sigapp', {});
      h += fieldHTML('Signature — formation line', 'docState.sigform', {});
      h += '</div></fieldset>';
    }
    h += '<fieldset class="box"><legend>Minute signature</legend><div class="grid">';
    h += fieldHTML('Signed by — name', 'docState.minsigname', { req: true });
    h += fieldHTML('Post (e.g. Clerk IV (Ag))', 'docState.minsigpost', {});
    h += '</div></fieldset>';
    h += composerHTML(cf);
    if (cf.module === 'routine') {
      h += '<fieldset class="box"><legend>Procurement method (item-and-quotation cases)</legend><div class="grid">';
      h += fieldHTML('Method', 'docState.method', { type: 'select', options: ['Request for Quotation', 'Open Tender', 'Selective Tender', 'Direct Contracting', 'Single / National Provider', 'Emergency Procurement'].map(function (x) { return [x, x]; }) });
      h += fieldHTML('Date RFQ / invitation issued', 'docState.rfqdate', { type: 'date' });
      h += fieldHTML('Closing date', 'docState.deadline', { type: 'date' });
      h += fieldHTML('Justification if Direct / Single Provider / Emergency', 'docState.methodjust', { type: 'textarea', wide: true });
      h += fieldHTML('Justification if the recommended supplier is not the lowest', 'docState.notlowest', { type: 'textarea', wide: true });
      h += fieldHTML('Extra minute paragraphs (blank line between paragraphs)', 'docState.minextra', { type: 'textarea', wide: true });
      h += '</div></fieldset>';
    }
    panel.innerHTML = h;
    bindInputs(panel);
  }

  /* ================= WORKING PAPERS ================= */
  function renderWork(panel) {
    var cf = APP.caseFile;
    if (cf.module === 'disposal') return renderDisposal(panel);
    if (cf.module === 'formal-evaluation') return renderFormal(panel);
    /* routine / daily procurement: the case decides its own working paper —
       written quotations on items, a verbal/telephone record, or the fuller
       supplier-comparison worksheet. The choice is offered, never forced. */
    if (cf.evaluation) return renderEvaluation(panel);
    var isVerbal = !!cf.verbal;
    var h = '<h2 class="p">Working Papers — Routine procurement</h2>';
    h += '<fieldset class="box"><legend>How was this procured?</legend>';
    h += '<label class="f" style="display:inline-block;margin-right:18px"><input type="radio" name="routinePapers" data-special="routine-papers" value="items"' + (!isVerbal ? ' checked' : '') + '> Written quotations (items and supplier rows)</label>';
    h += '<label class="f" style="display:inline-block;margin-right:18px"><input type="radio" name="routinePapers" data-special="routine-papers" value="verbal"' + (isVerbal ? ' checked' : '') + '> Micro-procurement by verbal quotation</label>';
    h += '<label class="f" style="display:inline-block"><input type="radio" name="routinePapers" data-special="routine-papers" value="worksheet"> Supplier comparison worksheet (many items × many suppliers)</label>';
    h += '</fieldset>';
    if (isVerbal) { panel.innerHTML = h + verbalEditorHTML(cf); bindInputs(panel); return; }
    h += itemsEditorHTML(cf);
    panel.innerHTML = h;
    bindInputs(panel);
  }

  /* ---- P1 verbal editor ---- */
  function verbalEditorHTML(cf) {
    var v = cf.verbal;
    var t = M.verbal.totalCents(v);
    var h = '<fieldset class="box"><legend>Verbal quotation (micro-procurement)</legend><div class="grid">';
    h += fieldHTML('Purpose, as a sentence fragment (e.g. "the provision of Boxed Meals for the Human Resource Training Workshop")', 'verbal.purpose', { wide: true, req: true });
    h += fieldHTML('Schedule table title (e.g. Boxed Meals)', 'verbal.tableTitle', {});
    h += fieldHTML('Basis of selection', 'verbal.selectionBasis', {});
    h += fieldHTML('Justification if the selected company is not the lowest', 'verbal.notLowestJustification', { type: 'textarea', wide: true });
    h += '</div>';
    h += '<p class="hint">Record every company telephoned, including those that gave no quotation. The minute counts them; the register evidences them.</p>';
    h += '<div class="scrollx"><table class="q"><thead><tr><th>Sel.</th><th>Company</th><th>Telephone</th><th>Date</th><th>Officer calling</th><th>Spoke to</th><th>Outcome</th><th>Amount quoted $</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < v.contacts.length; i++) {
      var c = v.contacts[i];
      var amtBad = c.outcome === 'quoted' && c.amount && !M.money.parseStrict(c.amount).ok;
      h += '<tr>' +
        '<td class="ctr"><input type="radio" name="vsel" data-vcontact-sel="' + i + '"' + (v.selected === i ? ' checked' : '') + '></td>' +
        '<td><input type="text" data-vcontact="' + i + ':name" value="' + esc(c.name || '') + '"></td>' +
        '<td><input type="text" data-vcontact="' + i + ':phone" value="' + esc(c.phone || '') + '"></td>' +
        '<td><input type="date" data-vcontact="' + i + ':date" value="' + esc(c.date || '') + '"></td>' +
        '<td><input type="text" data-vcontact="' + i + ':officer" value="' + esc(c.officer || '') + '"></td>' +
        '<td><input type="text" data-vcontact="' + i + ':spokeTo" value="' + esc(c.spokeTo || '') + '"></td>' +
        '<td><select data-vcontact="' + i + ':outcome">' + ['quoted', 'no-answer', 'declined'].map(function (o) { return '<option' + (c.outcome === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></td>' +
        '<td' + (amtBad ? ' class="bad"' : '') + '><input type="text" data-vcontact="' + i + ':amount" value="' + esc(c.amount || '') + '"' + (c.outcome !== 'quoted' ? ' disabled' : '') + '></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="vcontact-del" data-i="' + i + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div>';
    h += '<button class="btn sec small" data-action="vcontact-add">＋ Add company</button>';
    h += '</fieldset>';
    h += '<fieldset class="box"><legend>Per-date schedule (what is delivered, when, at what rate)</legend>';
    h += '<div class="scrollx"><table class="q"><thead><tr><th>Date</th><th>Description</th><th>Qty</th><th>Rate $</th><th>Kind</th><th>Line total</th><th></th></tr></thead><tbody>';
    for (var j = 0; j < v.schedule.length; j++) {
      var r = v.schedule[j];
      var rt = M.verbal.rowTotalCents(r);
      h += '<tr>' +
        '<td><input type="date" data-vsched="' + j + ':date" value="' + esc(r.date || '') + '"></td>' +
        '<td><input type="text" data-vsched="' + j + ':desc" value="' + esc(r.desc || '') + '"></td>' +
        '<td style="width:70px"><input type="number" min="1" step="1" data-vsched="' + j + ':qty" value="' + esc(String(r.qty || '')) + '"></td>' +
        '<td style="width:110px"><input type="text" data-vsched="' + j + ':rate" value="' + esc(r.rate || '') + '"></td>' +
        '<td style="width:110px"><select data-vsched="' + j + ':kind"><option' + (r.kind === 'line' ? ' selected' : '') + '>line</option><option' + (r.kind === 'delivery' ? ' selected' : '') + '>delivery</option></select></td>' +
        '<td class="tot" data-compute="vsched:' + j + '">' + (isNaN(rt) ? 'check' : fmtMoney(rt)) + '</td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="vsched-del" data-i="' + j + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div>';
    h += '<button class="btn sec small" data-action="vsched-add">＋ Add schedule line</button>';
    h += '<div class="notice" style="margin-top:10px"><b>Computed total:</b> <span data-compute="verbal-total">' + (isNaN(t) ? '— fix the flagged lines' : fmtMoney(t) + ' — ' + esc(M.words.amountInWords(t))) + '</span></div>';
    /* Non-lowest selection explanation — shown ONLY when it has arisen,
       kept inside a computed container so it appears and disappears live
       as figures are typed, without disturbing the fields. */
    h += '<div data-compute="verbal-notlowest">' + verbalNotLowestHTML(v) + '</div>';
    h += '</fieldset>';
    return h;
  }

  /* The non-lowest verbal selection warning — '' unless it has arisen. */
  function verbalNotLowestHTML(v) {
    var selC = M.verbal.selectedContact(v);
    if (!selC || selC.outcome !== 'quoted') return '';
    var selCents = M.verbal.contactQuoteCents(selC), lowestC = null;
    for (var lc = 0; lc < v.contacts.length; lc++) {
      var qc = M.verbal.contactQuoteCents(v.contacts[lc]);
      if (qc != null && !isNaN(qc) && (lowestC === null || qc < lowestC)) lowestC = qc;
    }
    if (selCents == null || isNaN(selCents) || lowestC === null || selCents <= lowestC) return '';
    return '<div class="notice red"><b>You have selected a company that did not give the lowest price</b> (' + fmtMoney(selCents) + ' against a lowest of ' + fmtMoney(lowestC) + ').<br>' +
      'That is allowed, but the rules require the reason in writing: put it in the <b>Justification if the selected company is not the lowest</b> box above (for example: the cheaper company cannot deliver before the event). ' +
      'The minute will state your selection, and the case cannot clear verification until the reason is recorded.</div>';
  }

  /* ---- P1/P2 items editor (the legacy card layout) ---- */
  function itemsEditorHTML(cf) {
    var items = cf.docState.items;
    var h = '<p class="hint">One card per item. Under each item, one row per supplier the request went to — including those that did not respond. Copy figures exactly as printed on the quotation; the system computes every total and refuses malformed figures.</p>';
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var amountMode = it.mode === 'amount';
      h += '<fieldset class="box"><legend>Item ' + (i + 1) + '</legend>';
      h += '<div class="grid">';
      h += '<label class="f wide">Description <span class="req">*</span><input type="text" data-item="' + i + ':desc" value="' + esc(it.desc || '') + '"></label>';
      h += '<label class="f">Entry mode<select data-item="' + i + ':mode"><option value="qty"' + (!amountMode ? ' selected' : '') + '>Quantity × unit cost</option><option value="amount"' + (amountMode ? ' selected' : '') + '>Amount only (subtotal + VAT)</option></select></label>';
      if (!amountMode) {
        h += '<label class="f">Quantity <span class="req">*</span><input type="number" min="0" step="any" data-item="' + i + ':qty" value="' + esc(it.qty || '') + '"></label>';
        h += '<label class="f">Unit name (pairs, each, metres…)<input type="text" data-item="' + i + ':unitname" value="' + esc(it.unitname || '') + '"></label>';
      }
      h += '</div>';
      h += '<div class="scrollx"><table class="q"><thead><tr><th>Supplier</th><th>Status</th>' +
        (amountMode ? '<th>Amount (VAT-excl.) $</th>' : '<th>Unit cost $</th>') +
        '<th>VAT $</th><th>Total</th><th>Meets spec?</th><th>Recommend</th><th>Address</th><th></th></tr></thead><tbody>';
      for (var j = 0; j < it.quotes.length; j++) {
        var q = it.quotes[j];
        q.mode = it.mode; q.qty = it.qty;
        var lt = M.compute.lineTotal(q);
        h += '<tr>' +
          '<td><input type="text" data-quote="' + i + ':' + j + ':supplier" value="' + esc(q.supplier || '') + '"></td>' +
          '<td><select data-quote="' + i + ':' + j + ':status">' + ['Quoted', 'Did Not Quote', 'No Response'].map(function (s) { return '<option' + (q.status === s ? ' selected' : '') + '>' + s + '</option>'; }).join('') + '</select></td>' +
          (amountMode
            ? '<td><input type="text" data-quote="' + i + ':' + j + ':sub" value="' + esc(q.sub || '') + '"' + (q.status !== 'Quoted' ? ' disabled' : '') + '></td>'
            : '<td><input type="text" data-quote="' + i + ':' + j + ':unit" value="' + esc(q.unit || '') + '"' + (q.status !== 'Quoted' ? ' disabled' : '') + '></td>') +
          '<td><input type="text" data-quote="' + i + ':' + j + ':vat" value="' + esc(q.vat || '') + '"' + (q.status !== 'Quoted' ? ' disabled' : '') + '></td>' +
          '<td class="tot" data-compute="quote:' + i + ':' + j + '">' + (q.status !== 'Quoted' ? '—' : (lt !== null && !isNaN(lt)) ? fmtMoney(lt) : 'check') + '</td>' +
          '<td class="ctr"><select data-quote="' + i + ':' + j + ':compliant"' + (q.status !== 'Quoted' ? ' disabled' : '') + '><option' + (q.compliant === 'Yes' ? ' selected' : '') + '>Yes</option><option' + (q.compliant === 'No' ? ' selected' : '') + '>No</option></select></td>' +
          '<td class="ctr"><input type="checkbox" data-quote="' + i + ':' + j + ':recommended"' + (q.recommended ? ' checked' : '') + (q.status !== 'Quoted' ? ' disabled' : '') + '></td>' +
          '<td><input type="text" data-quote="' + i + ':' + j + ':address" value="' + esc(q.address || '') + '"></td>' +
          '<td class="rowbtns"><button class="btn danger small" data-action="quote-del" data-i="' + i + '" data-j="' + j + '">✕</button></td></tr>';
      }
      h += '</tbody></table></div>';
      h += '<button class="btn sec small" data-action="quote-add" data-i="' + i + '">＋ Add supplier row</button> ';
      h += '<button class="btn danger small" data-action="item-del" data-i="' + i + '">Delete item</button>';
      h += '</fieldset>';
    }
    h += '<button class="btn" data-action="item-add">＋ Add item</button>';
    var gt = M.compute.grandTotal(items);
    h += '<div class="notice" style="margin-top:14px"><b>Grand total (recommended rows):</b> <span data-compute="items-grand">' + (isNaN(gt) ? '— fix the flagged rows' : gt === 0 ? '$0.00 (no recommended rows yet)' : fmtMoney(gt) + ' — ' + esc(M.words.amountInWords(gt))) + '</span></div>';
    return h;
  }

  /* The offline narrative composer (restored from the original Approvals
     Composer). Deterministic: it stitches only the words the user
     supplies into a first draft in the house register — no figure is
     ever composed, and nothing enters a field until the user reads the
     draft and clicks Insert. Engine: js/lib/narrative.js (parity-tested
     against the legacy tool). */
  function composerHTML(cf) {
    /* Each target is [destination path, label]. The compose wording style
       is derived from the last path segment (see da-compose). Only the
       fields the current module actually uses are offered. */
    var targets;
    if (cf.module === 'disposal') {
      targets = [
        ['disposal.strategy.background', 'Disposal strategy — Background'],
        ['disposal.strategy.objectives', 'Disposal strategy — Objectives'],
        ['disposal.strategy.recommendation', 'Disposal strategy — Recommendation']
      ];
    } else if (cf.module === 'formal-evaluation') {
      targets = [
        ['formal.introduction', 'Report — Introduction'],
        ['formal.background', 'Report — Background'],
        ['formal.recommendationNote', 'Report — Recommendation note']
      ];
    } else {
      targets = [['docState.need', 'Background / operational need']];
      if (cf.module === 'routine') {
        targets.push(['docState.methodjust', 'Method justification']);
        targets.push(['docState.minextra', 'Extra minute paragraphs']);
      }
    }
    /* Keep the stored target valid for this module: if it belongs to another
       module (e.g. a fresh case still holding the default), snap it to this
       module's first field so Compose/Insert never misfire. */
    var current = cf.docState.da_target;
    if (!targets.some(function (t) { return t[0] === current; })) {
      current = targets[0][0];
      cf.docState.da_target = current;
    }
    var h = '<fieldset class="box"><legend>Narrative composer (offline, optional)</legend>';
    h += '<p class="hint">Write the narrative fields yourself, or enter the facts of the case below and click Compose: the composer stitches them into a starting draft in the house register. It runs entirely on this computer — nothing leaves the machine, no internet is used, and no figure is invented (every dollar amount in the documents remains computed). The draft appears in a preview; nothing goes into the field until you read it and click Insert. Treat it as a first draft, not the finished paragraph.</p>';
    h += '<div class="grid">';
    h += '<label class="f">Write into<select data-path="docState.da_target">' + targets.map(function (t) {
      return '<option value="' + t[0] + '"' + (t[0] === current ? ' selected' : '') + '>' + esc(t[1]) + '</option>';
    }).join('') + '</select></label>';
    h += fieldHTML('Activity / purpose', 'docState.da_activity', { placeholder: 'e.g. Accounts Training for Finance Branch personnel' });
    h += fieldHTML('For whom / beneficiary', 'docState.da_who', { placeholder: 'e.g. thirty-five members of staff' });
    h += fieldHTML('Date(s) / period', 'docState.da_when', { placeholder: 'e.g. 14–18 July 2026' });
    h += fieldHTML('Consequence if not procured', 'docState.da_cons', { wide: true, placeholder: 'e.g. the training cannot be conducted and the annual training plan will slip' });
    h += fieldHTML('Rough notes (facts, fragments — one point per line; for extra minute paragraphs, a blank line between paragraphs)', 'docState.da_notes', { type: 'textarea', wide: true });
    h += '</div>';
    h += '<button class="btn" data-action="da-compose">Compose</button> <span id="daStatus" class="hint" style="display:inline-block;margin-left:8px"></span>';
    h += '<div id="daPreview" style="display:none;border:1px solid var(--line);border-radius:6px;padding:10px 14px;margin-top:10px;background:#fff;font-family:Georgia,serif"></div>';
    h += '<div id="daActions" style="display:none;margin-top:8px"><button class="btn" data-action="da-insert">Insert into field</button> <button class="btn sec" data-action="da-discard">Discard</button></div>';
    h += '</fieldset>';
    return h;
  }

  /* Situation explanations for an evaluation — plain language, and only
     for situations that actually exist right now. Returns '' when none. */
  function evalSituationsHTML(ev) {
    var h = '';
    var tieItems = [], shortfallItems = [], specItems = [], overrideItems = [];
    for (var iq = 0; iq < ev.items.length; iq++) {
      var sq = M.evaluation.effectiveSelection(ev, iq);
      var label = (iq + 1) + '. ' + (ev.items[iq].desc || 'item');
      if (sq.auto.tied.length > 1) tieItems.push(label + ' (' + sq.auto.tied.map(function (x) { return ev.suppliers[x].name; }).join(' and ') + ')');
      for (var ex = 0; ex < sq.auto.excluded.length; ex++) {
        var exn = ev.suppliers[sq.auto.excluded[ex].supIdx].name;
        if (sq.auto.excluded[ex].reason === 'quantity shortfall') shortfallItems.push(label + ' (' + exn + ')');
        if (sq.auto.excluded[ex].reason === 'does not meet specification') specItems.push(label + ' (' + exn + ')');
      }
      if (sq.override) overrideItems.push(label);
    }
    if (tieItems.length) {
      h += '<div class="notice"><b>There is a price tie on: ' + esc(tieItems.join('; ')) + '.</b><br>' +
        'A tie means two or more suppliers quoted exactly the same lowest price for the same item. The system cannot pick between equal prices — that decision belongs to the committee. ' +
        'Choose the supplier in the <b>Committee selection</b> box for that item and write a short note in <b>Tie note</b> saying why (for example: one delivery instead of two, or that supplier already holds the other items). ' +
        'Your pick becomes the recommended winner for that item and its price goes into that supplier’s award total. Because the prices are equal, the grand total does not change — only who is recommended. ' +
        'The case cannot clear verification until every tie has a recorded selection.</div>';
    }
    if (shortfallItems.length) {
      h += '<div class="notice"><b>A supplier offered less than the quantity required on: ' + esc(shortfallItems.join('; ')) + '.</b><br>' +
        'A quantity shortfall means the supplier can only give you part of what you asked for (for example 48 packs when you need 50). ' +
        'The system does not recommend a shortfall quote automatically — even at a cheaper price — because it does not meet the full requirement, so the next lowest full quotation is recommended instead. ' +
        'If the committee still wants the shortfall supplier, select it in the <b>Committee selection</b> box and write the reason in <b>Justification</b>; the documents will then show that choice as an override with your reason printed beside it.</div>';
    }
    if (specItems.length) {
      h += '<div class="notice"><b>A quotation does not meet the specification on: ' + esc(specItems.join('; ')) + '.</b><br>' +
        'This supplier offered something different from what was asked for (for example boxes of 6 instead of boxes of 12), so its price is not compared automatically — a cheaper wrong item is not a saving. The next lowest quotation that does meet the specification is recommended instead. ' +
        'Selecting the non-compliant quotation anyway is not permitted by the checks: correct the compliance entry if it was marked in error, or let the compliant recommendation stand.</div>';
    }
    if (overrideItems.length) {
      h += '<div class="notice red"><b>The committee has overridden the computed lowest price on: ' + esc(overrideItems.join('; ')) + '.</b><br>' +
        'An override means recommending a supplier that did not have the lowest compliant price. That is allowed, but the reason must be written in the <b>Justification</b> box — an override with no written reason can never clear verification. ' +
        'The override and its reason are shown on the worksheet, in the evaluation report and on the verification certificate, and the totals simply follow your selection.</div>';
    }
    return h;
  }

  /* The sheet-numbering question — '' unless a starting folio above 1
     makes it relevant to the file being prepared. */
  function sheetNumberBoxHTML(cf) {
    if (!(Number.isInteger(cf.folioStart) && cf.folioStart > 1)) return '';
    var typed = (cf.docState && cf.docState.minsheet) || '1a';
    var mode = cf.sheetNumbering;
    return '<div class="notice"><b>Your starting folio number is ' + cf.folioStart + '. Should the sheet numbers follow it for this file?</b><br><br>' +
      'In plain terms: a <b>folio number</b> is stamped on each paper so it can be tracked in an official file — your register here starts at ' + cf.folioStart + '. ' +
      'A <b>sheet number</b> (like "' + esc(typed) + '") counts the minute sheets themselves. Some offices want the sheet numbers to carry the same starting number as the folios, so the whole file reads in one sequence; other offices treat sheet numbers separately and always start them at 1. ' +
      'This is your office’s choice for this file, and it changes only the Sheet No printed at the top of the minute.<br><br>' +
      '<label style="display:block;margin:4px 0"><input type="radio" name="sheetnum" data-sheetnum value="manual"' + (mode === 'manual' ? ' checked' : '') + '> <b>Keep sheet numbers separate</b> — the minute prints Sheet No ' + esc(typed) + ', exactly as typed.</label>' +
      '<label style="display:block;margin:4px 0"><input type="radio" name="sheetnum" data-sheetnum value="follow-folio"' + (mode === 'follow-folio' ? ' checked' : '') + '> <b>Follow the starting folio</b> — the minute prints Sheet No ' + esc(M.folio.sheetLabel(typed, cf.folioStart, 'follow-folio')) + '.</label>' +
      'Whichever you choose is recorded on the case and shown in the verification checks (G6), so the checker can see the decision. Until you choose, verification carries a caution.</div>';
  }

  /* The provision-base question — '' unless the two figures differ. */
  function voteBaseBoxHTML(cf) {
    var comp = M.votestatus.compute(cf.voteStatus);
    if (!cf.voteStatus || !comp.ok || comp.cents.originalProvision === comp.cents.revisedAllocation) return '';
    var baseSel = (cf.voteStatus.provisionBase === 'original') ? 'original' : 'revised';
    return '<div class="notice"><b>Your Original Provision and Revised Allocation are different figures, so you must choose which one the Balance of Provision is measured against.</b><br><br>' +
      'In plain terms: the <b>Original Provision</b> is the money this vote started the year with. During the year, money can be moved into or out of a vote with approvals (called transfers and virements). The figure after those movements is the <b>Revised Allocation</b>. ' +
      'The Balance of Provision is the money left on the vote, worked out as your chosen figure minus what has been spent — so the choice changes the balance, and it can change whether the minute says the money covers this purchase.<br><br>' +
      '<label style="display:block;margin:4px 0"><input type="radio" name="provbase" data-vstatus-base value="revised"' + (baseSel === 'revised' ? ' checked' : '') + '> <b>Revised Allocation</b> (the standard choice) — the Ministry of Finance vote book controls spending against the allocation as varied by approved transfers and virements (Comptroller of Accounts Accounting Manual §2.3.3; Financial Instructions 1965, para 103(2)).</label>' +
      '<label style="display:block;margin:4px 0"><input type="radio" name="provbase" data-vstatus-base value="original"' + (baseSel === 'original' ? ' checked' : '') + '> <b>Original Provision</b> — choose this only if a written instruction on your file directs that the balance be measured against the original figure.</label>' +
      'Whichever you choose is recorded on the case and printed in the verification certificate, so the checker can see exactly how the balance was worked out.</div>';
  }

  /* The computed vote balances, cautions and shortfall notice. */
  function voteBalancesHTML(cf) {
    var comp = M.votestatus.compute(cf.voteStatus);
    var h = '';
    if (cf.voteStatus && comp.ok) {
      h += '<div class="notice green"><b>Computed:</b> Balance of Releases ' + fmtMoney(comp.cents.balanceOfReleases) +
        ' · Balance of Provision ' + fmtMoney(comp.cents.balanceOfProvision) +
        ' · Uncommitted Balance ' + fmtMoney(comp.cents.uncommittedBalance) +
        (comp.notes.length ? '<br>' + esc(comp.notes.join(' ')) : '') +
        (comp.errors.length ? '<br><b>Caution:</b> ' + esc(comp.errors.join(' ')) : '') + '</div>';
      var total = M.verifycase.caseTotalCents(cf);
      if (!isNaN(total) && total > 0) {
        var short = M.votestatus.shortfallCents(cf.voteStatus, total);
        h += short > 0
          ? '<div class="notice red"><b>Shortfall:</b> the case total ' + fmtMoney(total) + ' exceeds the uncommitted balance by ' + fmtMoney(short) + '. The transfer line will print in the minute.</div>'
          : '<div class="notice green">The uncommitted balance covers the case total ' + fmtMoney(total) + '.</div>';
      }
    } else if (cf.voteStatus) {
      h += '<div class="notice red">' + esc(comp.errors.join(' ')) + '</div>';
    }
    return h;
  }

  /* ---- P3 evaluation editor ---- */
  function renderEvaluation(panel) {
    var cf = APP.caseFile;
    if (!cf.evaluation) cf.evaluation = M.evaluation.newEvaluation();
    var ev = cf.evaluation;
    var h = '<h2 class="p">Supplier Comparison Worksheet — Routine procurement</h2>';
    h += '<p class="hint">A working paper inside the travelling file — not the formal tender evaluation report, which is a separate activity on the Start screen. Items down the side, suppliers across the top. Tick V on a cell where VAT applies. Where a supplier prices by the case, record the pack size — the conversion is computed, never left as a note. The lowest compliant quotation per item is computed; overriding it requires a written justification and shows on every document.</p>';

    h += '<fieldset class="box"><legend>Suppliers</legend><div class="scrollx"><table class="q"><thead><tr><th>Name</th><th>Status</th><th>Address</th><th></th></tr></thead><tbody>';
    for (var s = 0; s < ev.suppliers.length; s++) {
      var sup = ev.suppliers[s];
      h += '<tr><td><input type="text" data-esup="' + s + ':name" value="' + esc(sup.name || '') + '"></td>' +
        '<td><select data-esup="' + s + ':status">' + ['quoted', 'did-not-quote', 'no-response'].map(function (o) { return '<option' + (sup.status === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select></td>' +
        '<td><input type="text" data-esup="' + s + ':address" value="' + esc(sup.address || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="esup-del" data-i="' + s + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="esup-add">＋ Add supplier</button></fieldset>';

    h += '<fieldset class="box"><legend>Items</legend><div class="scrollx"><table class="q"><thead><tr><th>Description</th><th>Variant / size</th><th>Qty</th><th>Unit name</th><th>Qty display (optional, e.g. "1 Case (12)")</th><th></th></tr></thead><tbody>';
    for (var i = 0; i < ev.items.length; i++) {
      var it = ev.items[i];
      h += '<tr><td><input type="text" data-eitem="' + i + ':desc" value="' + esc(it.desc || '') + '"></td>' +
        '<td><input type="text" data-eitem="' + i + ':variant" value="' + esc(it.variant || '') + '"></td>' +
        '<td style="width:80px"><input type="number" min="1" step="1" data-eitem="' + i + ':qty" value="' + esc(String(it.qty || '')) + '"></td>' +
        '<td><input type="text" data-eitem="' + i + ':unitName" value="' + esc(it.unitName || '') + '"></td>' +
        '<td><input type="text" data-eitem="' + i + ':qtyText" value="' + esc(it.qtyText || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="eitem-del" data-i="' + i + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="eitem-add">＋ Add item</button></fieldset>';

    /* the cell grid */
    var quoting = [];
    for (var s2 = 0; s2 < ev.suppliers.length; s2++) if (ev.suppliers[s2].status === 'quoted') quoting.push(s2);
    if (ev.items.length && quoting.length) {
      h += '<fieldset class="box"><legend>Prices (one cell per item per quoting supplier; leave a cell empty if that supplier did not quote the item)</legend><div class="scrollx"><table class="q"><thead><tr><th>Item</th>';
      quoting.forEach(function (s3) { h += '<th colspan="5">' + esc(ev.suppliers[s3].name || ('Supplier ' + (s3 + 1))) + '</th>'; });
      h += '</tr><tr><th></th>';
      quoting.forEach(function () { h += '<th>Unit $</th><th>V</th><th>Qty quoted</th><th>Pack size</th><th>Spec</th>'; });
      h += '</tr></thead><tbody>';
      for (var i2 = 0; i2 < ev.items.length; i2++) {
        h += '<tr><td style="min-width:160px">' + (i2 + 1) + '. ' + esc(ev.items[i2].desc || '') + '</td>';
        for (var qi = 0; qi < quoting.length; qi++) {
          var s4 = quoting[qi];
          var cell = M.evaluation.cellAt(ev, i2, s4);
          var cc = M.evaluation.computeCell(ev, i2, s4);
          var bad = cell && cc.errors.length;
          h += '<td style="width:110px"' + (bad ? ' class="bad" title="' + esc(cc.errors.join(' ')) + '"' : '') + '><input type="text" data-ecell="' + i2 + ':' + s4 + ':unit" value="' + esc(cell ? cell.unit : '') + '"></td>' +
            '<td class="ctr"><input type="checkbox" data-ecell="' + i2 + ':' + s4 + ':vatable"' + (cell && cell.vatable ? ' checked' : '') + '></td>' +
            '<td style="width:74px"><input type="number" min="1" step="1" data-ecell="' + i2 + ':' + s4 + ':quotedQty" value="' + esc(cell && cell.quotedQty != null ? String(cell.quotedQty) : '') + '"></td>' +
            '<td style="width:74px"><input type="number" min="1" step="1" data-ecell="' + i2 + ':' + s4 + ':packSize" value="' + esc(cell && cell.packSize != null ? String(cell.packSize) : '') + '"></td>' +
            '<td class="ctr"><input type="checkbox" data-ecell="' + i2 + ':' + s4 + ':compliant"' + (!cell || cell.compliant !== false ? ' checked' : '') + ' title="Meets specification"></td>';
        }
        h += '</tr>';
      }
      h += '</tbody></table></div></fieldset>';

      /* Situation explanations — shown ONLY when the situation actually
         exists in this evaluation, in plain language. Held in a computed
         container so they appear and disappear live as figures change,
         without disturbing the fields being typed in. */
      h += '<div data-compute="eval-situations">' + evalSituationsHTML(ev) + '</div>';
      /* selections */
      h += '<fieldset class="box"><legend>Recommendation per item (computed lowest unless the committee records otherwise)</legend><div class="scrollx"><table class="q"><thead><tr><th>Item</th><th>Computed</th><th>Committee selection</th><th>Justification (mandatory for an override)</th><th>Tie note</th></tr></thead><tbody>';
      for (var i3 = 0; i3 < ev.items.length; i3++) {
        var sel = M.evaluation.effectiveSelection(ev, i3);
        var auto = sel.auto;
        var autoTxt = auto.lowest != null ? esc(ev.suppliers[auto.lowest].name) + ' (lowest)' :
          auto.tied.length > 1 ? 'TIE: ' + esc(auto.tied.map(function (x) { return ev.suppliers[x].name; }).join(' / ')) : 'none (' + esc(auto.reason) + ')';
        var manual = null;
        for (var sl = 0; sl < ev.selections.length; sl++) if (ev.selections[sl].item === i3) manual = ev.selections[sl];
        h += '<tr><td>' + (i3 + 1) + '. ' + esc(ev.items[i3].desc || '') + '</td><td>' + autoTxt + '</td>' +
          '<td><select data-esel="' + i3 + ':supplier"><option value="">(automatic)</option>' + quoting.map(function (s5) {
            return '<option value="' + s5 + '"' + (manual && manual.supplier === s5 ? ' selected' : '') + '>' + esc(ev.suppliers[s5].name) + '</option>';
          }).join('') + '</select>' + (sel.override ? ' <b style="color:var(--red)">OVERRIDE</b>' : sel.tie ? ' <b>tie pick</b>' : '') + '</td>' +
          '<td><input type="text" data-esel="' + i3 + ':justification" value="' + esc(manual ? manual.justification || '' : '') + '"></td>' +
          '<td><input type="text" data-esel="' + i3 + ':tieNote" value="' + esc(manual ? manual.tieNote || '' : '') + '"></td></tr>';
      }
      h += '</tbody></table></div></fieldset>';

      var bk = M.evaluation.breakdown(ev);
      h += '<div class="notice"><b>Awards (computed):</b> <span data-compute="eval-awards">' + bk.schedules.map(function (sch) {
        return esc(sch.name) + ' — ' + fmtMoney(sch.totalCents);
      }).join(' · ') + (bk.schedules.length ? ' · <b>Grand total ' + (bk.bad ? 'CHECK' : fmtMoney(bk.grandTotalCents)) + '</b>' : 'none yet') + '</span></div>';
      h += '<button class="btn" data-action="adopt-internal">Adopt into the Ministry internal minute</button> ';
      h += '<button class="btn sec" data-action="adopt-formation">Adopt into a formation approval (letter + minute)</button> ';
    }
    h += '<button class="btn danger small" style="margin-top:10px" data-action="worksheet-discard">Discard the comparison worksheet (removes every recorded price)</button>';
    panel.innerHTML = h;
    bindInputs(panel);
  }

  /* ---- disposal editor: the OPR Forms A–E on one working screen ---- */
  function renderDisposal(panel) {
    var cf = APP.caseFile;
    if (!cf.disposal) cf.disposal = M.disposal.newDisposal();
    M.disposal.upgrade(cf.disposal);
    var d = cf.disposal;
    var h = '<h2 class="p">Disposal of Public Property</h2>';
    h += '<div class="notice green">Built to the OPR Retention &amp; Disposal Handbook and Sample Case Study — Forms A to E. Every figure below (unit NBV, 20%, appraised value, expected returns, the total) is computed from the quantities and net book values you type; nothing is invented. Fill only what applies — leave the rest blank. Forms F, G and H and real-property disposals are not yet built.</div>';

    /* Form A header — the request */
    h += '<fieldset class="box"><legend>Request details (Form A)</legend><div class="grid">';
    h += fieldHTML('Public body / entity', 'disposal.entity', { placeholder: 'e.g. Ministry of Defence' });
    h += fieldHTML('Business unit / department', 'disposal.department', {});
    h += fieldHTML('Location of the asset(s)', 'disposal.assetLocation', {});
    h += fieldHTML('Request date', 'disposal.requestDate', { type: 'date' });
    h += fieldHTML('Disposal request reference', 'disposal.requestRef', { placeholder: 'e.g. 0001' });
    h += fieldHTML('Submitted by (Inventory / Requesting Officer)', 'disposal.submittedBy', {});
    h += fieldHTML('Verified by (Assigned Officer)', 'disposal.verifiedBy', {});
    h += fieldHTML('Other information', 'disposal.otherInformation', { wide: true });
    h += '</div></fieldset>';

    /* Officers */
    h += '<fieldset class="box"><legend>Officers</legend><div class="grid">';
    h += fieldHTML('Named Procurement Officer', 'disposal.npoName', {});
    h += fieldHTML('NPO designation', 'disposal.npoDesignation', {});
    h += fieldHTML('Finance / Accounting Officer (verifies Form A)', 'disposal.financeOfficer', {});
    h += fieldHTML('Accounting Officer', 'disposal.aoName', {});
    h += fieldHTML('Accounting Officer post', 'disposal.aoPost', {});
    h += '</div></fieldset>';

    /* Disposal Committee — not less than three officers */
    h += '<fieldset class="box"><legend>Disposal Committee — not less than three officers (Act ss. 55–56)</legend><div class="scrollx"><table class="q"><thead><tr><th>Name</th><th>Post</th><th></th></tr></thead><tbody>';
    for (var m = 0; m < d.committee.length; m++) {
      h += '<tr><td><input type="text" data-dcomm="' + m + ':name" value="' + esc(d.committee[m].name || '') + '"></td>' +
        '<td><input type="text" data-dcomm="' + m + ':post" value="' + esc(d.committee[m].post || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="dcomm-del" data-i="' + m + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="dcomm-add">＋ Add member</button></fieldset>';

    /* PDAC — Reg 21 */
    h += '<fieldset class="box"><legend>Procurement &amp; Disposal Advisory Committee (PDAC) — reviews the disposal file (Reg 21)</legend><div class="scrollx"><table class="q"><thead><tr><th>Name</th><th>Role</th><th></th></tr></thead><tbody>';
    for (var p = 0; p < d.pdac.length; p++) {
      h += '<tr><td><input type="text" data-dpdac="' + p + ':name" value="' + esc(d.pdac[p].name || '') + '"></td>' +
        '<td><input type="text" data-dpdac="' + p + ':post" value="' + esc(d.pdac[p].post || '') + '" placeholder="e.g. Head of Finance"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="dpdac-del" data-i="' + p + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="dpdac-add">＋ Add PDAC member</button></fieldset>';

    /* Property — one card per item, Forms A/B/C fields grouped */
    h += '<fieldset class="box"><legend>Property for disposal — inventory, inspection and appraisal (Forms A, B, C)</legend>';
    h += '<p class="hint">The appraisal columns are computed: enter the <b>Total NBV</b> (net book value across the whole quantity) and the system works out the unit NBV, 20% of NBV, and the appraised value less 20% — exactly as the OPR worked example does. The <b>sale price</b> is the committee’s decision; expected returns = quantity × sale price. Mark an item “not saleable (N/A)” for items to be recycled, destroyed or donated.</p>';
    for (var i = 0; i < d.items.length; i++) {
      h += disposalItemHTML(d.items[i], i);
    }
    h += '<button class="btn" data-action="ditem-add">＋ Add item</button>';
    var tr = M.disposal.totalExpectedReturnsCents(d);
    h += '<div class="notice" style="margin-top:12px"><b>Total expected returns (computed):</b> <span data-compute="disposal-returns">' + (isNaN(tr) ? '— fix the flagged items' : fmtMoney(tr) + ' — ' + esc(M.words.amountInWords(tr))) + '</span></div>';
    h += '</fieldset>';

    /* Form C narrative */
    h += '<fieldset class="box"><legend>Committee appraisal narrative (Form C)</legend><div class="grid">';
    h += fieldHTML('Appraisal report as of (date)', 'disposal.appraisalAsOf', { type: 'date' });
    h += fieldHTML('Inventory & Inspection Report dated', 'disposal.inventoryReportDated', { type: 'date' });
    h += fieldHTML('Findings / observations', 'disposal.appraisalFindings', { type: 'textarea', wide: true });
    h += fieldHTML('Valuation procedures / considerations', 'disposal.appraisalProcedures', { type: 'textarea', wide: true });
    h += '</div></fieldset>';

    /* Form D strategy */
    h += '<fieldset class="box"><legend>Disposal strategy (Form D)</legend>';
    h += '<p class="hint">Optional narrative — write only what applies. The composer on Case Details can help draft the background.</p><div class="grid">';
    h += fieldHTML('Background', 'disposal.strategy.background', { type: 'textarea', wide: true });
    h += fieldHTML('Scope', 'disposal.strategy.scope', { type: 'textarea', wide: true });
    h += fieldHTML('How this supports business objectives', 'disposal.strategy.businessSupport', { type: 'textarea', wide: true });
    h += fieldHTML('Disposal objectives', 'disposal.strategy.objectives', { type: 'textarea', wide: true });
    h += fieldHTML('Findings from research and analysis', 'disposal.strategy.findings', { type: 'textarea', wide: true });
    h += fieldHTML('Strategy options considered', 'disposal.strategy.optionsConsidered', { type: 'textarea', wide: true });
    h += fieldHTML('Specification / requirement issues', 'disposal.strategy.requirementIssues', { type: 'textarea', wide: true });
    h += fieldHTML('Needs assessment / feasibility', 'disposal.strategy.needsAssessment', { type: 'textarea', wide: true });
    h += fieldHTML('Current demand / contractual issues', 'disposal.strategy.contractualIssues', { type: 'textarea', wide: true });
    h += fieldHTML('Applicable issues for the disposal', 'disposal.strategy.applicableIssues', { type: 'textarea', wide: true });
    h += fieldHTML('Market research & analysis', 'disposal.strategy.marketResearch', { type: 'textarea', wide: true });
    h += fieldHTML('Strategy options analysis (pros / cons)', 'disposal.strategy.optionsAnalysis', { type: 'textarea', wide: true });
    h += fieldHTML('Preferred strategy recommendation', 'disposal.strategy.recommendation', { type: 'textarea', wide: true });
    h += fieldHTML('Stakeholder impact analysis', 'disposal.strategy.stakeholderImpact', { type: 'textarea', wide: true });
    h += fieldHTML('Advertising arrangement (needed for public sale/auction above TT$100,000)', 'disposal.strategy.advertisingNote', { type: 'textarea', wide: true });
    h += '</div>';
    /* spend analysis rows */
    h += '<p style="margin-top:8px"><b>Estimated disposal expenditure (Table 3)</b></p><div class="scrollx"><table class="q"><thead><tr><th>Details</th><th style="width:140px">Amount $</th><th></th></tr></thead><tbody>';
    for (var e = 0; e < d.strategy.expenditure.length; e++) {
      var sp = d.strategy.expenditure[e];
      var spBad = sp.amount && !M.money.parseStrict(sp.amount).ok;
      h += '<tr><td><input type="text" data-dspend="' + e + ':detail" value="' + esc(sp.detail || '') + '"></td>' +
        '<td' + (spBad ? ' class="bad"' : '') + '><input type="text" data-dspend="' + e + ':amount" value="' + esc(sp.amount || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="dspend-del" data-i="' + e + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="dspend-add">＋ Add expenditure line</button>';
    var spT = M.disposal.spendTotalCents(d);
    if (d.strategy.expenditure.length) h += '<div class="notice"><b>Expenditure total (computed):</b> <span data-compute="disposal-spend">' + (isNaN(spT) ? '— fix the flagged amounts' : fmtMoney(spT)) + '</span></div>';
    /* stakeholders */
    h += '<p style="margin-top:8px"><b>Stakeholder analysis (Table 4)</b></p><div class="scrollx"><table class="q"><thead><tr><th style="width:30%">Stakeholder</th><th>Level of interest</th><th></th></tr></thead><tbody>';
    for (var k = 0; k < d.strategy.stakeholders.length; k++) {
      var stk = d.strategy.stakeholders[k];
      h += '<tr><td><input type="text" data-dstake="' + k + ':name" value="' + esc(stk.name || '') + '"></td>' +
        '<td><input type="text" data-dstake="' + k + ':interest" value="' + esc(stk.interest || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="dstake-del" data-i="' + k + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="dstake-add">＋ Add stakeholder</button>';
    h += '</fieldset>';

    /* Form E + statutory dates */
    h += '<fieldset class="box"><legend>Approvals and statutory steps (Form E and the Act)</legend>';
    h += '<p class="hint">Fill these in as the disposal moves through approval. The checks read the dates and tell you, in plain words, if a statutory time limit is missed — the fourteen days the Accounting Officer has to decide, and the six weeks to notify the OPR after completion.</p><div class="grid">';
    h += fieldHTML('Strategy submitted for approval — date', 'disposal.approvals.strategyRequestDate', { type: 'date' });
    h += fieldHTML('Reviewed by NPO — date', 'disposal.approvals.npoReviewDate', { type: 'date' });
    h += fieldHTML('Reviewed by PDAC — date', 'disposal.approvals.pdacReviewDate', { type: 'date' });
    h += fieldHTML('Recommendation received by Accounting Officer — date', 'disposal.approvals.recommendationReceivedDate', { type: 'date' });
    h += fieldHTML('Accounting Officer decision', 'disposal.approvals.aoDecision', { type: 'select', options: [['', '— not yet —'], ['approved', 'Approved'], ['rejected', 'Not approved (rejected)']] });
    h += fieldHTML('Decision date', 'disposal.approvals.aoDecisionDate', { type: 'date' });
    h += fieldHTML('Reasons for rejection (required if rejected)', 'disposal.approvals.rejectionReasons', { type: 'textarea', wide: true });
    h += fieldHTML('Sale to employees: PDAC prior-approval notice sent (s. 57, Reg 7)', 'disposal.approvals.employeeSaleApproval', { type: 'checkbox', wide: true });
    h += fieldHTML('Employee-sale approval reference / details', 'disposal.approvals.employeeSaleDetails', { type: 'textarea', wide: true });
    h += fieldHTML('Disposal completed — date', 'disposal.approvals.completionDate', { type: 'date' });
    h += fieldHTML('OPR notified (through the Procurement Depository) — date', 'disposal.approvals.oprNotifiedDate', { type: 'date' });
    h += fieldHTML('Net proceeds brought to account', 'disposal.approvals.proceedsAccounted', { type: 'checkbox', wide: true });
    h += '</div></fieldset>';

    /* Form F — Summary Report of Approved Disposal Action */
    h += '<fieldset class="box"><legend>Summary of the completed disposal (Form F)</legend>';
    h += '<p class="hint">Fill this after the disposal has been carried out. If it was not executed as approved, say why and what was done.</p><div class="grid">';
    h += fieldHTML('Disposal execution date', 'disposal.summary.executionDate', { type: 'date' });
    h += fieldHTML('Executed as approved?', 'disposal.summary.executedAsApproved', { type: 'select', options: [['', '— not yet —'], ['yes', 'Yes'], ['no', 'No']] });
    h += fieldHTML('If no, reasons and action taken', 'disposal.summary.deviationReasons', { type: 'textarea', wide: true });
    h += fieldHTML('Summary of disposal proceedings', 'disposal.summary.proceedingsSummary', { type: 'textarea', wide: true });
    h += fieldHTML('Challenges encountered during disposal', 'disposal.summary.challenges', { type: 'textarea', wide: true });
    h += fieldHTML('Total proceeds / revenue earned $ (from Cashier report)', 'disposal.summary.totalProceeds', {});
    h += '</div></fieldset>';

    /* Form G — Transfer / Donation of Excess Personal Property */
    h += '<fieldset class="box"><legend>Transfer / donation of excess property (Form G) — only if applicable</legend><div class="grid">';
    h += fieldHTML('To — requesting organisation (full name & address)', 'disposal.transfer.toOrg', { type: 'textarea', wide: true });
    h += fieldHTML('From — holding entity (full name & address)', 'disposal.transfer.fromEntity', { type: 'textarea', wide: true });
    h += fieldHTML('Ship to (consignee & destination)', 'disposal.transfer.shipTo', {});
    h += fieldHTML('Location of property', 'disposal.transfer.propertyLocation', {});
    h += fieldHTML('Items received by', 'disposal.transfer.receivedBy', {});
    h += fieldHTML('Comments', 'disposal.transfer.comments', { wide: true });
    h += '</div>';
    h += '<p style="margin-top:6px"><b>Property to be transferred / donated</b></p><div class="scrollx"><table class="q"><thead><tr><th>Stock code</th><th>Item no.</th><th>Description</th><th>Unit</th><th style="width:90px">Quantity</th><th></th></tr></thead><tbody>';
    var tr = d.transfer || { items: [] };
    for (var ti = 0; ti < tr.items.length; ti++) {
      var trit = tr.items[ti];
      h += '<tr><td><input type="text" data-dtrans="' + ti + ':stockCode" value="' + esc(trit.stockCode || '') + '"></td>' +
        '<td><input type="text" data-dtrans="' + ti + ':itemNo" value="' + esc(trit.itemNo || '') + '"></td>' +
        '<td><input type="text" data-dtrans="' + ti + ':description" value="' + esc(trit.description || '') + '"></td>' +
        '<td><input type="text" data-dtrans="' + ti + ':unit" value="' + esc(trit.unit || '') + '"></td>' +
        '<td><input type="number" min="1" step="1" data-dtrans="' + ti + ':quantity" value="' + esc(String(trit.quantity == null ? '' : trit.quantity)) + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="dtrans-del" data-i="' + ti + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="dtrans-add">＋ Add transfer item</button></fieldset>';

    /* Form H — Notice of Rejection */
    h += '<fieldset class="box"><legend>Notice of rejection (Form H) — only if the Accounting Officer rejects the strategy</legend>';
    h += '<p class="hint">Used when the Accounting Officer does not approve the committee’s strategy. The property is disposed of as the Accounting Officer directs, after consulting the responsible Minister; the notice goes to the OPR.</p><div class="grid">';
    h += fieldHTML('Summary of consultation with Line Minister', 'disposal.rejection.lineMinisterConsultation', { type: 'textarea', wide: true });
    h += fieldHTML('Reasons for rejection of the committee’s proposal', 'disposal.rejection.reasons', { type: 'textarea', wide: true });
    h += fieldHTML('New decision on how the property should be disposed, and reasoning', 'disposal.rejection.newDecision', { type: 'textarea', wide: true });
    h += fieldHTML('Prepared by (Accounting Officer)', 'disposal.rejection.preparedByAO', {});
    h += fieldHTML('Confirmation of Line Minister (name)', 'disposal.rejection.lineMinisterName', {});
    h += '</div></fieldset>';

    panel.innerHTML = h;
    bindInputs(panel);
  }

  /* One property item as a card, with the Form C appraisal computed live. */
  function disposalItemHTML(it, i) {
    var a = M.disposal.appraisal(it);
    var nbvBad = it.totalNBV && !M.money.parseStrict(it.totalNBV).ok;
    var spBad = it.saleable === 'yes' && it.salePrice && !M.money.parseStrict(it.salePrice).ok;
    var h = '<fieldset class="box" style="border-style:solid">';
    h += '<legend>Item ' + (i + 1) + (it.desc ? ' — ' + esc(it.desc) : '') + ' <button class="btn danger small" data-action="ditem-del" data-i="' + i + '" style="margin-left:8px">✕ Remove</button></legend>';
    h += '<div class="grid">';
    h += '<label class="f wide">Description <input type="text" data-ditem="' + i + ':desc" value="' + esc(it.desc || '') + '"></label>';
    h += '<label class="f">Make / model <input type="text" data-ditem="' + i + ':makeModel" value="' + esc(it.makeModel || '') + '"></label>';
    h += '<label class="f">Reason for disposal <input type="text" data-ditem="' + i + ':reason" value="' + esc(it.reason || '') + '"></label>';
    h += '<label class="f">Quantity <input type="number" min="1" step="1" data-ditem="' + i + ':qty" value="' + esc(String(it.qty == null ? '' : it.qty)) + '"></label>';
    h += '<label class="f">Condition <input type="text" data-ditem="' + i + ':condition" value="' + esc(it.condition || '') + '"></label>';
    h += '<label class="f">Location <input type="text" data-ditem="' + i + ':location" value="' + esc(it.location || '') + '"></label>';
    h += '<label class="f">Original unit purchase price $ <input type="text" data-ditem="' + i + ':originalUnitPrice" value="' + esc(it.originalUnitPrice || '') + '"></label>';
    h += '<label class="f">Purchase date <input type="date" data-ditem="' + i + ':purchaseDate" value="' + esc(it.purchaseDate || '') + '"></label>';
    h += '<label class="f">Property no. <input type="text" data-ditem="' + i + ':propertyNo" value="' + esc(it.propertyNo || '') + '"></label>';
    h += '<label class="f">Date acquired <input type="date" data-ditem="' + i + ':dateAcquired" value="' + esc(it.dateAcquired || '') + '"></label>';
    h += '<label class="f">Service years <input type="text" data-ditem="' + i + ':serviceYears" value="' + esc(it.serviceYears || '') + '"></label>';
    h += '<label class="f' + (nbvBad ? ' bad' : '') + '">Total NBV (whole quantity) $ <input type="text" data-ditem="' + i + ':totalNBV" value="' + esc(it.totalNBV || '') + '" placeholder="leave blank if no NBV"></label>';
    h += '<label class="f">Disposition (Form B) <select data-ditem="' + i + ':disposition"><option value="">— select —</option>' + M.disposal.DISPOSITIONS.map(function (x) { return '<option value="' + x.code + '"' + (it.disposition === x.code ? ' selected' : '') + '>' + esc(x.label) + '</option>'; }).join('') + '</select></label>';
    h += '<label class="f">Saleable? <select data-ditem="' + i + ':saleable"><option value="">— choose —</option><option value="yes"' + (it.saleable === 'yes' ? ' selected' : '') + '>Yes — offered for a price</option><option value="no"' + (it.saleable === 'no' ? ' selected' : '') + '>No — not saleable (N/A)</option></select></label>';
    if (it.saleable === 'yes') {
      h += '<label class="f' + (spBad ? ' bad' : '') + '">Unit sale price $ (committee decision) <input type="text" data-ditem="' + i + ':salePrice" value="' + esc(it.salePrice || '') + '"></label>';
    }
    h += '<label class="f">Method of disposal (reg 6(2)) <select data-ditem="' + i + ':method"><option value="">— select —</option>' + M.disposal.METHODS.map(function (mm) { return '<option' + (it.method === mm ? ' selected' : '') + '>' + esc(mm) + '</option>'; }).join('') + '</select></label>';
    h += '<label class="f wide">Reason for the method (required for gift / donation / destruction, or any method off the list) <input type="text" data-ditem="' + i + ':methodReason" value="' + esc(it.methodReason || '') + '"></label>';
    h += '<label class="f wide">Value / price determination comment (Form C) <input type="text" data-ditem="' + i + ':valueComment" value="' + esc(it.valueComment || '') + '"></label>';
    h += '</div>';
    /* live appraisal readout */
    h += '<div data-compute="disposal-appraise:' + i + '" style="font-size:10.5pt;color:#444;margin-top:4px">' + disposalAppraiseHTML(a) + '</div>';
    h += '</fieldset>';
    return h;
  }

  function disposalAppraiseHTML(a) {
    if (a.errors.length) return '<b style="color:var(--red)">Appraisal: ' + esc(a.errors.join(' ')) + '</b>';
    if (a.saleable === false) return 'Not saleable — contributes nothing to the expected returns.';
    if (a.saleable == null) return 'Mark the item saleable or not to complete the appraisal.';
    var parts = [];
    if (a.hasNBV) parts.push('Unit NBV ' + fmtMoney(a.unitNBVCents), '20% ' + fmtMoney(a.pct20Cents), 'less 20% ' + fmtMoney(a.less20Cents));
    if (a.salePriceCents != null) parts.push('sale price ' + fmtMoney(a.salePriceCents));
    if (a.returnsCents != null) parts.push('<b>expected returns ' + fmtMoney(a.returnsCents) + '</b>');
    return 'Appraisal (computed): ' + parts.join(' · ');
  }

  /* ---- formal tender / RFP / ITB evaluation editor (OPR template) ---- */
  function renderFormal(panel) {
    var cf = APP.caseFile;
    if (!cf.formal) cf.formal = M.formal.newFormal();
    var f = cf.formal;
    /* keep the parallel price array aligned with the proponents */
    while (f.prices.length < f.proponents.length) f.prices.push(M.formal.blankPrice());
    var h = '<h2 class="p">Formal Evaluation — Tender / RFP / ITB</h2>';
    h += '<div class="notice green">Built to the OPR Evaluation of Submissions guideline and the Tender Evaluation Report Template. This is the formal Evaluation Committee report — committee declarations, preliminary examination, technical then commercial evaluation, ranking and a recommendation VAT inclusive. Scores and weights are the committee’s and the solicitation’s; the ranking is computed from them, nothing is invented.</div>';

    /* Solicitation */
    h += '<fieldset class="box"><legend>Solicitation</legend><div class="grid">';
    h += fieldHTML('Type', 'formal.solicitationType', { type: 'select', options: [['RFP', 'Request for Proposals (RFP)'], ['ITB', 'Invitation to Bid (ITB)']] });
    h += fieldHTML('Title', 'formal.rfpTitle', { wide: true, req: true });
    h += fieldHTML('RFP / ITB number', 'formal.rfpNumber', {});
    h += fieldHTML('Report date', 'formal.reportDate', { type: 'date' });
    h += fieldHTML('Submission deadline', 'formal.submissionDeadline', {});
    h += fieldHTML('Tender opening (procedure / date)', 'formal.tenderOpening', {});
    h += fieldHTML('Introduction (reason for the project)', 'formal.introduction', { type: 'textarea', wide: true });
    h += fieldHTML('Background (initiation, prior approval, invitation, deadline, firms, opening)', 'formal.background', { type: 'textarea', wide: true });
    h += '</div></fieldset>';

    /* Committee + declarations */
    h += '<fieldset class="box"><legend>Evaluation Committee — each member signs the Appendix I declaration (typically three to six)</legend><div class="scrollx"><table class="q"><thead><tr><th>Name</th><th>Job title</th><th>Role</th><th>COI + confidentiality signed</th><th>Conflict? ("none" or details)</th><th></th></tr></thead><tbody>';
    for (var m = 0; m < f.committee.length; m++) {
      var mm = f.committee[m];
      h += '<tr><td><input type="text" data-fmember="' + m + ':name" value="' + esc(mm.name || '') + '"></td>' +
        '<td><input type="text" data-fmember="' + m + ':jobTitle" value="' + esc(mm.jobTitle || '') + '"></td>' +
        '<td><input type="text" data-fmember="' + m + ':role" value="' + esc(mm.role || '') + '"></td>' +
        '<td class="ctr"><input type="checkbox" data-fmember="' + m + ':coiSigned"' + (mm.coiSigned ? ' checked' : '') + '></td>' +
        '<td><input type="text" data-fmember="' + m + ':coiConflict" value="' + esc(mm.coiConflict || '') + '" placeholder="none"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="fmember-del" data-i="' + m + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="fmember-add">＋ Add member</button></fieldset>';

    /* Mandatory + weighted criteria */
    h += '<fieldset class="box"><legend>Mandatory (pass/fail) criteria — from the solicitation</legend><div class="scrollx"><table class="q"><thead><tr><th>Requirement</th><th></th></tr></thead><tbody>';
    for (var mc = 0; mc < f.mandatoryCriteria.length; mc++) {
      h += '<tr><td><input type="text" data-fmand="' + mc + '" value="' + esc(f.mandatoryCriteria[mc].name || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="fmand-del" data-i="' + mc + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="fmand-add">＋ Add mandatory criterion</button></fieldset>';

    h += '<fieldset class="box"><legend>Weighted criteria and scoring — from the solicitation</legend><div class="scrollx"><table class="q"><thead><tr><th style="width:24%">Criterion</th><th>Description</th><th style="width:90px">Max points</th><th></th></tr></thead><tbody>';
    for (var c = 0; c < f.criteria.length; c++) {
      var cr = f.criteria[c];
      var cBad = cr.maxPoints !== '' && !(Number.isInteger(Number(cr.maxPoints)) && Number(cr.maxPoints) > 0);
      h += '<tr><td><input type="text" data-fcrit="' + c + ':name" value="' + esc(cr.name || '') + '"></td>' +
        '<td><input type="text" data-fcrit="' + c + ':description" value="' + esc(cr.description || '') + '"></td>' +
        '<td' + (cBad ? ' class="bad"' : '') + '><input type="number" min="1" step="1" data-fcrit="' + c + ':maxPoints" value="' + esc(String(cr.maxPoints || '')) + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="fcrit-del" data-i="' + c + '">✕</button></td></tr>';
    }
    var maxT = M.formal.maxTechnicalPoints(f);
    h += '</tbody></table></div><button class="btn sec small" data-action="fcrit-add">＋ Add criterion</button>';
    h += '<div class="notice"><b>Maximum technical score (computed):</b> <span data-compute="formal-maxtech">' + (isNaN(maxT) ? '— enter whole positive maxima' : maxT + ' points') + '</span></div>';
    h += '<div class="grid">';
    h += fieldHTML('Minimum technical score (the gate)', 'formal.minTechnicalScore', { type: 'number' });
    h += fieldHTML('Technical weight (%)', 'formal.technicalWeight', { type: 'number' });
    h += fieldHTML('Financial weight (%)', 'formal.financialWeight', { type: 'number' });
    h += fieldHTML('Ranking formula (as pre-determined, for the record)', 'formal.rankingFormula', { wide: true });
    h += fieldHTML('Methodology note (optional)', 'formal.methodologyNote', { type: 'textarea', wide: true });
    h += '</div></fieldset>';

    /* Proponents + preliminary examination */
    h += '<fieldset class="box"><legend>Proponents and preliminary examination</legend><div class="scrollx"><table class="q"><thead><tr><th>Firm</th><th style="width:130px">Compliant?</th><th>Reason if non-compliant</th><th></th></tr></thead><tbody>';
    for (var p = 0; p < f.proponents.length; p++) {
      var pr = f.proponents[p];
      h += '<tr><td><input type="text" data-fprop="' + p + ':name" value="' + esc(pr.name || '') + '"></td>' +
        '<td><select data-fprop="' + p + ':compliant"><option value="">— examine —</option><option value="yes"' + (pr.compliant === 'yes' ? ' selected' : '') + '>Compliant</option><option value="no"' + (pr.compliant === 'no' ? ' selected' : '') + '>Non-compliant</option></select></td>' +
        '<td><input type="text" data-fprop="' + p + ':complianceNote" value="' + esc(pr.complianceNote || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="fprop-del" data-i="' + p + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="fprop-add">＋ Add proponent</button></fieldset>';

    /* Technical scoring grid — compliant proponents × criteria */
    var compliant = [];
    for (var p2 = 0; p2 < f.proponents.length; p2++) if (f.proponents[p2].compliant === 'yes') compliant.push(p2);
    if (compliant.length && f.criteria.length) {
      h += '<fieldset class="box"><legend>Technical evaluation — score each compliant proponent on each criterion</legend><div class="scrollx"><table class="q"><thead><tr><th>Proponent</th>';
      for (var c2 = 0; c2 < f.criteria.length; c2++) h += '<th>' + esc(f.criteria[c2].name || ('Criterion ' + (c2 + 1))) + ' /' + esc(String(f.criteria[c2].maxPoints || '?')) + '</th>';
      h += '<th>Total</th><th>Gate</th></tr></thead><tbody>';
      compliant.forEach(function (pi) {
        h += '<tr><td>' + esc(f.proponents[pi].name || ('Proponent ' + (pi + 1))) + '</td>';
        for (var c3 = 0; c3 < f.criteria.length; c3++) {
          var val = M.formal.techScore(f, pi, c3);
          h += '<td style="width:76px"><input type="number" min="0" step="1" data-fscore="' + pi + ':' + c3 + '" value="' + esc(val == null ? '' : String(val)) + '"></td>';
        }
        h += '<td class="ctr" data-compute="formal-tt:' + pi + '">' + formalTTHTML(f, pi) + '</td><td class="ctr" data-compute="formal-gate:' + pi + '">' + (M.formal.passesGate(f, pi) ? 'Pass' : '—') + '</td></tr>';
      });
      h += '</tbody></table></div></fieldset>';

      /* Commercial evaluation — a price row for every compliant proponent;
         only the gate-passers' prices count (and reach the report), but the
         field stays put as scores change so nothing typed is lost. */
      h += '<fieldset class="box"><legend>Commercial evaluation — verified price (VAT inclusive); only the gate-passers are carried</legend><div class="scrollx"><table class="q"><thead><tr><th>Proponent</th><th style="width:70px">Gate</th><th style="width:150px">Quoted price $</th><th style="width:150px">Verified price $ (VAT incl.)</th><th>Arithmetic check note</th></tr></thead><tbody>';
      compliant.forEach(function (pi) {
        var passes = M.formal.passesGate(f, pi);
        var price = f.prices[pi] || M.formal.blankPrice();
        var vBad = price.verifiedPrice && !M.money.parseStrict(price.verifiedPrice).ok;
        h += '<tr' + (passes ? '' : ' style="opacity:.6"') + '><td>' + esc(f.proponents[pi].name) + '</td>' +
          '<td class="ctr" data-compute="formal-gatecell:' + pi + '">' + (passes ? 'Pass' : 'below') + '</td>' +
          '<td><input type="text" data-fprice="' + pi + ':quotedPrice" value="' + esc(price.quotedPrice || '') + '"></td>' +
          '<td' + (vBad ? ' class="bad"' : '') + '><input type="text" data-fprice="' + pi + ':verifiedPrice" value="' + esc(price.verifiedPrice || '') + '"></td>' +
          '<td><input type="text" data-fprice="' + pi + ':arithmeticNote" value="' + esc(price.arithmeticNote || '') + '"></td></tr>';
      });
      h += '</tbody></table></div><p class="hint">A price below the technical gate is shown greyed and is not carried into the ranking or the report.</p></fieldset>';
    }

    /* Clarifications */
    h += '<fieldset class="box"><legend>Clarifications (arithmetic corrections only)</legend><div class="scrollx"><table class="q"><thead><tr><th style="width:22%">Proponent</th><th style="width:110px">Issued</th><th style="width:110px">Received</th><th>Summary</th><th></th></tr></thead><tbody>';
    for (var cl = 0; cl < f.clarifications.length; cl++) {
      var cla = f.clarifications[cl];
      h += '<tr><td><select data-fclar="' + cl + ':proponent"><option value="">—</option>' + f.proponents.map(function (pp, idx) { return '<option value="' + idx + '"' + (cla.proponent === idx ? ' selected' : '') + '>' + esc(pp.name || ('Proponent ' + (idx + 1))) + '</option>'; }).join('') + '</select></td>' +
        '<td><input type="text" data-fclar="' + cl + ':issued" value="' + esc(cla.issued || '') + '"></td>' +
        '<td><input type="text" data-fclar="' + cl + ':received" value="' + esc(cla.received || '') + '"></td>' +
        '<td><input type="text" data-fclar="' + cl + ':summary" value="' + esc(cla.summary || '') + '"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="fclar-del" data-i="' + cl + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="fclar-add">＋ Add clarification</button></fieldset>';

    /* Ranking (computed) + recommendation */
    h += '<fieldset class="box"><legend>Ranking and recommendation</legend>';
    h += '<div data-compute="formal-ranking">' + formalRankingHTML(f) + '</div>';
    h += '<div class="grid">';
    h += '<label class="f">Recommended for award<select data-frec><option value="">— top-ranked, or choose —</option>' +
      f.proponents.map(function (pp, idx) { return '<option value="' + idx + '"' + (f.recommendedProponent === idx ? ' selected' : '') + '>' + esc(pp.name || ('Proponent ' + (idx + 1))) + '</option>'; }).join('') + '</select></label>';
    h += fieldHTML('Recommendation note (required if not the top-ranked)', 'formal.recommendationNote', { type: 'textarea', wide: true });
    h += fieldHTML('Negotiations (if applicable)', 'formal.negotiationNote', { type: 'textarea', wide: true });
    h += fieldHTML('PDAC review', 'formal.pdacReview', { wide: true });
    h += fieldHTML('Accounting Officer review', 'formal.aoReview', { wide: true });
    h += '</div></fieldset>';

    panel.innerHTML = h;
    bindInputs(panel);
  }

  function formalTTHTML(f, p) {
    var tt = M.formal.technicalTotal(f, p);
    if (tt.bad.length) return '<b style="color:var(--red)">range?</b>';
    return '<b>' + tt.total + '</b>' + (tt.missing ? ' <span style="color:#888">(' + tt.missing + ' left)</span>' : '');
  }

  function formalRankingHTML(f) {
    var r = M.formal.ranking(f);
    if (!r.ok || !r.rows.length) {
      return '<p class="hint">The ranking is computed once every gate-passing proponent has complete technical scores and a valid verified price, and the technical + financial weights (whole percentages) total 100.</p>';
    }
    var h = '<div class="scrollx"><table class="q"><thead><tr><th>Rank</th><th>Proponent</th><th>Technical</th><th>Financial</th><th>Combined</th><th>Verified price</th></tr></thead><tbody>';
    r.rows.forEach(function (row) {
      h += '<tr><td class="ctr">' + row.rank + '</td><td>' + esc(row.name) + '</td><td class="ctr">' + row.techPct + '</td><td class="ctr">' + row.finPct + '</td><td class="ctr"><b>' + row.combinedPct + '</b></td><td class="tot">' + fmtMoney(row.priceCents) + '</td></tr>';
    });
    h += '</tbody></table></div>';
    var top = r.rows[0];
    h += '<p class="hint">Top-ranked: <b>' + esc(top.name) + '</b> at ' + fmtMoney(top.priceCents) + ' VAT inclusive.</p>';
    return h;
  }

  /* ================= VOTE & FUNDING ================= */
  function renderVote(panel) {
    var cf = APP.caseFile;
    var h = '<h2 class="p">Vote &amp; Funding</h2>';
    h += '<p class="hint">Type the five figures from the vote book; the three balances are computed and printed — they are never typed. If the uncommitted balance cannot cover the case total, the minute includes the transfer-of-funds line automatically.</p>';
    h += '<fieldset class="box"><legend>Vote block (Head / Sub-Head / Item / Sub-Item)</legend><div class="scrollx"><table class="q"><thead><tr><th></th><th style="width:110px">Code</th><th>Description</th></tr></thead><tbody>';
    var vb = cf.voteBlock || {};
    [['head', 'Head'], ['subHead', 'Sub-Head'], ['item', 'Item'], ['subItem', 'Sub-Item']].forEach(function (row) {
      var cur = vb[row[0]] || ['', ''];
      h += '<tr><td><b>' + row[1] + ':</b></td>' +
        '<td><input type="text" data-vblock="' + row[0] + ':0" value="' + esc(cur[0] || '') + '"></td>' +
        '<td><input type="text" data-vblock="' + row[0] + ':1" value="' + esc(cur[1] || '') + '"></td></tr>';
    });
    h += '</tbody></table></div></fieldset>';
    h += '<fieldset class="box"><legend>Status of the vote (five typed figures; three computed balances)</legend><div class="grid">';
    var vs = cf.voteStatus || {};
    M.votestatus.INPUT_FIELDS.forEach(function (f) {
      h += '<label class="f">' + esc(f[1]) + ' $<input type="text" data-vstatus="' + f[0] + '" value="' + esc(vs[f[0]] || '') + '"></label>';
    });
    h += '</div>';
    /* The provision-base question lives in a computed container: it is
       offered ONLY while the two figures actually differ — when they are
       equal the choice changes nothing and the question would only
       confuse — and it appears or clears live as figures are typed. */
    h += '<div data-compute="vote-base-box">' + voteBaseBoxHTML(cf) + '</div>';
    h += '<div data-compute="vote-balances">' + voteBalancesHTML(cf) + '</div>';
    h += '</fieldset>';
    if (cf.module === 'routine') {
      h += '<fieldset class="box"><legend>Item-and-quotation cases (legacy fields, used by the formation letter and old-style minute)</legend><div class="grid">';
      h += fieldHTML('VAT treatment', 'docState.vat', { type: 'select', options: [['', '— select —'], ['VAT Inclusive', 'VAT Inclusive'], ['VAT Exclusive (VAT shown separately)', 'VAT Exclusive (VAT shown separately)'], ['VAT and Duty Free', 'VAT and Duty Free'], ['VAT Not Applicable', 'VAT Not Applicable']] });
      h += fieldHTML('Vote to be utilised (free text, one line per element)', 'docState.vote', { type: 'textarea', wide: true });
      h += fieldHTML('Available funds on vote (optional, for the cover check)', 'docState.funds', {});
      h += '</div></fieldset>';
    }
    panel.innerHTML = h;
    bindInputs(panel);
  }

  /* ================= FOLIOS ================= */
  function renderFol(panel) {
    var cf = APP.caseFile;
    var h = '<h2 class="p">Folio Register</h2>';
    h += '<p class="hint">The numbered register at the head of the minute. Numbers are computed from the starting folio number (' + cf.folioStart + ' — change it on Case Details) and renumber everywhere automatically. Tag the special folios so paragraphs can cite them by computed number: <b>verbal-form</b>, <b>evaluation</b>, or <b>quote:</b> followed by the supplier’s exact name.</p>';
    h += '<div class="scrollx"><table class="q"><thead><tr><th style="width:44px">No.</th><th>Folio description</th><th style="width:130px">Date (dd/mm/yy)</th><th style="width:220px">Tag (optional)</th><th></th></tr></thead><tbody>';
    var reg = M.folio.numbered(cf.docState.folios, cf.folioStart);
    var live = 0;
    for (var i = 0; i < cf.docState.folios.length; i++) {
      var f = cf.docState.folios[i];
      var n = (f.desc && String(f.desc).trim()) ? reg[live++].n : '—';
      h += '<tr><td class="ctr">' + n + '</td>' +
        '<td><input type="text" data-folio="' + i + ':desc" value="' + esc(f.desc || '') + '"></td>' +
        '<td><input type="text" data-folio="' + i + ':date" value="' + esc(f.date || '') + '"></td>' +
        '<td><input type="text" data-folio="' + i + ':tag" value="' + esc(f.tag || '') + '" placeholder="e.g. quote:J. Chai Trading Co. Ltd"></td>' +
        '<td class="rowbtns"><button class="btn danger small" data-action="folio-del" data-i="' + i + '">✕</button></td></tr>';
    }
    h += '</tbody></table></div><button class="btn sec small" data-action="folio-add">＋ Add folio line</button>';
    if (cf.module === 'routine' && cf.presentation === 'formation') {
      h += '<fieldset class="box" style="margin-top:16px"><legend>Attachments (formation letter)</legend>';
      h += '<button class="btn sec small" data-action="att-auto">Auto-build from supplier rows</button>';
      h += '<div class="scrollx"><table class="q"><thead><tr><th style="width:44px">No.</th><th>Attachment</th><th></th></tr></thead><tbody>';
      for (var a = 0; a < cf.docState.attachments.length; a++) {
        h += '<tr><td class="ctr">' + (a + 1) + '</td><td><input type="text" data-att="' + a + '" value="' + esc(cf.docState.attachments[a] || '') + '"></td><td class="rowbtns"><button class="btn danger small" data-action="att-del" data-i="' + a + '">✕</button></td></tr>';
      }
      h += '</tbody></table></div><button class="btn sec small" data-action="att-add">＋ Add attachment</button></fieldset>';
    }
    panel.innerHTML = h;
  }

  /* ================= VERIFICATION ================= */
  var FIX_TABS = [
    [/^C(1|2|3|4|5)$/, 'case'], [/^C(6|7|8|9|10|11|13|19)/, 'work'],
    [/^C(12|14|15|16)/, 'vote'], [/^C(17|18|22)/, 'case'],
    [/^C(20|21)/, 'fol'], [/^G5/, 'fol'], [/^G/, 'case'],
    [/^E/, 'work'], [/^V/, 'work'], [/^D/, 'work'], [/^H/, 'vote']
  ];
  function fixTabFor(id) {
    for (var i = 0; i < FIX_TABS.length; i++) if (FIX_TABS[i][0].test(id)) return FIX_TABS[i][1];
    return null;
  }

  function renderVer(panel) {
    var cf = APP.caseFile;
    var R = M.verifycase.runAllChecks(cf);
    var fails = R.filter(function (c) { return c.result === 'FAIL'; }).length;
    var warns = R.filter(function (c) { return c.result === 'WARN'; }).length;
    var h = '<h2 class="p">Verification</h2>';
    h += fails ? '<div class="notice red"><b>' + fails + ' check(s) failed.</b> The pack is not cleared; every document prints with the DRAFT — NOT CLEARED stamp until the checks pass. Click Fix beside a red item.</div>'
      : warns ? '<div class="notice"><b>All mandatory checks passed;</b> ' + warns + ' caution(s) noted below.</div>'
        : '<div class="notice green"><b>All checks passed.</b> Print the verification certificate and confirm every figure against its folio before the pack is carried for signature.</div>';
    h += '<ul class="checks">';
    for (var i = 0; i < R.length; i++) {
      var c = R[i];
      var fix = (c.result === 'FAIL' || c.result === 'WARN') && fixTabFor(c.id)
        ? '<button class="btn small" data-action="fix" data-tab="' + fixTabFor(c.id) + '" style="flex:0 0 auto;margin-left:8px">Fix →</button>' : '';
      h += '<li><div class="tag ' + c.result + '">' + c.result + '</div><div class="body"><b>' + esc(c.id) + ' — ' + esc(c.name) + '</b><span>' + esc(c.detail) + (c.result !== 'PASS' && c.action ? (' → ' + esc(c.action)) : '') + '</span></div>' + fix + '</li>';
    }
    h += '</ul>';
    panel.innerHTML = h;
  }

  /* ================= DOCUMENTS ================= */
  function renderDocs(panel) {
    var cf = APP.caseFile;
    var docs = M.documents.availableDocs(cf);
    if (!docs.length) {
      panel.innerHTML = '<h2 class="p">Documents</h2><div class="notice"><b>No documents are available for this activity yet.</b> The formal tender / RFP / ITB evaluation module registers its own documents (the OPR-format Evaluation Report and the conflict-of-interest and confidentiality declarations) when that module is fitted. Nothing from routine procurement or disposal is offered here — the activities are kept separate by design.</div>';
      return;
    }
    var current = APP.currentDoc && docs.some(function (d) { return d.id === APP.currentDoc; }) ? APP.currentDoc : docs[0].id;
    APP.currentDoc = current;
    var h = '<h2 class="p">Documents</h2>';
    h += '<div id="docBar"><label class="f" style="margin:0">Document <select id="docSel">' + docs.map(function (d) {
      return '<option value="' + d.id + '"' + (d.id === current ? ' selected' : '') + '>' + esc(d.label) + '</option>';
    }).join('') + '</select></label> ' +
      '<button class="btn" data-action="doc-print">Print</button> ' +
      '<button class="btn" data-action="doc-download">Download as Word (.doc)</button> ' +
      '<button class="btn sec" data-action="doc-download-all">Download all documents (.doc)</button></div>';
    var s = M.verifycase.stats(cf);
    if (s.fail) h += '<div class="notice red">This document is stamped <b>DRAFT — NOT CLEARED</b> because ' + s.fail + ' verification check(s) are failing. The stamp is removed automatically once every check passes.</div>';
    var body;
    try { body = M.documents.build(cf, current); }
    catch (e) { body = '<p><b>Cannot render:</b> ' + esc(e.message) + '</p>'; }
    h += '<div id="preview"><div class="sheet"><div class="doc">' + body + '</div></div></div>';
    panel.innerHTML = h;
  }

  /* ================= SETTINGS / CASE FILE & REGISTER ================= */
  function renderSettings(panel) {
    var cf = APP.caseFile;
    var h = '<h2 class="p">Case File &amp; Register</h2>';
    h += '<fieldset class="box"><legend>This case</legend>';
    h += '<p>Case ID <b>' + esc(cf.caseId) + '</b> · schema version ' + cf.schemaVersion + ' · created ' + esc(cf.meta.createdAt) + ' · last change ' + esc(cf.meta.modifiedAt) + '.</p>';
    h += '<p>Suggested file name: <b>' + esc(M.storage.caseFileName(cf)) + '</b></p>';
    h += '<button class="btn" data-action="save-case">Save Case (.json)</button> ';
    h += '<label class="f" style="display:inline-block;margin-left:14px"><input type="checkbox" id="autosaveToggle"' + (APP.autosaveEnabled ? ' checked' : '') + '> Autosave to this computer’s browser storage (recovery only — the saved .json file remains the record)</label>';
    h += '</fieldset>';
    h += '<fieldset class="box"><legend>History</legend><ul>' + cf.meta.history.map(function (ev) {
      return '<li><b>' + esc(ev.at) + '</b> — ' + esc(ev.event) + (ev.detail ? ': ' + esc(ev.detail) : '') + '</li>';
    }).join('') + '</ul></fieldset>';
    h += '<fieldset class="box"><legend>Shared-folder case register</legend>';
    h += '<p class="hint">Point this at the shared folder of case .json files. The app rebuilds the register index from the files themselves — the index never overrides a case file. <b>True multi-user concurrency needs a small server; that is an IT decision (see README-IT.md).</b> Two officers saving the same case at the same moment will race, and the index is only as fresh as its last rebuild.</p>';
    h += '<input type="file" id="registerDir" webkitdirectory multiple style="display:none">';
    h += '<button class="btn sec" data-action="register-pick">Choose the case folder…</button> ';
    h += '<button class="btn sec" data-action="register-export" ' + (APP.registerIndex ? '' : 'disabled') + '>Download refreshed register-index.json</button>';
    h += '<div id="registerHost" style="margin-top:12px">';
    if (APP.registerIndex) {
      var idx = APP.registerIndex;
      h += '<p><b>' + idx.cases.length + '</b> case(s) indexed at ' + esc(idx.builtAt) + '.' + (idx.problems.length ? ' <b style="color:var(--red)">' + idx.problems.length + ' file(s) could not be read:</b> ' + esc(idx.problems.join(' | ')) : '') + '</p>';
      h += '<div class="scrollx"><table class="q"><thead><tr><th>File No</th><th>Subject</th><th>Activity</th><th>Total</th><th>Cleared</th><th>Modified</th><th></th></tr></thead><tbody>';
      idx.cases.forEach(function (c, i) {
        h += '<tr><td>' + esc(c.fileNo) + '</td><td>' + esc(c.subject) + '</td><td class="ctr">' + esc(c.activity || c.module || c.pathway || '') + '</td><td class="tot">' + esc(c.totalDisplay) + '</td><td class="ctr">' + (c.cleared ? 'Yes' : c.failing + ' failing') + '</td><td>' + esc(c.modifiedAt) + '</td><td><button class="btn small" data-action="register-open" data-i="' + i + '">Open</button></td></tr>';
      });
      h += '</tbody></table></div>';
    }
    h += '</div></fieldset>';
    panel.innerHTML = h;
  }

  /* In-place refresh of computed displays — no DOM replacement, so typing
     is never interrupted and half-committed values are never destroyed. */
  function lightUpdate(panel) {
    var cf = APP.caseFile;
    if (!cf || !panel) return;
    var nodes = panel.querySelectorAll('[data-compute]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-compute').split(':');
      var out = '';
      try {
        if (key[0] === 'vsched') {
          var rt = M.verbal.rowTotalCents(cf.verbal.schedule[+key[1]]);
          out = isNaN(rt) ? 'check' : fmtMoney(rt);
        } else if (key[0] === 'verbal-total') {
          var vt = M.verbal.totalCents(cf.verbal);
          out = isNaN(vt) ? '— fix the flagged lines' : fmtMoney(vt) + ' — ' + M.words.amountInWords(vt);
        } else if (key[0] === 'quote') {
          var q = cf.docState.items[+key[1]].quotes[+key[2]];
          var lt = M.compute.lineTotal(q);
          out = q.status !== 'Quoted' ? '—' : (lt !== null && !isNaN(lt)) ? fmtMoney(lt) : 'check';
        } else if (key[0] === 'items-grand') {
          var gt = M.compute.grandTotal(cf.docState.items);
          out = isNaN(gt) ? '— fix the flagged rows' : gt === 0 ? '$0.00 (no recommended rows yet)' : fmtMoney(gt) + ' — ' + M.words.amountInWords(gt);
        } else if (key[0] === 'eval-awards') {
          var bk = M.evaluation.breakdown(cf.evaluation);
          out = bk.schedules.map(function (sch) { return sch.name + ' — ' + fmtMoney(sch.totalCents); }).join(' · ') +
            (bk.schedules.length ? ' · Grand total ' + (bk.bad ? 'CHECK' : fmtMoney(bk.grandTotalCents)) : 'none yet');
        } else if (key[0] === 'disposal-returns') {
          var dr = M.disposal.totalExpectedReturnsCents(cf.disposal);
          out = isNaN(dr) ? '— fix the flagged items' : fmtMoney(dr) + ' — ' + M.words.amountInWords(dr);
        } else if (key[0] === 'disposal-spend') {
          var dsp = M.disposal.spendTotalCents(cf.disposal);
          out = isNaN(dsp) ? '— fix the flagged amounts' : fmtMoney(dsp);
        } else if (key[0] === 'disposal-appraise') {
          try { nodes[i].innerHTML = disposalAppraiseHTML(M.disposal.appraisal(cf.disposal.items[+key[1]])); } catch (e7) { }
          continue;
        } else if (key[0] === 'formal-maxtech') {
          var mt = M.formal.maxTechnicalPoints(cf.formal);
          out = isNaN(mt) ? '— enter whole positive maxima' : mt + ' points';
        } else if (key[0] === 'formal-tt') {
          try { nodes[i].innerHTML = formalTTHTML(cf.formal, +key[1]); } catch (e8) { }
          continue;
        } else if (key[0] === 'formal-gate') {
          out = M.formal.passesGate(cf.formal, +key[1]) ? 'Pass' : '—';
        } else if (key[0] === 'formal-gatecell') {
          out = M.formal.passesGate(cf.formal, +key[1]) ? 'Pass' : 'below';
        } else if (key[0] === 'formal-ranking') {
          try { nodes[i].innerHTML = formalRankingHTML(cf.formal); } catch (e9) { }
          continue;
        } else if (key[0] === 'eval-situations') {
          /* guidance containers hold no text inputs, so replacing their
             innerHTML never disturbs anything being typed */
          try { nodes[i].innerHTML = evalSituationsHTML(cf.evaluation); } catch (e2) { }
          continue;
        } else if (key[0] === 'vote-base-box') {
          try { nodes[i].innerHTML = voteBaseBoxHTML(cf); } catch (e3) { }
          continue;
        } else if (key[0] === 'sheet-number-box') {
          try { nodes[i].innerHTML = sheetNumberBoxHTML(cf); } catch (e6) { }
          continue;
        } else if (key[0] === 'vote-balances') {
          try { nodes[i].innerHTML = voteBalancesHTML(cf); } catch (e4) { }
          continue;
        } else if (key[0] === 'verbal-notlowest') {
          try { nodes[i].innerHTML = verbalNotLowestHTML(cf.verbal); } catch (e5) { }
          continue;
        } else continue;
      } catch (e) { out = '…'; }
      nodes[i].textContent = out;
    }
  }

  window.PANELS = {
    lightUpdate: lightUpdate,
    start: renderStart, 'case': renderCase, work: renderWork, vote: renderVote,
    fol: renderFol, ver: renderVer, docs: renderDocs, settings: renderSettings,
    bindInputs: bindInputs, getPath: getPath, setPath: setPath, fixTabFor: fixTabFor
  };
})();
