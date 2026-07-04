/* Style profile: Ministry minute (original tool format).
   kind "legacy-minute" routes rendering to the ported minute-sheet builder,
   which reproduces the Approvals Composer output exactly.
   ==== IT OFFICERS: see ttcg-formation.profile.js for how to edit or copy. */
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
    id: 'ministry-minute',
    name: 'Ministry minute (original tool format)',
    description: 'The Ministry minute sheet exactly as the original Approvals Composer produced it. Kept for continuity with drafts prepared in the old tool.',
    kind: 'legacy-minute',
    folio: { style: 'dotted', showDates: true },
    routing: { addressee: 'Permanent Secretary (Accounting Officer)', ufsLines: ['Ufs AOV'] }
    /* ==== EDIT ABOVE THIS LINE ==== */
  };
});
