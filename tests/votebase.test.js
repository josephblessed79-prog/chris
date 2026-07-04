/* votebase.test.js — the Balance of Provision base.
   Verified treatment: the Ministry of Finance (Comptroller of Accounts)
   Accounting Manual, Vote Book §2.3.3 (Financial Regulations paras 66–69,
   Exchequer and Audit Act Ch. 69:01) controls expenditure against the
   funds allocated for the current financial year as varied by approved
   transfers and virements (Financial Instructions 1965, para 103(2)) —
   the Revised Allocation. That is the default base. A per-case override
   to the Original Provision exists for a written instruction to the
   contrary; it is recorded, printed in the check detail, and the choice
   is only surfaced by the interface when the two figures differ. */
'use strict';

const t = require('./harness.js');
const votestatus = require('../js/lib/votestatus.js');

const DIFFERING = {
  originalProvision: '380,000.00',
  revisedAllocation: '400,000.00', // $20,000.00 moved in by transfer
  releasesToDate: '32,602.00',
  expenditureToDate: '3,560.57',
  commitment: '21,654.44'
};

t.test('default base is the Revised Allocation (verified MoF treatment)', () => {
  const c = votestatus.compute(DIFFERING);
  t.eq(c.ok, true);
  t.eq(c.baseUsed, 'revised');
  t.eq(c.cents.balanceOfProvision, 40000000 - 356057, 'Revised $400,000.00 − expenditure');
  t.eq(c.cents.uncommittedBalance, 40000000 - 356057 - 2165444);
});

t.test('a recorded per-case selection of the Original Provision is honoured', () => {
  const vs = Object.assign({}, DIFFERING, { provisionBase: 'original' });
  const c = votestatus.compute(vs);
  t.eq(c.baseUsed, 'original');
  t.eq(c.cents.balanceOfProvision, 38000000 - 356057, 'Original $380,000.00 − expenditure');
});

t.test('when the figures differ, the computation says which base it used and why', () => {
  const c = votestatus.compute(DIFFERING);
  t.eq(c.notes.length, 1);
  t.ok(/Revised Allocation/.test(c.notes[0]));
  t.ok(/Comptroller of Accounts Accounting Manual/.test(c.notes[0]), 'the authority is cited');
  const co = votestatus.compute(Object.assign({}, DIFFERING, { provisionBase: 'original' }));
  t.ok(/Original Provision/.test(co.notes[0]));
  t.ok(/per-case selection recorded/.test(co.notes[0]));
});

t.test('when the figures are equal, no note is raised — the choice changes nothing', () => {
  const c = votestatus.compute({
    originalProvision: '380,000.00', revisedAllocation: '380,000.00',
    releasesToDate: '32,602.00', expenditureToDate: '3,560.57', commitment: '21,654.44'
  });
  t.eq(c.notes, []);
  t.eq(c.cents.balanceOfProvision, 37643943, 'the signed-sample figure is unchanged');
});

t.test('the H1 check detail carries the base note so certificates record it', () => {
  const R = votestatus.runVoteChecks(DIFFERING, 120000);
  const h1 = R.find(x => x.id === 'H1');
  t.eq(h1.result, 'PASS');
  t.ok(/Revised Allocation/.test(h1.detail));
  t.ok(/Financial Instructions 1965/.test(h1.detail));
});

t.test('the base only moves the provision-side balances, never the releases side', () => {
  const rev = votestatus.compute(DIFFERING);
  const orig = votestatus.compute(Object.assign({}, DIFFERING, { provisionBase: 'original' }));
  t.eq(rev.cents.balanceOfReleases, orig.cents.balanceOfReleases);
  t.ok(rev.cents.balanceOfProvision !== orig.cents.balanceOfProvision);
});
