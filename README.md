# Ministry of Defence — Procurement Administration System

An offline, browser-based system for preparing, checking and producing
procurement and disposal documents under the **Public Procurement and
Disposal of Public Property Act, Act No. 1 of 2015** (Trinidad and
Tobago). It runs by opening `index.html` from a folder or a network
share, in Edge or Chrome, with no internet, no installation, no macros
and no build step.

## The rule of the system

Every name, quantity, price and vote figure is typed **once**, straight
from the document in the file (or accepted, one by one, from an imported
document on the staging screen). The system:

- does all the arithmetic in exact integer cents — nothing is ever a
  rounded float, and a figure it cannot compute exactly is an error, not
  an approximation;
- writes every amount in words **from the same number as the figure**,
  so the words and the figure cannot disagree;
- numbers every folio from the register and a configurable starting
  folio number, so no reference is ever typed;
- computes the three vote balances from the five vote-book figures;
- refuses malformed figures on entry with the reason (the signed sample
  evaluations contain figures such as `$11,3900.00` — this system will
  not accept them);
- runs the full set of verification checks continuously and stamps any
  document generated while a check fails **DRAFT — NOT CLEARED**;
- invents nothing, and sends nothing anywhere.

## Three separate modules — chosen before any data is entered

The system is one solution, but it does **not** treat all
procurement-related work as the same. A start screen asks *what are you
doing today?* and the answer sets the module: its forms, its questions,
its checks, its documents. None borrows another's logic.

| Module | What it is | Documents |
|---|---|---|
| **A. Routine / daily procurement** | The everyday travelling file. Two presentations chosen on Case Details — Ministry internal minute, or an external-formation letter + minute (Coast Guard, Defence Force, Regiment, Police, Fire, Prison Services, other agencies). Working paper chosen where it arises — written quotations, a verbal/telephone record, or a supplier-comparison worksheet | Minute sheet, formation approval letter, verbal quotation form, telephone-contact register, supplier comparison record & worksheet, checklist, verification certificate |
| **B. Formal tender / RFP / ITB evaluation** | The Evaluation Committee report on a formal solicitation, to the OPR template | Evaluation Report (introduction, background, team, criteria & scoring, methodology, preliminary examination, technical & commercial evaluation, computed ranking, recommendation VAT inclusive), Conflict of Interest & Confidentiality declarations (Appendix I) |
| **C. Disposal of public property** | Disposal under Part VI of the Act and the Retention & Disposal Regulations 2021, to the OPR Handbook and Sample Case Study | Forms A–E: Request for Asset Disposal, Inventory & Inspection Report, Committee Appraisal Report (computed), Strategy Development Report, Strategy Approval / Signature Form |

Shared tools only — money in exact cents, amounts in words, folio
numbering, the vote book (a routine instrument), save/load, the
verification framework, the offline narrative composer, and the
document-upload/intake feature — live in a common core. Each module owns its own workflow and check series
(routine C/E/V/H + G; formal F + G; disposal D + G); the framework
merges only a module's own series, so tender-evaluation logic never
reaches routine procurement, routine minute logic never reaches a formal
report, and procurement-award logic never reaches disposal.

Legacy case files open losslessly: the old pathway codes P1/P2/P3 map to
routine (internal / formation / with a comparison worksheet) and P4 to
disposal, with the original pathway preserved on the case.

## Format authority

- **Routine** documents are held to the four signed sample documents in
  `samples/source/`; the dry-run suites replay all four to the cent, and
  where the signed sheets themselves contain arithmetic errors (they do)
  the tests assert the **correct** figures and show the system flagging
  the malformed ones on entry.
- **Disposal** Forms A–H are held to the official **OPR Disposal
  Templates**, with the Retention & Disposal Handbook (HGRD02 v3.0) and
  the Sample Disposal Case Study #1 as supporting authority. Form C
  follows the official blank (Item · Appraised Value · Total), with the
  Case Study's NBV working preserved as an optional Appraisal Catalogue;
  the case study replays to its published total, **TT$70,650.00**, to the
  cent (`tests/dryruns/disposal-casestudy.test.js`). Only real-property
  disposals (s. 57A) remain pending their own regulations.
- **Formal evaluation** is held to the OPR Evaluation of Submissions
  guideline (Appendix I COI form, Appendix II report template); a worked
  example ranks two gate-passing proponents to the cent
  (`tests/formal.test.js`).

Deliberate deviations and everything still pending are listed in
`ASSUMPTIONS.md`.

## Tests are the definition of done

```
node tests/run.js
```

runs every suite: engine units, byte-parity against the original
Approvals Composer, the four sample replays, the disposal case-study
replay, the formal worked example, the module-separation guarantees
(`tests/modulescope.test.js`), the document-intake engine
(`tests/intake.test.js`) and its four Phase-7 suites (global-state
injection, OCR-protocol handling, layout compliance, conflict
resolution), seventeen further full-system scenarios,
storage, ingestion, vendored libraries, and an adversarial suite.
Nothing in this repository claims a capability that is not demonstrated
by a passing test. Five browser smoke tests (Playwright + Chromium)
drive the real UI from `file://`: `browser-smoke.js` (a routine case end
to end), `browser-smoke-guidance.js` (conditional questions),
`browser-smoke-composer.js` (the offline composer),
`browser-smoke-modules.js` (the three-module separation), and
`browser-smoke-intake.js` (uploading a real document and choosing how it
is used).

## Documentation

- `README-IT.md` — file map, intranet deployment, changing templates and
  profiles without touching the engine, storage levels, the OCR
  limitation, and what needs a server.
- `USER-GUIDE.md` — written so a first-time user teaches themselves by
  using it.
- `ASSUMPTIONS.md` — every decision taken without explicit format
  authority, and the questions awaiting answers.
- `vendor/README.md` — the vendored libraries, versions and licences.
- `legacy/Approvals_Composer.html` — the original single-file tool,
  kept verbatim; the parity tests run against it.
