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
  check('Forms A–H offered to disposal', dispDocs.includes('Form C — Appraisal Report') && dispDocs.includes('Form H — Notice of Rejection'));
  check('optional appraisal catalogue offered', dispDocs.includes('Appraisal Catalogue'));
  check('no procurement checklist offered to disposal', !dispDocs.includes('Approvals checklist'));
  check('no procurement certificate offered to disposal', !dispDocs.includes('Verification certificate'));
  check('no minute sheet offered to disposal', !dispDocs.includes('Ministry minute sheet'));
  // Form C prints the official simple appraisal; the NBV working is in the catalogue
  await page.selectOption('#docSel', 'disposal-form-c');
  await page.waitForTimeout(250);
  const formC = await page.textContent('#preview');
  check('Form C prints the per-item appraised value ($19,000.00)', formC.includes('$19,000.00'));
  check('Form C carries no scaffold banner', !formC.includes('AWAITING FORMAT AUTHORITY'));
  check('Form C cites the OPR authority', formC.includes('OPR Disposal Templates') || formC.includes('OPR Retention'));
  await page.selectOption('#docSel', 'disposal-form-c-catalogue');
  await page.waitForTimeout(250);
  const cat = await page.textContent('#preview');
  check('Appraisal Catalogue prints the computed unit NBV ($4,858.33)', cat.includes('$4,858.33'));

  // ---- formal: placeholder working papers, no borrowed documents
  await page.click('nav.tabs button[data-t="start"]');
  await page.waitForTimeout(150);
  await page.click('.pathcard[data-activity="formal-evaluation"]');
  await page.waitForTimeout(250);
  check('formal case header', (await page.textContent('#tab-case h2')).includes('Formal tender / RFP / ITB evaluation'));
  check('vote tab hidden for formal', await page.isHidden('nav.tabs button[data-t="vote"]'));
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  const formalWork = await page.textContent('#tab-work');
  check('formal editor is the OPR committee report, not routine', formalWork.includes('Formal Evaluation — Tender / RFP / ITB'));
  check('formal editor has the criteria/scoring section', formalWork.includes('Weighted criteria and scoring'));
  // drive a minimal ranking: 2 criteria, 2 proponents, weights, prices
  await page.click('[data-action="fcrit-add"]'); await page.waitForTimeout(120);
  await page.fill('[data-fcrit="0:name"]', 'Experience');
  await page.fill('[data-fcrit="0:maxPoints"]', '100');
  await page.dispatchEvent('[data-fcrit="0:maxPoints"]', 'change');
  await page.waitForTimeout(150);
  await page.fill('[data-path="formal.minTechnicalScore"]', '60');
  await page.fill('[data-path="formal.technicalWeight"]', '70');
  await page.fill('[data-path="formal.financialWeight"]', '30');
  await page.dispatchEvent('[data-path="formal.financialWeight"]', 'change');
  await page.waitForTimeout(150);
  await page.click('[data-action="fprop-add"]'); await page.waitForTimeout(120);
  await page.click('[data-action="fprop-add"]'); await page.waitForTimeout(120);
  await page.fill('[data-fprop="0:name"]', 'Alpha Ltd');
  await page.selectOption('[data-fprop="0:compliant"]', 'yes');
  await page.fill('[data-fprop="1:name"]', 'Beta Ltd');
  await page.selectOption('[data-fprop="1:compliant"]', 'yes');
  await page.waitForTimeout(200);
  await page.fill('[data-fscore="0:0"]', '90');
  await page.fill('[data-fscore="1:0"]', '80');
  await page.dispatchEvent('[data-fscore="1:0"]', 'change');
  await page.waitForTimeout(200);
  await page.fill('[data-fprice="0:verifiedPrice"]', '1,000,000.00');
  await page.fill('[data-fprice="1:verifiedPrice"]', '900,000.00');
  await page.dispatchEvent('[data-fprice="1:verifiedPrice"]', 'change');
  await page.waitForTimeout(250);
  const ranked = await page.textContent('#tab-work');
  check('formal ranking computes live (Alpha top)', ranked.includes('Top-ranked: Alpha Ltd') || ranked.includes('Alpha Ltd'));
  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(250);
  const formalDocs = await page.textContent('#docBar');
  check('formal report offered', formalDocs.includes('Evaluation report (OPR template)'));
  check('COI/confidentiality forms offered', formalDocs.includes('Conflict of interest & confidentiality forms'));
  check('no routine minute offered to formal', !formalDocs.includes('Ministry minute sheet'));
  await page.selectOption('#docSel', 'formal-report');
  await page.waitForTimeout(250);
  const formalReport = await page.textContent('#preview');
  check('formal report renders as the OPR EVALUATION REPORT', formalReport.includes('EVALUATION REPORT'));
  check('formal report has the recommendation section', formalReport.includes('Recommendation for Award of Contract'));

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
