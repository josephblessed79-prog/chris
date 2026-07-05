/* Document Upload / Intake smoke: the three-way A/B/C choice, honest
   support matrix, real DOCX structure extraction, the compliance-bounded
   layout decision (official layout kept; Enhanced profile applied only on
   confirmation), and the per-case audit record — driven through the real
   browser from file://. Uses a tracked sample .docx (no new binary). */
'use strict';
const { chromium } = require('playwright-core');
const path = require('path');
const SAMPLE = path.resolve(__dirname, '../samples/source/Evaluation of Pantry Supplies-GA.docx');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  const fails = [];
  function check(name, cond) { if (cond) console.log('ok  ' + name); else { console.log('FAIL ' + name); fails.push(name); } }

  await page.goto('file:///home/user/chris/index.html');
  await page.waitForTimeout(400);

  // ---- Disposal case, layout mode (B): official layout kept, Enhanced applied on confirm
  await page.click('.pathcard[data-activity="disposal"]');
  await page.waitForTimeout(250);
  await page.click('nav.tabs button[data-t="ingest"]');
  await page.waitForTimeout(200);

  const importText = await page.textContent('#tab-ingest');
  check('import screen offers the three A/B/C choices', importText.includes('Use this document for information only') && importText.includes('Use this document as the preferred layout or structure') && importText.includes('Use this document for both information and layout'));
  check('support matrix is honest about DOCX', importText.includes('facts + layout/structure'));
  check('support matrix flags scanned PDF needs OCR', importText.includes('needs OCR'));

  // choose mode B, then upload the sample docx
  await page.check('input[data-special="intake-mode"][value="B"]');
  await page.waitForTimeout(150);
  await page.setInputFiles('#ingestFile', SAMPLE);
  await page.waitForTimeout(1500); // mammoth parse

  const analysis = await page.textContent('#tab-ingest');
  check('intake analysis names the uploaded file', analysis.includes('Evaluation of Pantry Supplies-GA.docx'));
  check('layout guidance keeps the official form in full', analysis.includes('stays in full') || analysis.includes('kept in full'));
  check('apply and keep buttons are both offered', analysis.includes('Apply layout guidance') && analysis.includes('Keep the approved'));

  // before applying, the case is still on the approved layout
  let profile = await page.evaluate(() => window.APP.caseFile.outputProfile);
  check('approved layout until the user applies', profile === 'approved');
  let intakeLen = await page.evaluate(() => window.APP.caseFile.intake.length);
  check('nothing recorded before confirmation', intakeLen === 0);

  // apply the layout guidance (the confirmation)
  await page.click('[data-action="intake-apply-layout"]');
  await page.waitForTimeout(300);
  profile = await page.evaluate(() => window.APP.caseFile.outputProfile);
  check('Enhanced layout applied only after confirmation', profile === 'enhanced');
  const rec = await page.evaluate(() => window.APP.caseFile.intake[0]);
  check('intake recorded on the case for audit', rec && rec.fileName.includes('Pantry'));
  check('record captures the mode', rec && rec.mode === 'B');
  check('record captures the confirmation', rec && rec.confirmed === true && !!rec.confirmedAt);
  check('record captures the layout decision', rec && rec.layoutApplied === true);
  const recordedNote = await page.textContent('#tab-ingest');
  check('screen confirms it was recorded', recordedNote.includes('Recorded on this case'));

  // the Enhanced profile shows on Case Details and can be read back
  await page.click('nav.tabs button[data-t="case"]');
  await page.waitForTimeout(200);
  const caseText = await page.textContent('#tab-case');
  check('Case Details exposes the document-layout choice', caseText.includes('Document layout'));

  // ---- Routine case, information-only (A): approved layout never changes
  await page.click('nav.tabs button[data-t="start"]');
  await page.waitForTimeout(150);
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(200);
  await page.click('nav.tabs button[data-t="ingest"]');
  await page.waitForTimeout(150);
  await page.check('input[data-special="intake-mode"][value="A"]');
  await page.waitForTimeout(150);
  await page.setInputFiles('#ingestFile', SAMPLE);
  await page.waitForTimeout(1500);
  const aText = await page.textContent('#tab-ingest');
  check('information-only offers a record button, no layout change', aText.includes('Record this document intake'));
  await page.click('[data-action="intake-record"]');
  await page.waitForTimeout(250);
  const rprofile = await page.evaluate(() => window.APP.caseFile.outputProfile);
  check('information-only never changes the approved layout', rprofile === 'approved');
  const rrec = await page.evaluate(() => window.APP.caseFile.intake[0]);
  check('information-only intake is still recorded for audit', rrec && rrec.mode === 'A' && rrec.confirmed === true);

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nINTAKE SMOKE FAILED: ' + fails.join(' | ') : '\nINTAKE SMOKE PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
