/* ingestfiles.js — browser-side file ingestion: routes an imported file to
   the right vendored parser and returns candidates from ingest.js. All
   parsing happens on this computer; nothing is uploaded anywhere.

   Capability detection is honest: each format reports whether it can work
   right now and, if not, why, in plain English. The known hard limit is
   OCR: browsers refuse to start a Web Worker from a file:// script, so
   OCR of scans requires the app to be served over the intranet (HTTP) —
   see vendor/README.md and README-IT.md. The interface must show these
   reasons next to the import control, not hide them.

   Loads in the browser as MODPA.ingestfiles. In Node only the pure helpers
   are exercised; file readers need the browser. */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./ingest.js'));
  } else {
    root.MODPA = root.MODPA || {};
    root.MODPA.ingestfiles = factory(root.MODPA.ingest);
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function (ingest) {
  'use strict';

  var isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

  function hasLib(name) {
    if (!isBrowser) return false;
    if (name === 'pdfjs') return typeof window.pdfjsLib !== 'undefined';
    if (name === 'mammoth') return typeof window.mammoth !== 'undefined';
    if (name === 'xlsx') return typeof window.XLSX !== 'undefined';
    if (name === 'tesseract') return typeof window.Tesseract !== 'undefined';
    return false;
  }

  /* What can this installation ingest, right now? Every 'no' has a reason. */
  function capabilities() {
    var fileProtocol = isBrowser && window.location && window.location.protocol === 'file:';
    return {
      text: { available: true, reason: '' },
      csv: { available: true, reason: '' },
      pdf: hasLib('pdfjs')
        ? { available: true, reason: 'Reads the text layer only. A scanned PDF has no text layer — use OCR for scans.' }
        : { available: false, reason: 'The PDF library (vendor/pdfjs/) is not loaded. Check the script lines in index.html.' },
      docx: hasLib('mammoth')
        ? { available: true, reason: '' }
        : { available: false, reason: 'The .docx library (vendor/mammoth/) is not loaded. Check the script lines in index.html.' },
      xlsx: hasLib('xlsx')
        ? { available: true, reason: '' }
        : { available: false, reason: 'The spreadsheet library (vendor/xlsx/) is not loaded. Check the script lines in index.html.' },
      ocr: !hasLib('tesseract')
        ? { available: false, reason: 'The OCR library (vendor/tesseract/) is not loaded. Check the script lines in index.html.' }
        : fileProtocol
          ? { available: false, reason: 'OCR cannot run when the app is opened straight from a folder (file://): the browser refuses to start the OCR engine from a local script. Everything else works. To use OCR, IT can serve this folder over the intranet (HTTP) — see README-IT.md.' }
          : { available: true, reason: 'OCR of scans is error-prone. Every OCR-derived candidate is marked accordingly and must be verified character by character against the original.' }
    };
  }

  function extOf(name) {
    var m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1] : '';
  }

  function readAsArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read the file.')); };
      r.readAsArrayBuffer(file);
    });
  }

  function readAsText(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('Could not read the file.')); };
      r.readAsText(file);
    });
  }

  function fromPdf(file) {
    return readAsArrayBuffer(file).then(function (buf) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'vendor/pdfjs/pdf.worker.min.js';
      return window.pdfjsLib.getDocument({ data: buf }).promise;
    }).then(function (doc) {
      var pages = [];
      for (var i = 1; i <= doc.numPages; i++) pages.push(i);
      return pages.reduce(function (chain, pageNo) {
        return chain.then(function (acc) {
          return doc.getPage(pageNo).then(function (page) {
            return page.getTextContent();
          }).then(function (tc) {
            var text = tc.items.map(function (it) { return it.str; }).join(' ');
            return acc + text + '\n';
          });
        });
      }, Promise.resolve('')).then(function (text) {
        if (!text.replace(/\s/g, '')) {
          return { text: '', candidates: [], warning: 'This PDF has no readable text layer — it is probably a scan. Use OCR (if available) or type from the paper.', kind: 'pdf-scanned', structure: null };
        }
        return { text: text, candidates: ingest.extractFromText(text, 'pdf'), warning: '', kind: 'pdf-text', structure: structureFromText(text) };
      });
    });
  }

  /* Approximate structure from plain text: all-caps or title lines become
     headings. Used for text PDFs (limited structure guidance). */
  function structureFromText(text) {
    var out = { headings: [], tables: [], paragraphs: [], hasSignatureBlocks: false, hasLetterhead: false };
    var lines = String(text || '').split(/\n+/);
    var seen = {};
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i].trim();
      if (!l) continue;
      out.paragraphs.push(l);
      if (l.length > 2 && l.length <= 60 && l === l.toUpperCase() && /[A-Z]/.test(l) && !/\d{3,}/.test(l) && !seen[l]) { seen[l] = 1; out.headings.push(l); }
    }
    out.hasSignatureBlocks = /signature|signed by|name in block letters|_{6,}/i.test(text);
    out.hasLetterhead = /logo|letterhead/i.test(text);
    return out;
  }

  /* Build a coarse structural view of a document from mammoth HTML, for
     the intake layout-guidance feature. Headings come from heading styles
     and from short bold / all-caps lines; table columns from each table's
     first row. Deliberately approximate — the intake engine treats it as a
     guide, never as authority (the official template always wins). */
  function structureFromHtml(html) {
    var out = { headings: [], tables: [], paragraphs: [], hasSignatureBlocks: false, hasLetterhead: false };
    if (typeof DOMParser === 'undefined') return out;
    var doc = new DOMParser().parseFromString(html || '', 'text/html');
    var seen = {};
    function addHeading(txt) {
      var t = (txt || '').trim();
      if (t && t.length <= 80 && !seen[t]) { seen[t] = 1; out.headings.push(t); }
    }
    var nodes = doc.body ? doc.body.childNodes : [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.nodeType !== 1) continue;
      var tag = el.tagName.toLowerCase();
      var txt = (el.textContent || '').trim();
      if (/^h[1-6]$/.test(tag)) addHeading(txt);
      else if (tag === 'p') {
        out.paragraphs.push(txt);
        var strongOnly = el.children.length === 1 && el.children[0].tagName === 'STRONG' && el.children[0].textContent.trim() === txt;
        var allCaps = txt.length > 2 && txt.length <= 60 && txt === txt.toUpperCase() && /[A-Z]/.test(txt);
        if ((strongOnly || allCaps) && txt) addHeading(txt);
      } else if (tag === 'table') {
        var firstRow = el.querySelector('tr');
        var cols = firstRow ? Array.prototype.map.call(firstRow.querySelectorAll('td,th'), function (c) { return (c.textContent || '').trim(); }).filter(Boolean) : [];
        out.tables.push({ columns: cols, rowCount: el.querySelectorAll('tr').length });
      }
    }
    var all = (doc.body ? doc.body.textContent : '') || '';
    out.hasSignatureBlocks = /signature|signed by|name in block letters|_{6,}/i.test(all);
    out.hasLetterhead = /logo|letterhead|insert your logo/i.test(all + ' ' + (html || ''));
    return out;
  }

  function fromDocx(file) {
    return readAsArrayBuffer(file).then(function (buf) {
      return Promise.all([
        window.mammoth.extractRawText({ arrayBuffer: buf }),
        window.mammoth.convertToHtml({ arrayBuffer: buf }).catch(function () { return { value: '' }; })
      ]);
    }).then(function (both) {
      var text = both[0].value, html = both[1].value || '';
      return { text: text, candidates: ingest.extractFromText(text, 'docx'), warning: '', kind: 'docx', structure: structureFromHtml(html) };
    });
  }

  function fromXlsx(file) {
    return readAsArrayBuffer(file).then(function (buf) {
      var wb = window.XLSX.read(buf, { type: 'array' });
      var candidates = [], textAll = '';
      wb.SheetNames.forEach(function (name) {
        var rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
        candidates = candidates.concat(ingest.extractItemsFromRows(rows, 'xlsx'));
        textAll += rows.map(function (r) { return r.join(' | '); }).join('\n') + '\n';
      });
      /* also scan the flattened text for suppliers / dates / references */
      candidates = candidates.concat(ingest.extractSuppliers(textAll, 'xlsx'), ingest.extractDates(textAll, 'xlsx'), ingest.extractReferences(textAll, 'xlsx'));
      return { text: textAll, candidates: candidates, warning: '', kind: 'xlsx', structure: null };
    });
  }

  function fromCsv(file) {
    return readAsText(file).then(function (text) {
      var rows = ingest.parseCSV(text);
      var candidates = ingest.extractItemsFromRows(rows, 'csv')
        .concat(ingest.extractSuppliers(text, 'csv'), ingest.extractDates(text, 'csv'), ingest.extractReferences(text, 'csv'));
      return { text: text, candidates: candidates, warning: '', kind: 'csv', structure: null };
    });
  }

  function fromImageOcr(file) {
    var cap = capabilities().ocr;
    if (!cap.available) return Promise.reject(new Error(cap.reason));
    return window.Tesseract.createWorker('eng', 1, {
      workerPath: 'vendor/tesseract/worker.min.js',
      corePath: 'vendor/tesseract/core',
      langPath: 'vendor/tesseract/lang',
      gzip: true
    }).then(function (worker) {
      return worker.recognize(file).then(function (res) {
        var text = res.data.text || '';
        return worker.terminate().then(function () {
          return {
            text: text,
            candidates: ingest.extractFromText(text, 'ocr'),
            warning: ingest.OCR_NOTE,
            kind: 'pdf-text',
            structure: structureFromText(text)
          };
        });
      });
    });
  }

  /* One entry point: file -> Promise<{text, candidates, warning}>. */
  function ingestFile(file) {
    var ext = extOf(file.name);
    var cap = capabilities();
    if (ext === 'pdf') {
      if (!cap.pdf.available) return Promise.reject(new Error(cap.pdf.reason));
      return fromPdf(file);
    }
    if (ext === 'docx') {
      if (!cap.docx.available) return Promise.reject(new Error(cap.docx.reason));
      return fromDocx(file);
    }
    if (ext === 'xlsx' || ext === 'xls') {
      if (!cap.xlsx.available) return Promise.reject(new Error(cap.xlsx.reason));
      return fromXlsx(file);
    }
    if (ext === 'csv') return fromCsv(file);
    if (ext === 'txt') {
      return readAsText(file).then(function (text) {
        return { text: text, candidates: ingest.extractFromText(text, 'text'), warning: '', kind: 'pdf-text', structure: structureFromText(text) };
      });
    }
    if (['png', 'jpg', 'jpeg', 'bmp', 'tif', 'tiff'].indexOf(ext) >= 0) return fromImageOcr(file);
    return Promise.reject(new Error('Unsupported file type ".' + ext + '". Supported: PDF, DOCX, XLSX, CSV, TXT, and images (PNG/JPG) where OCR is available.'));
  }

  return {
    capabilities: capabilities,
    ingestFile: ingestFile,
    extOf: extOf
  };
});
