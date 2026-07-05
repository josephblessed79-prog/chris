/* modulescope.test.js — the module-separation guarantees: each activity
   sees only its own documents and runs only its own check series. This is
   the test that keeps tender-evaluation logic out of routine procurement,
   routine minute logic out of formal evaluation, and procurement-award
   logic out of disposal. */
'use strict';

const t = require('./harness.js');
const cm = require('../js/lib/casemodel.js');
const sp = require('../js/lib/styleprofile.js');
const documents = require('../js/lib/documents.js');
const verifycase = require('../js/lib/verifycase.js');
const evaluation = require('../js/lib/evaluation.js');
const verbal = require('../js/lib/verbal.js');
const disposal = require('../js/lib/disposal.js');
require('../js/lib/docs/hybridminute.js');
require('../js/lib/docs/verbalform.js');
require('../js/lib/docs/evalreport.js');
require('../js/lib/docs/hybridcert.js');
require('../js/lib/docs/disposaldocs.js');

for (const f of ['ministry-dotted', 'ministry-circled', 'ttcg-formation', 'ministry-minute', 'agency-neutral']) {
  if (!sp.has(f)) sp.register(require('../styles/' + f + '.profile.js'));
}
const NOW = '2026-07-04T12:00:00.000Z';

function ids(cf) { return documents.availableDocs(cf).map(d => d.id); }

t.test('a disposal case is never offered a procurement document', () => {
  const cf = cm.newCase('disposal', 'ministry-dotted', NOW);
  cf.disposal = disposal.newDisposal();
  t.eq(ids(cf), ['disposal-inventory', 'disposal-minute', 'disposal-instrument']);
  t.ok(ids(cf).indexOf('checklist') < 0, 'no procurement checklist');
  t.ok(ids(cf).indexOf('certificate') < 0, 'no procurement-worded certificate');
  t.ok(ids(cf).indexOf('minute') < 0, 'no procurement minute');
});

t.test('a routine internal case sees the travelling-file set, and no disposal instrument', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  t.eq(ids(cf), ['minute', 'checklist', 'certificate']);
  cf.verbal = verbal.newVerbal();
  t.eq(ids(cf), ['minute', 'verbal-form', 'phone-register', 'checklist', 'certificate']);
  cf.evaluation = evaluation.newEvaluation();
  t.ok(ids(cf).indexOf('eval-report') >= 0 && ids(cf).indexOf('eval-worksheet') >= 0);
  t.ok(ids(cf).every(id => id.indexOf('disposal') < 0));
});

t.test('the formation approval letter belongs to the formation presentation only', () => {
  const internal = cm.newCase('routine', 'ministry-dotted', NOW);
  t.ok(ids(internal).indexOf('approval') < 0);
  const formation = cm.newCase('P2', 'ttcg-formation', NOW);
  t.eq(ids(formation)[0], 'approval');
});

t.test('the routine comparison papers are labelled Supplier comparison, not Evaluation report', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.evaluation = evaluation.newEvaluation();
  const labels = documents.availableDocs(cf).map(d => d.label);
  t.ok(labels.indexOf('Supplier comparison record') >= 0);
  t.ok(labels.indexOf('Supplier comparison worksheet') >= 0);
  t.ok(!labels.some(l => /Evaluation report/i.test(l)));
});

t.test('a formal-evaluation case has no routine or disposal documents', () => {
  const cf = cm.newCase('formal-evaluation', 'agency-neutral', NOW);
  t.eq(ids(cf), [], 'the formal module registers its own documents when its engine loads');
});

t.test('check series stay inside their module', () => {
  // disposal: D-series and G-series only — no vote-book (H) or award (C/E/V) checks
  const dp = cm.newCase('disposal', 'ministry-dotted', NOW);
  dp.disposal = disposal.newDisposal();
  dp.voteStatus = { originalProvision: '100.00' }; // even if typed in, disposal never runs vote checks
  const dpIds = verifycase.runAllChecks(dp).map(c => c.id);
  t.ok(dpIds.every(id => /^[DG]/.test(id)), 'disposal runs only D/G series: ' + dpIds.join(','));
  // formal: G-series only until the formal engine brings the F-series
  const fe = cm.newCase('formal-evaluation', 'agency-neutral', NOW);
  const feIds = verifycase.runAllChecks(fe).map(c => c.id);
  t.ok(feIds.every(id => /^G/.test(id)), 'formal runs only G series for now: ' + feIds.join(','));
  // routine item case: C-series plus vote H-series — and no D-series
  const rt = cm.newCase('routine', 'ministry-dotted', NOW);
  const rtIds = verifycase.runAllChecks(rt).map(c => c.id);
  t.ok(rtIds.some(id => /^C/.test(id)), 'routine runs the C-series');
  t.ok(rtIds.every(id => !/^D/.test(id)), 'routine never runs disposal checks');
});

t.test('the certificate names the activity, not a pathway code', () => {
  const cf = cm.newCase('routine', 'ministry-dotted', NOW);
  cf.docState.subject = 'S'; cf.docState.minfile = 'F';
  const html = documents.build(cf, 'certificate');
  t.ok(html.indexOf('Activity: Routine procurement (Ministry internal)') > 0);
  t.ok(html.indexOf('Pathway:') < 0);
});
