/* casemodel.test.js — schema v2, v1 migration, validation, transitions. */
'use strict';

const t = require('./harness.js');
const fx = require('./fixtures.js');
const cm = require('../js/lib/casemodel.js');
const verify = require('../js/lib/verify.js');
const dMinute = require('../js/lib/docs/minute.js');

const NOW = '2026-07-04T12:00:00.000Z';

t.test('newCase produces a valid v2 case file', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  t.eq(cm.validate(cf), []);
  t.eq(cf.schemaVersion, 2);
  t.eq(cf.pathway, 'P1');
  t.eq(cf.folioStart, 1);
  t.eq(cf.meta.history.length, 1);
  t.throws(() => cm.newCase('P9', '', NOW));
});

t.test('detectVersion distinguishes v2, v1 and rubbish', () => {
  t.eq(cm.detectVersion(cm.newCase('P3', 'x', NOW)), 2);
  t.eq(cm.detectVersion(fx.shoesCase()), 1);
  t.eq(cm.detectVersion({}), 0);
  t.eq(cm.detectVersion(null), 0);
  t.eq(cm.detectVersion({ schemaVersion: 3 }), 0);
});

t.test('v1 migration carries every field and loses nothing', () => {
  const v1 = fx.shoesCase();
  const { caseFile, report } = cm.migrateV1(v1, NOW);
  t.eq(cm.validate(caseFile), []);
  for (const k of cm.V1_FIELDS) {
    t.eq(caseFile.docState[k], v1[k], 'field ' + k);
  }
  t.ok(report.length >= 1);
  t.eq(caseFile.pathway, 'P2'); // legacy drafts are formation approvals
  t.eq(caseFile.styleProfileId, 'ttcg-formation');
});

t.test('unknown v1 fields are preserved and reported', () => {
  const v1 = fx.shoesCase();
  v1.customNote = 'typed by an officer in an older revision';
  v1.anotherThing = { a: 1 };
  const { caseFile, report } = cm.migrateV1(v1, NOW);
  t.eq(caseFile.extra.unknownV1Fields.customNote, 'typed by an officer in an older revision');
  t.eq(caseFile.extra.unknownV1Fields.anotherThing, { a: 1 });
  t.ok(report.some(r => /customNote/.test(r) && /anotherThing/.test(r)));
});

t.test('v1 repair matches legacy loadDraft tolerance', () => {
  const v1 = fx.shoesCase();
  delete v1.items[0].mode;
  v1.items[0].quotes[0].sub = null;
  v1.attachments = 'not-a-list';
  const { caseFile } = cm.migrateV1(v1, NOW);
  t.eq(caseFile.docState.items[0].mode, 'qty');
  t.eq(caseFile.docState.items[0].quotes[0].sub, '');
  t.eq(caseFile.docState.attachments, []);
});

t.test('migrated case verifies and renders identically to the v1 draft', () => {
  const v1 = fx.splitAwardCase();
  const { caseFile } = cm.migrateV1(v1, NOW);
  t.eq(verify.runChecks(caseFile.docState), verify.runChecks(fx.splitAwardCase()));
  t.eq(dMinute.buildMinute(caseFile.docState), dMinute.buildMinute(fx.splitAwardCase()));
});

t.test('load() routes v2, v1 and rubbish correctly', () => {
  const v2 = cm.newCase('P3', 'ministry-circled', NOW);
  t.eq(cm.load(v2).ok, true);
  t.eq(cm.load(fx.shoesCase(), NOW).ok, true);
  t.eq(cm.load(fx.shoesCase(), NOW).caseFile.schemaVersion, 2);
  const bad = cm.load({ nonsense: true });
  t.eq(bad.ok, false);
  t.ok(bad.errors.length === 1);
  const broken = cm.newCase('P1', 'x', NOW);
  broken.folioStart = 0;
  t.eq(cm.load(broken).ok, false);
});

t.test('pathway transition keeps data and records history', () => {
  const cf = cm.newCase('P3', 'ministry-dotted', NOW);
  cf.docState.subject = 'PANTRY SUPPLIES';
  cm.transitionPathway(cf, 'P1', 'Evaluation complete; proceeding to approval', '2026-07-05T09:00:00.000Z');
  t.eq(cf.pathway, 'P1');
  t.eq(cf.docState.subject, 'PANTRY SUPPLIES');
  const last = cf.meta.history[cf.meta.history.length - 1];
  t.eq(last.event, 'pathway-changed');
  t.ok(/From P3 to P1/.test(last.detail));
  t.throws(() => cm.transitionPathway(cf, 'P7'));
});

t.test('serialize round-trips', () => {
  const cf = cm.newCase('P4', 'agency-neutral', NOW);
  const back = JSON.parse(cm.serialize(cf));
  t.eq(back, cf);
});
