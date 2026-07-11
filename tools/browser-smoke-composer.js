/* Composer restoration check: compose from facts, preview, insert into the
   need field, and confirm the minute carries the composed narrative —
   deterministically, matching the parity-tested engine output. */
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
  await page.waitForTimeout(300);
  { const gx = await page.$('[data-action="guide-expert"]'); if (gx) await gx.click(); } // full form view (button absent if already in expert view)
  await page.waitForTimeout(200);

  check('composer fieldset present on Case Details', (await page.textContent('#tab-case')).includes('Narrative composer (offline, optional)'));

  // compose with nothing -> guidance message, no preview
  await page.click('[data-action="da-compose"]');
  await page.waitForTimeout(150);
  check('empty compose gives guidance, not output', (await page.textContent('#daStatus')).includes('Enter at least the activity'));

  // enter facts and compose
  await page.fill('[data-path="docState.da_activity"]', 'Accounts Training for Finance Branch personnel');
  await page.fill('[data-path="docState.da_who"]', 'thirty-five members of staff');
  await page.fill('[data-path="docState.da_when"]', '14-18 July 2026');
  await page.fill('[data-path="docState.da_cons"]', 'the training cannot be conducted');
  await page.dispatchEvent('[data-path="docState.da_cons"]', 'change');
  await page.click('[data-action="da-compose"]');
  await page.waitForTimeout(200);
  const preview = await page.textContent('#daPreview');
  check('deterministic draft matches the parity-tested engine output',
    preview.includes('The items listed in this approval are required to facilitate Accounts Training for Finance Branch personnel for thirty-five members of staff, carded for 14-18 July 2026.') &&
    preview.includes('Should the items not be procured, the training cannot be conducted.'));
  check('nothing entered the field before Insert', (await page.inputValue('[data-path="docState.need"]')) === '');

  // insert
  await page.click('[data-action="da-insert"]');
  await page.waitForTimeout(200);
  const need = await page.inputValue('[data-path="docState.need"]');
  check('Insert places the draft into the need field', need.includes('Should the items not be procured'));
  check('status confirms the insert', (await page.textContent('#daStatus')).includes('Inserted into'));

  // the composed narrative flows into the minute
  await page.fill('[data-path="docState.minfile"]', 'F');
  await page.dispatchEvent('[data-path="docState.minfile"]', 'change');
  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(300);
  check('minute preview carries the composed paragraph', (await page.textContent('#preview')).includes('The items listed in this approval are required to facilitate'));

  // the composer also serves the disposal module — writing into the
  // disposal strategy, not a routine field
  await page.click('nav.tabs button[data-t="start"]');
  await page.waitForTimeout(150);
  await page.click('.pathcard[data-activity="disposal"]');
  await page.waitForTimeout(300);
  { const gx = await page.$('[data-action="guide-expert"]'); if (gx) await gx.click(); } // full form view (button absent if already in expert view)
  await page.waitForTimeout(250);
  const dispTargets = await page.$$eval('[data-path="docState.da_target"] option', os => os.map(o => o.textContent));
  check('disposal composer targets the disposal strategy', dispTargets.some(t => t.includes('Disposal strategy — Background')));
  check('disposal composer offers no routine method field', !dispTargets.some(t => t.includes('Method justification')));
  await page.fill('[data-path="docState.da_activity"]', 'clearing the basement store of obsolete furniture');
  await page.dispatchEvent('[data-path="docState.da_activity"]', 'change');
  await page.click('[data-action="da-compose"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="da-insert"]');
  await page.waitForTimeout(200);
  check('disposal insert reports the strategy field', (await page.textContent('#daStatus')).includes('Disposal strategy — Background'));
  const backVal = await page.evaluate(() => window.APP.caseFile.disposal.strategy.background);
  check('composed draft landed in disposal.strategy.background', backVal.includes('obsolete furniture'));
  check('nothing was written to the routine need field', (await page.evaluate(() => window.APP.caseFile.docState.need)) === '');

  check('no page errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));
  await browser.close();
  console.log(fails.length ? '\nCOMPOSER CHECK FAILED: ' + fails.join(' | ') : '\nCOMPOSER CHECK PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
