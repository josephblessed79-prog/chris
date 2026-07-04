/* textutil.js — text helpers shared by the engine and the document builders.
   Loads in the browser as MODPA.textutil and in Node via require().
   No dependencies. Ported from Approvals_Composer.html without change of
   behaviour; the parity test holds every function to the legacy output. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.textutil = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* HTML-escape for every user-typed value placed in a document. */
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* Number as word for small counts: countWord(5) -> "five", used as
     "five (5) suppliers". Beyond twenty the figure alone is returned. */
  function countWord(n) {
    var w = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
      'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
      'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
    return (n >= 0 && n <= 20) ? w[n] : String(n);
  }

  /* "a, b and c" */
  function joinAnd(a) {
    if (!a.length) return '';
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];

  /* iso yyyy-mm-dd -> "01 July, 2026"; handDay leaves space for a hand-written
     day: "     July, 2026". Unparseable input is returned untouched. */
  function fmtDateLong(iso, handDay) {
    if (!iso) return '';
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    var mon = MONTHS[parseInt(m[2], 10) - 1];
    return (handDay ? '\u00A0\u00A0\u00A0\u00A0\u00A0' : m[3] + ' ') + mon + ', ' + m[1];
  }


  /* iso yyyy-mm-dd -> "18 July 2024" (prose form, no leading zero). */
  function fmtDateProse(iso) {
    if (!iso) return '';
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return String(parseInt(m[3], 10)) + ' ' + MONTHS[parseInt(m[2], 10) - 1] + ' ' + m[1];
  }

  /* iso yyyy-mm-dd -> "13/05/26" (folio register style). */
  function fmtDateShort(iso) {
    if (!iso) return '';
    var m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return iso;
    return m[3] + '/' + m[2] + '/' + m[1].slice(2);
  }

  /* Ensure a sentence ends with a stop. */
  function endStop(s) {
    s = (s || '').trim();
    if (!s) return '';
    return /[.!?:;]$/.test(s) ? s : s + '.';
  }

  /* Lower-case a leading article/pronoun so a fragment can be spliced
     mid-sentence ("The training…" -> "the training…"). */
  function softLower(s) {
    s = (s || '').trim();
    var m = s.match(/^([A-Za-z]+)\b/);
    if (!m) return s;
    var starters = { 'The': 1, 'A': 1, 'An': 1, 'This': 1, 'That': 1, 'These': 1,
      'Those': 1, 'It': 1, 'They': 1, 'We': 1, 'Our': 1, 'There': 1, 'No': 1,
      'Should': 1, 'When': 1, 'If': 1, 'Because': 1, 'Owing': 1, 'Given': 1 };
    if (starters[m[1]]) return m[1].toLowerCase() + s.slice(m[1].length);
    return s;
  }

  /* One rough note line -> one tidy sentence. */
  function cleanNoteLine(s) {
    s = (s || '').trim();
    if (!s) return '';
    s = s.replace(/^[\s\-–—\*•]+/, '').trim();
    if (!s) return '';
    if (/^[a-z]/.test(s) && !/^(the|a|an|it|they|we|our|this|that|these|those|there)\b/.test(s) === false) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    } else if (/^[a-z]/.test(s)) {
      s = s.charAt(0).toUpperCase() + s.slice(1);
    }
    return endStop(s);
  }

  function notesToSentences(notes) {
    if (!notes) return [];
    return notes.split(/\r?\n/).map(cleanNoteLine).filter(function (x) { return x; });
  }

  return {
    esc: esc,
    countWord: countWord,
    joinAnd: joinAnd,
    fmtDateLong: fmtDateLong,
    fmtDateProse: fmtDateProse,
    fmtDateShort: fmtDateShort,
    endStop: endStop,
    softLower: softLower,
    cleanNoteLine: cleanNoteLine,
    notesToSentences: notesToSentences,
    MONTHS: MONTHS
  };
});
