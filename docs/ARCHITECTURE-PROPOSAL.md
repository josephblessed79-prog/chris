# CORRECTED ARCHITECTURE — CONFIRMED AND IMPLEMENTED

Status: **CONFIRMED (July 2026) and BUILT.** The three-module separation
described below was approved and is implemented across case-model v3
(module + presentation, lossless v2→v3 migration), the start-screen
process selector, module-scoped documents and check series, the disposal
module (Forms A–E to OPR authority, case study replayed to TT$70,650.00),
and the formal tender/RFP/ITB module (OPR Evaluation Report, Appendix I
COI forms, computed ranking). The routine/travelling-file printed
**layouts** are byte-unchanged — the byte-parity and sample-replay tests
still enforce that; the only routine label change is the worksheet's
title (see §4.1). Module-separation guarantees are locked by
`tests/modulescope.test.js`. This document is kept as the design record.

## 1. Authorities reviewed

| Document | Governs | Used for |
|---|---|---|
| PPDPP (Procurement Methods and Procedures) (No. 2) Regulations, 2021 | The procurement methods. Reg 10–11: Request for Quotations — written requests to **not less than three** suppliers (recorded justification if only two available), ≥ five working days, one quotation per supplier; regs 5–9 open/limited bidding; 12–15 single/sole source; 21 PDAC composition; 31–34 opening, preliminary examination, clarification, evaluation | Module C rules; Module B legal frame |
| OPR General Guidelines: Evaluation of Submissions and Award of Contracts (HGEA01, v2.0 2023) | Evaluation committee, criteria, preliminary examination, detailed technical/financial evaluation, ranking, PDAC review, award steps; Appendix I Conflict of Interest and Confidentiality form; Appendix II report template | Module B structure and checks |
| OPR Tender Evaluation Report Template | The formal Evaluation Report layout: Introduction; Background; Evaluation of Bids (Team, Criteria and Scoring, Methodology, Preliminary Examination, Technical Evaluation, Commercial Evaluation, Clarification, Ranking, Negotiations); Recommendation for Award (amount in words, VAT INCLUSIVE); signatures; Appendices | Module B **format authority** |
| OPR General Guidelines: Procurement Methods and Procedures (HGPL08, v2.0 2023) | Method selection and conditions of use | Module C method logic |
| OPR Comprehensive Handbook (HGGE01, v2.0 2023) | End-to-end operational frame; §4.1 confirmation of funding; §6 planning/solicitation/evaluation/PDAC/award; §9 disposal — which **defers all detailed disposal procedures, forms and templates to** *General Guidelines: Retention of Public Property and Disposal of Personal Property* (not supplied) | Context; disposal authority gap |
| OPR Basic Procurement Handbook (HGGE02, v2.0 2023) | Simplified day-to-day procedure | Module C context |
| OPR General Guidelines: Record Keeping & Maintenance of Procurement Files (HGCM02) | The procurement record: what is conserved, filing, file movement, closing | Module C travelling-file checklist |
| Standard Terms and Conditions of Purchase (template) | PO terms annexure | Module C output |

## 2. Process map — three separate workflows

### Module C — ROUTINE / DAILY PROCUREMENT (the travelling file)
Purchase requisition / memorandum of need
→ confirm vote and funds (five vote-book figures; three balances computed)
→ choose method: **written RFQ** (reg 10–11: ≥3 written requests, ≥5
working days) or **verbal quotation / micro-procurement** (telephone
register) or non-competitive with recorded justification
→ receive quotations → **simple supplier comparison worksheet**
(price, specification compliance, availability/responsiveness, quantity
shortfall, tie, pack conversion — the pantry / minor-equipment sheet)
→ award recommendation (lowest compliant, or justified otherwise)
→ **minute sheet** ("Approval is hereby sought…", regulation 10 and 11
citation, OPR registration line, vote block, vote status table,
transfer line on computed shortfall) — with the **formation letter**
presentation where the request is for an external formation
→ Accounting Officer approval → purchase order with **Standard Terms
and Conditions** → delivery/payment papers → file kept per the
Record-Keeping guideline.
Decision points: funds cover; three-supplier rule; lowest-cost rule;
shortfall/tie/override (asked only when they arise).
Outputs: minute sheet, formation letter, verbal quotation form,
telephone-contact register, comparison worksheet, checklist,
verification certificate, PO terms annexure.

### Module B — FORMAL TENDER / RFP / ITB EVALUATION
Solicitation already issued with pre-determined criteria and scoring
→ Evaluation Committee constituted; **every member signs Conflict of
Interest and Confidentiality declarations** (Appendix I)
→ opening of submissions (record of opening)
→ **Preliminary Examination** — pass/fail compliance, no scoring
→ clarifications (issued/received, logged)
→ **Technical Evaluation** — scoring against the solicitation's
criteria and sub-criteria; minimum technical score gate
→ **Financial / Commercial Evaluation** — price proposals of those
passing the gate; arithmetic verification of every price
→ **Ranking** — normalisation by the pre-determined formula
→ Negotiations with top-ranked (if applicable; minuted)
→ Committee findings and **Recommendation for Award** (amount in
words, VAT INCLUSIVE) → all members sign
→ **PDAC / Accounting Officer review** → notice of decision,
standstill, award (recorded, outside document generation).
Decision points: compliance per submission; score per criterion per
proponent; gate threshold; ranking formula; negotiation.
Output: the **OPR Evaluation Report** exactly per the template, plus
COI/confidentiality forms, compliance checklist appendix, evaluation
matrix appendix, clarification log, negotiation minutes.

### Module A — DISPOSAL OF PUBLIC PROPERTY
Identification of unserviceable / obsolete / surplus property
→ inventory with condition and location → valuation with recorded
basis (e.g. Board of Survey) → **Disposal Committee** recommends a
method per the OPR retention-and-disposal guidelines (transfer, sale by
auction, sale by tender, trade-in, donation, destruction, recycling;
donation/destruction require recorded reasons)
→ approval instrument → execution and evidence → proceeds (if any)
brought to account.
A comparative evaluation enters **only** where the chosen method
requires one (sale by tender / auction offers) — and it compares
**offers received, highest realisation**, never procurement-award
logic.
Outputs: inventory and valuation record, committee minute, approval
instrument — all remaining **PENDING FORMAT AUTHORITY** until the OPR
*Retention of Public Property and Disposal of Personal Property*
guidelines/handbook (or a signed disposal file) is supplied.

## 3. Where the existing code belongs

**Shared deterministic core (serves all three modules, no workflow logic):**
`money.js, words.js, textutil.js, folio.js, casemodel.js,
styleprofile.js, storage.js, documents.js (dispatcher),
verifycase.js (framework), ingest.js, ingestfiles.js, vendor/, css/,
js/app/ shell`.

**Module C (routine):** `compute.js, verify.js (C-checks), verbal.js,
votestatus.js, evaluation.js` (the comparison worksheet **is a routine
working paper**), `docs/minute.js, docs/approval.js,
docs/hybridminute.js, docs/verbalform.js, docs/checklist.js,
docs/certificate.js, docs/hybridcert.js, docs/evalreport.js` (to be
re-labelled a *Supplier Comparison Record*, not an "Evaluation
Report"), plus a new Standard Terms annexure builder.

**Module B (formal):** does not exist yet. New: `formal.js` (committee,
declarations, criteria/scoring, preliminary examination, clarification
log, technical scores, financial verification, ranking formula,
F-series checks) and `docs/formalreport.js` (the OPR template),
`docs/coiforms.js`. May **internally reuse** the exact-arithmetic price
verification of the shared core — engine reuse, never workflow reuse.

**Module A (disposal):** `disposal.js, docs/disposaldocs.js` (already
separate, already bannered).

## 4. What the current build wrongly mixes

1. **Naming/framing:** the current "P3 — Evaluation Committee" builds
   the routine supplier-comparison worksheet and titles its output
   "EVALUATION REPORT". That is not the OPR committee report and could
   be mistaken for it. The worksheet belongs inside Routine; the formal
   report is a different document entirely.
2. **Process levelling:** P3 sits on the start screen as a process type
   parallel to P1/P2, when the pantry and minor-equipment sheets are
   folios *inside* a routine travelling file.
3. **P1 vs P2** are one routine workflow with two presentations
   (internal minute; formation letter + minute), not two process types.
4. **Disposal is offered procurement documents:** the dispatcher gives
   every case, including P4, the procurement-worded "Approvals
   checklist" and "Verification certificate — Procurement case".
   Disposal must have its own verification wording or none until the
   format authority arrives.
5. **No conflict-of-interest / confidentiality instruments** exist —
   mandatory for the formal module.
6. **Standard Terms and Conditions** are not yet produced anywhere —
   they belong to Routine (PO support).
What is *not* mixed: the deterministic core (money, words, folio,
vote balances, checks framework) is genuinely common ground and stays
shared; disposal already keeps its own forms, valuation logic, method
list and D-series checks.

## 5. Proposed corrected structure

Start screen offers **three activities** (module recorded on the case):

```
WHAT ARE YOU DOING TODAY?
[C] Routine / daily procurement        → sub-choice, only when needed:
      presentation: Ministry internal | external formation
      method: written quotations (RFQ) | telephone (verbal/micro) | other
      working papers: items & quotes | full comparison worksheet
[B] Formal tender / RFP / ITB          → Evaluation Committee report
      (committee, declarations, scoring, ranking, OPR report)
[A] Disposal of public property        → inventory, valuation, method,
      committee minute, instrument  [PENDING FORMAT AUTHORITY]
```

- Case model: `module: 'routine' | 'formal-evaluation' | 'disposal'`
  (schema v3, lossless migration: P1/P2/P3 → routine, P4 → disposal).
- Check series ownership: C/E/V/H + G = routine; F-series (new) =
  formal; D + G = disposal. The framework merges only a module's own
  series — no cross-module checks.
- Document menus are module-scoped; no shared document types across
  modules except through the shared core builders each module owns.
- **Output preservation guarantee:** the routine/travelling-file printed
  outputs (minutes, letters, worksheets, certificates) do not change at
  all — screen labels and menu grouping change, documents do not, and
  the existing byte-parity and to-the-cent replay tests continue to
  enforce that.
- Standing rules kept: ask-only-when-the-issue-arises with
  plain-language explanations; every unresolved assumption in
  ASSUMPTIONS.md; nothing claimed without a passing test.

## 6. Unresolved assumptions (carried and new)

1. Disposal formats — pending the OPR *Retention of Public Property and
   Disposal of Personal Property* guidelines/handbook or a signed
   disposal file. Layout unchanged until then (confirmed instruction).
2. Formal report boilerplate follows the OPR template exactly where the
   template is explicit; where the template shows blanks (criteria
   count, gate score, formula), these are case data typed by the
   committee — never invented.
3. Procurement thresholds are entity-specific (reg 4: set by
   guidelines/special guidelines). Treated as data the office enters,
   asked only when a threshold rule is actually engaged.
4. The COI/Confidentiality forms will follow Appendix I of the
   evaluation guideline as supplied.
