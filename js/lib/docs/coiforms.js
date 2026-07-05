/* docs/coiforms.js — the Conflict of Interest and Confidentiality
   Declaration forms, to Appendix I of the OPR Evaluation of Submissions
   guideline. One form per evaluation committee member; every member must
   sign before the evaluation. The declaration wording follows the OPR
   sample form. Registers 'coi-forms'. Loads as MODPA.docs.coiforms /
   require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../textutil.js'), require('../formal.js'), require('../documents.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.coiforms = factory(root.MODPA.textutil, root.MODPA.formal, root.MODPA.documents);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (textutil, formal, documents) {
  'use strict';

  var esc = textutil.esc;

  function oneForm(publicBody, project, member) {
    var name = (member && member.name) || '';
    var title = (member && member.jobTitle) || '';
    var h = '<div class="ttl" style="font-size:14pt">' + esc(publicBody || '[PUBLIC BODY]') + '</div>';
    h += '<div style="text-align:center;font-weight:bold">Confidentiality and Conflict of Interest Declaration Form</div>';
    h += '<p style="margin-top:8pt"><b>Name:</b> ' + esc(name || '____________________') + '<br>' +
      '<b>Job Title:</b> ' + esc(title || '____________________') + '<br>' +
      '<b>Procurement Project:</b> ' + esc(project || '[project]') + '</p>';

    h += '<p style="font-weight:bold;margin-top:10pt">CONFIDENTIALITY DECLARATION</p>';
    h += '<p>As a member of the evaluation committee / approver of the procurement process or approver of the recommendation for award of contract for the above-mentioned procurement project, I hereby declare that all the information that comes into my possession and that is deliberated upon during the procurement process, especially during the evaluation, shall not be disclosed to any other party other than that which is approved by the panel. I understand that disclosure of information to unauthorised parties may lead to my input being disqualified, rejection of the entire report and/or the termination of the procurement process.</p>';
    h += '<p>I confirm that the declarations I have made above are, to the best of my knowledge, correct. I fully understand that, if the public body concludes that the declarations I have made are false or materially misleading, the public body may refer the matter to the relevant person/authority for disciplinary action. I have read, understand and agree to adhere to the above declaration.</p>';
    h += '<p style="margin-top:10pt">Title: ____________________&nbsp;&nbsp;Signature: ____________________&nbsp;&nbsp;Date: ____________</p>';

    h += '<p style="font-weight:bold;margin-top:14pt">CONFLICT OF INTEREST DECLARATION</p>';
    h += '<p>In exercising my responsibility as a member of the evaluation committee / approver of the procurement process or recommendation for award of contract I will uphold the objects of the Public Procurement and Disposal of Public Property Act 2015, as amended. Additionally, I have read and understood the Office of Procurement Regulation’s Guidelines for Ethical Conduct, and I will take all reasonable steps to notify the Chairman of the Evaluation Committee, the ‘named’ Procurement Officer or the Accounting Officer / CEO (as may be appropriate) of any conflict that arises through professional or personal interests relevant to this procurement project.</p>';
    h += '<p>I agree to declare any effort by any party to unduly influence the evaluation process and decisions concerning the award of a contract, at the earliest opportunity. Should an actual or potential conflict arise at any time during the evaluation process, I further declare that I will immediately notify the Chairman of the Evaluation Committee, the ‘named’ Procurement Officer or the Accounting Officer / CEO in writing. I acknowledge that the Chairman, the ‘named’ Procurement Officer or the Accounting Officer / CEO may take such decision as appropriate, including discontinuing my involvement in the evaluation process.</p>';
    h += '<p style="margin-top:8pt"><i>Please enter details in the relevant sections below; if no conflict exists, please write “none”.</i></p>';
    var declared = member && (member.coiConflict || '').trim();
    var fill = declared ? esc(member.coiConflict) : '';
    h += '<table style="width:100%;border-collapse:collapse;font-size:10.5pt">';
    h += coiRow('Ownership, part-ownership or directorship (including non-executive) in any participating firm:', fill);
    h += coiRow('Any majority or controlling shareholdings in organisations entering this process:', fill);
    h += coiRow('Any benefits, gifts or hospitality received from organisations entering this process:', fill);
    h += coiRow('Details of any actual, potential or perceived conflict of interest from your participation:', fill);
    h += '</table>';
    h += '<p style="margin-top:10pt">I have read, understood and agree to adhere to the above declaration.</p>';
    h += '<p>Title: ____________________&nbsp;&nbsp;Signature: ____________________&nbsp;&nbsp;Date: ____________</p>';
    h += '<p style="margin-top:8pt;font-size:10pt"><b>Review of Declaration</b> (to be completed by the Named Procurement Officer or delegate): ____________________________________________</p>';
    h += '<p style="font-size:9pt;color:#555">Actual: a real conflict already exists. Potential: a conflict is about to happen, or could happen. Perceived: others might reasonably perceive that a person is compromised.</p>';
    return h;
  }

  function coiRow(label, fill) {
    return '<tr><td style="border:1px solid #ccc;padding:5pt;width:58%">' + esc(label) + '</td><td style="border:1px solid #ccc;padding:5pt">' + (fill || '&nbsp;') + '</td></tr>';
  }

  function build(caseFile) {
    var f = caseFile.formal || formal.newFormal();
    var publicBody = (caseFile.docState && caseFile.docState.formation) || 'Ministry of Defence';
    var project = f.rfpTitle || (caseFile.docState && caseFile.docState.subject) || '[project]';
    var members = f.committee.filter(function (m) { return (m.name || '').trim(); });
    if (!members.length) {
      return oneForm(publicBody, project, null) +
        '<p style="color:#888;margin-top:10pt">No committee members are recorded yet — add them on Working Papers and a signed form is produced for each.</p>';
    }
    var parts = [];
    for (var i = 0; i < members.length; i++) {
      parts.push(oneForm(publicBody, project, members[i]));
    }
    /* page-break between members when printed / saved to Word */
    return parts.join('<div style="page-break-after:always;border-top:2px dashed #bbb;margin:24pt 0"></div>');
  }

  documents.registerBuilder('coi-forms', build);
  return { build: build, oneForm: oneForm };
});
