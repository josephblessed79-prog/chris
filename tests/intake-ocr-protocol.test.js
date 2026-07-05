/* intake-ocr-protocol.test.js (Phase 7) — under the file:// protocol, OCR
   of a scanned/image document aborts gracefully and returns the exact
   plain-language warning; over http:// it proceeds. */
'use strict';

const t = require('./harness.js');
const intake = require('../js/lib/intake.js');

const EXACT = 'This appears to be a scanned document. The browser’s security blocks text-recognition (OCR) when opening from a local folder. Please type these figures manually, or ask IT to host this system on the intranet to enable scanning.';

t.test('a scanned PDF under file:// aborts OCR with the exact message', () => {
  const d = intake.ocrDecision('file:', 'pdf-scanned');
  t.eq(d.abort, true);
  t.eq(d.message, EXACT);
});

t.test('an image under file:// aborts OCR with the exact message', () => {
  const d = intake.ocrDecision('file:', 'image');
  t.eq(d.abort, true);
  t.eq(d.message, EXACT);
});

t.test('the same files over http:// do not abort', () => {
  t.eq(intake.ocrDecision('http:', 'pdf-scanned').abort, false);
  t.eq(intake.ocrDecision('https:', 'image').abort, false);
  t.eq(intake.ocrDecision('http:', 'pdf-scanned').message, '');
});

t.test('a readable document never triggers the OCR abort, on any protocol', () => {
  t.eq(intake.ocrDecision('file:', 'docx').abort, false);
  t.eq(intake.ocrDecision('file:', 'pdf-text').abort, false);
  t.eq(intake.ocrDecision('file:', 'xlsx').abort, false);
  t.eq(intake.ocrDecision('file:', 'csv').abort, false);
});
