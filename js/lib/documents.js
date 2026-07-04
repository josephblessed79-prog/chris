/* documents.js — the document dispatcher. Given a case file and its style
   profile, routes each document type to the right builder. Legacy-kind
   profiles route to the ported Approvals Composer builders (byte-identical
   output, proven by test); hybrid-kind profiles route to the hybrid minute
   builder used by pathways P1 and P2 in the sample house style.
   Loads in the browser as MODPA.documents and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(
      require('./styleprofile.js'),
      require('./docs/approval.js'),
      require('./docs/minute.js'),
      require('./docs/checklist.js'),
      require('./docs/certificate.js'),
      require('./docs/common.js')
    );
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.documents = factory(
      root.MODPA.styleprofile,
      root.MODPA.docs.approval,
      root.MODPA.docs.minute,
      root.MODPA.docs.checklist,
      root.MODPA.docs.certificate,
      root.MODPA.docs.common
    );
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (styleprofile, dApproval, dMinute, dChecklist, dCert, common) {
  'use strict';

  /* Builders registered by later modules (hybrid minute, evaluation report,
     verbal quotation form, disposal instruments) hook in here so this
     dispatcher never needs editing to add a document type. */
  var extraBuilders = {};

  function registerBuilder(docType, fn) {
    extraBuilders[docType] = fn;
  }

  /* Which document types make sense for a case, by pathway and profile. */
  function availableDocs(caseFile) {
    var p = styleprofile.get(caseFile.styleProfileId);
    var out = [];
    if (caseFile.pathway === 'P2') out.push({ id: 'approval', label: 'Formation approval letter' });
    out.push({ id: 'minute', label: 'Ministry minute sheet' });
    if (caseFile.pathway === 'P1' && caseFile.verbal) {
      out.push({ id: 'verbal-form', label: 'Verbal quotation form' });
      out.push({ id: 'phone-register', label: 'Telephone-contact register' });
    }
    if (caseFile.pathway === 'P3' && caseFile.evaluation) {
      out.push({ id: 'eval-report', label: 'Evaluation report' });
      out.push({ id: 'eval-worksheet', label: 'Evaluation worksheet' });
    }
    if (caseFile.pathway === 'P4' && caseFile.disposal) {
      out.push({ id: 'disposal-inventory', label: 'Disposal inventory and valuation record' });
      out.push({ id: 'disposal-minute', label: 'Disposal Committee minute' });
      out.push({ id: 'disposal-instrument', label: 'Approval instrument (disposal)' });
    }
    out.push({ id: 'checklist', label: 'Approvals checklist' });
    out.push({ id: 'certificate', label: 'Verification certificate' });
    return out;
  }

  /* caseFile + docType -> document body HTML. Throws on unknown types so a
     wiring mistake is loud, never a silently blank document. */
  function build(caseFile, docType) {
    var profile = styleprofile.get(caseFile.styleProfileId);
    var st = caseFile.docState;
    if (docType === 'approval') {
      /* The formation letter keeps the legacy presentation for every profile;
         profile letterhead defaults apply when the case has none. */
      return dApproval.buildApproval(st);
    }
    if (docType === 'minute') {
      if (profile.kind === 'legacy-minute' || profile.kind === 'legacy-approval') {
        return dMinute.buildMinute(st);
      }
      if (extraBuilders['minute-hybrid']) return extraBuilders['minute-hybrid'](caseFile, profile);
      throw new Error('The hybrid minute builder is not loaded (js/lib/docs/hybridminute.js).');
    }
    if (docType === 'checklist') return dChecklist.buildChecklist(st);
    if (docType === 'certificate') {
      if (extraBuilders['certificate']) return extraBuilders['certificate'](caseFile, profile);
      return dCert.buildCert(st);
    }
    if (extraBuilders[docType]) return extraBuilders[docType](caseFile, profile);
    throw new Error('Unknown document type: ' + docType);
  }

  /* Full downloadable .doc content for one document. */
  function buildDoc(caseFile, docType, title) {
    return common.wordWrap(build(caseFile, docType), title || docType);
  }

  return {
    registerBuilder: registerBuilder,
    availableDocs: availableDocs,
    build: build,
    buildDoc: buildDoc
  };
});
