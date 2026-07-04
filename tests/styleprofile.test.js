/* styleprofile.test.js — profile registry, merging with defaults, template
   filling, and the zero-regression dispatch of the two legacy profiles. */
'use strict';

const t = require('./harness.js');
const fx = require('./fixtures.js');
const sp = require('../js/lib/styleprofile.js');
const cm = require('../js/lib/casemodel.js');
const documents = require('../js/lib/documents.js');
const dApproval = require('../js/lib/docs/approval.js');
const dMinute = require('../js/lib/docs/minute.js');
const dChecklist = require('../js/lib/docs/checklist.js');
const dCert = require('../js/lib/docs/certificate.js');

/* Register the shipped profiles the way index.html does. */
for (const f of ['ttcg-formation', 'ministry-minute', 'ministry-dotted', 'ministry-circled', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}

t.test('all shipped profiles register and validate', () => {
  const ids = sp.list().map(p => p.id);
  for (const id of ['ttcg-formation', 'ministry-minute', 'ministry-dotted', 'ministry-circled', 'agency-neutral']) {
    t.ok(ids.includes(id), id);
  }
});

t.test('profiles merge over defaults (data only, no code)', () => {
  const p = sp.get('ministry-circled');
  t.eq(p.folio.style, 'circled');
  t.eq(p.header.tempVol, 'Temp: Vol. I');
  t.eq(p.routing.ufsLines.length, 2);
  // untouched defaults still present
  t.ok(/regulation 10 and 11/.test(p.phrases.regulationLine));
  t.eq(p.voteStatusColumns.length, 8);
});

t.test('rejected profiles fail loudly', () => {
  t.throws(() => sp.register({ name: 'no id' }));
  t.throws(() => sp.register({ id: 'x', name: 'x', folio: { style: 'wavy' } }));
  t.throws(() => sp.get('does-not-exist'));
});

t.test('template filling substitutes only known placeholders', () => {
  t.eq(sp.fill('{words} ({figure}) in favour of {supplier}.', {
    words: 'One Thousand, Two Hundred Dollars', figure: '$1,200.00', supplier: 'Ate6Ate Savor City Caterers Ltd'
  }), 'One Thousand, Two Hundred Dollars ($1,200.00) in favour of Ate6Ate Savor City Caterers Ltd.');
  t.eq(sp.fill('{unknown} stays', {}), '{unknown} stays');
});

/* ---- zero regression: dispatcher output = legacy builders ---- */
t.test('P2 + ttcg-formation reproduces the legacy approval letter exactly', () => {
  const v1 = fx.splitAwardCase();
  const { caseFile } = cm.migrateV1(v1, '2026-07-04T12:00:00.000Z');
  caseFile.styleProfileId = 'ttcg-formation';
  t.eqStr(documents.build(caseFile, 'approval'), dApproval.buildApproval(fx.splitAwardCase()));
  t.eqStr(documents.build(caseFile, 'minute'), dMinute.buildMinute(fx.splitAwardCase()));
  t.eqStr(documents.build(caseFile, 'checklist'), dChecklist.buildChecklist(fx.splitAwardCase()));
  t.eqStr(documents.build(caseFile, 'certificate'), dCert.buildCert(fx.splitAwardCase()));
});

t.test('ministry-minute profile reproduces the legacy minute exactly', () => {
  const { caseFile } = cm.migrateV1(fx.shoesCase(), '2026-07-04T12:00:00.000Z');
  caseFile.styleProfileId = 'ministry-minute';
  t.eqStr(documents.build(caseFile, 'minute'), dMinute.buildMinute(fx.shoesCase()));
});

t.test('unknown document types are loud', () => {
  const cf = cm.newCase('P1', 'ministry-dotted', '2026-07-04T12:00:00.000Z');
  t.throws(() => documents.build(cf, 'no-such-doc'));
});

t.test('availableDocs follows the pathway', () => {
  const p2 = cm.newCase('P2', 'ttcg-formation', '2026-07-04T12:00:00.000Z');
  t.ok(documents.availableDocs(p2).some(d => d.id === 'approval'));
  const p1 = cm.newCase('P1', 'ministry-dotted', '2026-07-04T12:00:00.000Z');
  t.ok(!documents.availableDocs(p1).some(d => d.id === 'approval'));
});
