/* styleprofile.js — the style-profile registry. A style profile is data,
   not code: letterhead, folio presentation, header fields, routing lines,
   phrase variants, signature layout. Profiles live in styles/*.profile.js —
   each file is a JSON object wrapped in the standard one-line registration
   so it loads offline from file:// (browsers block fetch() of local JSON).
   Adding a profile is a documented, code-free exercise: copy a profile
   file, change the JSON, add one <script> line to index.html.
   Loads in the browser as MODPA.styleprofile and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.styleprofile = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var registry = {};
  var order = [];

  /* Defaults guarantee that a sparse profile still renders every phrase;
     a profile overrides only what differs. All figure placeholders are
     substituted with computed values only. */
  var DEFAULTS = {
    kind: 'hybrid-minute',            // which builder renders this profile
    letterhead: { formation: '', lines: [], preprinted: false },
    folio: { style: 'dotted', showDates: true },
    header: { fileNoLabel: 'File No:', tempVol: 'Vol. I', sheetPrefix: '1', title: 'MINUTE SHEET' },
    routing: { addressee: 'Permanent Secretary', ufsLines: [] },
    phrases: {
      folioRefer: 'Folios  {first}   to   {last}    refers,',
      approvalSoughtSingle: 'Approval is hereby sought to incur expenditure in the sum of {words} ({figure}) in favour of {supplier} for {purpose}.',
      approvalSoughtMultiLead: 'Approval is hereby sought to incur expenditure in favour of the following suppliers for {purpose} as follows: -',
      approvalSoughtMultiLine: '{words} ({figure}) in favour of {supplier}.',
      quotationsRequested: 'Quotations were requested from {invitedWord} ({invited}) companies for the provision of {purpose}, only {quotedWord} ({quoted}) companies replied. Details are listed hereunder: -',
      verbalQuotation: 'A verbal quotation form was used as a means of micro procurement. {contactedWord} companies were contacted via telephone and verbal quotations were given. After examination of the verbal quotations, it was recommended that {supplier} was the best option based on price. {folioRefs} refers.',
      regulationLine: 'In accordance with regulation 10 and 11 of the Public Procurement and Disposal of Public Property (Procurement Methods and Procedures) Regulations, it is recommended that approval is conveyed.',
      oprLine: 'The Permanent Secretary is also advised that {suppliers} {isAre} registered with the Office of Procurement Regulation (OPR’s) Procurement Depository.',
      fundingLine: 'Funding to meet this expenditure in the sum of {words} ({figure}) to be made available under the following vote:',
      voteStatusLead: 'The status of the vote is as follows:',
      transferLine: 'The Director of Finance to address the necessary transfer for additional funds.',
      submittedApprovalSingle: 'Submitted for your consideration and approval to incur expenditure in the sum of {words} ({figure}), in favour of {supplier}.',
      submittedApprovalMultiLead: 'Submitted for your consideration and approval to incur expenditure in favour of the following suppliers for {purpose}, please.',
      submittedConsideration: 'Submitted for your consideration.',
      minuteContinues: 'Minute (1) Continues…'
    },
    signature: { name: '', post: '', unitLine: '', handwrittenDay: true },
    voteStatusColumns: ['Original Provision', 'Revised Allocation', 'Releases\nTo Date', 'Expenditure\nto date', 'Commitment', 'Balance of Releases', 'Balance of\nProvision', 'Uncommitted Balance']
  };

  function isPlainObject(x) {
    return x && typeof x === 'object' && !Array.isArray(x);
  }

  function merge(base, over) {
    var out = {};
    var k;
    for (k in base) if (Object.prototype.hasOwnProperty.call(base, k)) {
      out[k] = isPlainObject(base[k]) ? merge(base[k], {}) : base[k];
    }
    for (k in over) if (Object.prototype.hasOwnProperty.call(over, k)) {
      if (isPlainObject(over[k]) && isPlainObject(out[k])) out[k] = merge(out[k], over[k]);
      else out[k] = over[k];
    }
    return out;
  }

  /* {placeholder} substitution. Values must already be computed/escaped by
     the caller; the template itself is trusted profile data. */
  function fill(template, values) {
    return String(template).replace(/\{(\w+)\}/g, function (m, key) {
      return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : m;
    });
  }

  function validateProfile(p) {
    var errs = [];
    if (!p || typeof p !== 'object') return ['Profile is not an object.'];
    if (!p.id || typeof p.id !== 'string') errs.push('Profile id missing.');
    if (!p.name) errs.push('Profile name missing.');
    if (p.folio && p.folio.style && p.folio.style !== 'dotted' && p.folio.style !== 'circled') {
      errs.push('folio.style must be "dotted" or "circled".');
    }
    if (p.kind && ['hybrid-minute', 'legacy-approval', 'legacy-minute'].indexOf(p.kind) < 0) {
      errs.push('kind must be hybrid-minute, legacy-approval or legacy-minute.');
    }
    return errs;
  }

  function register(profile) {
    var errs = validateProfile(profile);
    if (errs.length) throw new Error('Style profile rejected: ' + errs.join(' '));
    var full = merge(DEFAULTS, profile);
    if (!registry[profile.id]) order.push(profile.id);
    registry[profile.id] = full;
    return full;
  }

  function get(id) {
    if (!registry[id]) throw new Error('Unknown style profile: ' + id + '. Available: ' + order.join(', '));
    return registry[id];
  }

  function has(id) { return !!registry[id]; }

  function list() {
    return order.map(function (id) {
      return { id: id, name: registry[id].name, description: registry[id].description || '', kind: registry[id].kind };
    });
  }

  return {
    DEFAULTS: DEFAULTS,
    register: register,
    get: get,
    has: has,
    list: list,
    fill: fill,
    merge: merge,
    validateProfile: validateProfile
  };
});
