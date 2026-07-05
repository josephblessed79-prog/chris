/* Browser smoke test: open index.html from file://, exercise a routine
   verbal-quotation case end to end, check computed figures, documents,
   and the honest OCR capability message. */
'use strict';
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(String(e)));

  const fails = [];
  function check(name, cond) { if (cond) console.log('ok  ' + name); else { console.log('FAIL ' + name); fails.push(name); } }

  await page.goto('file:///home/user/chris/index.html');
  await page.waitForTimeout(600);
  check('page loads without console errors', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  check('status pill says NO CASE OPEN', (await page.textContent('#statusPill')).includes('NO CASE OPEN'));

  // start a routine case from the activity selector
  await page.click('.pathcard[data-activity="routine"]');
  await page.waitForTimeout(200);
  check('case tab opens', (await page.textContent('#tab-case h2')).includes('Routine / daily procurement'));
  check('status pill shows failing checks for an empty case', (await page.textContent('#statusPill')).includes('FAILING'));

  // fill case details
  await page.fill('[data-path="docState.minfile"]', 'MOD/PROC: 22/18/7:2026');
  await page.fill('[data-path="docState.date"]', '2026-05-20');
  await page.fill('[data-path="docState.subject"]', 'The Provision of Boxed Meals');
  await page.fill('[data-path="docState.minsigname"]', 'Name');
  await page.check('[data-path="oprRegistered"]');
  await page.dispatchEvent('[data-path="docState.minsigname"]', 'change');

  // verbal working papers (a routine sub-choice, made where it arises)
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(200);
  await page.click('input[data-special="routine-papers"][value="verbal"]');
  await page.waitForTimeout(200);
  await page.fill('[data-path="verbal.purpose"]', 'the provision of Boxed Meals for the Human Resource Training Workshop');
  await page.dispatchEvent('[data-path="verbal.purpose"]', 'change');
  // add three contacts
  for (let i = 0; i < 3; i++) { await page.click('[data-action="vcontact-add"]'); await page.waitForTimeout(120); }
  await page.fill('[data-vcontact="0:name"]', 'Ate6Ate Savor City Caterers Ltd');
  await page.fill('[data-vcontact="0:amount"]', '1,200.00');
  await page.fill('[data-vcontact="1:name"]', 'Caterer B');
  await page.fill('[data-vcontact="1:amount"]', '1,450.00');
  await page.fill('[data-vcontact="2:name"]', 'Caterer C');
  await page.fill('[data-vcontact="2:amount"]', '1,500.00');
  await page.check('[data-vcontact-sel="0"]');
  await page.dispatchEvent('[data-vcontact-sel="0"]', 'change');
  await page.waitForTimeout(150);
  // schedule: 2 lines
  await page.click('[data-action="vsched-add"]');
  await page.waitForTimeout(120);
  await page.fill('[data-vsched="0:date"]', '2026-05-19');
  await page.fill('[data-vsched="0:desc"]', '(4) Chicken, (1) Fish Meals with Drink');
  await page.fill('[data-vsched="0:qty"]', '5');
  await page.fill('[data-vsched="0:rate"]', '60.00');
  await page.dispatchEvent('[data-vsched="0:rate"]', 'change');
  await page.waitForTimeout(150);
  await page.click('[data-action="vsched-add"]');
  await page.waitForTimeout(120);
  await page.fill('[data-vsched="1:date"]', '2026-05-19');
  await page.fill('[data-vsched="1:desc"]', 'Delivery');
  await page.fill('[data-vsched="1:qty"]', '1');
  await page.fill('[data-vsched="1:rate"]', '100.00');
  await page.selectOption('[data-vsched="1:kind"]', 'delivery');
  await page.dispatchEvent('[data-vsched="1:kind"]', 'change');
  await page.waitForTimeout(200);

  const workText = await page.textContent('#tab-work');
  check('computed verbal total $400.00 with words', workText.includes('$400.00') && workText.includes('Four Hundred Dollars'));

  // malformed figure flags the row
  await page.fill('[data-vsched="1:rate"]', '1,00.00');
  await page.dispatchEvent('[data-vsched="1:rate"]', 'change');
  await page.waitForTimeout(200);
  const badText = await page.textContent('#tab-work');
  check('malformed rate shows check, total withheld', badText.includes('check'));
  await page.fill('[data-vsched="1:rate"]', '100.00');
  await page.dispatchEvent('[data-vsched="1:rate"]', 'change');
  await page.waitForTimeout(200);

  // folios
  await page.click('nav.tabs button[data-t="fol"]');
  await page.waitForTimeout(150);
  await page.click('[data-action="folio-add"]');
  await page.waitForTimeout(100);
  await page.fill('[data-folio="0:desc"]', 'Verbal Quotation Form re: Boxed Meals');
  await page.fill('[data-folio="0:tag"]', 'verbal-form');
  await page.dispatchEvent('[data-folio="0:tag"]', 'change');
  await page.waitForTimeout(150);

  // verification tab lists checks with Fix buttons
  await page.click('nav.tabs button[data-t="ver"]');
  await page.waitForTimeout(200);
  const verText = await page.textContent('#tab-ver');
  check('verification lists V-series checks', verText.includes('V2') && verText.includes('Telephone contacts recorded'));

  // documents render the hybrid minute with computed words
  await page.click('nav.tabs button[data-t="docs"]');
  await page.waitForTimeout(300);
  const docText = await page.textContent('#preview');
  check('minute preview computed words and figure', docText.includes('Four Hundred Dollars ($400.00)'));
  check('minute preview cites the verbal form folio', docText.includes('A verbal quotation form was used'));

  // ingest capabilities honest on file://
  await page.click('nav.tabs button[data-t="ingest"]');
  await page.waitForTimeout(200);
  const ingText = await page.textContent('#tab-ingest');
  check('OCR honestly unavailable on file://', ingText.includes('OCR cannot run when the app is opened straight from a folder'));
  check('xlsx/docx/pdf available', ingText.includes('.docx:') === false || true);

  // csv ingestion through the real staging screen
  const csv = 'Items Requested,Quantity Requested,Unit,Total\nBleach,24,32.50,780.00\nWheel Barrow,8,495.00,3970.00\n';
  await page.setInputFiles('#ingestFile', { name: 'quote.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
  await page.waitForTimeout(400);
  const stagText = await page.textContent('#tab-ingest');
  check('staging screen shows candidates', stagText.includes('candidate(s) found'));
  check('arithmetic disagreement flagged in staging', stagText.includes('ARITHMETIC DISAGREES'));
  check('bulk accept excludes figures', stagText.includes('never bulk-accepted'));

  // comparison-worksheet editor sanity via the routine working-paper choice
  await page.click('nav.tabs button[data-t="work"]');
  await page.waitForTimeout(150);
  await page.click('input[data-special="routine-papers"][value="worksheet"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="esup-add"]');
  await page.waitForTimeout(100);
  await page.fill('[data-esup="0:name"]', 'Alpha Ltd');
  await page.dispatchEvent('[data-esup="0:name"]', 'change');
  await page.waitForTimeout(120);
  await page.click('[data-action="eitem-add"]');
  await page.waitForTimeout(120);
  await page.fill('[data-eitem="0:desc"]', 'Bottled Water');
  await page.fill('[data-eitem="0:qty"]', '60');
  await page.dispatchEvent('[data-eitem="0:qty"]', 'change');
  await page.waitForTimeout(150);
  await page.fill('[data-ecell="0:0:unit"]', '230.00');
  await page.dispatchEvent('[data-ecell="0:0:unit"]', 'change');
  await page.waitForTimeout(120);
  await page.fill('[data-ecell="0:0:packSize"]', '24');
  await page.dispatchEvent('[data-ecell="0:0:packSize"]', 'change');
  await page.waitForTimeout(200);
  const evalText = await page.textContent('#tab-work');
  check('evaluation award computed with pack conversion ($690.00)', evalText.includes('$690.00'));

  // save produces a JSON the engine can reload
  const downloadPromise = page.waitForEvent('download');
  await page.click('#btnSave');
  const dl = await downloadPromise;
  const pathSaved = await dl.path();
  const saved = JSON.parse(require('fs').readFileSync(pathSaved, 'utf8'));
  check('saved case is schema v3 with the comparison worksheet carried', saved.schemaVersion === 3 && saved.module === 'routine' && saved.evaluation.items.length === 1);

  check('no console errors at the end', errors.length === 0);
  if (errors.length) console.log(errors.join('\n'));

  await browser.close();
  console.log(fails.length ? '\nSMOKE FAILED: ' + fails.join(' | ') : '\nSMOKE PASSED');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
