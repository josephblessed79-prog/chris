/* run.js — discovers and runs every *.test.js under tests/ and tests/dryruns/.
   Usage:  node tests/run.js  [substring-filter]
   Exits non-zero if any test fails. No dependencies. */
'use strict';

const fs = require('fs');
const path = require('path');
const harness = require('./harness.js');

const filter = process.argv[2] || '';

function collect(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.test.js'))
    .map(f => path.join(dir, f))
    .sort();
}

const files = [
  ...collect(__dirname),
  ...collect(path.join(__dirname, 'dryruns')),
].filter(f => f.includes(filter));

for (const f of files) {
  harness.suite(path.relative(__dirname, f));
  require(f);
}

const r = harness.run();

for (const f of r.failures) {
  console.error('\nFAIL  [' + f.suite + '] ' + f.test);
  console.error('      ' + String(f.error && f.error.message ? f.error.message : f.error).split('\n').join('\n      '));
}

console.log('\n' + files.length + ' file(s), ' + (r.pass + r.fail) + ' test(s): ' +
  r.pass + ' passed, ' + r.fail + ' failed.');
process.exit(r.fail ? 1 : 0);
