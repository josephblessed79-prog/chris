/* legacy-parity.test.js — the zero-regression proof for the module
   extraction. The pure-logic sections of legacy/Approvals_Composer.html
   (marked //<<CORE ... //CORE>> and //<<BUILD ... //BUILD>>) are executed
   in a Node vm sandbox, and every extracted module is held byte-for-byte
   to the legacy output across the fixture cases. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const t = require('./harness.js');
const fx = require('./fixtures.js');

const money = require('../js/lib/money.js');
const words = require('../js/lib/words.js');
const textutil = require('../js/lib/textutil.js');
const compute = require('../js/lib/compute.js');
const verify = require('../js/lib/verify.js');
const narrative = require('../js/lib/narrative.js');
const dApproval = require('../js/lib/docs/approval.js');
const dMinute = require('../js/lib/docs/minute.js');
const dChecklist = require('../js/lib/docs/checklist.js');
const dCert = require('../js/lib/docs/certificate.js');
const dCommon = require('../js/lib/docs/common.js');

/* ---- load the legacy engine into a sandbox ---- */
const html = fs.readFileSync(path.join(__dirname, '..', 'legacy', 'Approvals_Composer.html'), 'utf8');
function section(startMark, endMark) {
  const a = html.indexOf(startMark), b = html.indexOf(endMark);
  if (a < 0 || b < 0 || b <= a) throw new Error('marker not found: ' + startMark);
  return html.slice(a + startMark.length, b);
}
const legacySrc = section('//<<CORE', '//CORE>>') + '\n' + section('//<<BUILD', '//BUILD>>');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(legacySrc + '\n; this.__L = { parseMoney, fmtMoney, amountInWords, countWord, fmtDateLong, fmtDateProse, lineTotal, grandTotal, recommendedSuppliers, awardSummary, allSuppliers, runChecks, checkStats, composeOffline, buildApproval, buildMinute, buildChecklist, buildCert, wordWrap:(typeof wordWrap!=="undefined"?wordWrap:null) };', sandbox);
const L = sandbox.__L;

const cases = {
  shoes: fx.shoesCase(), split: fx.splitAwardCase(), failing: fx.failingCase(),
  direct: fx.directCase(), shortfall: fx.shortfallCase()
};

/* Objects returned from inside the vm sandbox belong to another realm, so
   deepStrictEqual would reject them on prototype identity alone. JSON
   round-tripping compares the data, which is what parity means here. */
function norm(x) { return JSON.parse(JSON.stringify(x)); }

/* ---- money ---- */
t.test('parseMoney parity across a value sweep', () => {
  const inputs = ['', null, undefined, '0', '0.5', '1', '12.34', '1,234.56',
    '$1,234.56', 'TT$99.10', '  450.00 ', 'abc', '12.345', '-5', '11,3900.00',
    '$57,4716.72', '1200', '380000.00'];
  for (const s of inputs) {
    const a = money.parseMoney(s), b = L.parseMoney(s);
    if (Number.isNaN(a) && Number.isNaN(b)) continue;
    t.eq(a, b, 'parseMoney(' + JSON.stringify(s) + ')');
  }
});

t.test('fmtMoney parity across a cents sweep', () => {
  const vals = [null, undefined, NaN, 0, 1, 99, 100, 120000, 4469425, 7838964,
    -12345, 5747167, 25520379, 63482304, 1e12 + 7];
  for (const v of vals) t.eq(money.fmtMoney(v), L.fmtMoney(v), 'fmtMoney(' + v + ')');
});

/* ---- words ---- */
t.test('amountInWords parity across a cents sweep', () => {
  const vals = [0, 1, 99, 100, 101, 1100, 120000, 1053000, 1066878, 5719086,
    7838964, 4469425, 100000000, 100000001, 123456789012, 25000, 205000, 999999999999];
  for (const v of vals) t.eq(words.amountInWords(v), L.amountInWords(v), 'amountInWords(' + v + ')');
});

t.test('amounts in words match the signed samples exactly', () => {
  t.eq(words.amountInWords(1053000), 'Ten Thousand, Five Hundred and Thirty Dollars');
  t.eq(words.amountInWords(1066878), 'Ten Thousand, Six Hundred and Sixty-Eight Dollars and Seventy-Eight Cents');
  t.eq(words.amountInWords(5719086), 'Fifty-Seven Thousand, One Hundred and Ninety Dollars and Eighty-Six Cents');
  t.eq(words.amountInWords(7838964), 'Seventy-Eight Thousand, Three Hundred and Eighty-Nine Dollars and Sixty-Four Cents');
});

/* ---- textutil ---- */
t.test('date and count helpers parity', () => {
  t.eq(textutil.fmtDateLong('2026-07-01', false), L.fmtDateLong('2026-07-01', false));
  t.eq(textutil.fmtDateLong('2026-07-01', true), L.fmtDateLong('2026-07-01', true));
  t.eq(textutil.fmtDateLong('', false), L.fmtDateLong('', false));
  t.eq(textutil.fmtDateLong('not-a-date', false), L.fmtDateLong('not-a-date', false));
  t.eq(textutil.fmtDateProse('2024-07-18'), L.fmtDateProse('2024-07-18'));
  for (let n = 0; n <= 25; n++) t.eq(textutil.countWord(n), L.countWord(n));
});

/* ---- compute ---- */
t.test('lineTotal / grandTotal / award grouping parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    for (const it of st.items) for (const q of it.quotes) {
      const a = compute.lineTotal(q), b = L.lineTotal(q);
      if (Number.isNaN(a) && Number.isNaN(b)) continue;
      t.eq(a, b, name + ' lineTotal ' + q.supplier);
    }
    const ga = compute.grandTotal(st.items), gb = L.grandTotal(st.items);
    if (!(Number.isNaN(ga) && Number.isNaN(gb))) t.eq(ga, gb, name + ' grandTotal');
    t.eq(norm(compute.recommendedSuppliers(st.items)), norm(L.recommendedSuppliers(st.items)), name + ' recommendedSuppliers');
    t.eq(norm(compute.awardSummary(st.items)), norm(L.awardSummary(st.items)), name + ' awardSummary');
    t.eq(norm(compute.allSuppliers(st.items)), norm(L.allSuppliers(st.items)), name + ' allSuppliers');
  }
});

/* ---- verification engine ---- */
t.test('runChecks parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    t.eq(norm(verify.runChecks(st)), norm(L.runChecks(st)), name + ' runChecks');
    t.eq(norm(verify.checkStats(verify.runChecks(st))), norm(L.checkStats(L.runChecks(st))), name + ' checkStats');
  }
});

/* ---- narrative composer ---- */
t.test('composeOffline parity', () => {
  const combos = [
    ['need', { activity: 'Accounts Training for Finance Branch personnel', who: 'thirty-five members of staff', when: '14-18 July 2026', cons: 'the training cannot be conducted', notes: 'the venue is confirmed\n- catering is required' }, { method: 'Request for Quotation' }],
    ['need', { notes: 'stock is exhausted' }, {}],
    ['need', {}, {}],
    ['methodjust', { notes: 'owing to the urgency of the requirement' }, { method: 'Direct Contracting' }],
    ['methodjust', { activity: 'boxed meals' }, { method: 'Request for Quotation' }],
    ['minextra', { notes: 'first paragraph line one\nline two\n\nsecond paragraph' }, {}],
    ['minextra', {}, {}]
  ];
  for (const [target, f, ctx] of combos) {
    t.eq(narrative.composeOffline(target, f, ctx), L.composeOffline(target, f, ctx),
      'composeOffline ' + target + ' ' + JSON.stringify(f).slice(0, 40));
  }
});

/* ---- document builders: byte-for-byte ---- */
t.test('buildApproval byte parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    t.eqStr(dApproval.buildApproval(st), L.buildApproval(st), name + ' approval letter');
  }
});

t.test('buildMinute byte parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    t.eqStr(dMinute.buildMinute(st), L.buildMinute(st), name + ' minute sheet');
  }
});

t.test('buildChecklist byte parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    t.eqStr(dChecklist.buildChecklist(st), L.buildChecklist(st), name + ' checklist');
  }
});

t.test('buildCert byte parity on every fixture', () => {
  for (const [name, st] of Object.entries(cases)) {
    t.eqStr(dCert.buildCert(st), L.buildCert(st), name + ' verification certificate');
  }
});

t.test('wordWrap byte parity', () => {
  if (!L.wordWrap) return; // wordWrap lives in the UI section of some revisions
  const body = '<p>Test body</p>';
  t.eqStr(dCommon.wordWrap(body, 'Title & Co'), L.wordWrap(body, 'Title & Co'));
});
