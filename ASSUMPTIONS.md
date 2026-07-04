# ASSUMPTIONS — decisions taken without explicit format authority

The signed samples in `samples/source/` are the format authority. Where
the samples and the specification disagreed, the samples won. Where the
samples were silent, contradictory or arithmetically wrong, the
decisions below were taken — each is deliberate, tested, and open to
reversal on instruction. **Questions needing an answer are marked ➤.**

## 1. Computed words replace hand-written idioms

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

## 3. The vote balances are computed

Both sample vote-status tables obey, to the cent:
- Balance of Releases = Releases − Expenditure − Commitment
- Balance of Provision = Revised Allocation − Expenditure
- Uncommitted Balance = Balance of Provision − Commitment

So the system computes the three balances from the five typed figures.
➤ Both samples have Original Provision = Revised Allocation, so it is
not provable which of the two governs Balance of Provision. **Revised
Allocation** is used. Confirm.

## 4. Evaluation award rules inferred from the pantry sheet

- **Quantity shortfall excludes a quote from the automatic
  recommendation** (Ovaltine: Beyond quoted 48 of 50 packs at a lower
  unit price and did not win). Selecting a shortfall quote is an
  override and demands a justification. ➤ Confirm this rule.
- **Specification non-compliance excludes** (Granola: boxes of 6 against
  a requirement of boxes of 12; the dearer compliant quote won).
- **A price tie requires a recorded committee selection** (Digestive
  Biscuits, $2.50 = $2.50, went to Beyond). The selection is marked
  "tied lowest" on the worksheet; a note of the basis is expected
  (warned if absent, not failed, since both prices are the lowest).
  ➤ Confirm.

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

## 6. Continuation sheets

The samples hard-type "Minute (1) Continues…" and fresh headers (Sheet
No 1b, 2a) at each page break. Page breaks depend on Word's pagination
at print time, which a generator cannot know. The generated minute is a
single flowing document; the sheet number field prints once. ➤ If
continuation headers are required, the practical route is a Word page
header — say the word and it will be documented in the user guide; the
engine cannot honestly compute page breaks.

## 7. OPR line uses the collective "are"

Both samples: "…Ate6Ate Savor City Caterers Ltd **are** registered…" —
even for a single company. Followed.

## 8. The verbal-quotation sample names only the winner

The narrative says three companies were telephoned but names one. The
system requires every contact recorded (the register exists to evidence
them); the dry run uses clearly-marked illustrative names for the two
unnamed companies. Hardening, not deviation.

## 9. P4 disposal is a scaffold

No sample disposal file was provided. Layouts follow the Act's disposal
provisions and the house minute style; every P4 document carries a
visible **SCAFFOLD — AWAITING FORMAT AUTHORITY** banner and verification
carries a standing caution. ➤ Provide a signed disposal file to confirm
the formats.

## 10. Miscellaneous

- The folio register's wide gaps ("Folios  1   to   6    refers,") are
  reproduced; in the hand-typed originals they existed for manual
  amendment — here the numbers are computed, so the gaps are cosmetic.
- Sheet numbering (1a, 1b…) stays a typed field; only folio numbers are
  computed. ➤ Confirm the starting-folio requirement does not extend to
  sheet numbers.
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
