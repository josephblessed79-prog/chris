/* folio.js — the folio register. Every folio number in every document is
   computed from the register order and the case's starting folio number
   (set by the Procurement Supervisor when the physical file does not begin
   at folio 1). Nothing is ever renumbered by hand: change the start number
   and every reference in every document follows.
   Two presentation styles appear in the signed samples and both are
   supported: dotted-leader numerals ("1. …… 04/05/26") and circled
   numerals ("① …… 24/03/26").
   Loads in the browser as MODPA.folio and in Node via require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.folio = factory(root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (textutil) {
  'use strict';

  var esc = textutil.esc;

  /* Circled numeral for 1-50 (the Unicode sets used in the samples);
     beyond 50 falls back to "(51)" and the register says so plainly. */
  function circled(n) {
    if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);   // ①-⑳
    if (n >= 21 && n <= 35) return String.fromCharCode(0x3251 + n - 21); // ㉑-㉟
    if (n >= 36 && n <= 50) return String.fromCharCode(0x32B1 + n - 36); // ㊱-㊿
    return '(' + n + ')';
  }

  /* register entries: [{desc, date, tag?}] with blanks dropped.
     Returns [{n, desc, date, tag}] where n = folioStart + position. */
  function numbered(folios, folioStart) {
    var start = Number.isInteger(folioStart) && folioStart >= 1 ? folioStart : 1;
    var out = [];
    var live = (folios || []).filter(function (f) { return f && f.desc && String(f.desc).trim(); });
    for (var i = 0; i < live.length; i++) {
      out.push({ n: start + i, desc: String(live[i].desc), date: live[i].date || '', tag: live[i].tag || '' });
    }
    return out;
  }

  /* The number of a tagged folio ("evaluation", "quote:J. Chai Trading Co. Ltd"),
     or null when the register has no such folio — callers must treat null as
     a verification failure, never print an invented number. */
  function numberOfTag(folios, folioStart, tag) {
    var reg = numbered(folios, folioStart);
    for (var i = 0; i < reg.length; i++) if (reg[i].tag === tag) return reg[i].n;
    return null;
  }

  /* "Folios 1 to 6 refers," — computed range over the whole register. */
  function rangeText(folios, folioStart, template) {
    var reg = numbered(folios, folioStart);
    if (!reg.length) return '';
    var first = reg[0].n, last = reg[reg.length - 1].n;
    var tpl = template || 'Folios  {first}   to   {last}    refers,';
    if (reg.length === 1) return 'Folio  ' + first + '  refers,';
    return tpl.replace('{first}', String(first)).replace('{last}', String(last));
  }

  /* Prose references inside paragraphs: "Folio 2", "Folios 4 and 6". */
  function proseRef(ns) {
    var list = (Array.isArray(ns) ? ns : [ns]).filter(function (n) { return n != null; });
    if (!list.length) return '';
    if (list.length === 1) return 'Folio ' + list[0];
    return 'Folios ' + textutil.joinAnd(list.map(String));
  }

  /* The register table at the head of a minute sheet.
     style 'dotted':  1. | description with dotted leader | date
     style 'circled': ①  | description with dotted leader | date */
  function registerHTML(folios, folioStart, style) {
    var reg = numbered(folios, folioStart);
    if (!reg.length) return '';
    var h = '<table class="fol">';
    for (var i = 0; i < reg.length; i++) {
      var f = reg[i];
      var label = style === 'circled' ? circled(f.n) : (f.n + '.');
      h += '<tr><td style="width:26pt;vertical-align:bottom">' + esc(label) + '</td><td class="d1">' + esc(f.desc) + '</td><td class="d2">' + esc(f.date || '') + '</td></tr>';
    }
    h += '</table>';
    return h;
  }

  return {
    circled: circled,
    numbered: numbered,
    numberOfTag: numberOfTag,
    rangeText: rangeText,
    proseRef: proseRef,
    registerHTML: registerHTML
  };
});
