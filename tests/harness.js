/* harness.js — minimal zero-dependency test harness for Node.
   Test files call t.test(name, fn); fn throws on failure (use t.eq / t.ok /
   t.throws or Node's assert). run.js collects and reports. */
'use strict';

const assert = require('assert');

const suites = [];
let current = null;

function suite(name) {
  current = { name, tests: [] };
  suites.push(current);
}

function test(name, fn) {
  if (!current) suite('(unnamed suite)');
  current.tests.push({ name, fn });
}

function eq(actual, expected, msg) {
  assert.deepStrictEqual(actual, expected, msg);
}

function ok(value, msg) {
  assert.ok(value, msg);
}

function throws(fn, msg) {
  assert.throws(fn, undefined, msg);
}

/* Strict string equality with a readable first-difference report,
   for comparing generated documents byte for byte. */
function eqStr(actual, expected, msg) {
  if (actual === expected) return;
  const a = String(actual), b = String(expected);
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const ctx = 60;
  const detail =
    '\nFirst difference at index ' + i +
    '\n  actual   …' + JSON.stringify(a.slice(Math.max(0, i - ctx), i + ctx)) +
    '\n  expected …' + JSON.stringify(b.slice(Math.max(0, i - ctx), i + ctx));
  assert.fail((msg || 'strings differ') + detail);
}

function run() {
  let pass = 0, fail = 0;
  const failures = [];
  for (const s of suites) {
    for (const t of s.tests) {
      try {
        t.fn();
        pass++;
      } catch (e) {
        fail++;
        failures.push({ suite: s.name, test: t.name, error: e });
      }
    }
  }
  return { pass, fail, failures, suites: suites.length };
}

module.exports = { suite, test, eq, ok, throws, eqStr, run };
