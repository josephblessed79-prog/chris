/* formal.js — the Formal Tender / RFP / ITB Evaluation module, built to
   the OPR authority supplied to this project:

     - OPR General Guidelines: Evaluation of Submissions and Award of
       Contracts (HGEA01 08-2023 v2.0) — the evaluation committee, the
       mandatory/weighted criteria distinction, preliminary examination,
       technical then commercial evaluation, clarification (arithmetic
       corrections only), ranking, PDAC/AO review, Appendix I Conflict of
       Interest & Confidentiality Form;
     - OPR Tender Evaluation Report Template (Appendix II) — the report
       layout the committee produces;
     - the Act (Part IV) and the Procurement Methods and Procedures
       Regulations 2021 (reg 21 PDAC).

   This is a different activity from routine procurement: it produces a
   formal Evaluation Committee report, not a travelling-file minute, and
   it borrows no routine or disposal logic. Money is exact (integer cents,
   VAT-inclusive as the template requires); the ranking is computed by a
   pre-determined weighting the committee enters (integer percentages that
   sum to 100), so nothing is invented — only the committee's own scores
   and the solicitation's own weights are combined.

   Data model (figures/scores typed once; totals and ranking computed):
     formal = {
       solicitationType ('RFP'|'ITB'), rfpTitle, rfpNumber, reportDate,
       introduction, background, submissionDeadline, tenderOpening,
       committee: [{ name, jobTitle, role, coiSigned (bool),
                     coiConflict ('' | 'none' | details) }],
       mandatoryCriteria: [{ name }],
       criteria: [{ name, description, maxPoints }],
       minTechnicalScore, technicalWeight, financialWeight, // ints; weights sum 100
       methodologyNote, rankingFormula,
       proponents: [{ name, compliant ('yes'|'no'|''), complianceNote }],
       techScores: { 'p:c': points, ... },   // proponent index : criterion index
       prices: [{ quotedPrice, verifiedPrice, arithmeticNote }], // per proponent
       clarifications: [{ proponent, issued, received, summary }],
       negotiationNote, recommendedProponent (index|null), recommendationNote,
       pdacReview, aoReview
     }
   Loads as MODPA.formal / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.formal = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var AUTHORITY = 'OPR General Guidelines: Evaluation of Submissions and Award of Contracts (HGEA01 08-2023 v2.0), Appendix I (Conflict of Interest & Confidentiality) and Appendix II (Evaluation Report Template), under the Act (Part IV) and the Procurement Methods and Procedures Regulations 2021.';

  function newFormal() {
    return {
      solicitationType: 'RFP', rfpTitle: '', rfpNumber: '', reportDate: '',
      introduction: '', background: '', submissionDeadline: '', tenderOpening: '',
      committee: [],
      mandatoryCriteria: [],
      criteria: [],
      minTechnicalScore: '', technicalWeight: '', financialWeight: '',
      methodologyNote: '', rankingFormula: '',
      proponents: [],
      techScores: {},
      prices: [],
      clarifications: [],
      negotiationNote: '', recommendedProponent: null, recommendationNote: '',
      pdacReview: '', aoReview: ''
    };
  }

  function blankMember() { return { name: '', jobTitle: '', role: '', coiSigned: false, coiConflict: '' }; }
  function blankCriterion() { return { name: '', description: '', maxPoints: '' }; }
  function blankProponent() { return { name: '', compliant: '', complianceNote: '' }; }
  function blankPrice() { return { quotedPrice: '', verifiedPrice: '', arithmeticNote: '' }; }

  function intOrNaN(v) {
    if (v === '' || v == null) return NaN;
    var n = Number(v);
    return Number.isInteger(n) ? n : NaN;
  }

  /* Maximum technical points = sum of the criteria maxima. NaN if any
     criterion has a non-integer or non-positive maximum. */
  function maxTechnicalPoints(f) {
    var t = 0;
    for (var i = 0; i < f.criteria.length; i++) {
      var m = intOrNaN(f.criteria[i].maxPoints);
      if (isNaN(m) || m <= 0) return NaN;
      t += m;
    }
    return f.criteria.length ? t : NaN;
  }

  function scoreKey(p, c) { return p + ':' + c; }
  function techScore(f, p, c) {
    var v = f.techScores[scoreKey(p, c)];
    return v === '' || v == null ? null : Number(v);
  }

  /* A proponent's technical total; { total, bad } where bad lists
     out-of-range or missing scores (compliant proponents only). */
  function technicalTotal(f, p) {
    var total = 0, bad = [], missing = 0;
    for (var c = 0; c < f.criteria.length; c++) {
      var s = techScore(f, p, c);
      var max = intOrNaN(f.criteria[c].maxPoints);
      if (s == null) { missing++; continue; }
      if (!Number.isFinite(s) || s < 0 || (!isNaN(max) && s > max)) bad.push(c);
      else total += s;
    }
    return { total: total, bad: bad, missing: missing };
  }

  function isCompliant(f, p) { return f.proponents[p] && f.proponents[p].compliant === 'yes'; }

  function passesGate(f, p) {
    var min = intOrNaN(f.minTechnicalScore);
    if (isNaN(min)) return false;
    var tt = technicalTotal(f, p);
    if (tt.bad.length || tt.missing) return false;
    return tt.total >= min;
  }

  function verifiedPriceCents(f, p) {
    var pr = f.prices[p];
    if (!pr) return NaN;
    var parsed = money.parseStrict(pr.verifiedPrice);
    return parsed.ok ? parsed.cents : NaN;
  }

  /* Lowest verified price among the compliant gate-passers, or NaN. */
  function lowestVerifiedCents(f) {
    var lo = NaN;
    for (var p = 0; p < f.proponents.length; p++) {
      if (!isCompliant(f, p) || !passesGate(f, p)) continue;
      var c = verifiedPriceCents(f, p);
      if (isNaN(c)) continue;
      if (isNaN(lo) || c < lo) lo = c;
    }
    return lo;
  }

  /* The pre-determined normalisation: technical percentage and financial
     percentage (lowest price / this price) combined by the committee's
     weights. Everything is integer maths on a 1e6 scale so a ranking is
     deterministic and reproducible (the audit-trail requirement).
     Returns rows for the gate-passers, sorted best-first, each with a
     combinedScaled integer and a percent string for display. */
  function ranking(f) {
    var maxTech = maxTechnicalPoints(f);
    var wt = intOrNaN(f.technicalWeight), wf = intOrNaN(f.financialWeight);
    var lo = lowestVerifiedCents(f);
    var rows = [];
    if (isNaN(maxTech) || isNaN(wt) || isNaN(wf) || (wt + wf) !== 100 || isNaN(lo) || lo <= 0) {
      return { ok: false, rows: [] };
    }
    for (var p = 0; p < f.proponents.length; p++) {
      if (!isCompliant(f, p) || !passesGate(f, p)) continue;
      var tt = technicalTotal(f, p);
      var priceCents = verifiedPriceCents(f, p);
      if (isNaN(priceCents) || priceCents <= 0) return { ok: false, rows: [] };
      var techScaled = Math.round(1000000 * tt.total / maxTech);      // 0..1e6
      var finScaled = Math.round(1000000 * lo / priceCents);          // 0..1e6
      var combined = Math.round((wt * techScaled + wf * finScaled) / 100);
      rows.push({
        proponent: p, name: f.proponents[p].name,
        techTotal: tt.total, techScaled: techScaled, finScaled: finScaled,
        priceCents: priceCents, combinedScaled: combined,
        techPct: pct(techScaled), finPct: pct(finScaled), combinedPct: pct(combined)
      });
    }
    rows.sort(function (a, b) {
      if (b.combinedScaled !== a.combinedScaled) return b.combinedScaled - a.combinedScaled;
      return a.priceCents - b.priceCents; /* tie-break by lower price, deterministic */
    });
    for (var i = 0; i < rows.length; i++) rows[i].rank = i + 1;
    return { ok: true, rows: rows };
  }

  function pct(scaled) {
    /* scaled is 0..1e6 -> a percentage to two decimals, no float drift */
    var hundredths = Math.round(scaled / 100); /* 0..10000 = percent×100 */
    var whole = Math.floor(hundredths / 100), frac = hundredths % 100;
    return whole + '.' + (frac < 10 ? '0' : '') + frac + '%';
  }

  function topRanked(f) {
    var r = ranking(f);
    return r.ok && r.rows.length ? r.rows[0] : null;
  }

  /* ---------- F-series verification checks ---------- */
  function runFormalChecks(f) {
    var R = [];
    function add(id, name, result, detail, action) {
      R.push({ id: id, name: name, result: result, detail: detail || '', action: action || '' });
    }
    if (!f) { add('F1', 'Evaluation record', 'FAIL', 'No formal-evaluation record on this case.', 'Complete the evaluation.'); return R; }

    add('F0', 'Report authority', 'PASS', 'Built to the ' + AUTHORITY, '');

    /* Committee — typically three to six persons, each signing COI +
       confidentiality (Appendix I). */
    var named = f.committee.filter(function (m) { return (m.name || '').trim(); });
    if (!named.length) add('F1', 'Evaluation Committee constituted', 'FAIL', '', 'Record the evaluation committee members.');
    else {
      add('F1', 'Evaluation Committee constituted', 'PASS', named.length + ' member(s).', '');
      if (named.length < 3 || named.length > 6) {
        add('F1a', 'Committee size', 'WARN', 'The guideline expects an evaluation committee of typically three to six persons; ' + named.length + ' recorded.', 'Confirm the committee composition.');
      }
      var unsigned = named.filter(function (m) { return !m.coiSigned; });
      add('F1b', 'Conflict of interest & confidentiality declarations signed', unsigned.length ? 'FAIL' : 'PASS',
        unsigned.length ? unsigned.length + ' member(s) have not signed the Appendix I declaration. Every member must sign before the evaluation.' : 'All members have signed.',
        'Each member signs the Conflict of Interest & Confidentiality form before evaluating.');
      var conflicts = named.filter(function (m) { var v = (m.coiConflict || '').trim().toLowerCase(); return v && v !== 'none'; });
      if (conflicts.length) {
        add('F1c', 'Declared conflicts addressed', 'WARN',
          conflicts.length + ' member(s) declared a conflict of interest. A member with a conflict should not take part in that evaluation; the Named Procurement Officer decides.',
          'Record how each declared conflict was handled.');
      }
    }

    /* Criteria & scoring (from the solicitation). */
    if (!f.criteria.length) add('F2', 'Evaluation criteria recorded', 'FAIL', '', 'Enter the weighted criteria and their maximum points from the solicitation.');
    else {
      var maxT = maxTechnicalPoints(f);
      if (isNaN(maxT)) add('F2', 'Criteria maxima are whole positive numbers', 'FAIL', 'Every criterion needs a whole-number maximum above zero.', 'Correct the criteria maxima.');
      else add('F2', 'Evaluation criteria recorded', 'PASS', f.criteria.length + ' criteria, ' + maxT + ' points total.', '');
    }
    var min = intOrNaN(f.minTechnicalScore);
    add('F3', 'Minimum technical score (the gate) set', isNaN(min) ? 'FAIL' : 'PASS',
      isNaN(min) ? 'The minimum technical score below which a proposal is not carried to the price evaluation must be set (from the solicitation).' : 'Minimum ' + min + ' points.',
      'Enter the minimum technical score.');

    /* Proponents & preliminary examination. */
    var named2 = f.proponents.filter(function (p) { return (p.name || '').trim(); });
    if (named2.length < 2) add('F4', 'Proposals received', named2.length ? 'WARN' : 'FAIL', named2.length + ' proponent(s). Competition normally means more than one.', 'Record every firm that submitted a proposal.');
    else add('F4', 'Proposals received', 'PASS', named2.length + ' proponents.', '');
    for (var p = 0; p < f.proponents.length; p++) {
      var pr = f.proponents[p];
      if (!(pr.name || '').trim()) continue;
      var tag = 'Proponent ' + (p + 1) + ' (' + pr.name + ')';
      if (pr.compliant !== 'yes' && pr.compliant !== 'no') {
        add('F5.' + (p + 1), tag + ': preliminary examination', 'FAIL', 'The preliminary examination checks each submission for compliance (pass/fail) — not yet recorded for this proponent.', 'Mark the proponent compliant or non-compliant.');
      } else if (pr.compliant === 'no' && !(pr.complianceNote || '').trim()) {
        add('F5.' + (p + 1) + 'r', tag + ': reason for non-compliance', 'FAIL', 'A rejected submission needs a recorded reason (a notice of rejection and reasons is dispatched).', 'Record why the proposal was found non-compliant.');
      }
    }

    /* Technical evaluation — every compliant proponent scored on every
       criterion, each within range. */
    for (var p2 = 0; p2 < f.proponents.length; p2++) {
      if (!isCompliant(f, p2)) continue;
      var tag2 = 'Proponent ' + (p2 + 1) + ' (' + f.proponents[p2].name + ')';
      var tt = technicalTotal(f, p2);
      if (tt.missing) add('F6.' + (p2 + 1), tag2 + ': technical scores complete', 'FAIL', tt.missing + ' criterion score(s) not entered.', 'Score the proponent on every criterion.');
      if (tt.bad.length) add('F6.' + (p2 + 1) + 'r', tag2 + ': technical scores in range', 'FAIL', 'A score is negative or above the criterion maximum.', 'Correct the out-of-range score(s).');
    }

    /* Commercial evaluation — verified price for every gate-passer, with
       the arithmetic-verification note (only arithmetic corrections are
       permitted). Prices are VAT inclusive. */
    for (var p3 = 0; p3 < f.proponents.length; p3++) {
      if (!isCompliant(f, p3) || !passesGate(f, p3)) continue;
      var tag3 = 'Proponent ' + (p3 + 1) + ' (' + f.proponents[p3].name + ')';
      var pc = verifiedPriceCents(f, p3);
      if (isNaN(pc)) add('F7.' + (p3 + 1), tag3 + ': verified price', 'FAIL', 'The gate-passing proposals have their prices examined and verified (VAT inclusive); this one has no valid verified price.', 'Enter the verified price (VAT inclusive) as examined.');
      else if (!((f.prices[p3] && f.prices[p3].arithmeticNote) || '').trim()) {
        add('F7.' + (p3 + 1) + 'a', tag3 + ': arithmetic verification recorded', 'WARN', 'Record that the pricing was checked for arithmetic errors (no change to price or scope is permitted except correcting arithmetic).', 'Note the arithmetic check result.');
      }
    }

    /* Ranking. */
    var wt = intOrNaN(f.technicalWeight), wf = intOrNaN(f.financialWeight);
    if (isNaN(wt) || isNaN(wf)) add('F8', 'Ranking weights set', 'FAIL', 'The technical and financial weights (from the pre-determined formula) are needed to rank the proposals.', 'Enter the technical and financial weights as whole percentages.');
    else if (wt + wf !== 100) add('F8', 'Ranking weights sum to 100', 'FAIL', 'The weights are ' + wt + ' + ' + wf + ' = ' + (wt + wf) + '; they must total 100.', 'Correct the weights so they total 100.');
    else {
      var r = ranking(f);
      if (!r.ok) add('F8', 'Ranking computable', 'WARN', 'The ranking cannot be computed until every gate-passing proponent has complete technical scores and a valid verified price.', 'Complete the scores and verified prices.');
      else add('F8', 'Ranking computed', 'PASS', r.rows.map(function (x) { return x.rank + '. ' + x.name + ' (' + x.combinedPct + ')'; }).join('; '), '');
    }

    /* Recommendation — VAT inclusive, and the top-ranked unless justified. */
    var top = topRanked(f);
    if (f.recommendedProponent == null) {
      add('F9', 'Recommendation for award', top ? 'WARN' : 'FAIL', top ? 'The computed top-ranked proponent is ' + top.name + ' (' + money.fmtMoney(top.priceCents) + ' VAT inclusive). No recommendation is recorded yet.' : 'No recommendation recorded.', 'Record the recommendation for award.');
    } else {
      var recName = (f.proponents[f.recommendedProponent] || {}).name || '';
      if (top && f.recommendedProponent !== top.proponent && !(f.recommendationNote || '').trim()) {
        add('F9', 'Recommendation matches the ranking', 'FAIL', 'The recommended proponent (' + recName + ') is not the top-ranked (' + top.name + '); a departure from the ranking must be justified in writing.', 'Record the justification, or recommend the top-ranked proponent.');
      } else {
        add('F9', 'Recommendation for award (VAT inclusive)', 'PASS', 'Award recommended to ' + recName + (isNaN(verifiedPriceCents(f, f.recommendedProponent)) ? '' : ' — ' + money.fmtMoney(verifiedPriceCents(f, f.recommendedProponent)) + ' VAT inclusive.'), '');
      }
    }

    add('F10', 'PDAC / Accounting Officer review', (f.pdacReview || f.aoReview || '').trim() ? 'PASS' : 'WARN',
      (f.pdacReview || f.aoReview || '').trim() ? 'Review recorded.' : 'The report is reviewed by the PDAC and/or the Accounting Officer before award (reg 21).',
      'Record the PDAC / Accounting Officer review when done.');

    return R;
  }

  return {
    AUTHORITY: AUTHORITY,
    newFormal: newFormal,
    blankMember: blankMember,
    blankCriterion: blankCriterion,
    blankProponent: blankProponent,
    blankPrice: blankPrice,
    maxTechnicalPoints: maxTechnicalPoints,
    techScore: techScore,
    scoreKey: scoreKey,
    technicalTotal: technicalTotal,
    isCompliant: isCompliant,
    passesGate: passesGate,
    verifiedPriceCents: verifiedPriceCents,
    lowestVerifiedCents: lowestVerifiedCents,
    ranking: ranking,
    topRanked: topRanked,
    runFormalChecks: runFormalChecks
  };
});
