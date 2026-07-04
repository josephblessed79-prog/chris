/* storage.js — the data layer, "database-lite". Case files are
   self-contained JSON documents (casemodel.js). Storage works at three
   levels, selectable in Settings:
     (a) file-based save/load — always available, the default;
     (b) browser storage (localStorage) on the local machine, used only
         for autosave recovery;
     (c) a shared-folder case register — a folder of case JSON files plus
         an index the app can rebuild at any time.
   TRUE MULTI-USER CONCURRENCY NEEDS A SMALL SERVER. That is an IT
   decision and is stated plainly in README-IT.md; this module does not
   pretend otherwise. Two people saving the same case file to a share at
   the same moment will race, and the register index is only as fresh as
   its last rebuild.
   The pure logic here is Node-testable; the browser glue (download,
   folder pickers, localStorage) lives in js/app/.
   Loads as MODPA.storage / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./casemodel.js'), require('./verifycase.js'), require('./money.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.storage = factory(root.MODPA.casemodel, root.MODPA.verifycase, root.MODPA.money);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (casemodel, verifycase, money) {
  'use strict';

  var REGISTER_VERSION = 1;
  var AUTOSAVE_KEY = 'modpa-autosave-v2';

  function safeName(s) {
    return String(s || '').replace(/[^A-Za-z0-9 _-]/g, '').trim().replace(/\s+/g, '_').slice(0, 60);
  }

  /* The suggested file name for a case: caseId plus a readable subject. */
  function caseFileName(caseFile) {
    var subject = safeName(caseFile.docState && caseFile.docState.subject);
    return caseFile.caseId + (subject ? '__' + subject : '') + '.json';
  }

  /* One register row summarising a case, computed from the case itself. */
  function registerEntry(caseFile, fileName) {
    var total = verifycase.caseTotalCents(caseFile);
    var stats = verifycase.stats(caseFile);
    return {
      caseId: caseFile.caseId,
      fileName: fileName || caseFileName(caseFile),
      pathway: caseFile.pathway,
      subject: (caseFile.docState && caseFile.docState.subject) || '',
      fileNo: (caseFile.docState && (caseFile.docState.minfile || caseFile.docState.ref)) || '',
      styleProfileId: caseFile.styleProfileId,
      modifiedAt: caseFile.meta && caseFile.meta.modifiedAt || '',
      totalCents: isNaN(total) ? null : total,
      totalDisplay: isNaN(total) ? '' : money.fmtMoney(total),
      cleared: stats.fail === 0,
      failing: stats.fail
    };
  }

  /* Rebuild the register index from a list of {name, text} JSON files
     (however they were read — folder picker in the browser, fs in tests).
     Tolerant: bad files are reported, never silently dropped. */
  function rebuildRegister(files, nowIso) {
    var index = {
      registerVersion: REGISTER_VERSION,
      builtAt: nowIso || new Date().toISOString(),
      cases: [],
      problems: []
    };
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!/\.json$/i.test(f.name) || /^register-index\.json$/i.test(f.name)) continue;
      var obj;
      try { obj = JSON.parse(f.text); }
      catch (e) { index.problems.push(f.name + ': not valid JSON.'); continue; }
      var loaded = casemodel.load(obj, index.builtAt);
      if (!loaded.ok) { index.problems.push(f.name + ': ' + loaded.errors.join(' ')); continue; }
      index.cases.push(registerEntry(loaded.caseFile, f.name));
    }
    index.cases.sort(function (a, b) { return a.modifiedAt < b.modifiedAt ? 1 : a.modifiedAt > b.modifiedAt ? -1 : 0; });
    return index;
  }

  function serializeRegister(index) {
    return JSON.stringify(index, null, 1);
  }

  return {
    REGISTER_VERSION: REGISTER_VERSION,
    AUTOSAVE_KEY: AUTOSAVE_KEY,
    safeName: safeName,
    caseFileName: caseFileName,
    registerEntry: registerEntry,
    rebuildRegister: rebuildRegister,
    serializeRegister: serializeRegister
  };
});
