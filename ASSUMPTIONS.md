# ASSUMPTIONS — decisions taken without explicit format authority

The signed samples in `samples/source/` are the format authority. Where
the samples and the specification disagreed, the samples won. Where the
samples were silent, contradictory or arithmetically wrong, the
decisions below were taken — each is deliberate, tested, and open to
reversal on instruction. **Questions needing an answer are marked ➤;
items marked RESOLVED carry the decision received and its date.**

## 1. Computed words replace hand-written idioms — RESOLVED

**Confirmed (July 2026): the formal style stands.** The instruction is
to use the formal method of writing out numbers, as in international
banking and formal financial documents — "One Thousand, Two Hundred
Dollars", never "Twelve Hundred Dollars".

The boxed-meals sample writes "in the sum Twelve Hundred Dollars
($1,200.00)". This system prints "in the sum of One Thousand, Two
Hundred Dollars ($1,200.00)": the words are generated from the same
number as the figure, so they cannot disagree — that is the core
guarantee and it excludes idioms like "Twelve Hundred" (and restores the
dropped "of"). The figure is identical. The words style otherwise
follows the materials sample exactly ("Seventy-Eight Thousand, Three
Hundred and Eighty-Nine Dollars and Sixty-Four Cents"), with no "Only"
suffix, since no sample uses one.

## 2. VAT arithmetic

12.5%, computed on the V subtotal, rounded **half-up at the cent**.
Verified against the samples: Trintrac $189,216.68 × 12.5% =
$23,652.085 → printed $23,652.09; J. Chai $453,375.00 × 12.5% =
$56,671.875 → printed $56,671.88. The rate is data
(`evaluation.vatRate`), not a constant in code.

## 3. The vote balances are computed — RESOLVED (verified)

Both sample vote-status tables obey, to the cent:
- Balance of Releases = Releases − Expenditure − Commitment
- Balance of Provision = (provision base) − Expenditure
- Uncommitted Balance = Balance of Provision − Commitment

So the system computes the three balances from the five typed figures.

**Provision base — verified from Ministry of Finance authority (July
2026).** The Comptroller of Accounts Accounting Manual (Ministry of
Finance, published by the Auditor General's Department) states, in the
Vote Book section 2.3.3 — whose cited authority is Financial
Regulations paragraphs 66–69 to the Exchequer and Audit Act Chapter
69:01 — that the Vote Book "is a control ledger designed to ensure that
expenditure incurred in respect of each sub-item does not exceed the
funds allocated for the current financial year and the releases granted
to date", and, for the Schedule of Accounts under Financial
Instructions 1965 paragraph 103(2), that officers "record details of
amounts added and deducted from the original provision (transfers,
virements) to date". Vote control is therefore exercised against the
allocation **as varied** by approved transfers and virements — the
figure the minute tables label **Revised Allocation** — and that is the
base this system uses.

Because the manual establishes the control principle without using the
literal words "Balance of Provision", a per-case selection
(`voteStatus.provisionBase`) is retained for the event that a written
instruction directs the Original Provision. The interface offers the
choice **only when the two figures actually differ** (when they are
equal the choice changes nothing), explains both options in plain
language on screen, and the base used is recorded in the H1 check
detail so every verification certificate shows how the balance was
worked out. Covered by `tests/votebase.test.js` and
`tools/browser-smoke-guidance.js`.

## 4. Evaluation award rules inferred from the pantry sheet — RESOLVED

**Confirmed (July 2026), with a condition: the system raises these
matters only when they actually arise in the case being prepared, and
whenever the user must decide, the screen explains the choice in plain
language.** Implemented: the tie, shortfall, non-compliance and override
explanations appear on the worksheet only while such a situation exists
in the evaluation (and disappear when it is resolved), each written so a
first-time reader understands what the situation means, what they must
do, and what effect the choice has on the documents and totals. Covered
by `tools/browser-smoke-guidance.js`.

- **Quantity shortfall excludes a quote from the automatic
  recommendation** (Ovaltine: Beyond quoted 48 of 50 packs at a lower
  unit price and did not win). Selecting a shortfall quote is an
  override and demands a justification.
- **Specification non-compliance excludes** (Granola: boxes of 6 against
  a requirement of boxes of 12; the dearer compliant quote won).
- **A price tie requires a recorded committee selection** (Digestive
  Biscuits, $2.50 = $2.50, went to Beyond). The selection is marked
  "tied lowest" on the worksheet; a note of the basis is expected
  (warned if absent, not failed, since both prices are the lowest).

## 5. Sample arithmetic errors are not reproduced

The dry runs replay the samples from their cell-level data and assert
the **correct** arithmetic. Catalogue of the signed sheets' own errors:

| Sample | Printed | Correct |
|---|---|---|
| Pantry, Ramsackal award | Sub Total (V) $20,948.00; Vat $2,618.50; Total $39,776.50; grand $44,694.25 | $21,248.00; $2,656.00; $40,114.00; grand $45,031.75 (its own rows, with its own V flags, sum to this; the full-quote table on the same sheet agrees: $25,568.00 − 2 × $2,160.00 = $21,248.00) |
| Minor equipment, Pillai item 1 | $59,405.44 | 8 × $7,425.00 = $59,400.00 |
| Minor equipment, J. Chai item 7 | "$11,3900.00" | 2 × $5,695.00 = $11,390.00 (and the malformed grouping is refused on entry) |
| Minor equipment, Pillai V subtotal | "$57,4716.72" | $574,711.28 |
| Minor equipment, Pillai VAT | $60,106.32 | $71,838.91 |
| Minor equipment, J. Chai total | (left blank) | $562,846.88 |
| Minor equipment, Trintrac total | $256,231.68 (omits VAT) | $279,883.77 |
| Pantry, Condensed Milk note | "(24/case)" with 5 cases = 240 | the arithmetic is a case of 48 (5 × $826.15 = $4,130.75, as printed); recorded as pack size 48 |
| Boxed meals, header | File No 22/18/**7** on sheet 1a, 22/18/**4** on sheet 1b | one file number per case; the system prints one |

## 6. Continuation sheets — RESOLVED

**Confirmed (July 2026): continuation headers are a documented Word
formatting step, as a safeguard for printed clarity and administrative
traceability, with no alteration to the approved output layout beyond
what proper continuation requires.** Implemented in two parts:

1. **Computed part (tables).** Every generated table now marks its
   header row as a true table header (`<thead>`), which Word treats as
   "Repeat as header row at the top of each page". When a schedule,
   award table, worksheet, register or vote table continues onto another
   page, its headings repeat automatically. This changes nothing on a
   single page — the layout is identical.
2. **Documented part (minute headers).** The samples hard-type
   "Minute (1) Continues…" and fresh sheet headers (1b, 2a) at page
   breaks. Page breaks depend on Word's pagination at print time, which
   a generator cannot honestly compute; the Word step is documented in
   USER-GUIDE.md ("Continuation sheets") and README-IT.md.

## 7. OPR line uses the collective "are"

Both samples: "…Ate6Ate Savor City Caterers Ltd **are** registered…" —
even for a single company. Followed.

## 8. The verbal-quotation sample names only the winner

The narrative says three companies were telephoned but names one. The
system requires every contact recorded (the register exists to evidence
them); the dry run uses clearly-marked illustrative names for the two
unnamed companies. Hardening, not deviation.

## 9. Disposal — RESOLVED to OPR authority (was a scaffold)

**Superseded (July 2026).** The earlier scaffold existed because no
disposal format authority had been supplied. Two OPR documents were then
provided and **are** that authority: the *Retention & Disposal of Public
Property Handbook* (HGRD02 05-2023 v3.0) and *Sample Disposal Case Study
#1* (Sept 2021 v1.0). The disposal module is now built to them:

- Forms A–E to the case-study layouts (Request for Asset Disposal;
  Inventory & Inspection Report with the VG/G/F/P/S disposition bands;
  Committee Appraisal Report; Strategy Development Report; Strategy
  Approval / Signature Form). The **SCAFFOLD — AWAITING FORMAT
  AUTHORITY** banner is gone; each form cites its authority.
- The appraisal arithmetic (unit NBV, 20% of NBV, appraised-value-less-
  20%, expected returns) is computed and replays the case study to its
  published total, **TT$70,650.00**, to the cent
  (`tests/dryruns/disposal-casestudy.test.js`).
- Governance from the Act and Regulations, each raised only when it
  arises: Disposal Committee of not less than three officers (ss. 55–56);
  reg 6(2) method list (open — a method off it needs recorded reasoning);
  reg 6(3) TT$100,000 newspaper-advertising threshold; s.57/reg 7 prior
  PDAC approval for a sale to employees; the AO's fourteen-day decision
  and rejection-reasons rule; the six-week OPR notification; net proceeds
  to account.

➤ **Still pending format authority:** Form F (Summary Report of Approved
Disposal Action), Form G (Transfer/Donation of Excess Personal
Property), Form H (Notice of Rejection) — named in the Handbook workflow
but not supplied as layouts — and **real-property** disposals (s. 57A;
regulations pending). Each disposal form footer states this.

## 9a. Formal tender / RFP / ITB evaluation — built to OPR authority

The formal Evaluation Committee module is built to the OPR *General
Guidelines: Evaluation of Submissions and Award of Contracts* (HGEA01
08-2023 v2.0) — Appendix I Conflict of Interest & Confidentiality form,
Appendix II Evaluation Report template — and the Tender Evaluation Report
Template.

- **Ranking formula.** The template states the technical and financial
  scores are "normalised utilising the following pre-determined formula
  ____________" — a blank, filled from the solicitation. This system
  computes the standard QCBS normalisation (technical percentage, and
  financial percentage = lowest verified price ÷ this price, combined by
  the committee's weights), because it is deterministic and reproducible
  for the audit trail the guideline requires. The **weights are case
  data** (whole percentages that must total 100), never invented; the
  free-text formula description is also recorded. ➤ If a public body's
  solicitation prescribes a different normalisation, that formula must be
  supplied and the computation adjusted.
- **Minimum technical score (the gate), criteria and maxima** are case
  data typed from the solicitation, never invented.
- The recommendation states the amount **in words, VAT INCLUSIVE**, as
  the template requires. Covered by `tests/formal.test.js` (a worked
  example ranked to the cent).

## 9b. Three-module separation — CONFIRMED and implemented

**Confirmed (July 2026) and built.** The system is one solution organised
as three separate modules chosen on a start screen before any data is
entered — **routine/daily procurement**, **formal tender/RFP/ITB
evaluation**, and **disposal of public property**. Standing rules,
implemented and tested (`tests/modulescope.test.js`):

- No cross-module logic. Tender-evaluation logic is not forced into
  routine procurement; routine minute logic is not forced into a formal
  report; procurement-award logic is not forced into disposal. Each
  module owns its check series (routine C/E/V/H + G; formal F + G;
  disposal D + G) and its documents; the framework merges only a
  module's own series.
- The routine supplier-comparison worksheet was previously mislabelled
  "Evaluation Report" — it is now the **Supplier Comparison Record /
  Worksheet**, a routine working paper, distinct from the formal OPR
  Evaluation Report. This is the one printed-label change made to routine
  outputs; the printed **layouts** of the approved routine documents
  (minute, letter, worksheet body, certificate) are byte-unchanged, as
  the parity and replay tests enforce.
- Shared tools (money, words, folios, the vote book, save/load, the
  verification framework, the offline composer) remain in the common
  core and serve all three modules. The composer writes only facts the
  user supplies, invents no figure, and inserts nothing until the user
  reviews the draft and clicks Insert — in every module (its targets are
  module-aware: routine minute fields, disposal strategy fields, or the
  formal report's narrative).
- Legacy case files (schema v2, pathways P1–P4) open losslessly: P1/P2/P3
  map to routine, P4 to disposal, and the original pathway is preserved
  on the case under `extra.legacyPathway`.

## 10. Miscellaneous

- The folio register's wide gaps ("Folios  1   to   6    refers,") are
  reproduced; in the hand-typed originals they existed for manual
  amendment — here the numbers are computed, so the gaps are cosmetic.
- **Sheet numbering — RESOLVED (July 2026):** the starting-folio
  requirement is not hard-coded onto sheet numbers. When a starting
  folio above 1 is set, the user decides per case whether the sheet
  numbers follow it or stay as typed; the question is asked only when
  it arises, explained on screen in plain terms (a folio number tracks
  the papers in an official file; some offices carry the same starting
  number onto the sheet numbers, others keep them separate), and the
  decision is recorded in the G6 check detail, which prints on every
  verification certificate. Until decided, verification carries a
  caution. Covered by `tests/sheetnumbers.test.js` and
  `tools/browser-smoke-guidance.js`.
- Case IDs (`CASE-YYYYMMDD-XXXXXX`) are file-management identifiers only
  and never appear in any generated document.
- Figures are capped at $999,999,999,999.99 so that every computation
  stays inside exact integer arithmetic; anything larger is refused.

## Adversarial review — what was found and fixed, and what remains

Found by the review pass and fixed (each now has a regression test):
- the UI originally re-rendered on every change event, which could
  destroy a value typed into a neighbouring field before it was
  committed — caught by the browser smoke test; the editing model was
  redesigned (sync on keystroke, in-place computed updates);
- saved case `.json` carried the Word BOM, corrupting strict parsers;
- extended totals could exceed exact-integer range silently — now an
  error; figures beyond the cap are refused;
- negative amounts could be spelt out in words — now refused;
- amounts above $999 billion would have produced wrong words — now
  unreachable (cap).

Known limits that remain, stated rather than hidden:
- OCR does not run from `file://` (browser Worker restriction);
  available over intranet HTTP. OCR correctness itself is **not**
  test-verified in this repository — only the vendored files' integrity
  and the pipeline around it; treat OCR output as untrusted (the UI
  says so).
- No multi-user concurrency without a server (stated in README-IT).
- Continuation-sheet pagination (item 6 above).
- Print fidelity in Word (fonts, exact spacing of the .doc rendering on
  Ministry machines) cannot be verified without live use, nor can the
  behaviour of the intranet share's permissions. The browser smoke test
  covers Chromium; Edge is the same engine but was not separately run.
