/* Guided Mode smoke: a first-time user drives a routine case end to end
   through the wizard — the guided shell is the default, the live preview
   follows the typing, the papers step consumes a document and feeds the
   case (safe facts pre-ticked, figures and item lines left as human
   decisions), the plain-language issues list jumps to the fixing step,
   the documents step delivers, and the guided/expert switch round-trips
   without losing anything. */
'use strict';
const { chromium } = require('playwright-core');
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

  // ---- a new case opens in the guided journey by default
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(400);
  check('guided is the default view for a new case', await page.evaluate(() => document.body.classList.contains('guided')));
  check('guided shell rendered', await page.$('#tab-guide .gshell') !== null);
  check('the tab strip is out of sight in guided mode', await page.isHidden('nav.tabs'));
  check('step 1 of 8', (await page.textContent('.gnum')).includes('Step 1 of 8'));
  check('step 1 asks the plain question', (await page.textContent('.gq h2')).includes('What is this purchase?'));
  check('live preview pane present', await page.$('#tab-guide .gpreview .doc') !== null);

  // ---- typing updates the live preview (debounced)
  await page.fill('#tab-guide [data-path="docState.subject"]', 'The Provision of Boxed Meals');
  await page.fill('#tab-guide [data-path="docState.date"]', '2026-05-20');
  await page.waitForTimeout(1000);
  check('live preview carries the typed subject', (await page.textContent('#tab-guide .gpreview .doc')).includes('The Provision of Boxed Meals'));

  // ---- papers step: drop a document, tick, and feed the case
  await page.click('[data-action="guide-next"]');
  await page.waitForTimeout(250);
  check('papers step is second', (await page.textContent('.gq h2')).includes('Have you papers to read in?'));
  check('papers step is skippable', (await page.textContent('.gnav')).includes('Skip'));
  check('drop zone offered', await page.$('#tab-guide .dropzone') !== null);

  // an items CSV: item lines and figures must NOT be pre-ticked
  const itemsCsv = 'Items Requested,Quantity Requested,Unit,Total\nBleach,24,32.50,780.00\n';
  await page.setInputFiles('#guideFile', { name: 'quote.csv', mimeType: 'text/csv', buffer: Buffer.from(itemsCsv) });
  await page.waitForTimeout(700);
  check('tick-list appears after the drop', (await page.textContent('#tab-guide')).includes('tick what to use'));
  const preTicked = await page.evaluate(() =>
    (window.APP.ingestCandidates || []).filter(c => (c.kind === 'figure' || c.kind === 'item-line') && c.accepted).length);
  check('figures and item lines are never pre-ticked', preTicked === 0);
  check('the one-by-one rule is stated', (await page.textContent('#tab-guide')).includes('Amounts must be ticked one by one'));

  // a reference CSV: a safe fact, pre-ticked, applied into the case
  const refCsv = 'File Reference\nMOD/PROC: 22/18/7:2026\n';
  await page.setInputFiles('#guideFile', { name: 'ref.csv', mimeType: 'text/csv', buffer: Buffer.from(refCsv) });
  await page.waitForTimeout(700);
  const refTicked = await page.evaluate(() =>
    (window.APP.ingestCandidates || []).some(c => c.kind === 'reference' && c.accepted));
  check('the safe reference fact is pre-ticked', refTicked);
  check('Add ticked items is enabled', await page.getAttribute('[data-action="intake-apply-facts"]', 'disabled') === null);
  await page.click('[data-action="intake-apply-facts"]');
  await page.waitForTimeout(400);
  check('a toast confirms the update', await page.$('#toastHost .toast') !== null);
  check('the applied row shows as added', (await page.textContent('#tab-guide .gcands')).includes('added'));
  const minfile = await page.evaluate(() => window.APP.caseFile.docState.minfile);
  check('the document fed the file number into the case', minfile === 'MOD/PROC: 22/18/7:2026');

  // pasted text flows through the same staging safeguards
  await page.fill('#guidePaste', 'Quotation from Alpha Cleaning Ltd\nSubject: Cleaning supplies\nTotal $250.00');
  await page.click('[data-action="guide-paste"]');
  await page.waitForTimeout(700);
  check('pasted text is read through the same intake', await page.evaluate(() => (window.APP.intakeAnalysis || {}).fileName === 'pasted-text.txt'));
  check('a pasted amount stays a human decision (not pre-ticked)',
    await page.evaluate(() => (window.APP.ingestCandidates || []).some(c => c.kind === 'figure' && !c.accepted)));

  // back on the about step, the field shows its value with the Imported badge
  await page.click('[data-action="guide-back"]');
  await page.waitForTimeout(250);
  check('imported value visible on the about step', (await page.inputValue('#tab-guide [data-path="docState.minfile"]')) === 'MOD/PROC: 22/18/7:2026');
  check('Imported badge shown beside the field', (await page.innerHTML('#tab-guide')).includes('imported-badge'));

  // ---- prices step: the verbal papers inside the wizard, computed live
  await page.click('.gsteps [data-action="guide-goto"][data-i="3"]');
  await page.waitForTimeout(250);
  check('prices step asks how prices were got', (await page.textContent('.gq h2')).includes('How did you get prices?'));
  await page.click('#tab-guide input[data-special="routine-papers"][value="verbal"]');
  await page.waitForTimeout(300);
  for (let i = 0; i < 3; i++) { await page.click('[data-action="vcontact-add"]'); await page.waitForTimeout(120); }
  await page.fill('[data-vcontact="0:name"]', 'Ate6Ate Savor City Caterers Ltd');
  await page.fill('[data-vcontact="0:amount"]', '1,200.00');
  await page.fill('[data-vcontact="1:name"]', 'Caterer B');
  await page.fill('[data-vcontact="1:amount"]', '1,450.00');
  await page.fill('[data-vcontact="2:name"]', 'Caterer C');
  await page.fill('[data-vcontact="2:amount"]', '1,500.00');
  await page.check('[data-vcontact-sel="0"]');
  await page.dispatchEvent('[data-vcontact-sel="0"]', 'change');
  await page.waitForTimeout(250);
  await page.click('[data-action="vsched-add"]');
  await page.waitForTimeout(150);
  await page.fill('[data-vsched="0:date"]', '2026-05-19');
  await page.fill('[data-vsched="0:desc"]', '(4) Chicken, (1) Fish Meals with Drink');
  await page.fill('[data-vsched="0:qty"]', '5');
  await page.fill('[data-vsched="0:rate"]', '60.00');
  await page.dispatchEvent('[data-vsched="0:rate"]', 'change');
  await page.waitForTimeout(200);
  await page.click('[data-action="vsched-add"]');
  await page.waitForTimeout(150);
  await page.fill('[data-vsched="1:date"]', '2026-05-19');
  await page.fill('[data-vsched="1:desc"]', 'Delivery');
  await page.fill('[data-vsched="1:qty"]', '1');
  await page.fill('[data-vsched="1:rate"]', '100.00');
  await page.selectOption('[data-vsched="1:kind"]', 'delivery');
  await page.dispatchEvent('[data-vsched="1:kind"]', 'change');
  await page.waitForTimeout(300);
  const gbody = await page.textContent('#tab-guide .gbody');
  check('verbal total computed live in the step ($400.00)', gbody.includes('$400.00'));
  await page.waitForTimeout(900);
  const prev = await page.textContent('#tab-guide .gpreview .doc');
  check('live preview minute carries the computed words and figure', prev.includes('Four Hundred Dollars ($400.00)'));

  // ---- money step: the five vote-book figures, balances worked out
  await page.click('.gsteps [data-action="guide-goto"][data-i="4"]');
  await page.waitForTimeout(250);
  check('money step asks what pays for it', (await page.textContent('.gq h2')).includes('What money pays for it?'));
  for (const [k, v] of [['originalProvision', '380,000.00'], ['revisedAllocation', '380,000.00'],
    ['releasesToDate', '32,602.00'], ['expenditureToDate', '3,560.57'], ['commitment', '21,654.44']]) {
    await page.fill('[data-vstatus="' + k + '"]', v);
  }
  await page.dispatchEvent('[data-vstatus="commitment"]', 'change');
  await page.waitForTimeout(300);
  check('vote balances computed inside the wizard', (await page.textContent('#tab-guide')).includes('$354,784.99'));

  // ---- folios step
  await page.click('.gsteps [data-action="guide-goto"][data-i="5"]');
  await page.waitForTimeout(250);
  await page.click('[data-action="folio-add"]');
  await page.waitForTimeout(200);
  await page.fill('[data-folio="0:desc"]', 'Verbal Quotation Form re: Boxed Meals');
  await page.fill('[data-folio="0:tag"]', 'verbal-form');
  await page.dispatchEvent('[data-folio="0:tag"]', 'change');
  await page.waitForTimeout(250);

  // ---- sign step: plain-language issues with Go buttons that jump
  await page.click('.gsteps [data-action="guide-goto"][data-i="6"]');
  await page.waitForTimeout(250);
  check('sign step reached', (await page.textContent('.gq h2')).includes('Check and sign'));
  await page.fill('#tab-guide [data-path="docState.minsigname"]', 'A. Officer');
  await page.dispatchEvent('#tab-guide [data-path="docState.minsigname"]', 'change');
  await page.waitForTimeout(300);
  const signText = await page.textContent('#tab-guide .gbody');
  const hasGo = await page.$('#tab-guide [data-action="guide-fix"]');
  check('outstanding items are listed in plain words with Go buttons', hasGo !== null && !/^Check [A-Z]\d+:/.test(signText));
  if (hasGo) {
    const targetCheck = await hasGo.getAttribute('data-check');
    const expectedStep = await page.evaluate(c => window.GUIDE.stepForCheck(window.APP.caseFile.module, c), targetCheck);
    await hasGo.click();
    await page.waitForTimeout(250);
    const landed = await page.evaluate(() => window.APP.guideStep);
    const landedId = await page.evaluate(() => window.GUIDE.steps(window.APP.caseFile.module)[window.APP.guideStep].id);
    check('Go jumps to the step that fixes the check (' + targetCheck + ' -> ' + landedId + ')', landedId === expectedStep && landed >= 0);
  }

  // ---- documents step: every document previewable and downloadable
  await page.click('.gsteps [data-action="guide-goto"][data-i="7"]');
  await page.waitForTimeout(300);
  check('documents step reached', (await page.textContent('.gq h2')).includes('Your documents'));
  const nDocs = (await page.$$('#tab-guide .gdoc')).length;
  check('per-document Preview/Download rows offered', nDocs >= 2);
  check('Download-all offered', await page.$('[data-action="guide-download-all"]') !== null);
  // switching the preview document works
  const docIds = await page.$$eval('#tab-guide select[data-special="guide-doc"] option', os => os.map(o => o.value));
  if (docIds.length > 1) {
    await page.selectOption('#tab-guide select[data-special="guide-doc"]', docIds[1]);
    await page.waitForTimeout(300);
    check('preview switches document', (await page.textContent('#tab-guide .gpreview .doc')).trim().length > 0);
  }
  // a per-document download really produces a .doc file
  const dlPromise = page.waitForEvent('download');
  await page.click('#tab-guide .gdoc [data-action="guide-download"]');
  const dl = await dlPromise;
  check('a document downloads from the wizard', /\.doc$/.test(dl.suggestedFilename()));

  // ---- guided/expert round trip loses nothing
  await page.click('[data-action="guide-expert"]');
  await page.waitForTimeout(300);
  check('expert view shows the tab strip', await page.isVisible('nav.tabs'));
  check('expert Case Details carries the typed subject', (await page.inputValue('#tab-case [data-path="docState.subject"]')) === 'The Provision of Boxed Meals');
  check('the wizard panel is emptied behind the scenes', (await page.innerHTML('#tab-guide')).trim() === '');
  await page.click('#btnGuided');
  await page.waitForTimeout(300);
  check('guided view returns on request', await page.evaluate(() => document.body.classList.contains('guided')));
  check('the journey resumes where it was left', (await page.textContent('.gq h2')).includes('Your documents'));
  const total = await page.evaluate(() => window.APP.caseFile.verbal.schedule.length);
  check('nothing was lost across the round trip', total === 2);

  // ---- the worked examples: one click shows what "done" looks like
  await page.click('[data-action="guide-start"]');
  await page.waitForTimeout(300);
  check('start screen offers the worked examples', (await page.textContent('#tab-start')).includes('See a complete worked example'));
  await page.click('[data-action="load-sample"][data-mod="routine"]');
  await page.waitForTimeout(500);
  check('worked example opens in the guided journey', await page.evaluate(() => document.body.classList.contains('guided')));
  check('example minute computes to the proven figure', (await page.textContent('#tab-guide .gpreview .doc')).includes('Four Hundred Dollars ($400.00)'));
  check('the routine example is fully cleared', !(await page.textContent('#statusPill')).includes('FAILING'));
  await page.click('[data-action="guide-start"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="load-sample"][data-mod="disposal"]');
  await page.waitForTimeout(500);
  check('the disposal example (OPR case study) loads cleared', !(await page.textContent('#statusPill')).includes('FAILING'));
  await page.click('[data-action="guide-start"]');
  await page.waitForTimeout(300);
  await page.click('[data-action="load-sample"][data-mod="formal-evaluation"]');
  await page.waitForTimeout(500);
  check('the formal example (ranked evaluation) loads cleared', !(await page.textContent('#statusPill')).includes('FAILING'));

  // ---- keyboard operation and the unsaved-work guard
  await page.click('[data-action="guide-start"]');
  await page.waitForTimeout(300);
  let focusCls = '';
  for (let i = 0; i < 24 && !focusCls.includes('pathcard'); i++) {
    await page.keyboard.press('Tab');
    focusCls = await page.evaluate(() => document.activeElement.className || '');
  }
  check('an activity card is reachable by keyboard', focusCls.includes('pathcard'));
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  check('Enter on a focused card opens the journey', await page.evaluate(() => document.body.classList.contains('guided')));
  check('a brand-new case is not flagged unsaved', await page.evaluate(() => window.APP.dirty === false));
  await page.fill('#tab-guide [data-path="docState.subject"]', 'Keyboard-entered subject');
  await page.waitForTimeout(150);
  check('typing flags unsaved work at once', await page.evaluate(() => window.APP.dirty === true));
  const savePromise = page.waitForEvent('download');
  await page.click('#btnSave');
  await savePromise;
  await page.waitForTimeout(1200);
  check('saving the .json clears the unsaved flag and it stays clear', await page.evaluate(() => window.APP.dirty === false));

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nGUIDED SMOKE FAILED: ' + fails.join(' | ') : '\nGUIDED SMOKE PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
