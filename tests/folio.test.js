/* folio.test.js — folio numbering from a configurable start, the two
   presentation styles, and computed references. */
'use strict';

const t = require('./harness.js');
const folio = require('../js/lib/folio.js');

const REG = [
  { desc: 'Purchase Requisition', date: '24/03/26', tag: 'requisition' },
  { desc: 'Vote Position Re: Other Minor Equipment', date: '31/03/26', tag: 'vote-position' },
  { desc: '', date: '' }, // blank line is dropped
  { desc: 'Quotation Re: Pillai Tools Company Ltd', date: '02/04/26', tag: 'quote:Pillai Tools Company Ltd' },
  { desc: 'Evaluation for Materials and Supplies', date: '', tag: 'evaluation' }
];

t.test('numbering starts at folioStart and skips blanks', () => {
  const n1 = folio.numbered(REG, 1);
  t.eq(n1.map(f => f.n), [1, 2, 3, 4]);
  const n7 = folio.numbered(REG, 7);
  t.eq(n7.map(f => f.n), [7, 8, 9, 10]);
  t.eq(n7[0].desc, 'Purchase Requisition');
  // invalid start falls back to 1
  t.eq(folio.numbered(REG, 0).map(f => f.n), [1, 2, 3, 4]);
  t.eq(folio.numbered(REG, undefined)[0].n, 1);
});

t.test('tagged folio lookup renumbers with the start', () => {
  t.eq(folio.numberOfTag(REG, 1, 'evaluation'), 4);
  t.eq(folio.numberOfTag(REG, 5, 'evaluation'), 8);
  t.eq(folio.numberOfTag(REG, 1, 'no-such-tag'), null);
});

t.test('range text is computed, never typed', () => {
  t.eq(folio.rangeText(REG, 1), 'Folios  1   to   4    refers,');
  t.eq(folio.rangeText(REG, 3), 'Folios  3   to   6    refers,');
  t.eq(folio.rangeText([{ desc: 'Only folio' }], 2), 'Folio  2  refers,');
  t.eq(folio.rangeText([], 1), '');
});

t.test('prose references', () => {
  t.eq(folio.proseRef(2), 'Folio 2');
  t.eq(folio.proseRef([4, 6]), 'Folios 4 and 6');
  t.eq(folio.proseRef([1, 2, 3]), 'Folios 1, 2 and 3');
  t.eq(folio.proseRef([]), '');
});

t.test('circled numerals cover 1-50 and fall back plainly beyond', () => {
  t.eq(folio.circled(1), '①');
  t.eq(folio.circled(8), '⑧');
  t.eq(folio.circled(20), '⑳');
  t.eq(folio.circled(21), '㉑');
  t.eq(folio.circled(35), '㉟');
  t.eq(folio.circled(36), '㊱');
  t.eq(folio.circled(50), '㊿');
  t.eq(folio.circled(51), '(51)');
});

t.test('register HTML renders both styles with computed numbers', () => {
  const dotted = folio.registerHTML(REG, 1, 'dotted');
  t.ok(dotted.indexOf('>1.</td>') > 0);
  t.ok(dotted.indexOf('Purchase Requisition') > 0);
  t.ok(dotted.indexOf('24/03/26') > 0);
  const circ = folio.registerHTML(REG, 1, 'circled');
  t.ok(circ.indexOf('>①</td>') > 0);
  t.ok(circ.indexOf('>④</td>') > 0);
  const circ5 = folio.registerHTML(REG, 5, 'circled');
  t.ok(circ5.indexOf('>⑤</td>') > 0, 'renumbered start');
  t.eq(folio.registerHTML([], 1, 'dotted'), '');
});
