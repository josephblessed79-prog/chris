/* guide.test.js — the Guided Mode step definitions are pure and testable:
   each module's journey has the designed steps in order, the completion
   rules answer honestly from the case file alone, and every verification
   check lands on the step that actually fixes it (with the sign step as
   the deliberate catch-all). The wizard is presentation only — these
   tests prove it computes nothing and invents nothing. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const GUIDE = require('../js/app/guide.js');

const NOW = '2026-07-05T09:00:00.000Z';

function ids(moduleId) {
  return GUIDE.steps(moduleId).map(s => s.id);
}
function step(moduleId, id) {
  return GUIDE.steps(moduleId).find(s => s.id === id);
}

/* ---------------- journeys: steps and order ---------------- */

t.test('routine journey has the designed steps in order', () => {
  t.eq(ids('routine'), ['about', 'papers', 'who', 'prices', 'money', 'folios', 'sign', 'docs']);
});

t.test('formal journey has the designed steps in order', () => {
  t.eq(ids('formal-evaluation'), ['about', 'papers', 'committee', 'rules', 'proponents', 'scores', 'decision', 'sign', 'docs']);
});

t.test('disposal journey has the designed steps in order', () => {
  t.eq(ids('disposal'), ['about', 'papers', 'people', 'property', 'strategy', 'approvals', 'after', 'sign', 'docs']);
});

t.test('an unknown module yields no steps rather than a wrong journey', () => {
  t.eq(GUIDE.steps('no-such-module'), []);
});

t.test('every journey starts with about, offers papers second, and ends sign then docs', () => {
  for (const m of ['routine', 'formal-evaluation', 'disposal']) {
    const list = ids(m);
    t.eq(list[0], 'about', m + ' starts with about');
    t.eq(list[1], 'papers', m + ' offers the drop-zone second');
    t.eq(list.slice(-2), ['sign', 'docs'], m + ' ends sign, docs');
  }
});

t.test('papers is optional (skippable) in every journey; about and sign are not', () => {
  for (const m of ['routine', 'formal-evaluation', 'disposal']) {
    t.ok(step(m, 'papers').optional, m + ' papers optional');
    t.ok(!step(m, 'about').optional, m + ' about required');
    t.ok(!step(m, 'sign').optional, m + ' sign required');
  }
});

t.test('every step carries a plain-question title and a hint', () => {
  for (const m of ['routine', 'formal-evaluation', 'disposal']) {
    for (const s of GUIDE.steps(m)) {
      t.ok(s.title && s.title.trim(), m + '/' + s.id + ' has a title');
      t.ok(s.hint && s.hint.trim(), m + '/' + s.id + ' has a hint');
      t.ok(typeof s.done === 'function', m + '/' + s.id + ' has a completion rule');
      t.ok(typeof s.render === 'function', m + '/' + s.id + ' has a renderer');
    }
  }
});

/* ---------------- completion rules answer from the case file ---------- */

t.test('routine about: blank case incomplete; subject + file + date completes it', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const s = step('routine', 'about');
  t.eq(s.done(cf), false);
  cf.docState.subject = 'The Provision of Boxed Meals';
  cf.docState.minfile = 'MOD/PROC: 22/18/7:2026';
  t.eq(s.done(cf), false, 'date still missing');
  cf.docState.date = '2026-05-20';
  t.eq(s.done(cf), true);
});

t.test('routine prices: complete once any pricing paper carries an entry', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const s = step('routine', 'prices');
  t.eq(s.done(cf), false, 'no papers yet');
  cf.verbal = { contacts: [{ name: 'Caterer A' }], schedule: [] };
  t.eq(s.done(cf), true, 'a verbal contact counts');
  cf.verbal = { contacts: [], schedule: [] };
  t.eq(s.done(cf), false, 'empty verbal papers do not count');
  cf.evaluation = { items: [{ desc: 'Paper' }] };
  t.eq(s.done(cf), true, 'a worksheet item counts');
});

t.test('routine money: complete once the vote status exists or funds are stated', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const s = step('routine', 'money');
  t.eq(s.done(cf), false);
  cf.docState.funds = 'Vote 26/001/09 — Training';
  t.eq(s.done(cf), true, 'a stated funds line counts');
  cf.docState.funds = '';
  cf.voteStatus = { originalProvision: '380,000.00' };
  t.eq(s.done(cf), true, 'a vote status counts');
});

t.test('routine folios: only a described folio completes the step', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const s = step('routine', 'folios');
  t.eq(s.done(cf), false);
  cf.docState.folios = [{ desc: '   ' }];
  t.eq(s.done(cf), false, 'a blank description does not count');
  cf.docState.folios = [{ desc: 'Verbal Quotation Form re: Boxed Meals' }];
  t.eq(s.done(cf), true);
});

t.test('sign step: complete only when the signing officer is named', () => {
  for (const m of ['routine', 'formal-evaluation', 'disposal']) {
    const cf = cm.newCase(m, 'ministry-dotted', NOW);
    const s = step(m, 'sign');
    t.eq(s.done(cf), false, m + ' unsigned');
    cf.docState.minsigname = 'A. Officer';
    t.eq(s.done(cf), true, m + ' signed');
  }
});

t.test('formal committee: three named members, every one with the COI declaration', () => {
  const cf = cm.newCase('formal-evaluation', 'ministry-dotted', NOW);
  const s = step('formal-evaluation', 'committee');
  t.eq(s.done(cf), false);
  cf.formal = { committee: [
    { name: 'A', coiSigned: true }, { name: 'B', coiSigned: true }, { name: '', coiSigned: true }
  ] };
  t.eq(s.done(cf), false, 'two named members are not enough');
  cf.formal.committee[2].name = 'C';
  cf.formal.committee[2].coiSigned = false;
  t.eq(s.done(cf), false, 'an unsigned COI blocks completion');
  cf.formal.committee[2].coiSigned = true;
  t.eq(s.done(cf), true);
});

t.test('formal rules: criteria, a minimum score, and weights totalling exactly 100', () => {
  const cf = cm.newCase('formal-evaluation', 'ministry-dotted', NOW);
  const s = step('formal-evaluation', 'rules');
  cf.formal = { criteria: [{ name: 'Experience', maxPoints: 100 }], minTechnicalScore: '60', technicalWeight: 70, financialWeight: 40 };
  t.eq(s.done(cf), false, 'weights totalling 110 are rejected');
  cf.formal.financialWeight = 30;
  t.eq(s.done(cf), true);
  cf.formal.minTechnicalScore = ' ';
  t.eq(s.done(cf), false, 'the gate score must be stated');
});

t.test('formal proponents: every named firm is compliant, or rejected with a written reason', () => {
  const cf = cm.newCase('formal-evaluation', 'ministry-dotted', NOW);
  const s = step('formal-evaluation', 'proponents');
  t.eq(s.done(cf), false, 'no proponents yet');
  cf.formal = { proponents: [{ name: 'Alpha Ltd', compliant: 'yes' }, { name: 'Beta Ltd', compliant: 'no', complianceNote: '' }] };
  t.eq(s.done(cf), false, 'a rejection without a reason blocks the step');
  cf.formal.proponents[1].complianceNote = 'Bid security not provided.';
  t.eq(s.done(cf), true);
});

t.test('formal decision: complete only once a recommendation exists', () => {
  const cf = cm.newCase('formal-evaluation', 'ministry-dotted', NOW);
  const s = step('formal-evaluation', 'decision');
  cf.formal = {};
  t.eq(s.done(cf), false);
  cf.formal.recommendedProponent = 0;
  t.eq(s.done(cf), true, 'proponent index 0 is a valid recommendation');
});

t.test('disposal people: the Act’s minimum of three named committee members', () => {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  const s = step('disposal', 'people');
  t.eq(s.done(cf), false);
  cf.disposal = { committee: [{ name: 'A' }, { name: 'B' }, { name: ' ' }] };
  t.eq(s.done(cf), false, 'a blank name does not count towards the three');
  cf.disposal.committee[2].name = 'C';
  t.eq(s.done(cf), true);
});

t.test('disposal property: at least one item; strategy/approvals/after stay optional', () => {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  t.eq(step('disposal', 'property').done(cf), false);
  cf.disposal = { items: [{ desc: 'Office Work Station' }] };
  t.eq(step('disposal', 'property').done(cf), true);
  for (const id of ['strategy', 'approvals', 'after']) {
    const s = step('disposal', id);
    t.ok(s.optional, id + ' is optional');
    t.eq(s.done(cm.newCase('disposal', 'ministry-dotted', NOW)), true, id + ' never blocks the journey');
  }
});

/* ---------------- check-to-step mapping ---------------- */

t.test('routine checks land on the step that fixes them', () => {
  t.eq(GUIDE.stepForCheck('routine', 'G1'), 'about');
  t.eq(GUIDE.stepForCheck('routine', 'C2'), 'about');
  t.eq(GUIDE.stepForCheck('routine', 'C17'), 'about');
  t.eq(GUIDE.stepForCheck('routine', 'V2'), 'prices');
  t.eq(GUIDE.stepForCheck('routine', 'E7'), 'prices');
  t.eq(GUIDE.stepForCheck('routine', 'C6'), 'prices');
  t.eq(GUIDE.stepForCheck('routine', 'H1'), 'money');
  t.eq(GUIDE.stepForCheck('routine', 'C14'), 'money');
  t.eq(GUIDE.stepForCheck('routine', 'C20'), 'folios');
  t.eq(GUIDE.stepForCheck('routine', 'G5'), 'folios');
  t.eq(GUIDE.stepForCheck('routine', 'G4'), 'sign');
});

t.test('formal checks land on the step that fixes them', () => {
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F1'), 'committee');
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F2'), 'rules');
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F4'), 'proponents');
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F6'), 'scores');
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F9'), 'decision');
  t.eq(GUIDE.stepForCheck('formal-evaluation', 'F10'), 'decision');
});

t.test('disposal checks land on the step that fixes them', () => {
  t.eq(GUIDE.stepForCheck('disposal', 'D1'), 'people');
  t.eq(GUIDE.stepForCheck('disposal', 'D4'), 'property');
  t.eq(GUIDE.stepForCheck('disposal', 'D7'), 'strategy');
  t.eq(GUIDE.stepForCheck('disposal', 'D8'), 'approvals');
  t.eq(GUIDE.stepForCheck('disposal', 'D11'), 'after');
});

t.test('an unmapped check falls back to the sign step, never nowhere', () => {
  t.eq(GUIDE.stepForCheck('routine', 'ZZ99'), 'sign');
  t.eq(GUIDE.stepForCheck('disposal', 'ZZ99'), 'sign');
});

t.test('every live verification check maps to a step that exists in its journey', () => {
  const M = require('../js/lib/verifycase.js');
  for (const m of ['routine', 'formal-evaluation', 'disposal']) {
    const cf = cm.newCase(m, 'ministry-dotted', NOW);
    const journey = new Set(ids(m));
    for (const r of M.runAllChecks(cf)) {
      const sid = GUIDE.stepForCheck(m, r.id);
      t.ok(journey.has(sid), m + ' check ' + r.id + ' maps into the journey (' + sid + ')');
    }
  }
});

/* ---------------- indices ---------------- */

t.test('stepIndex finds each step and answers 0 for the unknown', () => {
  t.eq(GUIDE.stepIndex('routine', 'money'), 4);
  t.eq(GUIDE.stepIndex('formal-evaluation', 'decision'), 6);
  t.eq(GUIDE.stepIndex('disposal', 'docs'), 8);
  t.eq(GUIDE.stepIndex('routine', 'nonexistent'), 0);
});

t.test('steps() returns fresh definitions each call — no shared mutable state', () => {
  const a = GUIDE.steps('routine');
  const b = GUIDE.steps('routine');
  t.ok(a !== b, 'distinct arrays');
  t.ok(a[0] !== b[0], 'distinct step objects');
});
