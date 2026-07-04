/* verify.test.js — behavioural tests of the verification engine (beyond
   the parity test): the controls must actually catch the failures they
   exist to catch. */
'use strict';

const t = require('./harness.js');
const fx = require('./fixtures.js');
const verify = require('../js/lib/verify.js');

function byId(R, id) { return R.find(c => c.id === id); }

t.test('complete pack passes every check', () => {
  const R = verify.runChecks(fx.shoesCase());
  const s = verify.checkStats(R);
  t.eq(s.fail, 0, JSON.stringify(R.filter(c => c.result === 'FAIL')));
});

t.test('missing case details fail individually', () => {
  const R = verify.runChecks(fx.failingCase());
  t.eq(byId(R, 'C1').result, 'FAIL'); // no ref
  t.eq(byId(R, 'C2').result, 'FAIL'); // no date
  t.eq(byId(R, 'C3').result, 'FAIL'); // no addressee
  t.eq(byId(R, 'C5').result, 'FAIL'); // no signature
});

t.test('invalid figure on a quoted row is caught', () => {
  const R = verify.runChecks(fx.failingCase());
  t.eq(byId(R, 'C9.1').result, 'FAIL');
  t.ok(/invalid/.test(byId(R, 'C9.1').detail));
});

t.test('lowest-cost rule fails without justification and passes with it', () => {
  const st = fx.failingCase();
  let R = verify.runChecks(st);
  t.eq(byId(R, 'C10.1').result, 'FAIL'); // C recommended at 120 over B at 90
  st.notlowest = 'B Ltd cannot deliver within the required period; C Ltd delivers in three days.';
  R = verify.runChecks(st);
  t.eq(byId(R, 'C10.1').result, 'PASS');
  t.ok(/justification recorded/.test(byId(R, 'C10.1').detail));
});

t.test('dates out of order are caught', () => {
  const R = verify.runChecks(fx.failingCase());
  t.eq(byId(R, 'C22').result, 'FAIL');
});

t.test('funds shortfall fails the cover check', () => {
  const R = verify.runChecks(fx.shortfallCase());
  t.eq(byId(R, 'C16').result, 'FAIL');
  t.ok(/Funds \$10,000\.00 vs total/.test(byId(R, 'C16').detail));
});

t.test('double-count guard warns when VAT Inclusive plus line VAT', () => {
  const R = verify.runChecks(fx.directCase());
  t.eq(byId(R, 'C13').result, 'WARN');
});

t.test('non-competitive method requires justification', () => {
  const st = fx.directCase();
  st.methodjust = '';
  t.eq(byId(verify.runChecks(st), 'C14').result, 'FAIL');
  st.methodjust = 'Sole authorised distributor.';
  t.eq(byId(verify.runChecks(st), 'C14').result, 'PASS');
});

t.test('double-count guard: two recommended rows on one priced item fail', () => {
  const st = fx.shoesCase();
  st.items[0].quotes[1].recommended = true; // second supplier also ticked
  const R = verify.runChecks(st);
  t.eq(byId(R, 'C8b.1').result, 'FAIL');
});

t.test('attachment traceability: quotation without an attachment line fails', () => {
  const st = fx.shoesCase();
  st.attachments = st.attachments.filter(a => !/Beta/.test(a));
  const R = verify.runChecks(st);
  t.eq(byId(R, 'C20').result, 'FAIL');
  t.ok(/Beta Uniform Supplies/.test(byId(R, 'C20').detail));
});
