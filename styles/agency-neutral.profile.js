/* Style profile: neutral agency.
   A plain presentation for agencies without their own profile yet (Police,
   Fire, Prison Services and others). Copy this file to make an agency
   profile: set the letterhead, routing lines and signature.
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
    id: 'agency-neutral',
    name: 'Neutral agency',
    description: 'Plain presentation for an agency without a dedicated profile. Dotted folio numerals, no letterhead, single routing line.',
    kind: 'hybrid-minute',
    letterhead: { formation: '', lines: [], preprinted: true },
    folio: { style: 'dotted', showDates: true },
    header: { fileNoLabel: 'File No:', tempVol: 'Vol. I', title: 'MINUTE SHEET' },
    routing: { addressee: 'Permanent Secretary', ufsLines: [] },
    signature: { post: '', unitLine: '', handwrittenDay: true }
    /* ==== EDIT ABOVE THIS LINE ==== */
  };
});
