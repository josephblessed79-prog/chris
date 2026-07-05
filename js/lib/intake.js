/* intake.js — the Document Upload / Intake engine. The user uploads a
   document and chooses how the system should use it:

     A. information only  — read the facts, help fill fields, keep the
                            official layout;
     B. preferred layout  — let the document guide presentation/structure,
                            but only where the official template, Act,
                            Regulations, OPR Guidelines and approved
                            public-body format permit;
     C. both              — facts and layout guidance, same safeguards.

   Compliance is first. This engine never lets an uploaded document
   silently replace an official form: the official template always wins,
   conflicts are detected and surfaced in plain language, and a full
   record of what was used (mode, file, extraction summary, layout
   decision, conflicts, confirmation) is produced for the case file.

   This module is pure logic and runs under Node for testing. The browser
   glue (reading the file bytes with the vendored parsers, building the
   structural representation, showing the preview, capturing the
   confirmation) lives in js/app/. Loads as MODPA.intake / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.intake = factory(root.MODPA.money);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money) {
  'use strict';

  var MODES = {
    A: { id: 'information', label: 'Use this document for information only',
      plain: 'Read this document and use the facts inside it to help fill the fields. Do not copy how it looks. The official form stays exactly as it should.' },
    B: { id: 'layout', label: 'Use this document as the preferred layout or structure',
      plain: 'Make the new document follow the same general look, order and headings as this one — but only where that is safe and the official form allows it. If it would break the official form, the official form wins and we tell you.' },
    C: { id: 'both', label: 'Use this document for both information and layout',
      plain: 'Use the facts inside the document, and also use its look and order as a guide where allowed. Same safety rule: the official form always wins if there is a clash.' }
  };

  /* Honest support matrix. info = can pull facts; structure = can read
     headings/tables/order for layout guidance. */
  var SUPPORT = {
    'docx': { info: true, structure: true, note: 'Word document: facts and layout/structure can both be read.' },
    'pdf-text': { info: true, structure: 'limited', note: 'PDF with selectable text: facts can be read; structure is approximate (headings and tables are inferred).' },
    'pdf-scanned': { info: false, structure: false, note: 'Scanned or image-only PDF: not reliably readable. Text recognition (OCR) is needed, and it only runs when the app is served over the intranet (HTTP), not opened straight from a folder.' },
    'xlsx': { info: true, structure: false, note: 'Excel: tabular facts can be read. It has no document layout to follow.' },
    'csv': { info: true, structure: false, note: 'CSV: tabular facts can be read. It has no document layout to follow.' },
    'unknown': { info: false, structure: false, note: 'This file type is not supported for intake.' }
  };

  function fileKind(fileName, mimeType, hasTextLayer) {
    var n = String(fileName || '').toLowerCase();
    var m = String(mimeType || '').toLowerCase();
    if (/\.docx$/.test(n) || /wordprocessingml/.test(m)) return 'docx';
    if (/\.csv$/.test(n) || m === 'text/csv') return 'csv';
    if (/\.xlsx$/.test(n) || /spreadsheetml/.test(m) || /\.xls$/.test(n)) return 'xlsx';
    if (/\.pdf$/.test(n) || m === 'application/pdf') return hasTextLayer === false ? 'pdf-scanned' : 'pdf-text';
    return 'unknown';
  }

  function supportFor(kind) { return SUPPORT[kind] || SUPPORT.unknown; }

  /* The mandated structure of each module's principal official documents:
     the section headings that must be present and, for form-tables, the
     column order. Used to detect conflicts with an uploaded layout. An
     empty/absent entry means the document has no frozen structure to
     protect (rare). Kept deliberately compact — it is a compliance guard,
     not a full template renderer. */
  var OFFICIAL = {
    'routine': {
      frozen: true,
      label: 'the approved Ministry minute / formation-letter layout',
      sections: ['File and sheet header', 'Numbered minute paragraphs', 'Vote block', 'Signature block'],
      note: 'The routine minute and formation letter use an approved, sample-verified printed layout. It is not changed by an uploaded document unless you deliberately choose a layout option and approve the result.'
    },
    'formal-evaluation': {
      frozen: true,
      label: 'the OPR Tender Evaluation Report template (Appendix II)',
      sections: ['Introduction', 'Background', 'Evaluation of Bids', 'Recommendation for Award of Contract'],
      note: 'The evaluation report follows the OPR template. Section wording and order are mandated by the OPR guideline.'
    },
    'disposal': {
      frozen: true,
      label: 'the OPR Disposal Templates (Forms A–H)',
      sections: ['Executive Summary', 'Disposal Requirement Analysis', 'Stakeholder Analysis', 'Market Analysis', 'Disposal Strategy Options', 'Preferred Disposal Strategy Recommendation'],
      formA: ['Asset Description', 'Make/Model', 'Reason for Disposal', 'Quantity', 'Condition', 'Original Purchase Price', 'Purchase Date', 'Net Book Value', 'Comments'],
      note: 'The disposal forms follow the official OPR blank templates (Forms A–H). Their columns, sections and signature blocks are mandated.'
    }
  };

  function officialStructureFor(caseModule) { return OFFICIAL[caseModule] || null; }

  /* Normalise an uploaded document's raw structure (built in the browser
     from mammoth HTML or pdf.js text) into a layout profile. Input:
       { headings:[str], tables:[{columns:[str], rowCount:int}],
         paragraphs:[str], hasSignatureBlocks:bool, hasLetterhead:bool } */
  function analyzeStructure(docStructure) {
    var s = docStructure || {};
    var headings = (s.headings || []).map(function (h) { return String(h).trim(); }).filter(Boolean);
    var tables = (s.tables || []).map(function (t) {
      return { columns: (t.columns || []).map(function (c) { return String(c).trim(); }).filter(Boolean), rowCount: t.rowCount || 0 };
    });
    return {
      sectionOrder: headings,
      sectionCount: headings.length,
      tables: tables,
      paragraphCount: (s.paragraphs || []).length,
      hasSignatureBlocks: !!s.hasSignatureBlocks,
      hasLetterhead: !!s.hasLetterhead
    };
  }

  function norm(x) { return String(x || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
  function includesLoose(list, target) {
    var t = norm(target);
    return list.some(function (x) { var n = norm(x); return n === t || n.indexOf(t) >= 0 || t.indexOf(n) >= 0; });
  }

  /* Compare an uploaded layout profile against the module's official
     structure. Returns a list of conflicts, each with a plain-language
     explanation and the safe resolution (the official template wins). */
  function detectConflicts(layoutProfile, official) {
    var conflicts = [];
    if (!official) return conflicts;
    var uploaded = (layoutProfile && layoutProfile.sectionOrder) || [];
    var mandated = official.sections || [];

    /* Mandated sections the uploaded document does not appear to contain:
       following the upload's structure would drop required content. */
    mandated.forEach(function (sec) {
      if (uploaded.length && !includesLoose(uploaded, sec)) {
        conflicts.push({
          severity: 'block',
          field: sec,
          message: 'The official layout requires the section "' + sec + '", which was not found in the uploaded document.',
          plain: 'Your document does not seem to have the "' + sec + '" part, but the official form must have it. We will keep the official form so nothing required is lost.',
          resolution: 'Official template kept; the required section stays.'
        });
      }
    });

    /* Extra sections in the upload that are not in the official form: they
       cannot be inserted into a mandated form. Noted, not applied. */
    uploaded.forEach(function (sec) {
      if (mandated.length && !includesLoose(mandated, sec)) {
        conflicts.push({
          severity: 'note',
          field: sec,
          message: 'The uploaded document has a section "' + sec + '" that is not part of the official form.',
          plain: 'Your document has an extra part called "' + sec + '". The official form does not have a place for it, so it will not be added — but you can copy any facts from it by hand.',
          resolution: 'Not added to the official form; available for information.'
        });
      }
    });

    return conflicts;
  }

  /* Decide what layout guidance can actually and safely be applied, given
     the mode, the file kind and any conflicts. Compliance-bounded: the
     official form structure is never altered; layout guidance maps to the
     enhanced output profile (presentation polish) plus a recorded
     preference. Returns the decision for the case record. */
  function planLayout(mode, kind, layoutProfile, official) {
    var wantsLayout = (mode === 'B' || mode === 'C');
    var support = supportFor(kind);
    var decision = {
      requested: wantsLayout,
      applied: false,
      outputProfile: null,
      conflicts: [],
      applicableItems: [],
      note: ''
    };
    if (!wantsLayout) {
      decision.note = 'Information-only intake: the official layout is unchanged.';
      return decision;
    }
    if (!support.structure) {
      decision.note = 'This file type cannot provide layout structure (' + support.note + '). Layout guidance was not applied; you can still use it for information.';
      return decision;
    }
    decision.conflicts = detectConflicts(layoutProfile, official);
    var blocking = decision.conflicts.filter(function (c) { return c.severity === 'block'; });
    /* The official form structure is preserved regardless. Layout guidance
       is honoured as the enhanced presentation profile plus any safe,
       non-structural signals (letterhead, signature-block emphasis). */
    decision.outputProfile = 'enhanced';
    if (layoutProfile && layoutProfile.hasLetterhead) decision.applicableItems.push('letterhead / logo emphasis');
    if (layoutProfile && layoutProfile.hasSignatureBlocks) decision.applicableItems.push('formal signature blocks');
    decision.applicableItems.push('enhanced spacing and typography');
    decision.applied = true;
    decision.note = 'The official ' + (official ? official.label : 'form') + ' layout is kept in full. Your document guides presentation only (the Enhanced professional profile' +
      (decision.applicableItems.length ? ': ' + decision.applicableItems.join(', ') : '') + ').' +
      (blocking.length ? ' ' + blocking.length + ' part(s) of your document’s structure could not be followed because the official form requires its own — see the conflicts, which we kept safe.' : '');
    return decision;
  }

  /* Summarise extracted facts (candidates produced by the browser via the
     existing ingest pipeline). Low-confidence facts are never applied
     automatically — they are held for review (safeguard: uncertain fields
     stay uncertain). Input: [{kind,label,value,confidence('high'|'low'|..)}] */
  function summarizeExtraction(candidates) {
    var facts = [], uncertain = [];
    (candidates || []).forEach(function (c) {
      var item = { kind: c.kind, label: c.label || c.kind, value: c.value, confidence: c.confidence || 'review' };
      if (c.confidence === 'high') facts.push(item);
      else uncertain.push(item);
    });
    return {
      facts: facts,
      uncertain: uncertain,
      summaryText: facts.length + ' fact(s) found with good confidence' +
        (uncertain.length ? ', and ' + uncertain.length + ' held for your review (not filled in automatically).' : '.')
    };
  }

  /* ---------- OCR / protocol handling (Phase 3) ---------- */

  /* Whether OCR can run, given the page protocol and the file kind, and
     the exact plain-language message when it cannot. Browsers refuse to
     start the Web Worker OCR needs from a file:// script. */
  function ocrDecision(protocol, fileKind) {
    var scanned = fileKind === 'pdf-scanned' || fileKind === 'image';
    if (scanned && protocol === 'file:') {
      return {
        abort: true,
        message: 'This appears to be a scanned document. The browser’s security blocks text-recognition (OCR) when opening from a local folder. Please type these figures manually, or ask IT to host this system on the intranet to enable scanning.'
      };
    }
    return { abort: false, message: '' };
  }

  /* ---------- field mapping and cross-tab accounting (Phase 5) ---------- */

  /* Which tab a field path lives on, and the tab order for "earliest
     modified tab". Kept in step with the app's tab order. */
  var TAB_ORDER = ['case', 'work', 'vote', 'fol'];
  var TAB_LABEL = { case: 'Case Details', work: 'Working Papers', vote: 'Vote & Funding', fol: 'Folios' };

  function pathTab(path) {
    if (/^voteStatus\.|^docState\.funds|^docState\.vote$|^docState\.vat/.test(path)) return 'vote';
    if (/^docState\.folios|^docState\.attachments/.test(path)) return 'fol';
    if (/^disposal\.|^formal\.|^evaluation\.|^verbal\.|^docState\.items/.test(path)) return 'work';
    return 'case';
  }

  function tabOrderIndex(tab) { var i = TAB_ORDER.indexOf(tab); return i < 0 ? 99 : i; }

  /* The default field a candidate maps to, as a concrete case path, given
     the module. Returns { path, tab, label } for a simple field, or null
     for candidates that append to a list (suppliers, item lines) rather
     than filling a single field. */
  function defaultTarget(kind, module) {
    if (kind === 'date') return field('docState.date', 'Document date');
    if (kind === 'reference') {
      if (module === 'formal-evaluation') return field('formal.rfpNumber', 'RFP / ITB number');
      if (module === 'disposal') return field('disposal.requestRef', 'Disposal request reference');
      return field('docState.minfile', 'File number');
    }
    if (kind === 'figure') {
      if (module === 'routine') return field('docState.funds', 'Available funds');
      return null;
    }
    return null; /* suppliers / item-lines append to lists; handled separately */
  }
  function field(path, label) { return { path: path, tab: pathTab(path), label: label }; }

  /* Small path helpers, so the engine can update a case object purely. */
  function getPath(obj, path) {
    var p = String(path).split('.'), c = obj;
    for (var i = 0; i < p.length; i++) { if (c == null) return undefined; c = c[p[i]]; }
    return c;
  }
  function setPath(obj, path, value) {
    var p = String(path).split('.'), c = obj;
    for (var i = 0; i < p.length - 1; i++) { if (c[p[i]] == null) c[p[i]] = {}; c = c[p[i]]; }
    c[p[p.length - 1]] = value;
  }

  /* Whether a figure string is acceptable to the deterministic core.
     A malformed figure (e.g. "$11,3900.00") is never applied. */
  function figureValid(value) {
    return money ? money.parseStrict(String(value)).ok : /^\$?\d{1,3}(,\d{3})*(\.\d{2})?$|^\$?\d+(\.\d{2})?$/.test(String(value));
  }

  /* Apply accepted field-facts to a case object (Phase 5). Each fact is
     { path, value, source?, kind? }. Rules:
       - empty target, or same value  -> set + mark 'imported';
       - different existing value      -> DO NOT overwrite; mark 'conflict'
                                          (keeping both the manual and the
                                          imported value for the user);
       - a malformed figure            -> skipped (recorded as 'rejected').
     Returns a summary for the toast and the cross-tab feedback. */
  function applyAcceptedFacts(caseData, facts, nowIso) {
    var now = nowIso || new Date().toISOString();
    if (!caseData.intakeFields || typeof caseData.intakeFields !== 'object') caseData.intakeFields = {};
    var updated = [], conflicts = [], rejected = [], byTab = {};
    (facts || []).forEach(function (f) {
      if (!f || !f.path) return;
      if (f.kind === 'figure' && !figureValid(f.value)) { rejected.push({ path: f.path, value: f.value }); return; }
      var cur = getPath(caseData, f.path);
      var curStr = cur == null ? '' : String(cur);
      var valStr = f.value == null ? '' : String(f.value);
      var tab = pathTab(f.path);
      if (curStr.trim() === '' || curStr === valStr) {
        setPath(caseData, f.path, f.value);
        caseData.intakeFields[f.path] = { value: f.value, source: f.source || '', at: now, status: 'imported' };
        updated.push(f.path);
        byTab[tab] = (byTab[tab] || 0) + 1;
      } else {
        caseData.intakeFields[f.path] = { value: f.value, manualValue: cur, source: f.source || '', at: now, status: 'conflict' };
        conflicts.push(f.path);
        byTab[tab] = (byTab[tab] || 0) + 1;
      }
    });
    var tabs = Object.keys(byTab);
    var earliestTab = tabs.length ? tabs.sort(function (a, b) { return tabOrderIndex(a) - tabOrderIndex(b); })[0] : null;
    return { updated: updated, conflicts: conflicts, rejected: rejected, byTab: byTab, earliestTab: earliestTab };
  }

  /* Toast wording (Phase 5): X updated on the current tab, Y on other
     (previous) tabs, with the earliest tab to jump back to. */
  function summarizeUpdate(byTab, currentTab) {
    var current = byTab[currentTab] || 0, others = 0, earliest = null, earliestIdx = 99;
    Object.keys(byTab).forEach(function (t) {
      if (t !== currentTab) others += byTab[t];
      if (tabOrderIndex(t) < earliestIdx) { earliestIdx = tabOrderIndex(t); earliest = t; }
    });
    return {
      current: current, others: others, earliestTab: earliest,
      earliestTabLabel: earliest ? (TAB_LABEL[earliest] || earliest) : '',
      text: current + ' field' + (current === 1 ? '' : 's') + ' were updated on this tab. ' +
        others + ' field' + (others === 1 ? '' : 's') + ' were updated in previous tabs.'
    };
  }

  /* Resolve a field conflict (Phase 5). choice: 'imported' | 'manual'. */
  function resolveConflict(caseData, path, choice) {
    var f = caseData.intakeFields && caseData.intakeFields[path];
    if (!f) return false;
    if (choice === 'imported') {
      setPath(caseData, path, f.value);
      f.status = 'imported';
      delete f.manualValue;
    } else {
      if (f.manualValue !== undefined) setPath(caseData, path, f.manualValue);
      f.status = 'manual-kept';
    }
    return true;
  }

  /* ---------- table-layout extraction and compliance (Phase 6) ---------- */

  /* The mandatory, distinct columns an official table must keep separate.
     These are the compliance backbone — merging any two, or dropping one,
     is rejected. */
  var OFFICIAL_TABLE = {
    'routine': ['Item', 'Description', 'Qty', 'Unit Price', 'VAT', 'Total'],
    'disposal': ['Asset Description', 'Quantity', 'Condition', 'Net Book Value', 'Appraised Value'],
    'formal-evaluation': ['Proponent', 'Technical', 'Financial', 'Combined']
  };
  function officialTableFor(module) { return OFFICIAL_TABLE[module] || null; }

  /* Extract a usable layout guide from a document structure (Phase 6).
     Honest about what each source yields: DOCX/HTML gives the columns,
     the table count and whether the table is bordered; XLSX (when the
     browser side provides them) gives real column widths. Cell padding is
     not recoverable from mammoth's DOCX output and is left null. */
  function extractTableLayout(structure) {
    var s = structure || {};
    var tables = (s.tables || []).map(function (t) {
      return {
        columns: (t.columns || []).map(function (c) { return String(c).trim(); }).filter(Boolean),
        rowCount: t.rowCount || 0,
        columnWidths: t.columnWidths || null,   /* only from XLSX */
        bordered: t.bordered !== false,
        cellPadding: t.cellPadding != null ? t.cellPadding : null
      };
    });
    return {
      tables: tables,
      hasSignatureBlocks: !!s.hasSignatureBlocks,
      hasLetterhead: !!s.hasLetterhead,
      signatureOrder: s.signatureOrder || []
    };
  }

  /* Compliance of an uploaded table against the official mandatory columns
     (Phase 6). Detects a missing mandatory column and a merged column
     (one uploaded column standing for two official ones). The official
     layout is preserved whenever this is not compliant. */
  function checkTableCompliance(uploadedColumns, officialColumns) {
    var up = (uploadedColumns || []).map(norm);
    var missing = [], merged = [];
    (officialColumns || []).forEach(function (oc) {
      var n = norm(oc);
      var present = up.some(function (u) { return u === n || u.indexOf(n) >= 0 || n.indexOf(u) >= 0; });
      if (!present) missing.push(oc);
    });
    for (var i = 0; i < up.length; i++) {
      var hits = (officialColumns || []).filter(function (oc) { return up[i].indexOf(norm(oc)) >= 0; });
      if (hits.length >= 2) merged.push(hits);
    }
    var compliant = missing.length === 0 && merged.length === 0;
    var reason = '';
    if (merged.length) {
      reason = 'The uploaded layout merges ‘' + merged[0][0] + '’ and ‘' + merged[0][1] +
        '’ into one column. This violates the verification check requirement. The official layout will be used.';
    } else if (missing.length) {
      reason = 'The uploaded layout is missing the required column' + (missing.length === 1 ? '' : 's') +
        ' ‘' + missing.join('’, ‘') + '’. The official layout will be used.';
    }
    return { compliant: compliant, reason: reason, missing: missing, merged: merged };
  }

  /* Signature-block order compliance (Phase 6). Reordering preparers and
     reviewers is permitted; the Accounting Officer's approval is the final,
     controlling act under the Act, so no signatory may appear after it.
     Returns { ok, reason } — the reason is logged when a change is
     rejected. */
  function signatureCompliance(uploadedOrder) {
    var names = (uploadedOrder || []).map(function (s) { return String(s).toLowerCase(); });
    var aoIdx = -1;
    for (var i = 0; i < names.length; i++) {
      if (/accounting officer|permanent secretary|\bceo\b|equivalent|line minister/.test(names[i])) { aoIdx = i; }
    }
    /* the last authority match must be the final entry */
    if (aoIdx >= 0 && aoIdx !== names.length - 1) {
      return {
        ok: false,
        reason: 'The uploaded signature order places a signatory after the Accounting Officer. Under the Act, the Accounting Officer’s approval is the final, controlling act, so it must appear last. The official signature order will be used.'
      };
    }
    return { ok: true, reason: '' };
  }

  /* Build the audit record to attach to the case file. Everything the
     user needs to see why a document was used and what it changed. */
  function buildRecord(opts) {
    opts = opts || {};
    var mode = opts.mode;
    var m = MODES[mode] || {};
    return {
      at: opts.at || new Date().toISOString(),
      fileName: opts.fileName || '',
      fileKind: opts.fileKind || 'unknown',
      mode: mode,
      modeLabel: m.label || '',
      support: supportFor(opts.fileKind || 'unknown'),
      extractionSummary: opts.extractionSummary || null,
      layoutDecision: opts.layoutDecision || null,
      conflicts: (opts.layoutDecision && opts.layoutDecision.conflicts) || [],
      appliedFacts: opts.appliedFacts || [],   /* what the user actually accepted */
      confirmed: !!opts.confirmed,
      confirmedAt: opts.confirmed ? (opts.at || new Date().toISOString()) : null
    };
  }

  return {
    MODES: MODES,
    SUPPORT: SUPPORT,
    OFFICIAL: OFFICIAL,
    fileKind: fileKind,
    supportFor: supportFor,
    officialStructureFor: officialStructureFor,
    analyzeStructure: analyzeStructure,
    detectConflicts: detectConflicts,
    planLayout: planLayout,
    summarizeExtraction: summarizeExtraction,
    buildRecord: buildRecord,
    ocrDecision: ocrDecision,
    TAB_ORDER: TAB_ORDER,
    TAB_LABEL: TAB_LABEL,
    pathTab: pathTab,
    defaultTarget: defaultTarget,
    figureValid: figureValid,
    applyAcceptedFacts: applyAcceptedFacts,
    summarizeUpdate: summarizeUpdate,
    resolveConflict: resolveConflict,
    officialTableFor: officialTableFor,
    extractTableLayout: extractTableLayout,
    checkTableCompliance: checkTableCompliance,
    signatureCompliance: signatureCompliance,
    getPath: getPath,
    setPath: setPath
  };
});
