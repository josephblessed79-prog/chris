/* casemodel.js — the case file: a self-contained JSON document with a schema
   version. Version 2 wraps the original Approvals_Composer draft (version 1)
   unchanged inside `docState`, and adds the pathway, style profile, folio
   start number, and the pathway-specific sections (evaluation, verbal,
   disposal, vote status). Migration from v1 loses nothing: unknown fields
   are preserved under `extra.unknownV1Fields` and reported.
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

  var SCHEMA_VERSION = 2;
  var APP = 'MODPA';
  var APP_VERSION = '2.0.0';

  var PATHWAYS = {
    P1: 'Ministry internal procurement',
    P2: 'Procurement on behalf of external formations',
    P3: 'Evaluation Committee',
    P4: 'Disposal Committee'
  };

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

  function newCase(pathway, styleProfileId, nowIso) {
    if (!PATHWAYS[pathway]) throw new Error('Unknown pathway: ' + pathway);
    var now = nowIso || new Date().toISOString();
    return {
      schemaVersion: SCHEMA_VERSION,
      caseId: newCaseId(now),
      pathway: pathway,
      styleProfileId: styleProfileId || 'ministry-dotted',
      folioStart: 1,
      /* null until decided; 'manual' | 'follow-folio'. The question is
         only put to the user when folioStart is above 1 (see verifycase). */
      sheetNumbering: null,
      meta: {
        app: APP, appVersion: APP_VERSION,
        createdAt: now, modifiedAt: now,
        history: [{ at: now, event: 'created', detail: 'Pathway ' + pathway + ' — ' + PATHWAYS[pathway] }]
      },
      docState: blankDocState(),
      evaluation: null,
      verbal: null,
      disposal: null,
      voteStatus: null,
      extra: {}
    };
  }

  /* 2 | 1 | 0 (unrecognised) */
  function detectVersion(obj) {
    if (!obj || typeof obj !== 'object') return 0;
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
    var cf = newCase('P2', 'ttcg-formation', now);
    cf.docState = doc;
    cf.extra = unknownKeys.length ? { unknownV1Fields: unknown } : {};
    cf.meta.history.push({ at: now, event: 'migrated', detail: 'Migrated from schema version 1 (Approvals Composer draft). ' + (report.length ? report.join(' | ') : 'No repairs required.') });
    report.unshift('Migrated from schema version 1. The draft opened in pathway P2 (formation approval) with the TTCG formation profile — the combination that reproduces the old tool’s documents exactly. Change the pathway or profile if this case is something else.');
    return { caseFile: cf, report: report };
  }

  /* Any parsed JSON object -> { ok, caseFile, report, errors } */
  function load(obj, nowIso) {
    var v = detectVersion(obj);
    if (v === 2) {
      var errs = validate(obj);
      if (errs.length) return { ok: false, caseFile: null, report: [], errors: errs };
      repairV1(obj.docState);
      return { ok: true, caseFile: obj, report: [], errors: [] };
    }
    if (v === 1) {
      var m = migrateV1(obj, nowIso);
      return { ok: true, caseFile: m.caseFile, report: m.report, errors: [] };
    }
    return { ok: false, caseFile: null, report: [], errors: ['This file is not a case file saved by this system, nor a draft saved by the Approvals Composer.'] };
  }

  /* Structural validation of a v2 case file. Returns a list of problems;
     an empty list means structurally sound. */
  function validate(cf) {
    var errs = [];
    if (!cf || typeof cf !== 'object') return ['Not an object.'];
    if (cf.schemaVersion !== 2) errs.push('schemaVersion must be 2.');
    if (!PATHWAYS[cf.pathway]) errs.push('Unknown pathway: ' + cf.pathway);
    if (!cf.docState || typeof cf.docState !== 'object') errs.push('docState missing.');
    if (typeof cf.styleProfileId !== 'string' || !cf.styleProfileId) errs.push('styleProfileId missing.');
    if (!(Number.isInteger(cf.folioStart) && cf.folioStart >= 1)) errs.push('folioStart must be a whole number of 1 or more.');
    if (cf.sheetNumbering != null && cf.sheetNumbering !== 'manual' && cf.sheetNumbering !== 'follow-folio') {
      errs.push('sheetNumbering must be "manual", "follow-folio", or unset.');
    }
    if (!cf.meta || typeof cf.meta !== 'object' || !Array.isArray(cf.meta.history)) errs.push('meta.history missing.');
    return errs;
  }

  /* Move a case between pathways, keeping every section and recording the
     transition. The caller applies any data projection (for example the
     evaluation result becoming award items) before or after this call. */
  function transitionPathway(cf, toPathway, detail, nowIso) {
    if (!PATHWAYS[toPathway]) throw new Error('Unknown pathway: ' + toPathway);
    var now = nowIso || new Date().toISOString();
    var from = cf.pathway;
    cf.pathway = toPathway;
    cf.meta.modifiedAt = now;
    cf.meta.history.push({ at: now, event: 'pathway-changed', detail: 'From ' + from + ' to ' + toPathway + (detail ? ' — ' + detail : '') });
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
    PATHWAYS: PATHWAYS,
    V1_FIELDS: V1_FIELDS,
    blankDocState: blankDocState,
    newCase: newCase,
    newCaseId: newCaseId,
    detectVersion: detectVersion,
    migrateV1: migrateV1,
    load: load,
    validate: validate,
    transitionPathway: transitionPathway,
    touch: touch,
    serialize: serialize
  };
});
