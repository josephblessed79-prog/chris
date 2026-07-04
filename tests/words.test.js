/* words.test.js — amounts in words, Trinidad and Tobago house style. */
'use strict';

const t = require('./harness.js');
const { amountInWords } = require('../js/lib/words.js');

t.test('house style matches the signed samples', () => {
  t.eq(amountInWords(120000), 'One Thousand, Two Hundred Dollars');
  t.eq(amountInWords(1053000), 'Ten Thousand, Five Hundred and Thirty Dollars');
  t.eq(amountInWords(1066878), 'Ten Thousand, Six Hundred and Sixty-Eight Dollars and Seventy-Eight Cents');
  t.eq(amountInWords(5719086), 'Fifty-Seven Thousand, One Hundred and Ninety Dollars and Eighty-Six Cents');
  t.eq(amountInWords(7838964), 'Seventy-Eight Thousand, Three Hundred and Eighty-Nine Dollars and Sixty-Four Cents');
});

t.test('edges', () => {
  t.eq(amountInWords(0), 'Zero Dollars');
  t.eq(amountInWords(100), 'One Dollar');
  t.eq(amountInWords(101), 'One Dollar and One Cent');
  t.eq(amountInWords(1), 'One Cent');
  t.eq(amountInWords(50), 'Fifty Cents');
  t.eq(amountInWords(100000000), 'One Million Dollars');
  t.eq(amountInWords(100000100), 'One Million, One Dollars');
  t.eq(amountInWords(NaN), '');
  t.eq(amountInWords(null), '');
});

t.test('hundreds use "and"; tens are hyphenated', () => {
  t.eq(amountInWords(47100), 'Four Hundred and Seventy-One Dollars');
  t.eq(amountInWords(2483 * 100 + 54), 'Two Thousand, Four Hundred and Eighty-Three Dollars and Fifty-Four Cents');
  t.eq(amountInWords(1719), 'Seventeen Dollars and Nineteen Cents');
});

t.test('large scales', () => {
  t.eq(amountInWords(123456789012),
    'One Billion, Two Hundred and Thirty-Four Million, Five Hundred and Sixty-Seven Thousand, Eight Hundred and Ninety Dollars and Twelve Cents');
});
