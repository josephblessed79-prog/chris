# README-IT — for the Ministry IT officer

This document assumes you have never seen this code before. It tells you
what every folder is, how to deploy the system on an intranet share, how
to change a template or add a style profile **without touching the
engine**, and where the hard limits are.

## What this is

A static web application: plain HTML, CSS and JavaScript. There is no
server component, no database, no build step, no package install and no
internet dependency. Users open `index.html` in Edge or Chrome. Case
files are `.json` documents the users save and open themselves.

## File map

```
index.html            The application shell. Loads everything below in order.
css/app.css           All styling. The .doc block is the document typography.
js/lib/               THE ENGINE. Pure logic, no screen code. Every file
                      also runs under Node for testing.
  money.js            Integer-cents arithmetic; strict figure parser; VAT.
  words.js            Amounts in words (TT house style).
  textutil.js         Escaping, dates, small helpers.
  compute.js          Item/quotation totals and award grouping.
  verify.js           The C-series checks (item cases).
  evaluation.js       The P3 worksheet engine and E-series checks.
  verbal.js           P1 micro-procurement and V-series checks.
  votestatus.js       Vote-book figures, computed balances, H-series checks.
  disposal.js         P4 inventory/valuation and D-series checks.
  verifycase.js       Assembles the right checks for a whole case.
  folio.js            Folio numbering, both numeral styles, references.
  casemodel.js        The case JSON (schema v2) and v1 migration.
  styleprofile.js     The style-profile registry.
  storage.js          File naming and the shared-folder register index.
  ingest.js           Candidate extraction from imported documents.
  ingestfiles.js      Browser file readers over the vendored parsers.
  documents.js        Dispatcher: case + profile -> document builder.
  docs/               One file per document type.
js/app/               THE SCREENS. Browser-only wiring; no arithmetic here.
styles/               STYLE PROFILES — data, not code. See below.
vendor/               Third-party libraries, vendored. See vendor/README.md.
tests/                Node test suites. `node tests/run.js` runs them all.
tools/                docx text extractor; Playwright browser smoke test.
samples/              The signed sample documents (format authority).
legacy/               The original Approvals_Composer.html, untouched.
```

Rule of thumb: **`js/lib/` computes, `js/app/` displays.** If a change
involves money, folio numbers, checks or document wording shared across
profiles, it is an engine change and must come with a test. If it is
letterhead, routing lines or phrase variants, it is a profile change and
needs no code at all.

## Deploying on an intranet share

1. Copy the whole folder (everything in this repository) to the share,
   e.g. `\\modserver\procurement\app\`.
2. Users open `index.html` from there. That is the entire deployment.
3. Create a sibling folder for case files, e.g.
   `\\modserver\procurement\cases\`. Users save case `.json` files into
   it and rebuild the register from it (Case File & Register tab).

### Serving over HTTP (optional, enables OCR)

Browsers refuse to start a Web Worker from a `file://` script, so OCR of
scanned documents does not run when the app is opened straight from a
folder. Everything else works. If OCR is wanted, serve the same folder
over HTTP on the intranet (any static web server — IIS with a virtual
directory pointing at the share is enough). No server code is executed;
it is still static files.

## Storage levels — and what needs a server

- **Level (a), file save/load** — always available; the `.json` file the
  user saves is the record.
- **Level (b), browser autosave** — recovery only, per computer, per
  browser profile. It is not a record and the app says so.
- **Level (c), shared-folder register** — a folder of case files plus
  `register-index.json`, rebuilt by the app from the files themselves.
  The index never overrides a case file.

**True multi-user concurrency needs a small server.** Two officers who
save the same case file to the share at the same moment will race — last
save wins, with no merge and no lock. The register index is only as
fresh as its last rebuild. This is an inherent property of a serverless
share, not a bug; if simultaneous editing becomes a requirement, that is
a server decision for IT, and nothing in this system pretends otherwise.

## Changing a template without touching the engine

Style profiles live in `styles/*.profile.js`. Each is a JSON object
inside a one-line wrapper (the wrapper exists because browsers refuse
`fetch()` of local JSON from `file://`). To add a profile:

1. Copy an existing file, e.g. `ministry-dotted.profile.js`, to
   `styles/my-agency.profile.js`.
2. Edit the JSON between the `==== EDIT` markers: change `id`, `name`,
   letterhead, `folio.style` (`"dotted"` or `"circled"`), routing lines,
   signature block, and any phrase in `phrases` (placeholders in
   `{braces}` are filled with computed values — never remove a
   placeholder that carries a figure).
3. Add one line to `index.html` beside the other profiles:
   `<script src="styles/my-agency.profile.js"></script>`.
4. Open the app; the profile appears in the Case Details picker. A
   malformed profile is rejected loudly at load with the reason.

The phrases are presentation. The figures, words-from-figures, folio
numbers and checks are computed by the engine identically for every
profile — a profile cannot change arithmetic.

## The disposal pathway (P4) is a scaffold

No sample disposal file was provided. The P4 documents follow the Act's
disposal provisions and the house minute style, and every one carries a
visible **SCAFFOLD — AWAITING FORMAT AUTHORITY** banner. When a signed
disposal file is available, its formats must be confirmed and the banner
removed (in `js/lib/docs/disposaldocs.js`) — that is the one place a
deliberate code change is expected.

## Continuation formatting

Generated tables wrap their heading rows in `<thead>`, which Word maps
to "Repeat as header row at the top of each page" — long schedules stay
readable when they spill onto a second page, with no visual change on a
single page. Do not remove the `<thead>` markers when editing a document
builder. The minute sheet's own continuation headers ("Minute (1)
Continues…", Sheet No 1b) remain a documented Word step (USER-GUIDE.md,
"Continuation sheets") because page breaks are only known at print time.

## Updating a vendored library

See `vendor/README.md` for exact versions and files. Replace the file(s)
with the same file(s) from the newer package, update the version in that
README, and run `node tests/run.js` — the vendored suite must pass
before the update ships. Note that `pdfjs` must remain a 3.x *legacy*
build: 4.x is ES-modules-only and will not load from `file://`.

## Running the tests

Any machine with Node.js (no packages needed):

```
node tests/run.js            # everything
node tests/run.js pantry     # one suite by name fragment
```

The browser smoke test needs Playwright and Chromium:
`node tools/browser-smoke.js` (adjust the browser path inside).

Nothing ships with a failing test.
