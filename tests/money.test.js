/* money.test.js — deterministic money arithmetic, including the strict
   entry-gate parser that must flag the malformed figures found in the
   signed sample documents. */
'use strict';

const t = require('./harness.js');
const money = require('../js/lib/money.js');

t.test('parseMoney tolerant behaviour (legacy contract)', () => {
  t.eq(money.parseMoney('450.00'), 45000);
  t.eq(money.parseMoney('$1,234.56'), 123456);
  t.eq(money.parseMoney('TT$99.10'), 9910);
  t.eq(money.parseMoney('0.5'), 50);
  t.eq(money.parseMoney(''), null);
  t.eq(money.parseMoney(null), null);
  t.ok(Number.isNaN(money.parseMoney('abc')));
  t.ok(Number.isNaN(money.parseMoney('12.345')));
  t.ok(Number.isNaN(money.parseMoney('-5')));
});

t.test('fmtMoney formatting', () => {
  t.eq(money.fmtMoney(0), '$0.00');
  t.eq(money.fmtMoney(5), '$0.05');
  t.eq(money.fmtMoney(120000), '$1,200.00');
  t.eq(money.fmtMoney(4469425), '$44,694.25');
  t.eq(money.fmtMoney(-12345), '-$123.45');
  t.eq(money.fmtMoney(NaN), '');
  t.eq(money.fmtMoney(null), '');
});

t.test('parseStrict accepts well-formed figures', () => {
  t.eq(money.parseStrict('1234.56'), { ok: true, cents: 123456, canonical: '$1,234.56' });
  t.eq(money.parseStrict('$1,234.56').cents, 123456);
  t.eq(money.parseStrict('TT$11,390.00').cents, 1139000);
  t.eq(money.parseStrict('113,900.00').cents, 11390000);
  t.eq(money.parseStrict('1200').cents, 120000);
  t.eq(money.parseStrict('0.5').cents, 50);
  t.eq(money.parseStrict(' 574,716.72 ').cents, 57471672);
});

t.test('parseStrict flags the malformed figures from the signed samples', () => {
  // "$11,3900.00" appears in the signed Minor Equipment evaluation (item 7).
  const a = money.parseStrict('$11,3900.00');
  t.eq(a.ok, false); t.eq(a.reason, 'bad-grouping');
  // "$57,4716.72" appears in the same document (Pillai Sub Total (V)).
  const b = money.parseStrict('$57,4716.72');
  t.eq(b.ok, false); t.eq(b.reason, 'bad-grouping');
  const c = money.parseStrict('1,23.45');
  t.eq(c.ok, false); t.eq(c.reason, 'bad-grouping');
});

t.test('parseStrict refuses other malformed input with a reason', () => {
  t.eq(money.parseStrict('').reason, 'empty');
  t.eq(money.parseStrict('   ').reason, 'empty');
  t.eq(money.parseStrict('12.345').reason, 'bad-decimals');
  t.eq(money.parseStrict('abc').reason, 'not-a-number');
  t.eq(money.parseStrict('12..3').reason, 'not-a-number');
  t.eq(money.parseStrict('-5').reason, 'not-a-number');
  t.eq(money.parseStrict('1 200').reason, 'not-a-number');
});

t.test('VAT at 12.5% rounds half-up at the cent, as the samples do', () => {
  // $9,360.00 -> $1,170.00 (exact — Materials sample, A. Moses & Sons)
  t.eq(money.vatCents(936000), 117000);
  // $9,483.36 -> $1,185.42 (exact — Pillai)
  t.eq(money.vatCents(948336), 118542);
  // $50,836.32 -> $6,354.54 (exact — J. Chai)
  t.eq(money.vatCents(5083632), 635454);
  // $19,868.35 -> $2,483.54375 -> $2,483.54 (Pantry, Beyond Office Solutions)
  t.eq(money.vatCents(1986835), 248354);
  // $189,216.68 -> $23,652.085 -> half-up -> $23,652.09 (Minor Equipment, Trintrac)
  t.eq(money.vatCents(18921668), 2365209);
  // $453,375.00 -> $56,671.875 -> half-up -> $56,671.88 (Minor Equipment, J. Chai)
  t.eq(money.vatCents(45337500), 5667188);
  t.ok(Number.isNaN(money.vatCents(NaN)));
});

t.test('quantity multiplication is exact for integer quantities', () => {
  t.eq(money.mulQtyCents(8, 742500), 5940000);       // 8 × $7,425.00 = $59,400.00
  t.eq(money.mulQtyCents(96, 2470), 237120);          // 96 × $24.70  = $2,371.20
  t.eq(money.mulQtyCents(3, 32000), 96000);           // 3 cases × $320.00 = $960.00
  t.ok(Number.isNaN(money.mulQtyCents(0, 100)));
  t.ok(Number.isNaN(money.mulQtyCents('', 100)));
});

t.test('exact unit-rate comparison by cross-multiplication', () => {
  // $320.00 per case of 24 vs $12.80 per bottle: 320/24 = 13.33 > 12.80
  t.eq(money.cmpUnitRate(32000, 24, 1280, 1), 1);
  // $240.00 per case of 24 vs $10.00 per bottle: exactly equal
  t.eq(money.cmpUnitRate(24000, 24, 1000, 1), 0);
  // $230.00 per case of 24 vs $10.00 per bottle: cheaper by the case
  t.eq(money.cmpUnitRate(23000, 24, 1000, 1), -1);
});

t.test('display-only unit rate rounds half-up and is never used in totals', () => {
  t.eq(money.unitRateDisplay(32000, 24), 1333);   // $13.33 (0.333 down)
  t.eq(money.unitRateDisplay(82615, 24), 3442);   // $34.42 ($826.15/24 = 34.4229)
  t.eq(money.unitRateDisplay(100, 3), 33);        // 33.33 -> 33
  t.eq(money.unitRateDisplay(100, 8), 13);        // 12.5 -> half-up 13
});
