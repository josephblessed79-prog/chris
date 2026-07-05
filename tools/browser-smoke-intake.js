/* Document Upload / Intake smoke (global modal): the persistent header
   button opens #intakeModal at any time; the A/B/C choice, honest support
   matrix, real DOCX structure extraction, the staging review, the two-step
   Apply with cross-tab injection, the Imported badge, the conflict
   triangle, and the compliance-bounded layout decision are all driven
   through the real browser from file://. Uses a tracked sample .docx. */
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

  // the intake button is a persistent global action, disabled until a case is open
  check('global Upload button present', await page.$('#btnIntake') !== null);
  check('Upload button disabled with no case', await page.getAttribute('#btnIntake', 'disabled') !== null);
  check('Import is not a linear tab', await page.$('nav.tabs button[data-t="ingest"]') === null);

  // open a routine case; type a File Number by hand so we can force a conflict
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(250);
  await page.fill('[data-path="docState.minfile"]', 'MOD/HAND-TYPED');
  await page.dispatchEvent('[data-path="docState.minfile"]', 'change');
  await page.waitForTimeout(150);

  // the global button is now enabled and opens the modal from any tab
  check('Upload button enabled once a case is open', await page.getAttribute('#btnIntake', 'disabled') === null);
  await page.click('#btnIntake');
  await page.waitForTimeout(200);
  check('intake modal opens', await page.isVisible('#intakeModal'));
  const modalText = await page.textContent('#intakeBody');
  check('three A/B/C options shown', modalText.includes('Use this document for information only') && modalText.includes('preferred layout') && modalText.includes('both information and layout'));
  check('honest support matrix present', modalText.includes('facts + layout/structure') && modalText.includes('needs OCR'));

  // upload the DOCX in information mode (A)
  await page.check('input[data-special="intake-mode"][value="A"]');
  await page.waitForTimeout(150);
  await page.setInputFiles('#ingestFile', SAMPLE);
  await page.waitForTimeout(1500);
  const staging = await page.textContent('#intakeBody');
  check('staging review table appears', staging.includes('Review what was found'));
  check('Apply button present', staging.includes('Apply Accepted Data to Case'));

  // accept the safe facts, then apply
  const applyDisabledBefore = await page.getAttribute('[data-action="intake-apply-facts"]', 'disabled');
  check('Apply disabled until something is accepted', applyDisabledBefore !== null);
  await page.click('[data-action="ingest-accept-safe"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="intake-apply-facts"]');
  await page.waitForTimeout(400);
  check('a toast is shown after applying', await page.$('#toastHost .toast') !== null);

  await page.click('#btnIntakeClose');
  await page.waitForTimeout(200);
  check('modal closes', await page.isHidden('#intakeModal'));

  // ---- conflict path: import a File Number that clashes with the manual one
  await page.click('#btnIntake');
  await page.waitForTimeout(200);
  // build a tiny CSV that carries a reference, in information mode
  await page.check('input[data-special="intake-mode"][value="A"]');
  await page.waitForTimeout(100);
  const csv = 'File Reference\nMOD/PROC: 22/18/7:2026\n';
  await page.setInputFiles('#ingestFile', { name: 'ref.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForTimeout(700);
  // accept the reference row through the UI (its default target is File number)
  const hasRefRow = await page.evaluate(() => (window.APP.ingestCandidates || []).some(c => c.kind === 'reference'));
  if (hasRefRow) {
    const row = page.locator('.stagetbl tbody tr', { hasText: 'MOD/PROC: 22/18/7:2026' }).first();
    await row.locator('[data-action="cand-accept"]').click();
    await page.waitForTimeout(200);
    await page.click('[data-action="intake-apply-facts"]');
    await page.waitForTimeout(400);
    const conflictState = await page.evaluate(() => window.APP.caseFile.intakeFields['docState.minfile'] && window.APP.caseFile.intakeFields['docState.minfile'].status);
    check('a clash becomes a conflict, not an overwrite', conflictState === 'conflict');
    const minfile = await page.evaluate(() => window.APP.caseFile.docState.minfile);
    check('the manual value is preserved during the conflict', minfile === 'MOD/HAND-TYPED');
    await page.click('#btnIntakeClose');
    await page.waitForTimeout(200);
    // the conflict triangle shows on Case Details
    const caseHtml = await page.innerHTML('#tab-case');
    check('conflict triangle rendered beside the field', caseHtml.includes('conflict-tri'));
    check('Keep Manual / Accept Imported offered', caseHtml.includes('conflict-keep') && caseHtml.includes('conflict-accept'));
    // resolve: hover the triangle to reveal the choice, then accept imported
    await page.hover('.conflict-tri');
    await page.waitForTimeout(150);
    await page.click('[data-action="conflict-accept"][data-path="docState.minfile"]', { force: true });
    await page.waitForTimeout(250);
    const resolved = await page.evaluate(() => window.APP.caseFile.docState.minfile);
    check('accepting imported applies the imported value', resolved === 'MOD/PROC: 22/18/7:2026');
    const badged = await page.innerHTML('#tab-case');
    check('field now shows the Imported badge', badged.includes('imported-badge'));
  } else {
    check('reference candidate parsed from CSV', false);
  }

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nINTAKE SMOKE FAILED: ' + fails.join(' | ') : '\nINTAKE SMOKE PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
