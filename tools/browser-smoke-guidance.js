/* Conditional-guidance smoke test: the provision-base question and the
   tie/shortfall explanations must appear only when those situations
   actually exist in the case. */
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
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(200);
  // choose the comparison worksheet as the routine working paper
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(150);
  await page.click('input[data-special="routine-papers"][value="worksheet"]');
  await page.waitForTimeout(200);

  // ---- vote base: equal figures -> no question
  await page.click('nav.tabs button[data-t="vote"]');
  await page.waitForTimeout(150);
  for (const [k, v] of [['originalProvision', '380,000.00'], ['revisedAllocation', '380,000.00'],
    ['releasesToDate', '32,602.00'], ['expenditureToDate', '3,560.57'], ['commitment', '21,654.44']]) {
    await page.fill('[data-vstatus="' + k + '"]', v);
  }
  await page.dispatchEvent('[data-vstatus="commitment"]', 'change');
  await page.click('nav.tabs button[data-t="vote"]'); // re-render settled
  await page.waitForTimeout(200);
  let voteText = await page.textContent('#tab-vote');
  check('equal figures: balances computed', voteText.includes('$354,784.99'));
  check('equal figures: NO base question', !voteText.includes('must choose which one'));

  // differing figures -> the question appears with the plain explanation
  await page.fill('[data-vstatus="revisedAllocation"]', '400,000.00');
  await page.dispatchEvent('[data-vstatus="revisedAllocation"]', 'change');
  await page.click('nav.tabs button[data-t="vote"]');
  await page.waitForTimeout(200);
  voteText = await page.textContent('#tab-vote');
  check('differing figures: base question appears', voteText.includes('must choose which one the Balance of Provision is measured against'));
  check('plain-language explanation present', voteText.includes('the money this vote started the year with'));
  check('authority cited', voteText.includes('Comptroller of Accounts Accounting Manual'));
  check('revised is the default: balance uses $400,000.00', voteText.includes('$374,784.99') || voteText.includes('$396,439.43'));
  await page.check('input[data-vstatus-base][value="original"]');
  await page.waitForTimeout(250);
  voteText = await page.textContent('#tab-vote');
  check('choosing Original moves the computed balance', voteText.includes('$376,439.43'));
  check('note records the per-case selection', voteText.includes('per-case selection recorded'));

  // ---- evaluation: no tie -> no tie explanation
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="esup-add"]'); await page.waitForTimeout(100);
  await page.click('[data-action="esup-add"]'); await page.waitForTimeout(100);
  await page.fill('[data-esup="0:name"]', 'A Ltd');
  await page.fill('[data-esup="1:name"]', 'B Ltd');
  await page.dispatchEvent('[data-esup="1:name"]', 'change');
  await page.waitForTimeout(120);
  await page.click('[data-action="eitem-add"]'); await page.waitForTimeout(120);
  await page.fill('[data-eitem="0:desc"]', 'Paper');
  await page.fill('[data-eitem="0:qty"]', '10');
  await page.dispatchEvent('[data-eitem="0:qty"]', 'change');
  await page.waitForTimeout(150);
  await page.fill('[data-ecell="0:0:unit"]', '52.00');
  await page.fill('[data-ecell="0:1:unit"]', '55.00');
  await page.dispatchEvent('[data-ecell="0:1:unit"]', 'change');
  await page.waitForTimeout(200);
  let workText = await page.textContent('#tab-work');
  check('no tie: NO tie explanation', !workText.includes('price tie'));

  // create the tie -> the explanation appears
  await page.fill('[data-ecell="0:1:unit"]', '52.00');
  await page.dispatchEvent('[data-ecell="0:1:unit"]', 'change');
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  workText = await page.textContent('#tab-work');
  check('tie: explanation appears', workText.includes('There is a price tie on: 1. Paper'));
  check('tie: explains in plain language', workText.includes('quoted exactly the same lowest price'));
  check('tie: says the total does not change', workText.includes('the grand total does not change'));

  // shortfall explanation appears only once a shortfall exists
  check('no shortfall yet: NO shortfall explanation', !workText.includes('quantity shortfall') && !workText.includes('offered less than the quantity'));
  await page.fill('[data-ecell="0:1:quotedQty"]', '8');
  await page.dispatchEvent('[data-ecell="0:1:quotedQty"]', 'change');
  await page.waitForTimeout(200);
  workText = await page.textContent('#tab-work');
  check('shortfall: explanation appears', workText.includes('offered less than the quantity required'));
  check('shortfall: explains the override route', workText.includes('show that choice as an override'));

  // ---- sheet numbering: asked only when the starting folio is above 1
  await page.click('nav.tabs button[data-t="case"]');
  await page.waitForTimeout(200);
  let caseText = await page.textContent('#tab-case');
  check('folio start 1: NO sheet-number question', !caseText.includes('Should the sheet numbers follow it'));
  await page.fill('[data-special="folioStart"]', '5');
  await page.dispatchEvent('[data-special="folioStart"]', 'change');
  await page.waitForTimeout(250);
  caseText = await page.textContent('#tab-case');
  check('folio start 5: sheet-number question appears', caseText.includes('Should the sheet numbers follow it for this file?'));
  check('sheet question explains folio vs sheet plainly', caseText.includes('stamped on each paper so it can be tracked'));
  await page.check('input[data-sheetnum][value="follow-folio"]');
  await page.waitForTimeout(250);
  const sheetChoice = await page.evaluate(() => window.APP.caseFile.sheetNumbering);
  check('sheet-number decision recorded on the case', sheetChoice === 'follow-folio');
  await page.click('nav.tabs button[data-t="ver"]');
  await page.waitForTimeout(250);
  const verText2 = await page.textContent('#tab-ver');
  check('G6 records the decision in the checks', verText2.includes('Decision recorded on this case'));

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nSMOKE2 FAILED: ' + fails.join(' | ') : '\nSMOKE2 PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
