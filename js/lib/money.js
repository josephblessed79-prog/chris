/* money.js — deterministic money arithmetic. Every amount in the system is an
   integer number of cents; no floating-point money ever leaves this module.
   Loads in the browser as MODPA.money and in Node via require(). No deps.

   Two parsers:
     parseMoney  — the legacy tolerant parser (strips $ , and spaces). Kept
                   byte-compatible with Approvals_Composer.html because the
                   ported computation and verification engines depend on its
                   exact null/NaN behaviour.
     parseStrict — the entry-gate parser. It refuses what the tolerant parser
                   would silently accept: bad comma grouping ("$11,3900.00",
                   "$57,4716.72" — both taken from signed sample documents),
                   more than two decimals, stray characters. The user
                   interface parses every typed figure with parseStrict and
                   shows the reason for refusal beside the field. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.money = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /* Legacy tolerant parser: string -> cents, or null (blank) or NaN (bad). */
  function parseMoney(s) {
    if (s === null || s === undefined) return null;
    var t = String(s).replace(/[$,\s]/g, '').replace(/^TT\$?/i, '');
    if (t === '') return null;
    if (!/^\d+(\.\d{1,2})?$/.test(t)) return NaN;
    var parts = t.split('.');
    var c = parseInt(parts[0], 10) * 100;
    if (parts[1]) c += parseInt((parts[1] + '0').slice(0, 2), 10);
    return c;
  }

  /* Strict entry-gate parser.
     Returns { ok:true, cents, canonical } or { ok:false, reason, hint }.
     Accepted forms: "1234.56", "1,234.56", "$1,234.56", "TT$1,234.56",
     "1234" (whole dollars). Comma grouping, when present, must be canonical
     groups of three from the right. */
  function parseStrict(s) {
    if (s === null || s === undefined || String(s).trim() === '') {
      return { ok: false, reason: 'empty', hint: 'No figure entered.' };
    }
    var t = String(s).trim().replace(/^TT\$?/i, '').replace(/^\$/, '').trim();
    if (t === '') return { ok: false, reason: 'empty', hint: 'No figure entered.' };
    var m = t.match(/^(\d{1,3}(?:,\d{3})*|\d+)(?:\.(\d+))?$/);
    if (!m) {
      if (/^\d[\d,]*(?:\.\d*)?$/.test(t)) {
        return { ok: false, reason: 'bad-grouping',
          hint: 'The comma grouping is wrong (for example "$11,3900.00" is not a valid figure — check the source and re-enter it as printed, e.g. "$11,390.00" or "$113,900.00").' };
      }
      return { ok: false, reason: 'not-a-number',
        hint: 'Only digits, a decimal point, and canonical commas are accepted (e.g. 1,234.56).' };
    }
    if (m[1].indexOf(',') >= 0 && !/^\d{1,3}(,\d{3})+$/.test(m[1])) {
      return { ok: false, reason: 'bad-grouping',
        hint: 'The comma grouping is wrong — commas must separate groups of three digits.' };
    }
    var dec = m[2] === undefined ? '' : m[2];
    if (dec.length > 2) {
      return { ok: false, reason: 'bad-decimals',
        hint: 'More than two decimal places — money is entered to the cent.' };
    }
    var whole = parseInt(m[1].replace(/,/g, ''), 10);
    if (!isFinite(whole) || whole > 90071992547409) {
      return { ok: false, reason: 'too-large', hint: 'Figure is too large to be handled exactly.' };
    }
    var cents = whole * 100 + (dec ? parseInt((dec + '0').slice(0, 2), 10) : 0);
    return { ok: true, cents: cents, canonical: fmtMoney(cents) };
  }

  /* cents -> "$1,234.56" (legacy format, byte-compatible). */
  function fmtMoney(cents) {
    if (cents === null || cents === undefined || isNaN(cents)) return '';
    var neg = cents < 0;
    cents = Math.abs(cents);
    var d = Math.floor(cents / 100), c = cents % 100;
    var s = String(d).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + '$' + s + '.' + (c < 10 ? '0' : '') + c;
  }

  /* VAT in Trinidad and Tobago is 12.5% (rate held as a rational number so
     the arithmetic stays exact). Rounding is half-up at the cent, which is
     what the signed samples do: $189,216.68 × 12.5% = $23,652.085 → $23,652.09. */
  var VAT_RATE = { num: 125, den: 1000, label: '12.5%' };

  function vatCents(cents, rate) {
    rate = rate || VAT_RATE;
    if (cents === null || cents === undefined || isNaN(cents)) return NaN;
    var num = cents * rate.num;
    return Math.floor((num + rate.den / 2) / rate.den);
  }

  /* Integer quantity × unit cents, exact. Fractional quantities (legacy
     allowed e.g. 2.5 metres) fall back to the legacy rounding. */
  function mulQtyCents(qty, unitCents) {
    if (unitCents === null || unitCents === undefined || isNaN(unitCents)) return NaN;
    var q = Number(qty);
    if (!isFinite(q) || q <= 0) return NaN;
    if (Number.isInteger(q)) return q * unitCents;
    return Math.round(q * unitCents);
  }

  /* Compare a/b priced amounts exactly without division:
     is (aCents per aQty units) cheaper than (bCents per bQty units)?
     Cross-multiplication keeps it in integers. Returns -1/0/1. */
  function cmpUnitRate(aCents, aQty, bCents, bQty) {
    var l = aCents * bQty, r = bCents * aQty;
    return l < r ? -1 : l > r ? 1 : 0;
  }

  /* Display-only comparable unit rate, rounded half-up to the cent, for a
     price quoted per pack: rateCents(packCents, packSize). The comparison
     logic never uses this rounded figure. */
  function unitRateDisplay(packCents, packSize) {
    if (!packSize || packSize <= 0 || packCents == null || isNaN(packCents)) return NaN;
    return Math.floor((packCents + packSize / 2) / packSize);
  }

  return {
    parseMoney: parseMoney,
    parseStrict: parseStrict,
    fmtMoney: fmtMoney,
    VAT_RATE: VAT_RATE,
    vatCents: vatCents,
    mulQtyCents: mulQtyCents,
    cmpUnitRate: cmpUnitRate,
    unitRateDisplay: unitRateDisplay
  };
});
