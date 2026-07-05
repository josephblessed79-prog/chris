/* Module-separation smoke: the start screen offers the three activities,
   each module sees only its own tabs, working papers and documents, and
   the routine sub-choices appear where they arise — not on the start
   screen. */
'use strict';
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const fails = [];
  function check(name, cond) { if (cond) console.log('ok  ' + name); else { console.log('FAIL ' + name); fails.push(name); } }

  await page.goto('file:///home/user/chris/index.html');
  await page.waitForTimeout(400);

  // ---- the start screen is the process selector
  const startText = await page.textContent('#tab-start');
  check('start asks what you are doing today', startText.includes('What are you doing today?'));
  check('three activity cards', (await page.$$('.pathcard')).length === 3);
  check('routine card present', startText.includes('Routine / daily procurement'));
  check('formal card present', startText.includes('Formal tender / RFP / ITB evaluation'));
  check('disposal card present', startText.includes('Disposal of public property'));
  check('no pathway codes on the start screen', !/P[1-4] —/.test(startText));

  // ---- disposal: own screens, no vote tab, no procurement documents
  await page.click('.pathcard[data-activity="disposal"]');
  await page.waitForTimeout(250);
  check('disposal case header', (await page.textContent('#tab-case h2')).includes('Disposal of public property'));
  check('vote tab hidden for disposal', await page.isHidden('nav.tabs button[data-t="vote"]'));
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  check('disposal working papers', (await page.textContent('#tab-work h2')).includes('Disposal of Public Property'));
  // drive one property item and confirm the appraisal computes live
  await page.click('[data-action="ditem-add"]');
  await page.waitForTimeout(200);
  await page.fill('[data-ditem="0:desc"]', 'Office Work Station / Cubicles');
  await page.fill('[data-ditem="0:qty"]', '5');
  await page.fill('[data-ditem="0:totalNBV"]', '24,291.67');
  await page.dispatchEvent('[data-ditem="0:totalNBV"]', 'change');
  await page.waitForTimeout(150);
  await page.selectOption('[data-ditem="0:saleable"]', 'yes');
  await page.waitForTimeout(200);
  await page.fill('[data-ditem="0:salePrice"]', '3,800.00');
  await page.dispatchEvent('[data-ditem="0:salePrice"]', 'change');
  await page.waitForTimeout(200);
  const dispWork = await page.textContent('#tab-work');
  check('unit NBV computed live ($4,858.33)', dispWork.includes('$4,858.33'));
  check('appraised less 20% computed live ($3,886.67)', dispWork.includes('$3,886.67'));
  check('expected returns computed live ($19,000.00)', dispWork.includes('$19,000.00'));

  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(250);
  const dispDocs = await page.textContent('#docBar');
  check('Forms A–E offered to disposal', dispDocs.includes('Form C — Committee Appraisal Report'));
  check('no procurement checklist offered to disposal', !dispDocs.includes('Approvals checklist'));
  check('no procurement certificate offered to disposal', !dispDocs.includes('Verification certificate'));
  check('no minute sheet offered to disposal', !dispDocs.includes('Ministry minute sheet'));
  // Form C prints the computed columns and cites the authority, no scaffold banner
  await page.selectOption('#docSel', 'disposal-form-c');
  await page.waitForTimeout(250);
  const formC = await page.textContent('#preview');
  check('Form C prints computed unit NBV', formC.includes('$4,858.33'));
  check('Form C carries no scaffold banner', !formC.includes('AWAITING FORMAT AUTHORITY'));
  check('Form C cites the OPR authority', formC.includes('OPR Retention'));

  // ---- formal: placeholder working papers, no borrowed documents
  await page.click('nav.tabs button[data-t="start"]');
  await page.waitForTimeout(150);
  await page.click('.pathcard[data-activity="formal-evaluation"]');
  await page.waitForTimeout(250);
  check('formal case header', (await page.textContent('#tab-case h2')).includes('Formal tender / RFP / ITB evaluation'));
  check('vote tab hidden for formal', await page.isHidden('nav.tabs button[data-t="vote"]'));
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  check('formal module announces itself, borrows nothing', (await page.textContent('#tab-work')).includes('formal evaluation module is being fitted'));
  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(250);
  const formalDocs = await page.textContent('#tab-docs');
  check('formal documents arrive with the formal module', formalDocs.includes('No documents are available for this activity yet'));

  // ---- routine: vote tab back, presentation choice on Case Details,
  //      working-paper choice on Working Papers (asked where they arise)
  await page.click('nav.tabs button[data-t="start"]');
  await page.waitForTimeout(150);
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(250);
  check('routine case header', (await page.textContent('#tab-case h2')).includes('Routine / daily procurement'));
  check('vote tab visible for routine', await page.isVisible('nav.tabs button[data-t="vote"]'));
  check('presentation choice on Case Details', (await page.textContent('#tab-case')).includes('Papers presented for'));
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  const workText = await page.textContent('#tab-work');
  check('routine working-paper choice offered', workText.includes('How was this procured?'));
  check('comparison worksheet is a routine sub-choice', workText.includes('Supplier comparison worksheet'));
  // formation presentation reveals the letter fields, without a new case
  await page.click('nav.tabs button[data-t="case"]');
  await page.waitForTimeout(150);
  await page.selectOption('[data-special="presentation"]', 'formation');
  await page.waitForTimeout(250);
  check('formation fields appear on the formation presentation', (await page.textContent('#tab-case')).includes('Formation letter (external formation)'));
  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(250);
  const routineDocs = await page.textContent('#docBar');
  check('formation letter offered', routineDocs.includes('Formation approval letter'));
  check('routine comparison papers use the comparison name', !routineDocs.includes('Evaluation report'));
  check('no disposal instruments offered to routine', !routineDocs.includes('Disposal'));

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nSMOKE3 FAILED: ' + fails.join(' | ') : '\nSMOKE3 PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
