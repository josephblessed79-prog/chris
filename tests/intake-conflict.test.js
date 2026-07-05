/* intake-conflict.test.js (Phase 7) — ingesting a value into a field that
   already holds manually-typed data does not overwrite it silently; it
   enters the conflict-resolution state, and the user's explicit choice
   (keep manual, or accept imported) is honoured. Malformed figures are
   never applied. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const intake = require('../js/lib/intake.js');

const NOW = '2026-07-05T09:00:00.000Z';

t.test('ingesting into an occupied field triggers a conflict, not an overwrite', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.minfile = 'MOD/PROC: HAND-TYPED';
  const r = intake.applyAcceptedFacts(cf, [
    { path: 'docState.minfile', value: 'MOD/PROC: FROM-IMPORT', kind: 'reference' }
  ], NOW);
  t.eq(r.conflicts.length, 1, 'the clash is a conflict');
  t.eq(r.updated.length, 0, 'nothing was silently applied');
  t.eq(cf.docState.minfile, 'MOD/PROC: HAND-TYPED', 'the manual value is untouched');
  const state = cf.intakeFields['docState.minfile'];
  t.eq(state.status, 'conflict');
  t.eq(state.manualValue, 'MOD/PROC: HAND-TYPED', 'the manual value is preserved for the choice');
  t.eq(state.value, 'MOD/PROC: FROM-IMPORT', 'the imported value is preserved for the choice');
});

t.test('resolving a conflict in favour of the imported value applies it', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.subject = 'Old subject';
  intake.applyAcceptedFacts(cf, [{ path: 'docState.subject', value: 'New subject from import', kind: 'other' }], NOW);
  t.eq(cf.docState.subject, 'Old subject', 'still not overwritten before the choice');
  intake.resolveConflict(cf, 'docState.subject', 'imported');
  t.eq(cf.docState.subject, 'New subject from import', 'accepted imported');
  t.eq(cf.intakeFields['docState.subject'].status, 'imported');
});

t.test('resolving a conflict in favour of the manual value keeps it', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.subject = 'Keep me';
  intake.applyAcceptedFacts(cf, [{ path: 'docState.subject', value: 'Discard me', kind: 'other' }], NOW);
  intake.resolveConflict(cf, 'docState.subject', 'manual');
  t.eq(cf.docState.subject, 'Keep me', 'manual value kept');
  t.eq(cf.intakeFields['docState.subject'].status, 'manual-kept');
});

t.test('an identical value is not treated as a conflict', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.minfile = 'SAME';
  const r = intake.applyAcceptedFacts(cf, [{ path: 'docState.minfile', value: 'SAME', kind: 'reference' }], NOW);
  t.eq(r.conflicts.length, 0);
  t.eq(r.updated.length, 1);
  t.eq(cf.intakeFields['docState.minfile'].status, 'imported');
});

t.test('a malformed figure is never applied, even into an empty field', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  const r = intake.applyAcceptedFacts(cf, [
    { path: 'docState.funds', value: '$11,3900.00', kind: 'figure' }
  ], NOW);
  t.eq(r.rejected.length, 1, 'the malformed figure is rejected');
  t.eq(r.updated.length, 0);
  t.eq(cf.docState.funds, '', 'the deterministic core is not bypassed');
  // a well-formed figure applies
  const ok = intake.applyAcceptedFacts(cf, [{ path: 'docState.funds', value: '11,390.00', kind: 'figure' }], NOW);
  t.eq(ok.updated.length, 1);
  t.eq(cf.docState.funds, '11,390.00');
});
