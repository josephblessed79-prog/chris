# User Guide — Procurement Administration System

You do not need training to use this system. Open it, pick what you are
doing, and it will ask you for what it needs. This guide walks the
common journeys once; after that the screens explain themselves.

## Opening the system

Double-click `index.html` (or open the link IT gave you). Nothing is
installed and nothing you type leaves your computer. Work is saved as a
small `.json` case file that you keep like any other document.

## Starting a case

The Start screen asks **what are you doing today?** and offers three
activities. Pick the one that matches the work in front of you — this
choice sets the whole module: its forms, its questions, its checks, its
documents. The three are kept separate on purpose; none uses another's
rules.

- **Routine / daily procurement.** The everyday travelling file: a unit
  or department buying goods or services, whether by written quotations
  or by telephone (verbal quotation). On Case Details you say whether the
  papers are a **Ministry internal** minute or an **external formation**
  letter + minute (Coast Guard, Defence Force, another agency) — that is
  a presentation choice, not a different activity.
- **Formal tender / RFP / ITB evaluation.** An Evaluation Committee
  reporting on a formal solicitation — declarations, scoring against the
  published criteria, ranking, and the OPR-format Evaluation Report.
- **Disposal of public property.** Disposing of stores or equipment
  under the Act and the Retention & Disposal Regulations — Forms A to E.

You choose *before* entering data. Smaller choices inside an activity
(which working paper, who signs, which method) are asked only where they
come up, each explained on screen in plain words. An old case file saved
by the earlier version still opens: its P1/P2/P3 become routine and P4
becomes disposal, and nothing is lost.

## The golden rules

1. **Type each figure once, exactly as printed on the source document.**
   If the system refuses a figure, it is telling you the figure cannot
   be right as typed (for example `$11,3900.00`). Look at the source
   again and enter what it actually says.
2. **The system does the arithmetic.** You never total anything, never
   compute VAT, never write an amount in words, never number a folio.
   If a total looks wrong, a typed figure is wrong — fix the figure.
3. **Red means stop.** The Verification tab lists every check. While
   any check fails, every document prints with a red **DRAFT — NOT
   CLEARED** stamp. Click **Fix →** beside a failure to go to the field
   that needs attention.
4. **Save your case.** The bottom bar saves a `.json` file — that file
   is your work. Autosave exists only to recover from a crash.

## Journey 1 — boxed meals by telephone (routine, verbal quotation)

1. Start → **Routine / daily procurement**. On Case Details leave the
   presentation on **Ministry internal**, and enter the file number,
   date, subject and who signs the minute.
2. Working Papers → choose **Micro-procurement by verbal quotation**. State the
   purpose as it should read in a sentence. Add **every** company you
   telephoned — including the ones that gave no price — with the amount
   each quoted. Select the recommended company (normally the lowest; if
   not the lowest, the system will demand your written reason).
3. Enter the schedule: one line per delivery date with quantity and
   rate. The total, and the total in words, are computed as you type.
4. Vote & Funding: enter Head / Sub-Head / Item / Sub-Item and the five
   figures from the vote book. The three balances are computed. If the
   money does not cover the total, the minute automatically includes the
   line asking the Director of Finance to address the transfer.
   If your Original Provision and Revised Allocation are different
   figures, the screen will explain the difference in plain terms and ask
   which one the Balance of Provision should be measured against — the
   Revised Allocation is the standard choice (it is how the Ministry of
   Finance vote book controls spending), and whichever you pick is
   recorded on the case and printed on the verification certificate.
   When the two figures are the same, you are not asked: the choice
   would change nothing.
5. Folios: list the papers in the file in order. Tag the verbal
   quotation form line `verbal-form` and the quotation line
   `quote:` followed by the company name exactly — the minute then cites
   those folios by number, and if you later change the starting folio
   number every reference renumbers itself.
6. Verification: make everything green. Documents: print or download
   the minute, the verbal quotation form, the telephone register and the
   verification certificate.

## Journey 2 — a supplier comparison (routine, comparison worksheet)

This is the routine travelling-file working paper for comparing many
suppliers across many items — **not** the formal Evaluation Committee
report (that is a separate activity, below).

1. Start → **Routine / daily procurement**. Working Papers → choose
   **Supplier comparison worksheet**. Enter the suppliers (mark those
   that did not quote) and the items with their quantities.
2. In the price grid, enter each supplier's unit price for each item.
   Tick **V** where VAT applies to that cell. If a supplier priced by
   the case ("$320.00 per case of 24"), put 24 in **Pack size** — the
   system works out how many cases cover the requirement and compares
   prices exactly, per unit. If a supplier quoted for a different
   quantity (96 instead of 100), put it in **Qty quoted**.
3. The lowest compliant quotation per item is marked automatically.
   To choose differently, record the committee's selection — the system
   will insist on a written justification and will show the override on
   the worksheet, in the report and on the certificate.
   You are only asked about special situations when they actually occur
   in your evaluation, and each one is explained on screen in plain
   language when it appears: a **price tie** (two suppliers equal at the
   lowest price — the committee records its pick and a short note; the
   total does not change, only who is recommended), a **quantity
   shortfall** (a supplier offered less than you asked for — not
   recommended automatically; choosing it anyway needs a written
   reason), and a quotation **not to specification** (excluded — a
   cheaper wrong item is not a saving). No tie, no question; no
   shortfall, no question.
4. The award tables, the Breakdown of Price per Company and the totals
   are computed. When the comparison is adopted, use **Adopt into…** —
   the internal minute or the formation approval is built from the same
   figures without retyping anything.

## Journey 3 — a formation approval (routine, external formation)

As Journey 1, but on Case Details set the presentation to **External
formation**: the formation-letter fields appear. Use item cards instead
of the telephone form — one card per item, one row per supplier under it,
tick **Recommend** on the winning row. The formation letter and the
Ministry minute are produced together, from the same data, and cannot
disagree.

## Journey 4 — a formal evaluation (tender / RFP / ITB)

1. Start → **Formal tender / RFP / ITB evaluation**. On Working Papers
   enter the solicitation title and number, then the **committee** — and
   tick the box for each member who has signed the Conflict of Interest &
   Confidentiality declaration. A member who has not signed is a hard
   failure; print the declaration forms from the Documents tab, one per
   member, for signature.
2. Enter the **criteria** and their maximum points from the solicitation,
   the **minimum technical score** (the gate), and the **technical and
   financial weights** (whole percentages that must add up to 100). The
   maximum technical score is computed for you.
3. Enter each **proponent** and mark it compliant or not at the
   preliminary examination (a rejection needs a reason). For every
   compliant proponent, score each criterion — the running total and
   whether it clears the gate are shown live.
4. For the proponents that clear the gate, enter the **verified price**
   (VAT inclusive) and note the arithmetic check. The system computes the
   **ranking** — technical and financial normalised by your weights — and
   shows the top-ranked firm.
5. Record the **recommendation** (the top-ranked, or another with a
   written reason) and the PDAC / Accounting Officer review. The
   Documents tab produces the OPR Evaluation Report — with the
   recommendation stated in words, VAT inclusive — and the declaration
   forms.

## Uploading a document (any module)

On the Import / Upload screen you upload a document and first choose, in
plain words, **how the system should use it**:

- **A — information only.** Read the facts inside and help fill the
  fields. The official form does not change.
- **B — preferred layout.** Let the document guide the look and order —
  but only where the official form allows. If it would break the official
  form, the official form wins and the system tells you.
- **C — both.** Use the facts and the look, with the same safety rule.

The system reads a Word (.docx), text-PDF, Excel or CSV file and lists
what it found — suppliers, dates, figures, item lines — each with the
snippet it came from and how confident to be. **Nothing enters your case
until you accept it**, and figures are accepted one by one, never in
bulk. Anything the system is unsure about is held for your review, not
guessed. A figure the parser rejected cannot be accepted until you edit
it to what the source really says. Scanned or image-only PDFs need OCR,
which only works when IT serves the system over the intranet; the screen
tells you plainly what each file type supports.

If you chose a layout option, the system shows what structure it found,
keeps the official form in full, and — where it is safe — offers the
**Enhanced professional layout** (cleaner spacing and presentation). It
never removes required content or changes a mandated form. Any clash is
explained in plain language, and **you confirm before anything is
applied.** Every upload is recorded on the case (which document, how it
was used, what changed) so there is a clear trail. You can also set the
Approved or Enhanced layout directly on Case Details.

Whatever route a figure took into the case, the verification
certificate still requires a person to compare it against the folio
before the pack is carried for signature.

## Continuation sheets (printing long documents)

When a table is longer than a page, its headings repeat automatically on
the next page — nothing to do. For the minute sheet itself, the house
style carries "Minute (1) Continues…" and a fresh header (Sheet No 1b,
2a…) at each page break. Where a page break falls depends on Word at
print time, so this is a quick Word step, done once after downloading:

1. Open the downloaded `.doc` in Word and look where the pages break.
2. At the top of each continuation page, use **Insert → Header** (or
   type at the top of the page) to add the same header line — File No,
   and the next sheet number — and add "Minute (1) Continues…" at the
   foot of the page before it, exactly as the office has always done.
3. Change nothing else; the figures and text are already final.

## Starting folio and sheet numbers

If your physical file does not begin at folio 1, set the starting folio
number on Case Details — every folio reference in every document
renumbers itself. When you do that, the screen will ask one question:
should the **sheet numbers** follow the same starting number, or stay as
typed? It explains the difference in plain terms; whichever you choose
is recorded on the case and shown in the verification checks, and it
changes only the Sheet No printed at the top of the minute. If your
starting folio is 1, you are not asked.

## The verification certificate

Print it last. Part A is the automated checks. Part B lists every
figure with an empty folio box and an initial box: the checker confirms
each figure against the paper file. The computer cannot read the paper —
this manual check is deliberate and mandatory.

## Disposal of public property (Forms A–E)

1. Start → **Disposal of public property**. On Working Papers enter the
   request details (Form A), the **Disposal Committee** (the Act requires
   not fewer than three officers) and, where they review the file, the
   PDAC.
2. For each item add a card: description, quantity, condition, and — if
   it has a net book value — the **Total NBV** across the whole quantity.
   The system computes the unit NBV, 20% of NBV and the appraised value
   less 20%, exactly as the OPR worked example does. Mark whether the
   item is **saleable**: if it is, enter the committee's sale price and
   the expected returns are computed; if it is not (to be recycled,
   destroyed or donated), mark it N/A. Choose the **method** of disposal;
   a gift, donation or destruction needs a written reason.
3. The system watches the statutory limits and explains them in plain
   words only when they apply: a public sale or auction worth more than
   TT$100,000 must be advertised in two newspapers and on the website; a
   sale to employees needs prior PDAC approval; the Accounting Officer
   has fourteen days to decide; the OPR must be notified within six weeks
   of completion.
4. Fill the strategy (Form D) and the approvals and dates (Form E) as the
   disposal progresses. After the disposal is carried out, complete the
   summary (Form F); use Form G for a transfer or donation, and Form H if
   the Accounting Officer rejects the strategy. The Documents tab produces
   all of Forms A to H, each citing its authority, plus an optional
   Appraisal Catalogue that shows how each appraised value was worked out.
   (Only real-property disposals are not yet built — the forms say so.)
