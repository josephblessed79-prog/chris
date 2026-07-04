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
          return { text: '', candidates: [], warning: 'This PDF has no readable text layer — it is probably a scan. Use OCR (if available) or type from the paper.' };
        }
        return { text: text, candidates: ingest.extractFromText(text, 'pdf'), warning: '' };
      });
    });
  }

  function fromDocx(file) {
    return readAsArrayBuffer(file).then(function (buf) {
      return window.mammoth.extractRawText({ arrayBuffer: buf });
    }).then(function (res) {
      return { text: res.value, candidates: ingest.extractFromText(res.value, 'docx'), warning: '' };
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
      return { text: textAll, candidates: candidates, warning: '' };
    });
  }

  function fromCsv(file) {
    return readAsText(file).then(function (text) {
      var rows = ingest.parseCSV(text);
      var candidates = ingest.extractItemsFromRows(rows, 'csv')
        .concat(ingest.extractSuppliers(text, 'csv'), ingest.extractDates(text, 'csv'), ingest.extractReferences(text, 'csv'));
      return { text: text, candidates: candidates, warning: '' };
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
            warning: ingest.OCR_NOTE
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
        return { text: text, candidates: ingest.extractFromText(text, 'text'), warning: '' };
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
