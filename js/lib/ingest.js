/* ingest.js — document ingestion: candidate-fact extraction. This module
   is an accelerator for typing, not an authority. It parses text or rows
   for candidate suppliers, dates, figures, item lines and reference
   numbers, and presents each with its source snippet and a plain
   confidence note. NOTHING it finds enters the case until a person
   accepts it on the staging screen, and figures can never be accepted in
   bulk. The verification certificate's figure-by-figure folio check
   applies to ingested figures exactly as to typed ones.
   Pure logic — no file handling here (see ingestfiles.js for the browser
   side). Loads as MODPA.ingest / require(). */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./money.js'), require('./textutil.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.ingest = factory(root.MODPA.money, root.MODPA.textutil);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (money, textutil) {
  'use strict';

  var OCR_NOTE = 'Read by OCR from a scanned image — OCR is error-prone; verify every character against the original before accepting.';

  function snippetAround(text, index, length) {
    var from = Math.max(0, index - 40);
    var to = Math.min(text.length, index + length + 40);
    return (from > 0 ? '…' : '') + text.slice(from, to).replace(/\s+/g, ' ').trim() + (to < text.length ? '…' : '');
  }

  function mkCandidate(kind, value, canonical, snippet, confidence, note, target) {
    return {
      kind: kind, value: value, canonical: canonical, snippet: snippet,
      confidence: confidence, note: note || '', target: target || '',
      accepted: false, rejected: false, edited: false
    };
  }

  /* ---- figures ---- */
  function extractFigures(text, origin) {
    var out = [];
    var re = /(?:TT\$|\$)?\s?(\d[\d,]*\.\d{1,2})(?!\d)/g;
    var m;
    while ((m = re.exec(text))) {
      var raw = m[0].trim();
      var p = money.parseStrict(raw);
      var snip = snippetAround(text, m.index, m[0].length);
      if (p.ok) {
        out.push(mkCandidate('figure', raw, p.canonical, snip,
          origin === 'ocr' ? 'low' : 'medium',
          (origin === 'ocr' ? OCR_NOTE + ' ' : '') + 'Figures are never bulk-accepted; each must be confirmed individually.',
          'figure'));
      } else {
        out.push(mkCandidate('figure', raw, null, snip, 'low',
          (origin === 'ocr' ? OCR_NOTE + ' ' : '') + 'REJECTED as a figure: ' + p.hint + ' Edit it to what the source document actually says before it can be accepted.',
          'figure'));
      }
    }
    return out;
  }

  /* ---- dates ---- */
  var MONTH_INDEX = {};
  textutil.MONTHS.forEach(function (mth, i) { MONTH_INDEX[mth.toLowerCase()] = i + 1; });

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function extractDates(text, origin) {
    var out = [];
    var conf = origin === 'ocr' ? 'low' : 'medium';
    var m;
    /* dd/mm/yy and dd/mm/yyyy — Commonwealth day-first order assumed and said. */
    var re1 = /\b(\d{1,2})[\/.](\d{1,2})[\/.](\d{2}|\d{4})\b/g;
    while ((m = re1.exec(text))) {
      var d = parseInt(m[1], 10), mo = parseInt(m[2], 10), y = parseInt(m[3], 10);
      if (m[3].length === 2) y += 2000;
      var snip = snippetAround(text, m.index, m[0].length);
      if (mo < 1 || mo > 12 || d < 1 || d > 31) {
        out.push(mkCandidate('date', m[0], null, snip, 'low', 'Not a readable day-first date.', 'date'));
        continue;
      }
      var note = 'Read as day/month/year (Commonwealth order).';
      if (d <= 12 && d !== mo) note += ' Could also be month-first — confirm against the document.';
      out.push(mkCandidate('date', m[0], y + '-' + pad2(mo) + '-' + pad2(d), snip, conf, (origin === 'ocr' ? OCR_NOTE + ' ' : '') + note, 'date'));
    }
    /* 13 May 2026 / 13 May, 2026 */
    var re2 = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s*,?\s*(\d{4})\b/gi;
    while ((m = re2.exec(text))) {
      var d2 = parseInt(m[1], 10), mo2 = MONTH_INDEX[m[2].toLowerCase()], y2 = parseInt(m[3], 10);
      out.push(mkCandidate('date', m[0], y2 + '-' + pad2(mo2) + '-' + pad2(d2),
        snippetAround(text, m.index, m[0].length), origin === 'ocr' ? 'low' : 'high',
        origin === 'ocr' ? OCR_NOTE : '', 'date'));
    }
    return out;
  }

  /* ---- file references ---- */
  function extractReferences(text, origin) {
    var out = [];
    var re = /\b([A-Z]{2,}(?:\/[A-Z]{2,})*\s*:?\s*[\d\/:.-]+\d)/g;
    var m;
    while ((m = re.exec(text))) {
      out.push(mkCandidate('reference', m[1].trim(), m[1].trim(),
        snippetAround(text, m.index, m[0].length), origin === 'ocr' ? 'low' : 'medium',
        (origin === 'ocr' ? OCR_NOTE + ' ' : '') + 'Looks like a file or minute reference.', 'ref'));
    }
    return out;
  }

  /* ---- supplier names ---- */
  var COMPANY_TAIL = /\b(?:Limited|Ltd\.?|Co\.\s?Ltd\.?|Company\s+Limited|Company\s+Ltd\.?|Incorporated|Inc\.?|Enterprises(?:\s+Limited)?|Services(?:\s+Limited)?|& Sons(?:\s+Limited)?|and Sons(?:\s+Limited)?)\s*$/;

  function extractSuppliers(text, origin) {
    var out = [], seen = {};
    var re = /([A-Z][\w’'&.,()\- ]{2,70}?(?:Limited|Ltd\.?|Inc\.?|Incorporated))(?=[\s;,.)]|$)/g;
    var m;
    while ((m = re.exec(text))) {
      var name = m[1].replace(/^[\s;,.]+/, '').replace(/\s+/g, ' ').trim();
      /* trim leading sentence words that are not part of the name: keep from
         the last capitalised run start — conservative: drop leading lowercase words */
      var k = name.toLowerCase();
      if (seen[k]) continue;
      seen[k] = 1;
      out.push(mkCandidate('supplier', name, name,
        snippetAround(text, m.index, m[0].length), origin === 'ocr' ? 'low' : 'medium',
        (origin === 'ocr' ? OCR_NOTE + ' ' : '') + 'Company-style name — confirm the exact registered name from the quotation.', 'supplier'));
    }
    return out;
  }

  /* ---- item lines from tabular rows (CSV / XLSX / pasted tables) ----
     Detects columns by header keywords; each row becomes one item-line
     candidate whose figures are strict-parsed, with the qty × unit = total
     check computed and any disagreement flagged on the candidate. */
  var HEADER_MAP = [
    ['desc', /^(item|description|items requested|particulars|goods|details?)$/i],
    ['qty', /^(qty|quantity|quantity requested|amount \(qty\)|no\.? of units)$/i],
    ['unit', /^(unit|unit cost|unit price|rate|price|cost)( \$| \(\$\))?$/i],
    ['total', /^(total|total cost|extended|amount|line total)( \$| \(\$\))?$/i],
    ['supplier', /^(supplier|company|vendor)$/i]
  ];

  function detectColumns(headerRow) {
    var map = {};
    for (var c = 0; c < headerRow.length; c++) {
      var cell = String(headerRow[c] == null ? '' : headerRow[c]).trim();
      if (!cell) continue;
      for (var h = 0; h < HEADER_MAP.length; h++) {
        if (HEADER_MAP[h][1].test(cell) && map[HEADER_MAP[h][0]] === undefined) {
          map[HEADER_MAP[h][0]] = c;
        }
      }
    }
    return map;
  }

  function extractItemsFromRows(rows, origin) {
    var out = [];
    if (!rows || !rows.length) return out;
    var headerIdx = -1, map = {};
    for (var r = 0; r < Math.min(rows.length, 10); r++) {
      var m2 = detectColumns(rows[r] || []);
      if (m2.desc !== undefined && (m2.unit !== undefined || m2.total !== undefined)) { headerIdx = r; map = m2; break; }
    }
    if (headerIdx < 0) return out;
    for (var i = headerIdx + 1; i < rows.length; i++) {
      var row = rows[i] || [];
      var desc = String(row[map.desc] == null ? '' : row[map.desc]).trim();
      if (!desc) continue;
      var qtyRaw = map.qty !== undefined ? String(row[map.qty] == null ? '' : row[map.qty]).trim() : '';
      var unitRaw = map.unit !== undefined ? String(row[map.unit] == null ? '' : row[map.unit]).trim() : '';
      var totalRaw = map.total !== undefined ? String(row[map.total] == null ? '' : row[map.total]).trim() : '';
      var supplier = map.supplier !== undefined ? String(row[map.supplier] == null ? '' : row[map.supplier]).trim() : '';
      var qty = /^\d+$/.test(qtyRaw) ? parseInt(qtyRaw, 10) : null;
      var unitP = unitRaw ? money.parseStrict(unitRaw) : { ok: false, reason: 'empty' };
      var totalP = totalRaw ? money.parseStrict(totalRaw) : { ok: false, reason: 'empty' };
      var notes = [];
      var confidence = origin === 'ocr' ? 'low' : 'medium';
      if (origin === 'ocr') notes.push(OCR_NOTE);
      if (qtyRaw && qty === null) { notes.push('Quantity "' + qtyRaw + '" is not a whole number.'); confidence = 'low'; }
      if (unitRaw && !unitP.ok) { notes.push('Unit figure rejected: ' + unitP.hint); confidence = 'low'; }
      if (totalRaw && !totalP.ok) { notes.push('Total figure rejected: ' + totalP.hint); confidence = 'low'; }
      if (qty !== null && unitP.ok && totalP.ok) {
        var expect = qty * unitP.cents;
        if (expect === totalP.cents) {
          notes.push('Checked: ' + qty + ' × ' + money.fmtMoney(unitP.cents) + ' = ' + money.fmtMoney(totalP.cents) + '.');
          if (origin !== 'ocr') confidence = 'high';
        } else {
          notes.push('ARITHMETIC DISAGREES: ' + qty + ' × ' + money.fmtMoney(unitP.cents) + ' = ' + money.fmtMoney(expect) + ' but the document says ' + money.fmtMoney(totalP.cents) + '. One of them is wrong — check the source.');
          confidence = 'low';
        }
      }
      out.push({
        kind: 'item-line',
        value: { desc: desc, qty: qty, qtyRaw: qtyRaw, unit: unitRaw, unitCents: unitP.ok ? unitP.cents : null, total: totalRaw, totalCents: totalP.ok ? totalP.cents : null, supplier: supplier },
        canonical: null,
        snippet: [desc, qtyRaw, unitRaw, totalRaw].filter(Boolean).join(' | '),
        confidence: confidence,
        note: notes.join(' '),
        target: 'item',
        accepted: false, rejected: false, edited: false
      });
    }
    return out;
  }

  /* ---- CSV (own tiny parser — quotes and commas, no dependency) ---- */
  function parseCSV(text) {
    var rows = [], row = [], cur = '', inQ = false;
    for (var i = 0; i < text.length; i++) {
      var ch = text[i];
      if (inQ) {
        if (ch === '"') {
          if (text[i + 1] === '"') { cur += '"'; i++; }
          else inQ = false;
        } else cur += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        row.push(cur); cur = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else cur += ch;
    }
    row.push(cur);
    if (row.length > 1 || row[0] !== '') rows.push(row);
    return rows;
  }

  /* ---- top-level text extraction ---- */
  function extractFromText(text, origin) {
    var out = [];
    out = out.concat(extractReferences(text, origin));
    out = out.concat(extractSuppliers(text, origin));
    out = out.concat(extractDates(text, origin));
    out = out.concat(extractFigures(text, origin));
    return out;
  }

  /* ---- the staging gate ----
     Policy, encoded once: figures and item lines are never bulk-accepted;
     a rejected-parse figure cannot be accepted at all until edited. */
  function canBulkAccept(candidate) {
    return candidate.kind !== 'figure' && candidate.kind !== 'item-line';
  }

  function canAccept(candidate) {
    if (candidate.kind === 'figure') return candidate.canonical !== null && candidate.canonical !== undefined;
    return true;
  }

  return {
    OCR_NOTE: OCR_NOTE,
    extractFromText: extractFromText,
    extractFigures: extractFigures,
    extractDates: extractDates,
    extractReferences: extractReferences,
    extractSuppliers: extractSuppliers,
    extractItemsFromRows: extractItemsFromRows,
    detectColumns: detectColumns,
    parseCSV: parseCSV,
    canBulkAccept: canBulkAccept,
    canAccept: canAccept
  };
});
