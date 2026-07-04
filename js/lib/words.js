/* words.js — amounts in words, Trinidad and Tobago Ministry house style.
   Generated from the same integer-cents number as the printed figure, so the
   words and the figure cannot disagree. Style confirmed against the signed
   samples, e.g. "Seventy-Eight Thousand, Three Hundred and Eighty-Nine
   Dollars and Sixty-Four Cents ($78,389.64)".
   Loads in the browser as MODPA.words and in Node via require(). No deps. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.words = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  var TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty',
    'Seventy', 'Eighty', 'Ninety'];

  /* 0-999 -> words: 471 -> "Four Hundred and Seventy-One" */
  function threeWords(n) {
    var out = '';
    var h = Math.floor(n / 100), r = n % 100;
    if (h) out = ONES[h] + ' Hundred';
    if (r) {
      if (out) out += ' and ';
      if (r < 20) out += ONES[r];
      else {
        out += TENS[Math.floor(r / 10)];
        if (r % 10) out += '-' + ONES[r % 10];
      }
    }
    return out;
  }

  /* integer cents -> "…Dollars and …Cents" (house style, no "Only" suffix —
     none of the signed samples uses one). */
  function amountInWords(cents) {
    if (cents === null || cents === undefined || isNaN(cents)) return '';
    cents = Math.round(cents);
    var d = Math.floor(cents / 100), c = cents % 100;
    var scales = [[1000000000, 'Billion'], [1000000, 'Million'], [1000, 'Thousand'], [1, '']];
    var chunks = [], rem = d;
    for (var i = 0; i < scales.length; i++) {
      var q = Math.floor(rem / scales[i][0]);
      rem = rem % scales[i][0];
      if (q) chunks.push(threeWords(q) + (scales[i][1] ? ' ' + scales[i][1] : ''));
    }
    var dw = '';
    if (d === 0) dw = 'Zero';
    else dw = chunks.join(', ');
    var s = dw + (d === 1 ? ' Dollar' : ' Dollars');
    if (d === 0 && c > 0) s = '';
    if (c > 0) {
      var cw = threeWords(c) + (c === 1 ? ' Cent' : ' Cents');
      s = s ? (s + ' and ' + cw) : cw;
    }
    return s;
  }

  return { amountInWords: amountInWords, threeWords: threeWords };
});
