# Vendored libraries

Every third-party library is stored here in full, so the system runs with
no internet connection and no CDN references. Nothing in this folder is
written by the Ministry; do not edit these files. To update one, replace
the file with the same file from the newer package and record the version
below.

| Folder | Package | Version | Files | Licence | Used for |
|---|---|---|---|---|---|
| `pdfjs/` | `pdfjs-dist` (legacy build) | 3.11.174 | `pdf.min.js`, `pdf.worker.min.js` | Apache-2.0 | Reading the text layer of PDF files. The 3.x *legacy* build is deliberate: it loads as a plain script from `file://`; the 4.x builds are ES modules and do not. |
| `mammoth/` | `mammoth` | 1.8.0 | `mammoth.browser.min.js` | BSD-2-Clause | Extracting text from `.docx` files. |
| `xlsx/` | `xlsx` (SheetJS Community Edition) | 0.18.5 | `xlsx.full.min.js` | Apache-2.0 | Reading `.xlsx` workbooks. |
| `tesseract/` | `tesseract.js` | 5.1.1 | `tesseract.min.js`, `worker.min.js` | Apache-2.0 | OCR of scanned PDFs and images (English). |
| `tesseract/core/` | `tesseract.js-core` | 5.1.1 | `tesseract-core*.wasm.js` | Apache-2.0 | The OCR engine (WebAssembly). |
| `tesseract/lang/` | `@tesseract.js-data/eng` | 1.0.0 (tessdata 4.0.0 best int) | `eng.traineddata.gz` | Apache-2.0 | English recognition data. |

## Known limitation, stated plainly

OCR (`tesseract.js`) runs in a Web Worker. Chrome and Edge do not allow a
page opened from `file://` (double-clicking `index.html`, or a mapped
network drive) to start a worker from a `file://` script. Consequences:

- Typed-text PDF reading, `.docx`, `.xlsx` and `.csv` ingestion all work
  from `file://` — they run on the page itself.
- OCR of scans works when the app is served over HTTP (an intranet web
  share) — an IT decision, documented in `README-IT.md`. On `file://` the
  app detects this and says so next to the import control; it does not
  pretend to OCR.
