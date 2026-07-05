/* casemodel.js — the case file: a self-contained JSON document with a schema
   version. Version 3 separates the three activities the office actually
   performs — routine/daily procurement, formal tender/RFP/ITB evaluation,
   and disposal of public property — as distinct modules chosen before any
   data is entered. Version 2 wrapped the original Approvals_Composer draft
   (version 1) unchanged inside `docState` and used pathway codes P1–P4;
   both older versions still open losslessly: v1 fields are preserved under
   `extra.unknownV1Fields`, and a v2 pathway is preserved under
   `extra.legacyPathway` while mapping onto its module.
   Loads in the browser as MODPA.casemodel and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.casemodel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var SCHEMA_VERSION = 3;
  var APP = 'MODPA';
  var APP_VERSION = '3.0.0';

  /* The three activities. Each is a separate workflow with its own forms,
     checks, decision points and documents; they share only the neutral
     tools (money, words, folios, save/load, verification framework). */
  var MODULES = {
    'routine': 'Routine / daily procurement',
    'formal-evaluation': 'Formal tender / RFP / ITB evaluation',
    'disposal': 'Disposal of public property'
  };

  /* Within routine procurement only: who the papers are presented for.
     One workflow, two presentations — not two process types. */
  var PRESENTATIONS = {
    'internal': 'Ministry internal minute',
    'formation': 'External formation (letter + minute)'
  };

  /* The v2 pathway codes, kept so old case files and callers map cleanly.
     P1/P2 were the same routine workflow in two presentations; P3 was the
     routine supplier-comparison worksheet mislevelled as a process type;
     P4 was disposal. */
  var PATHWAYS = {
    P1: 'Ministry internal procurement',
    P2: 'Procurement on behalf of external formations',
    P3: 'Evaluation Committee',
    P4: 'Disposal Committee'
  };
  var LEGACY_ACTIVITY = {
    P1: { module: 'routine', presentation: 'internal' },
    P2: { module: 'routine', presentation: 'formation' },
    P3: { module: 'routine', presentation: 'internal' },
    P4: { module: 'disposal', presentation: null }
  };

  /* Accepts a module id or a legacy pathway code; returns
     { module, presentation } or null if unrecognised. */
  function normalizeActivity(x) {
    if (MODULES[x]) return { module: x, presentation: x === 'routine' ? 'internal' : null };
    if (LEGACY_ACTIVITY[x]) return { module: LEGACY_ACTIVITY[x].module, presentation: LEGACY_ACTIVITY[x].presentation };
    return null;
  }

  function activityLabel(cf) {
    var label = MODULES[cf.module] || String(cf.module);
    if (cf.module === 'routine' && PRESENTATIONS[cf.presentation]) label += ' — ' + PRESENTATIONS[cf.presentation];
    return label;
  }

  /* Every field of the v1 (Approvals_Composer) flat draft. Order is the
     legacy declaration order; anything outside this list is unknown-v1. */
  var V1_FIELDS = ['formation', 'lhlines', 'prelh',
    'ref', 'date', 'handdate', 'addr', 'subject', 'subjectProse',
    'signame', 'sigrank', 'sigapp', 'sigform',
    'minfile', 'minsheet', 'minaddr', 'minufs', 'minsigname', 'minsigpost',
    'method', 'act', 'rfqdate', 'deadline', 'methodjust', 'urgency',
    'need', 'r_comm', 'r_tech', 'r_low', 'r_alt', 'notlowest',
    'vat', 'vote', 'funds', 'minextra',
    'da_target', 'da_activity', 'da_who', 'da_when', 'da_cons', 'da_notes',
    'items', 'attachments', 'folios'];

  function blankDocState() {
    return {
      formation: 'TRINIDAD AND TOBAGO COAST GUARD', lhlines: '', prelh: false,
      ref: '', date: '', handdate: false, addr: '', subject: '', subjectProse: '',
      signame: '', sigrank: '', sigapp: '', sigform: '',
      minfile: '', minsheet: '1a', minaddr: 'Permanent Secretary (Accounting Officer)',
      minufs: 'Ufs AOV', minsigname: '', minsigpost: '',
      method: 'Request for Quotation',
      act: 'Public Procurement and Disposal of Public Property Act, Act No. 1 of 2015, Part IV, Section 10 (Request for Quotation)',
      rfqdate: '', deadline: '', methodjust: '', urgency: 'Normal',
      need: '', r_comm: true, r_tech: true, r_low: true, r_alt: '', notlowest: '',
      vat: '', vote: '', funds: '', minextra: '',
      da_target: 'need', da_activity: '', da_who: '', da_when: '', da_cons: '', da_notes: '',
      items: [], attachments: [], folios: []
    };
  }

  /* Deterministic-enough local id: date prefix + random suffix. Used only as
     a filename/registry key, never in any generated document. */
  function newCaseId(now) {
    var d = now ? new Date(now) : new Date();
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var stamp = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var suffix = '';
    for (var i = 0; i < 6; i++) suffix += 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.charAt(Math.floor(Math.random() * 31));
    return 'CASE-' + stamp + '-' + suffix;
  }

  /* activity: a module id ('routine' | 'formal-evaluation' | 'disposal')
     or a legacy pathway code (P1–P4), which maps to its module. */
  function newCase(activity, styleProfileId, nowIso) {
    var a = normalizeActivity(activity);
    if (!a) throw new Error('Unknown activity: ' + activity);
    var now = nowIso || new Date().toISOString();
    var cf = {
      schemaVersion: SCHEMA_VERSION,
      caseId: newCaseId(now),
      module: a.module,
      presentation: a.presentation,
      styleProfileId: styleProfileId || 'ministry-dotted',
      folioStart: 1,
      /* null until decided; 'manual' | 'follow-folio'. The question is
         only put to the user when folioStart is above 1 (see verifycase). */
      sheetNumbering: null,
      /* 'approved' (default; approved/sample-verified layouts unchanged) or
         'enhanced' (professional presentation profile — never alters a
         mandated form structure). Only leaves 'approved' when the user
         deliberately chooses a layout option and confirms it. */
      outputProfile: 'approved',
      /* audit trail of Document Upload / Intake actions on this case. */
      intake: [],
      /* per-field intake state: path -> { value, manualValue?, source, at,
         status: 'imported' | 'conflict' | 'manual-kept' }. Drives the
         "Imported" badge and the conflict triangle beside each field. */
      intakeFields: {},
      /* an applied layout guide extracted from an uploaded document
         (bounded by the compliance check), or null. */
      intakeLayout: null,
      meta: {
        app: APP, appVersion: APP_VERSION,
        createdAt: now, modifiedAt: now,
        history: []
      },
      docState: blankDocState(),
      evaluation: null,
      verbal: null,
      formal: null,
      disposal: null,
      voteStatus: null,
      extra: {}
    };
    cf.meta.history.push({ at: now, event: 'created', detail: 'Activity: ' + activityLabel(cf) });
    return cf;
  }

  /* 3 | 2 | 1 | 0 (unrecognised) */
  function detectVersion(obj) {
    if (!obj || typeof obj !== 'object') return 0;
    if (obj.schemaVersion === 3 && obj.docState && typeof obj.docState === 'object') return 3;
    if (obj.schemaVersion === 2 && obj.docState && typeof obj.docState === 'object') return 2;
    if (!('schemaVersion' in obj) && Array.isArray(obj.items)) return 1;
    return 0;
  }

  /* Repair a v1 draft the way legacy loadDraft did: default the item mode,
     normalise quote rows, force the arrays. Operates in place, returns notes. */
  function repairV1(v1) {
    var notes = [];
    if (!Array.isArray(v1.items)) { v1.items = []; notes.push('items was not a list — reset to empty'); }
    for (var i = 0; i < v1.items.length; i++) {
      var it = v1.items[i];
      if (!it.mode) { it.mode = 'qty'; }
      if (!Array.isArray(it.quotes)) { it.quotes = []; notes.push('item ' + (i + 1) + ' had no supplier rows — reset to empty'); }
      for (var j = 0; j < it.quotes.length; j++) {
        var q = it.quotes[j];
        if (q.sub == null) q.sub = '';
        q.mode = it.mode;
      }
    }
    if (!Array.isArray(v1.attachments)) { v1.attachments = []; notes.push('attachments was not a list — reset to empty'); }
    if (!Array.isArray(v1.folios)) { v1.folios = []; notes.push('folios was not a list — reset to empty'); }
    return notes;
  }

  /* v1 draft object -> { caseFile, report } . Nothing is dropped: known
     fields go to docState, unknown fields are kept under extra.unknownV1Fields. */
  function migrateV1(obj, nowIso) {
    var now = nowIso || new Date().toISOString();
    var doc = blankDocState();
    var unknown = {};
    var report = [];
    for (var k in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
      if (V1_FIELDS.indexOf(k) >= 0) doc[k] = obj[k];
      else unknown[k] = obj[k];
    }
    var repairNotes = repairV1(doc);
    for (var r = 0; r < repairNotes.length; r++) report.push('Repaired: ' + repairNotes[r]);
    var unknownKeys = Object.keys(unknown);
    if (unknownKeys.length) report.push('Preserved unrecognised v1 field(s) unchanged: ' + unknownKeys.join(', '));
    var cf = newCase('routine', 'ttcg-formation', now);
    cf.presentation = 'formation';
    cf.docState = doc;
    cf.extra = unknownKeys.length ? { unknownV1Fields: unknown } : {};
    cf.meta.history.push({ at: now, event: 'migrated', detail: 'Migrated from schema version 1 (Approvals Composer draft). ' + (report.length ? report.join(' | ') : 'No repairs required.') });
    report.unshift('Migrated from schema version 1. The draft opened as routine procurement for an external formation, with the TTCG formation profile — the combination that reproduces the old tool’s documents exactly. Change the presentation or profile if this case is something else.');
    return { caseFile: cf, report: report };
  }

  /* v2 case file -> { caseFile, report } . Operates on the object itself:
     every section, figure and history entry is preserved; the pathway is
     kept under extra.legacyPathway while its module takes over. */
  function migrateV2(cf, nowIso) {
    var now = nowIso || new Date().toISOString();
    var report = [];
    var pathway = cf.pathway;
    var a = LEGACY_ACTIVITY[pathway] || { module: 'routine', presentation: 'internal' };
    if (!LEGACY_ACTIVITY[pathway]) report.push('The saved pathway "' + pathway + '" is not one this system knows; the case opened under routine procurement. Its original value is preserved on the case.');
    cf.schemaVersion = SCHEMA_VERSION;
    cf.module = a.module;
    cf.presentation = a.presentation;
    if (!('formal' in cf)) cf.formal = null;
    delete cf.pathway;
    if (!cf.extra || typeof cf.extra !== 'object') cf.extra = {};
    cf.extra.legacyPathway = pathway;
    repairV1(cf.docState);
    cf.meta.history.push({ at: now, event: 'migrated', detail: 'Migrated from schema version 2: pathway ' + pathway + ' (' + (PATHWAYS[pathway] || 'unknown') + ') became ' + activityLabel(cf) + '. Every section and figure carried over unchanged.' });
    report.unshift('Migrated from schema version 2. Pathway ' + pathway + ' opened as ' + activityLabel(cf) + '; every section and figure carried over unchanged.');
    return { caseFile: cf, report: report };
  }

  /* Any parsed JSON object -> { ok, caseFile, report, errors } */
  function load(obj, nowIso) {
    var v = detectVersion(obj);
    if (v === 3) {
      var errs = validate(obj);
      if (errs.length) return { ok: false, caseFile: null, report: [], errors: errs };
      repairV1(obj.docState);
      ensureFields(obj);
      return { ok: true, caseFile: obj, report: [], errors: [] };
    }
    if (v === 2) {
      var m2 = migrateV2(obj, nowIso);
      ensureFields(m2.caseFile);
      var errs2 = validate(m2.caseFile);
      if (errs2.length) return { ok: false, caseFile: null, report: [], errors: errs2 };
      return { ok: true, caseFile: m2.caseFile, report: m2.report, errors: [] };
    }
    if (v === 1) {
      var m1 = migrateV1(obj, nowIso);
      return { ok: true, caseFile: m1.caseFile, report: m1.report, errors: [] };
    }
    return { ok: false, caseFile: null, report: [], errors: ['This file is not a case file saved by this system, nor a draft saved by the Approvals Composer.'] };
  }

  /* Backfill fields added after a case was first saved, so an older v3
     (or freshly migrated) case gains the new defaults without loss. */
  function ensureFields(cf) {
    if (cf.outputProfile !== 'enhanced') cf.outputProfile = 'approved';
    if (!Array.isArray(cf.intake)) cf.intake = [];
    if (!cf.intakeFields || typeof cf.intakeFields !== 'object') cf.intakeFields = {};
    if (cf.intakeLayout === undefined) cf.intakeLayout = null;
    return cf;
  }

  /* Structural validation of a v3 case file. Returns a list of problems;
     an empty list means structurally sound. */
  function validate(cf) {
    var errs = [];
    if (!cf || typeof cf !== 'object') return ['Not an object.'];
    if (cf.schemaVersion !== SCHEMA_VERSION) errs.push('schemaVersion must be ' + SCHEMA_VERSION + '.');
    if (!MODULES[cf.module]) errs.push('Unknown module: ' + cf.module);
    if (cf.module === 'routine') {
      if (!PRESENTATIONS[cf.presentation]) errs.push('A routine case must record its presentation ("internal" or "formation").');
    } else if (cf.presentation != null) {
      errs.push('Only routine procurement has a presentation; ' + cf.module + ' cases must leave it unset.');
    }
    if (!cf.docState || typeof cf.docState !== 'object') errs.push('docState missing.');
    if (typeof cf.styleProfileId !== 'string' || !cf.styleProfileId) errs.push('styleProfileId missing.');
    if (!(Number.isInteger(cf.folioStart) && cf.folioStart >= 1)) errs.push('folioStart must be a whole number of 1 or more.');
    if (cf.sheetNumbering != null && cf.sheetNumbering !== 'manual' && cf.sheetNumbering !== 'follow-folio') {
      errs.push('sheetNumbering must be "manual", "follow-folio", or unset.');
    }
    if (cf.outputProfile != null && cf.outputProfile !== 'approved' && cf.outputProfile !== 'enhanced') {
      errs.push('outputProfile must be "approved", "enhanced", or unset.');
    }
    if (cf.intake != null && !Array.isArray(cf.intake)) errs.push('intake must be a list.');
    if (!cf.meta || typeof cf.meta !== 'object' || !Array.isArray(cf.meta.history)) errs.push('meta.history missing.');
    return errs;
  }

  /* Move a case to another activity (module id or legacy pathway code),
     keeping every section and recording the transition. Rare by design —
     the activity is chosen before data entry — but a case misfiled at the
     start must be movable without retyping. */
  function transitionActivity(cf, to, detail, nowIso) {
    var a = normalizeActivity(to);
    if (!a) throw new Error('Unknown activity: ' + to);
    var now = nowIso || new Date().toISOString();
    var from = activityLabel(cf);
    cf.module = a.module;
    cf.presentation = a.presentation;
    cf.meta.modifiedAt = now;
    cf.meta.history.push({ at: now, event: 'activity-changed', detail: 'From ' + from + ' to ' + activityLabel(cf) + (detail ? ' — ' + detail : '') });
    return cf;
  }

  /* Routine only: switch between the Ministry-internal minute and the
     external-formation presentation. The data is one case either way. */
  function setPresentation(cf, presentation, detail, nowIso) {
    if (cf.module !== 'routine') throw new Error('Only routine procurement has a presentation.');
    if (!PRESENTATIONS[presentation]) throw new Error('Unknown presentation: ' + presentation);
    if (cf.presentation === presentation) return cf;
    var now = nowIso || new Date().toISOString();
    var from = cf.presentation;
    cf.presentation = presentation;
    cf.meta.modifiedAt = now;
    cf.meta.history.push({ at: now, event: 'presentation-changed', detail: 'From ' + (PRESENTATIONS[from] || from) + ' to ' + PRESENTATIONS[presentation] + (detail ? ' — ' + detail : '') });
    return cf;
  }

  function touch(cf, nowIso) {
    cf.meta.modifiedAt = nowIso || new Date().toISOString();
    return cf;
  }

  function serialize(cf) { return JSON.stringify(cf, null, 1); }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    APP_VERSION: APP_VERSION,
    MODULES: MODULES,
    PRESENTATIONS: PRESENTATIONS,
    PATHWAYS: PATHWAYS,
    V1_FIELDS: V1_FIELDS,
    normalizeActivity: normalizeActivity,
    activityLabel: activityLabel,
    blankDocState: blankDocState,
    newCase: newCase,
    newCaseId: newCaseId,
    detectVersion: detectVersion,
    migrateV1: migrateV1,
    migrateV2: migrateV2,
    load: load,
    validate: validate,
    transitionActivity: transitionActivity,
    setPresentation: setPresentation,
    touch: touch,
    serialize: serialize
  };
});
