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

## The four pathways

| Pathway | What it is | Documents |
|---|---|---|
| **P1** — Ministry internal | Units and departments within MOD, including micro-procurement by verbal quotation | Hybrid minute sheet, verbal quotation form, telephone-contact register, checklist, verification certificate |
| **P2** — External formations | Coast Guard, Defence Force, Air Guard, Regiment, Police, Fire, Prison Services, other agencies | Formation approval letter, Ministry minute, checklist, verification certificate |
| **P3** — Evaluation Committee | Multi-item, multi-supplier evaluation worksheet | Worksheet, evaluation report, award tables, Breakdown of Price per Company |
| **P4** — Disposal Committee | Disposal of public property under the 2015 Act | Inventory and valuation record, committee minute, approval instrument — **scaffolded, awaiting format authority** (no sample disposal file has been provided) |

Pathways share one case model. A case moves between pathways (an
evaluation becomes an approval) with full data carry-over and its
history recorded.

## Format authority

The document formats are held to the four signed sample documents in
`samples/source/`. The dry-run test suites replay all four to the cent —
and, where the signed sheets themselves contain arithmetic errors (they
do; see `tests/dryruns/`), the tests assert the **correct** figures and
demonstrate that the system flags the malformed ones on entry.
Deliberate deviations from the samples are listed in `ASSUMPTIONS.md`.

## Tests are the definition of done

```
node tests/run.js
```

runs every suite: engine units, byte-parity against the original
Approvals Composer, the four sample replays, seventeen further
full-system scenarios, storage, ingestion, vendored libraries, and an
adversarial suite. Nothing in this repository claims a capability that
is not demonstrated by a passing test. A browser smoke test
(`tools/browser-smoke.js`, Playwright + Chromium) drives the real UI
from `file://`.

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
