/* Style profile: Ministry internal minute — circled folio numerals.
   The hybrid minute style of the signed materials-and-supplies sample:
   folio register numbered ① ② ③, "Temp: Vol. I" in the header, two
   u.f.s routing lines, and the Procurement Unit line under the signature.
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
    id: 'ministry-circled',
    name: 'Ministry internal minute — circled folio numerals',
    description: 'Ministry of Defence minute sheet in the hybrid house style, folio register numbered ① ② ③ (as the materials-and-supplies sample).',
    kind: 'hybrid-minute',
    folio: { style: 'circled', showDates: true },
    header: { fileNoLabel: 'File No:', tempVol: 'Temp: Vol. I', title: 'MINUTE SHEET' },
    routing: {
      addressee: 'Permanent Secretary',
      ufsLines: [
        'u.f.s Administrative Officer IV (Ag), (Procurement)',
        'u.f.s Administrative Officer V (Ag), (Procurement)'
      ]
    },
    signature: { post: 'Clerk IV (Ag)', unitLine: 'Procurement Unit', handwrittenDay: true }
    /* ==== EDIT ABOVE THIS LINE ==== */
  };
});
