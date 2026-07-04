/* docs/checklist.js — the approvals checklist. Ported from
   Approvals_Composer.html buildChecklist; byte-parity is tested.
   Loads in the browser as MODPA.docs.checklist and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('../textutil.js'), require('../verify.js'), require('./common.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.docs = root.MODPA.docs || {};
    root.MODPA.docs.checklist = factory(root.MODPA.textutil, root.MODPA.verify, root.MODPA.docs.common);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (textutil, verify, common) {
  'use strict';

  var esc = textutil.esc;

  function buildChecklist(st) {
    var R = verify.runChecks(st);
    function agg(prefix) {
      var worst = 'PASS', found = false;
      for (var i = 0; i < R.length; i++) if (R[i].id.indexOf(prefix) === 0) { found = true; if (R[i].result === 'FAIL') worst = 'FAIL'; else if (R[i].result === 'WARN' && worst !== 'FAIL') worst = 'WARN'; }
      return found ? worst : '—';
    }
    var rows = [
      ['Request and subject are clear', agg('C4')],
      ['Operational need is stated', agg('C17')],
      ['Procurement method is stated and justified where required', agg('C14')],
      ['Suppliers contacted are recorded (including non-respondents)', agg('C19')],
      ['Supplier responses are evidenced by quotations on file', agg('C20')],
      ['Recommended supplier is supported (lowest responsive cost or written justification)', agg('C10')],
      ['Arithmetic is correct (unit cost × quantity + VAT, line and grand totals)', agg('C9') === '—' ? agg('C11') : agg('C9')],
      ['Amount in words agrees with figures (computer-generated from the same number)', agg('C11')],
      ['VAT treatment is clear and not double-counted', agg('C12')],
      ['Funding vote is stated' + (st.funds ? ' and available funds cover the total' : ''), agg('C15') === 'FAIL' ? 'FAIL' : agg('C16') === '—' ? agg('C15') : agg('C16')],
      ['Attachments match the narrative', agg('C20')],
      ['Minute sheet folio register is complete', agg('C21')],
      ['Approval and minute state the same supplier(s), amount, method and vote (single data source)', 'PASS']
    ];
    var h = common.draftStampIfNeeded(st);
    h += '<div class="ttl">APPROVAL PACK CHECKLIST</div>';
    h += '<p style="text-align:center;margin-top:-6pt"><b>' + esc(st.subject || '[subject]') + '</b> — File: ' + esc(st.ref || '[ref]') + '</p>';
    h += '<p style="font-size:10.5pt">Automated results below are computed from the pack data. The Folio column and final sign-off are completed by hand against the physical file. If any item shows FAIL, return the file for correction before submission.</p>';
    h += '<table class="cert"><tr><th style="width:6%">No.</th><th>Check</th><th style="width:12%">Result</th><th style="width:14%">Folio</th><th style="width:12%">Verified (initial)</th></tr>';
    for (var i = 0; i < rows.length; i++) h += '<tr><td class="r">' + (i + 1) + '</td><td>' + rows[i][0] + '</td><td class="r">' + rows[i][1] + '</td><td></td><td></td></tr>';
    h += '</table>';
    h += '<p style="margin-top:20pt">Prepared / checked by: ____________________________&nbsp;&nbsp;Date: ______________</p>';
    h += '<p>Supervisor / PPO / AO V review: ____________________________&nbsp;&nbsp;Date: ______________</p>';
    return h;
  }

  return { buildChecklist: buildChecklist };
});
