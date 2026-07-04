/* Style profile: TTDF / Coast Guard formation letter.
   kind "legacy-approval" routes rendering to the formation approval-letter
   builder, which reproduces the Approvals Composer output exactly.
   ==== IT OFFICERS: the data between the ==== markers is plain JSON-style
   data. Edit values; do not edit the wrapper lines. To create a new
   profile, copy this file, change the id and values, and add one
   <script src="styles/your-file.profile.js"></script> line to index.html. */
(function (root, factory) {
  'use strict';
  var profile = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = profile;
  } else {
    root.MODPA.styleprofile.register(profile);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  return {
    /* ==== EDIT BELOW THIS LINE ==== */
    id: 'ttcg-formation',
    name: 'TTCG formation letter',
    description: 'Formation approval letter to the Permanent Secretary, in the Trinidad and Tobago Coast Guard presentation. Byte-identical to the original Approvals Composer letter.',
    kind: 'legacy-approval',
    letterhead: {
      formation: 'TRINIDAD AND TOBAGO COAST GUARD',
      lines: [
        'C/O CARENAGE POST OFFICE',
        'REPUBLIC OF TRINIDAD AND TOBAGO',
        'WEST INDIES',
        'TELEPHONE: 224-3324',
        '634-1476'
      ],
      preprinted: false
    },
    folio: { style: 'dotted', showDates: true },
    routing: { addressee: 'Permanent Secretary', ufsLines: [] }
    /* ==== EDIT ABOVE THIS LINE ==== */
  };
});
