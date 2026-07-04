# User Guide — Procurement Administration System

You do not need training to use this system. Open it, pick what you are
doing, and it will ask you for what it needs. This guide walks the
common journeys once; after that the screens explain themselves.

## Opening the system

Double-click `index.html` (or open the link IT gave you). Nothing is
installed and nothing you type leaves your computer. Work is saved as a
small `.json` case file that you keep like any other document.

## Starting a case

The Start screen offers four pathways. Pick the one that matches the
work in front of you:

- **P1 — Ministry internal procurement.** A unit or department of the
  Ministry buying goods or services, including small purchases done by
  telephone (verbal quotation).
- **P2 — Procurement for an external formation.** You are preparing the
  approval letter for the Coast Guard, Defence Force or another agency,
  plus the Ministry minute.
- **P3 — Evaluation Committee.** You are comparing quotations across
  many items and suppliers.
- **P4 — Disposal Committee.** You are disposing of public property.

Wrong pick? Nothing is lost — the pathway can be changed on Case
Details and everything you typed carries over.

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

## Journey 1 — boxed meals by telephone (P1, verbal quotation)

1. Start → **P1**. On Case Details enter the file number, date, subject
   and who signs the minute.
2. Working Papers → keep **verbal quotation** selected. State the
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
5. Folios: list the papers in the file in order. Tag the verbal
   quotation form line `verbal-form` and the quotation line
   `quote:` followed by the company name exactly — the minute then cites
   those folios by number, and if you later change the starting folio
   number every reference renumbers itself.
6. Verification: make everything green. Documents: print or download
   the minute, the verbal quotation form, the telephone register and the
   verification certificate.

## Journey 2 — an evaluation (P3)

1. Start → **P3**. Enter the suppliers (mark those that did not quote)
   and the items with their quantities.
2. In the price grid, enter each supplier's unit price for each item.
   Tick **V** where VAT applies to that cell. If a supplier priced by
   the case ("$320.00 per case of 24"), put 24 in **Pack size** — the
   system works out how many cases cover the requirement and compares
   prices exactly, per unit. If a supplier quoted for a different
   quantity (96 instead of 100), put it in **Qty quoted**.
3. The lowest compliant quotation per item is marked automatically.
   To choose differently, record the committee's selection — the system
   will insist on a written justification and will show the override on
   the worksheet, in the report and on the certificate. A price tie asks
   you to record the pick.
4. The award tables, the Breakdown of Price per Company and the totals
   are computed. When the evaluation is adopted, use **Carry result** —
   the approval minute or formation letter is built from the same
   figures without retyping anything.

## Journey 3 — a formation approval (P2)

As Journey 1, but with item cards instead of the telephone form: one
card per item, one row per supplier under it, tick **Recommend** on the
winning row. The formation letter and the Ministry minute are produced
together, from the same data, and cannot disagree.

## Importing documents (any pathway)

Import Documents reads a PDF, Word, Excel or CSV file and lists what it
found — suppliers, dates, figures, item lines — each with the snippet it
came from and a plain note about how confident to be. **Nothing enters
your case until you accept it**, and figures must be accepted one by
one, never in bulk. A figure the parser rejected cannot be accepted at
all until you edit it to what the source really says. Scanned documents
need OCR, which only works when IT serves the system over the intranet;
the screen tells you plainly if it is unavailable — and OCR output is
error-prone, so check every character.

Whatever route a figure took into the case, the verification
certificate still requires a person to compare it against the folio
before the pack is carried for signature.

## The verification certificate

Print it last. Part A is the automated checks. Part B lists every
figure with an empty folio box and an initial box: the checker confirms
each figure against the paper file. The computer cannot read the paper —
this manual check is deliberate and mandatory.

## Disposal (P4)

Enter the committee, the property, each item's condition, valuation
(with its basis — a figure without a basis fails verification) and the
recommended method. Destruction and donation require a written reason.
The documents currently carry a banner saying the layouts await a sample
disposal file — that is expected until one is provided.
