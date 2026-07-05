/* intake-global-state.test.js (Phase 7) — applying intake data updates
   fields across different module tabs: a File Number keyed on Case Details
   is updated while ingesting figures that belong to the Vote & Funding
   tab, and the summary reports which tab each landed on. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const intake = require('../js/lib/intake.js');

const NOW = '2026-07-05T09:00:00.000Z';

t.test('accepted facts update fields across tabs and are tracked by tab', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  // facts that belong to different tabs: file number (Case Details),
  // document date (Case Details), available funds (Vote & Funding)
  const facts = [
    { path: 'docState.minfile', value: 'MOD/PROC: 22/18/7:2026', kind: 'reference', source: 'File No: MOD/PROC…' },
    { path: 'docState.date', value: '2026-06-18', kind: 'date', source: 'Dated 18 June 2026' },
    { path: 'docState.funds', value: '380,000.00', kind: 'figure', source: 'Balance $380,000.00' }
  ];
  const r = intake.applyAcceptedFacts(cf, facts, NOW);
  t.eq(cf.docState.minfile, 'MOD/PROC: 22/18/7:2026', 'file number set on the case');
  t.eq(cf.docState.date, '2026-06-18');
  t.eq(cf.docState.funds, '380,000.00');
  t.eq(r.updated.length, 3, 'all three applied');
  t.eq(r.conflicts.length, 0);
  // cross-tab accounting: two on Case Details, one on Vote & Funding
  t.eq(r.byTab.case, 2);
  t.eq(r.byTab.vote, 1);
  t.eq(intake.pathTab('docState.minfile'), 'case');
  t.eq(intake.pathTab('docState.funds'), 'vote');
});

t.test('the toast reports current-tab and previous-tab counts and the earliest tab', () => {
  const byTab = { case: 2, vote: 1, work: 3 };
  // suppose the user triggered the intake from the Vote tab
  const s = intake.summarizeUpdate(byTab, 'vote');
  t.eq(s.current, 1, 'one field updated on the current (vote) tab');
  t.eq(s.others, 5, 'five updated in other tabs');
  t.eq(s.earliestTab, 'case', 'Case Details is the earliest modified tab');
  t.eq(s.earliestTabLabel, 'Case Details');
  t.ok(/updated in previous tabs/.test(s.text));
});

t.test('the earliest modified tab follows the real tab order', () => {
  const r = intake.applyAcceptedFacts(cm.newCase('routine', 'x', NOW), [
    { path: 'docState.folios', value: [], kind: 'other' }, // fol
    { path: 'docState.date', value: '2026-01-01', kind: 'date' } // case
  ], NOW);
  t.eq(r.earliestTab, 'case', 'Case Details precedes Folios');
});

t.test('every updated field is flagged Imported on the case for the badge', () => {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  intake.applyAcceptedFacts(cf, [{ path: 'disposal.requestRef', value: '0001', kind: 'reference' }], NOW);
  t.eq(cf.intakeFields['disposal.requestRef'].status, 'imported');
  t.eq(cf.intakeFields['disposal.requestRef'].value, '0001');
  t.eq(intake.pathTab('disposal.requestRef'), 'work', 'disposal fields live on Working Papers');
});
