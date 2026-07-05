/* casemodel.test.js — schema v3 (module separation), v2 and v1 migration,
   validation, activity/presentation transitions. */
'use strict';

const t = require('./harness.js');
const fx = require('./fixtures.js');
const cm = require('../js/lib/casemodel.js');
const verify = require('../js/lib/verify.js');
const dMinute = require('../js/lib/docs/minute.js');

const NOW = '2026-07-04T12:00:00.000Z';

t.test('newCase produces a valid v3 case file for each module', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  t.eq(cm.validate(cf), []);
  t.eq(cf.schemaVersion, 3);
  t.eq(cf.module, 'routine');
  t.eq(cf.presentation, 'internal');
  t.eq(cf.folioStart, 1);
  t.eq(cf.formal, null);
  t.eq(cf.meta.history.length, 1);
  const fe = cm.newCase('formal-evaluation', 'agency-neutral', NOW);
  t.eq(cm.validate(fe), []);
  t.eq(fe.presentation, null);
  const dp = cm.newCase('disposal', 'ministry-dotted', NOW);
  t.eq(cm.validate(dp), []);
  t.eq(dp.presentation, null);
  t.throws(() => cm.newCase('P9', '', NOW));
});

t.test('legacy pathway codes map onto their modules', () => {
  t.eq(cm.normalizeActivity('P1'), { module: 'routine', presentation: 'internal' });
  t.eq(cm.normalizeActivity('P2'), { module: 'routine', presentation: 'formation' });
  t.eq(cm.normalizeActivity('P3'), { module: 'routine', presentation: 'internal' });
  t.eq(cm.normalizeActivity('P4'), { module: 'disposal', presentation: null });
  t.eq(cm.normalizeActivity('nonsense'), null);
  const cf = cm.newCase('P2', 'ttcg-formation', NOW);
  t.eq(cf.module, 'routine');
  t.eq(cf.presentation, 'formation');
  t.eq(cm.validate(cf), []);
});

t.test('detectVersion distinguishes v3, v2, v1 and rubbish', () => {
  t.eq(cm.detectVersion(cm.newCase('routine', 'x', NOW)), 3);
  t.eq(cm.detectVersion({ schemaVersion: 2, docState: {} }), 2);
  t.eq(cm.detectVersion(fx.shoesCase()), 1);
  t.eq(cm.detectVersion({}), 0);
  t.eq(cm.detectVersion(null), 0);
  t.eq(cm.detectVersion({ schemaVersion: 4 }), 0);
});

t.test('v1 migration carries every field and loses nothing', () => {
  const v1 = fx.shoesCase();
  const { caseFile, report } = cm.migrateV1(v1, NOW);
  t.eq(cm.validate(caseFile), []);
  for (const k of cm.V1_FIELDS) {
    t.eq(caseFile.docState[k], v1[k], 'field ' + k);
  }
  t.ok(report.length >= 1);
  // legacy drafts are formation approvals: routine, external formation
  t.eq(caseFile.module, 'routine');
  t.eq(caseFile.presentation, 'formation');
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

/* A v2 case file exactly as version 2.0.0 saved it. */
function v2Case(pathway) {
  return {
    schemaVersion: 2,
    caseId: 'CASE-20260601-TESTV2',
    pathway: pathway,
    styleProfileId: 'ministry-dotted',
    folioStart: 7,
    sheetNumbering: 'follow-folio',
    meta: {
      app: 'MODPA', appVersion: '2.0.0',
      createdAt: '2026-06-01T09:00:00.000Z', modifiedAt: '2026-06-02T10:00:00.000Z',
      history: [{ at: '2026-06-01T09:00:00.000Z', event: 'created', detail: 'Pathway ' + pathway }]
    },
    docState: Object.assign(cm.blankDocState(), { subject: 'V2 CARRY-OVER', minfile: 'MOD/X: 1' }),
    evaluation: pathway === 'P3' ? { suppliers: [{ name: 'A Ltd', status: 'quoted' }], items: [{ desc: 'W', variant: '', qty: 1, unitName: '' }], cells: [], selections: [] } : null,
    verbal: null,
    disposal: pathway === 'P4' ? { committee: [], narrative: 'n', items: [] } : null,
    voteStatus: { originalProvision: '100.00' },
    extra: { note: 'kept' }
  };
}

t.test('v2 migration maps each pathway to its module and loses nothing', () => {
  const expectations = [
    ['P1', 'routine', 'internal'],
    ['P2', 'routine', 'formation'],
    ['P3', 'routine', 'internal'],
    ['P4', 'disposal', null]
  ];
  for (const [pathway, module_, presentation] of expectations) {
    const loaded = cm.load(v2Case(pathway), NOW);
    t.eq(loaded.ok, true, pathway + ' loads');
    const cf = loaded.caseFile;
    t.eq(cm.validate(cf), [], pathway + ' validates');
    t.eq(cf.schemaVersion, 3);
    t.eq(cf.module, module_, pathway + ' module');
    t.eq(cf.presentation, presentation, pathway + ' presentation');
    t.eq(cf.extra.legacyPathway, pathway, 'original pathway preserved on the case');
    t.eq(cf.extra.note, 'kept', 'extra data untouched');
    t.eq(cf.docState.subject, 'V2 CARRY-OVER');
    t.eq(cf.folioStart, 7);
    t.eq(cf.sheetNumbering, 'follow-folio');
    t.eq(cf.voteStatus, { originalProvision: '100.00' });
    t.eq(cf.formal, null, 'formal section added as empty');
    t.ok(!('pathway' in cf), 'pathway field replaced by module');
    const last = cf.meta.history[cf.meta.history.length - 1];
    t.eq(last.event, 'migrated');
    t.ok(loaded.report.length >= 1, 'migration is reported to the user');
  }
  const p3 = cm.load(v2Case('P3'), NOW).caseFile;
  t.eq(p3.evaluation.suppliers[0].name, 'A Ltd', 'P3 comparison worksheet carried over');
  const p4 = cm.load(v2Case('P4'), NOW).caseFile;
  t.eq(p4.disposal.narrative, 'n', 'P4 disposal section carried over');
});

t.test('load() routes v3, v2, v1 and rubbish correctly', () => {
  const v3 = cm.newCase('routine', 'ministry-circled', NOW);
  t.eq(cm.load(v3).ok, true);
  t.eq(cm.load(v2Case('P2'), NOW).ok, true);
  t.eq(cm.load(fx.shoesCase(), NOW).ok, true);
  t.eq(cm.load(fx.shoesCase(), NOW).caseFile.schemaVersion, 3);
  const bad = cm.load({ nonsense: true });
  t.eq(bad.ok, false);
  t.ok(bad.errors.length === 1);
  const broken = cm.newCase('routine', 'x', NOW);
  broken.folioStart = 0;
  t.eq(cm.load(broken).ok, false);
});

t.test('validate() enforces the module/presentation rules', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.presentation = 'sideways';
  t.ok(cm.validate(cf).some(e => /presentation/.test(e)));
  const dp = cm.newCase('disposal', 'ministry-dotted', NOW);
  dp.presentation = 'internal';
  t.ok(cm.validate(dp).some(e => /presentation/.test(e)));
  const un = cm.newCase('routine', 'ministry-dotted', NOW);
  un.module = 'buying-things';
  t.ok(cm.validate(un).some(e => /Unknown module/.test(e)));
});

t.test('activity transition keeps data and records history', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.subject = 'PANTRY SUPPLIES';
  cm.transitionActivity(cf, 'disposal', 'Misfiled at the start', '2026-07-05T09:00:00.000Z');
  t.eq(cf.module, 'disposal');
  t.eq(cf.presentation, null);
  t.eq(cf.docState.subject, 'PANTRY SUPPLIES');
  const last = cf.meta.history[cf.meta.history.length - 1];
  t.eq(last.event, 'activity-changed');
  t.ok(/Misfiled at the start/.test(last.detail));
  t.throws(() => cm.transitionActivity(cf, 'P7'));
});

t.test('presentation switches within routine only, and records history', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cm.setPresentation(cf, 'formation', 'Formation request received', '2026-07-05T09:00:00.000Z');
  t.eq(cf.presentation, 'formation');
  const last = cf.meta.history[cf.meta.history.length - 1];
  t.eq(last.event, 'presentation-changed');
  cm.setPresentation(cf, 'formation'); // no-op, no duplicate history
  t.eq(cf.meta.history.filter(h => h.event === 'presentation-changed').length, 1);
  t.throws(() => cm.setPresentation(cf, 'upside-down'));
  const dp = cm.newCase('disposal', 'ministry-dotted', NOW);
  t.throws(() => cm.setPresentation(dp, 'internal'));
});

t.test('serialize round-trips', () => {
  const cf = cm.newCase('disposal', 'agency-neutral', NOW);
  const back = JSON.parse(cm.serialize(cf));
  t.eq(back, cf);
});
