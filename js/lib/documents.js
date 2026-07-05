/* documents.js — the document dispatcher. Given a case file and its style
   profile, routes each document type to the right builder. Legacy-kind
   profiles route to the ported Approvals Composer builders (byte-identical
   output, proven by test); hybrid-kind profiles route to the hybrid minute
   builder used by routine procurement in the sample house style.
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

  /* Which document types make sense for a case. The menu is module-scoped:
     each activity sees only its own instruments, and nothing procurement-
     worded is ever offered to a disposal case. */
  function availableDocs(caseFile) {
    var out = [];
    if (caseFile.module === 'disposal') {
      if (caseFile.disposal) {
        out.push({ id: 'disposal-form-a', label: 'Form A — Request for Asset Disposal' });
        out.push({ id: 'disposal-form-b', label: 'Form B — Inventory & Inspection Report' });
        out.push({ id: 'disposal-form-c', label: 'Form C — Committee Appraisal Report' });
        out.push({ id: 'disposal-form-d', label: 'Form D — Disposal Strategy Development Report' });
        out.push({ id: 'disposal-form-e', label: 'Form E — Strategy Approval / Signature Form' });
      }
      return out;
    }
    if (caseFile.module === 'formal-evaluation') {
      /* The formal module registers its own documents (OPR evaluation
         report, conflict-of-interest and confidentiality declarations)
         when its engine is loaded. */
      return out;
    }
    /* routine / daily procurement */
    if (caseFile.presentation === 'formation') out.push({ id: 'approval', label: 'Formation approval letter' });
    out.push({ id: 'minute', label: 'Ministry minute sheet' });
    if (caseFile.verbal) {
      out.push({ id: 'verbal-form', label: 'Verbal quotation form' });
      out.push({ id: 'phone-register', label: 'Telephone-contact register' });
    }
    if (caseFile.evaluation) {
      out.push({ id: 'eval-report', label: 'Supplier comparison record' });
      out.push({ id: 'eval-worksheet', label: 'Supplier comparison worksheet' });
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
      /* Legacy profiles keep the byte-identical legacy certificate; hybrid
         profiles get the pathway-aware certificate once it is loaded. */
      if (profile.kind === 'hybrid-minute' && extraBuilders['certificate-hybrid']) {
        return extraBuilders['certificate-hybrid'](caseFile, profile);
      }
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
