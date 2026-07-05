/* storage.test.js — the shared-folder case register and file naming. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const storage = require('../js/lib/storage.js');
const fx = require('./fixtures.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}

const NOW = '2026-07-04T12:00:00.000Z';

t.test('case file names are safe and readable', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', NOW);
  cf.docState.subject = 'Boxed Meals / HR Training: 2026?';
  const name = storage.caseFileName(cf);
  t.ok(name.startsWith(cf.caseId + '__'));
  t.ok(name.endsWith('.json'));
  t.ok(!/[\/:?]/.test(name), 'no filesystem-hostile characters');
});

t.test('register entries summarise the case with computed totals and clearance', () => {
  const { caseFile } = cm.migrateV1(fx.shoesCase(), NOW);
  const e = storage.registerEntry(caseFile);
  t.eq(e.module, 'routine');
  t.eq(e.activity, 'Routine / daily procurement — External formation (letter + minute)');
  // Black Shoes 120 × $450.00 + $6,750.00 VAT; White Shoes 80 × $430.00 + $4,300.00 VAT
  t.eq(e.totalCents, (120 * 45000 + 675000) + (80 * 43000 + 430000));
  t.eq(e.totalDisplay, '$99,450.00');
  t.eq(e.cleared, true);
  const bad = cm.newCase('P1', 'ministry-dotted', NOW);
  const e2 = storage.registerEntry(bad);
  t.eq(e2.cleared, false);
  t.ok(e2.failing > 0);
});

t.test('rebuildRegister indexes good files and reports bad ones', () => {
  const good = cm.migrateV1(fx.shoesCase(), NOW).caseFile;
  const files = [
    { name: storage.caseFileName(good), text: cm.serialize(good) },
    { name: 'broken.json', text: '{ not json' },
    { name: 'not-a-case.json', text: '{"foo": 1}' },
    { name: 'notes.txt', text: 'ignored' },
    { name: 'register-index.json', text: '{"registerVersion":1}' } // the old index itself is skipped
  ];
  const idx = storage.rebuildRegister(files, NOW);
  t.eq(idx.cases.length, 1);
  t.eq(idx.cases[0].caseId, good.caseId);
  t.eq(idx.problems.length, 2);
  t.ok(idx.problems.some(p => /broken\.json/.test(p)));
  t.ok(idx.problems.some(p => /not-a-case\.json/.test(p)));
  const round = JSON.parse(storage.serializeRegister(idx));
  t.eq(round.cases[0].fileNo, 'MOD/PROC: 22/15/9: 2026', 'minute file number preferred over the letter reference');
});

t.test('legacy v1 drafts in the shared folder are indexed through migration', () => {
  const files = [{ name: 'old_draft.json', text: JSON.stringify(fx.splitAwardCase()) }];
  const idx = storage.rebuildRegister(files, NOW);
  t.eq(idx.cases.length, 1);
  t.eq(idx.cases[0].module, 'routine');
});
