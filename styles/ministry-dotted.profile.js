/* Style profile: Ministry internal minute — dotted-leader folio numerals.
   The hybrid minute style of the signed boxed-meals sample: "File No / Vol /
   Sheet No" header, folio register "1. …… 04/05/26", "Approval is hereby
   sought…", regulation 10 and 11, OPR depository line, funding vote block
   and vote status table.
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
    id: 'ministry-dotted',
    name: 'Ministry internal minute — dotted folio numerals',
    description: 'Ministry of Defence minute sheet in the hybrid house style, folio register numbered 1. 2. 3. with dotted leaders (as the boxed-meals sample).',
    kind: 'hybrid-minute',
    folio: { style: 'dotted', showDates: true },
    header: { fileNoLabel: 'File No:', tempVol: 'Vol. I', title: 'MINUTE SHEET' },
    routing: {
      addressee: 'Permanent Secretary',
      ufsLines: ['ufs Administrative Officer V (Ag)']
    },
    signature: { post: 'Clerk IV (Ag)', unitLine: '', handwrittenDay: true }
    /* ==== EDIT ABOVE THIS LINE ==== */
  };
});
