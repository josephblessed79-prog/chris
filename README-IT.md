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
  verify.js           Routine C-series checks (item cases).
  evaluation.js       Routine supplier-comparison worksheet + E-series checks.
  verbal.js           Routine micro-procurement + V-series checks.
  votestatus.js       Vote-book figures, computed balances, H-series checks.
  disposal.js         Disposal module: Forms A–E data, appraisal, D-series.
  formal.js           Formal tender/RFP/ITB module: scoring, ranking, F-series.
  verifycase.js       Assembles a module's own checks for a whole case.
  folio.js            Folio numbering, both numeral styles, references.
  casemodel.js        The case JSON (schema v3: module + presentation) and
                      lossless v1/v2 migration.
  styleprofile.js     The style-profile registry.
  storage.js          File naming and the shared-folder register index.
  ingest.js           Candidate extraction from imported documents.
  ingestfiles.js      Browser file readers + document-structure extraction.
  intake.js           Document Upload / Intake: mode A/B/C, layout-conflict
                      detection, compliance-bounded layout plan, audit record.
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

## Three modules, kept separate

The Start screen sets the case's **module** — `routine`,
`formal-evaluation` or `disposal` — before any data is entered
(`casemodel.js`). Each module owns its documents and its check series;
`verifycase.js` merges only a module's own series (routine C/E/V/H + G;
formal F + G; disposal D + G) and `documents.availableDocs` offers only a
module's own documents. This separation is the point of the design — do
not add a cross-module document or check. It is locked by
`tests/modulescope.test.js`, which fails if, say, a disposal case is ever
offered the procurement certificate or a formal case runs a vote check.

The disposal module is built to the official **OPR Disposal Templates
(Forms A–H)**, with the Handbook and Sample Case Study as supporting
authority (the case study replays to TT$70,650.00; Form C follows the
official blank, with the NBV working in an optional Appraisal Catalogue).
Only real-property disposals remain pending, marked so in each form's
footer. The formal module is built to the OPR Evaluation of Submissions
guideline (Appendix I COI form, Appendix II report). The one place a
solicitation-specific change might be needed is the ranking normalisation
in `formal.js` (`ranking`) — it uses the standard QCBS weighting on
integer maths; if a public body prescribes a different formula, adjust it
there and add a test.

## Professional output and the document-upload feature

Two cross-cutting rules, both compliance-first:

- **Professional Output Standard.** Documents aim for a polished,
  official appearance — but never at the cost of a mandated format. Any
  approved/sample-verified layout (routine minute, letter, worksheet,
  certificate) is byte-frozen and guarded by the parity tests. An
  optional `outputProfile: 'enhanced'` refines presentation only; it is
  honoured by the disposal and formal builders and never alters a
  mandated structure. Do not "improve" a frozen builder.
- **Document Upload / Intake** (`intake.js` + `ingest-ui.js`). The user
  uploads a document and picks mode A (information), B (layout) or C
  (both). Facts are extracted and confirmed one by one; layout guidance
  is compliance-bounded (it maps to the enhanced profile and safe
  signals, and the official template wins on any conflict). Every intake
  is recorded on `caseFile.intake` for audit. File-type support is
  honest and stated on screen; OCR still needs HTTP (not `file://`). The
  official-template structures used for conflict detection live in
  `intake.js` (`OFFICIAL`) — extend them there if a module's mandated
  structure changes.

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
