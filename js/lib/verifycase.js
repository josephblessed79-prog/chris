/* verifycase.js — pathway-aware verification over a whole v2 case file.
   Assembles the right check series for what the case actually is:
     - item/quote cases (legacy P1/P2): the full C-series;
     - evaluation cases (P3, or P1/P2 carried from P3): G-series + E-series;
     - verbal micro-procurement (P1): G-series + V-series;
     - vote status (any pathway): H-series;
   and computes the one figure every stamp depends on: does the case clear?
   Loads in the browser as MODPA.verifycase and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./verify.js'), require('./evaluation.js'),
      require('./verbal.js'), require('./votestatus.js'), require('./compute.js'),
      require('./folio.js'), require('./disposal.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.verifycase = factory(root.MODPA.verify, root.MODPA.evaluation,
      root.MODPA.verbal, root.MODPA.votestatus, root.MODPA.compute,
      root.MODPA.folio, root.MODPA.disposal);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (verify, evaluation, verbal, votestatus, compute, folio, disposal) {
  'use strict';

  /* The case total in cents: evaluation grand total, verbal schedule total,
     or the legacy items grand total. NaN when not computable. */
  function caseTotalCents(caseFile) {
    if (caseFile.evaluation && caseFile.evaluation.items && caseFile.evaluation.items.length) {
      var bk = evaluation.breakdown(caseFile.evaluation);
      return bk.bad ? NaN : bk.grandTotalCents;
    }
    if (caseFile.verbal && caseFile.verbal.schedule && caseFile.verbal.schedule.length) {
      return verbal.totalCents(caseFile.verbal);
    }
    return compute.grandTotal(caseFile.docState.items);
  }

  /* G-series: the general controls for evaluation/verbal cases (item-based
     cases get these through the fuller C-series instead). */
  function runGeneralChecks(caseFile) {
    var st = caseFile.docState;
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    add('G1', 'File number entered', (st.minfile || st.ref) ? 'PASS' : 'FAIL', st.minfile || st.ref || 'Missing', 'Enter the file number on Case Details.');
    add('G2', 'Document date entered', st.date ? 'PASS' : 'FAIL', st.date || 'Missing', 'Enter the date on Case Details.');
    var purpose = st.subjectProse || (caseFile.verbal && caseFile.verbal.purpose) || st.subject;
    add('G3', 'Subject / purpose stated', (purpose || '').trim() ? 'PASS' : 'FAIL', '', 'State the subject or purpose of the procurement.');
    add('G4', 'Signatory entered', (st.minsigname || st.signame) ? 'PASS' : 'FAIL', '', 'Enter the name of the officer signing the minute.');
    var live = (st.folios || []).filter(function (f) { return f && f.desc && String(f.desc).trim(); });
    add('G5', 'Folio register present', live.length ? 'PASS' : 'FAIL', live.length ? live.length + ' folio(s), numbered from ' + (caseFile.folioStart || 1) + '.' : '', 'Build the folio register; every document reference is computed from it.');
    return R;
  }

  function runAllChecks(caseFile) {
    var R = [];
    var isEval = !!(caseFile.evaluation && caseFile.evaluation.items && caseFile.evaluation.items.length);
    var isVerbal = !!(caseFile.verbal && (caseFile.verbal.contacts.length || caseFile.verbal.schedule.length));
    var isDisposal = caseFile.pathway === 'P4' || !!(caseFile.disposal && caseFile.disposal.items && caseFile.disposal.items.length);
    if (isDisposal) {
      R = R.concat(runGeneralChecks(caseFile));
      R = R.concat(disposal.runDisposalChecks(caseFile.disposal));
      R = R.concat(sheetNumberingCheck(caseFile));
      return R; /* a disposal case has no procurement award or vote status */
    }
    if (isEval || isVerbal) {
      R = R.concat(runGeneralChecks(caseFile));
      if (isEval) R = R.concat(evaluation.runEvalChecks(caseFile.evaluation));
      if (isVerbal) R = R.concat(verbal.runVerbalChecks(caseFile.verbal));
    } else {
      R = R.concat(verify.runChecks(caseFile.docState));
    }
    R = R.concat(sheetNumberingCheck(caseFile));
    R = R.concat(votestatus.runVoteChecks(caseFile.voteStatus, caseTotalCents(caseFile)));
    return R;
  }

  /* G6 — sheet numbering against a custom starting folio. The question
     only exists when a starting folio other than 1 is set (with folio
     start 1 the sheet number already aligns and nothing is asked). The
     recorded decision is carried in the check detail so every
     certificate shows how the sheet number was arrived at. */
  function sheetNumberingCheck(caseFile) {
    if (!(Number.isInteger(caseFile.folioStart) && caseFile.folioStart > 1)) return [];
    var typed = (caseFile.docState && caseFile.docState.minsheet) || '';
    if (caseFile.sheetNumbering === 'follow-folio') {
      return [{ id: 'G6', name: 'Sheet numbering decision recorded', result: 'PASS',
        detail: 'Sheet numbers follow the starting folio number (' + caseFile.folioStart + '): the minute prints Sheet No ' + folio.sheetLabel(typed, caseFile.folioStart, 'follow-folio') + '. Decision recorded on this case.', action: '' }];
    }
    if (caseFile.sheetNumbering === 'manual') {
      return [{ id: 'G6', name: 'Sheet numbering decision recorded', result: 'PASS',
        detail: 'Sheet numbers are kept separate from the folio numbering: the minute prints Sheet No ' + (typed || '1a') + ' as typed. Decision recorded on this case.', action: '' }];
    }
    return [{ id: 'G6', name: 'Sheet numbering decision recorded', result: 'WARN',
      detail: 'The starting folio number is ' + caseFile.folioStart + ', and no decision is recorded on whether the sheet numbers should follow it or stay as typed (' + (typed || '1a') + ' at present).',
      action: 'On Case Details, choose whether the sheet numbers follow the starting folio or are kept separate for this file.' }];
  }

  function stats(caseFile) {
    return verify.checkStats(runAllChecks(caseFile));
  }

  /* DRAFT stamp for hybrid documents, driven by the full case verification. */
  function draftStamp(caseFile) {
    var s = stats(caseFile);
    return s.fail > 0 ? '<div class="draftstamp">DRAFT — NOT CLEARED — ' + s.fail + ' VERIFICATION CHECK' + (s.fail === 1 ? '' : 'S') + ' FAILED</div>' : '';
  }

  return {
    caseTotalCents: caseTotalCents,
    runGeneralChecks: runGeneralChecks,
    runAllChecks: runAllChecks,
    stats: stats,
    draftStamp: draftStamp
  };
});
