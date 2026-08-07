# Review — the uploaded "ProcureFlow — Document-First Procurement Studio"

*Commissioned as an impartial, adversarial comparison against the working
system on this branch, judged only by the project's governing directives:
the Act comes first, approved layouts are preserved, intake must really
work, no placeholders, auditability, and the user at the centre.*

## The verdict, stated plainly

**As a product, it is not better. As a critique of our look and of two
missing conveniences, it is right, and we adopt those.**

The uploaded file is one 546-line page with a genuinely handsome shell —
better-looking than ours — wrapped around an engine that is roughly 2%
of the working system. The comparison is not close on substance, and the
honest way to show that is finding by finding, from its own code.

## What the upload gets right (adopted)

1. **The visual identity is better than ours.** Navy/gold/paper, card
   surfaces, soft shadows, a numbered step rail with a one-line subtitle
   under each step, a clear gold "one main action" per screen. Our chrome
   was utilitarian civil-service grey. *Adopted: the application chrome is
   restyled to this standard. The printed documents do not change by one
   character — the Professional Output Standard bounds beauty with
   compliance, and the parity suites still hold.*
2. **Paste-as-intake.** A plain textarea — "or paste the document text
   here" — is a lower-friction intake path than any file picker: prices
   arrive in email bodies and WhatsApp messages, not always as files.
   *Adopted: the guided papers step and the upload window both accept
   pasted text, fed through the same staging pipeline with the same
   safeguards.*
3. **"Load a worked example."** One click shows a first-time user a
   complete, correct case — the fastest possible answer to "what does
   done look like?" *Adopted, one per module, using the cases the test
   suites already replay to the cent: the boxed-meals verbal quotation
   ($400.00), the OPR formal worked example (88.50% / 83.20%), and the
   OPR disposal case study (TT$70,650.00).*
4. **Plain-word confidence.** "clear match / likely / check carefully"
   reads better than "high / medium / low". *Adopted in the staging
   table.*

## Where the upload fails its own claims (measured, not opined)

Each item below was verified by executing the file's own code.

1. **Two of its three modules do not exist.** The formal card promises
   "committee scoring against published criteria, ranking"; the disposal
   card promises "appraisal, committee, method and statutory limits".
   The code contains **no committee, no criteria, no scores, no
   appraisal, no method, no statutory limit** — choosing a module changes
   exactly three strings in the document header (`docMeta`, line 499) and
   nothing else. Both modules print the *routine items table* under a
   different title, labelled "FOUNDATION DRAFT". That is the placeholder
   the project's standing directive expressly bans, presented with a
   capability claim the code cannot honour.
2. **The document format authority is discarded.** The minute it prints
   is an invented generic layout. The Ministry's four signed sample
   documents, the OPR Disposal Templates (Forms A–H), and the OPR
   evaluation report template — the format authorities this project is
   contractually held to, byte-parity-tested — are absent. "Preserve
   approved layouts" is the user's own directive; the upload starts from
   zero against it.
3. **VAT is dead code.** `vatOn()` exists and the totals honour `it.vat`
   — but no control anywhere can set `vat` to true (verified: every
   assignment is `vat:false`). A VAT-registered quotation cannot be
   entered correctly at all.
4. **The vote check is wrong for the Ministry's books.** It compares the
   total only against *balance of releases* (line 477). Original
   provision and revised allocation are captured and then ignored — the
   Balance of Provision, the base question the Comptroller of Accounts
   framework requires when the two differ, and the funds-cover minute
   line all vanish. Two of its five vote inputs are decoration.
5. **Intake violates "uncertain stays uncertain" three ways** (all
   reproduced by running its code):
   - `toISO("05/06/2026")` → `2026-06-05`. An ambiguous date is silently
     *guessed* as day/month.
   - Any `$` amount found anywhere in prose — a vote balance, a deposit,
     a penalty clause — becomes, if ticked, a **priced line item**
     ("Imported amount — describe me", qty 1). A balance figure of
     $354,784.99 can enter the total of a purchase minute.
   - Supplier names are "applied" into `CASE.manual["supplier_N"]` — a
     store that no screen, no check and no document ever reads. The user
     is told "Applied 3 facts" and one of them went nowhere (verified:
     `manual` is write-only in the file).
6. **Its reference regex cannot read the Ministry's own file numbers.**
   `/\b\d{1,3}\/\d{1,3}\/\d{1,4}\b/` extracts `22/18/7` out of
   `MOD/PROC: 22/18/7:2026` — a wrong value with a "clear match" badge.
7. **Fractional quantities poison the integer-cents engine.** Qty is
   `Number(input)` with only a minimum of 1; qty 2.5 × 45.00 yields
   11 250 cents *silently* (verified). The exact-cents promise in its
   own header is breakable from its own keyboard.
8. **Conflicts are counted, not resolved.** A clash increments a counter
   and shows a toast; there is no per-field conflict state, no Keep
   Manual / Accept Imported, no record of what was refused. Our
   conflict machinery (status per field, resolution actions, audit
   records) has no counterpart.
9. **No DOCX, no PDF, no XLSX, no OCR protocol.** It reads .txt/.csv
   and admits the rest honestly — but the working system ships vendored
   parsers that actually read those formats offline today. Honesty about
   a regression is still a regression.
10. **You cannot see your document until every check passes.** Step 5 is
    hard-gated (line 326). The upload has **no live preview at all** —
    the single strongest feature of the guided rebuild (the document
    growing beside your typing) is absent, and the draft-with-stamp
    route (see your document *while* fixing it) is forbidden.
11. **No folios, no verification certificate, no telephone register, no
    comparison worksheet, no formation letters, no continuation-sheet
    guidance, no sheet numbers, no style profiles, no case history, no
    schema migration — and no tests.** Zero. The working system's 274
    Node tests and six browser smokes exist because the last directive
    but one demanded proof, not claims.

## Rejected ideas, with reasons

- **One screen for all facts** (its Step 3): works only because it asks
  ~12 questions. The real modules ask what the Act asks; put the
  disposal case study on one screen and the wall of fields returns —
  the exact disease the guided rebuild cured.
- **Gating the document behind green checks:** seeing the draft *is how
  you find what is wrong*. We keep the live preview plus the DRAFT — NOT
  CLEARED stamp; the stamp is the gate.
- **Its Money.parse in place of `money.parseStrict`:** it rejects
  malformed figures but silently, with no hint of what is wrong, and it
  strips `TT$`/spaces before judging. Ours explains the refusal.

## The severe critique turned on ourselves (acted on now)

The upload deserves credit for exposing, by contrast, what our system
still lacked. Acted on in this round:

1. Our chrome looked like a database front-end, not a premium product —
   **retheme adopted** (documents untouched).
2. No paste path — **added** to the papers step and the upload window.
3. No worked examples — **added**, one per module, from the dry-run
   fixtures the suites already prove to the cent.
4. Raw jargon confidence labels — **replaced with plain words**.
5. Our step rail lacked the one-line subtitles that make the journey
   legible at a glance — **added**.

## Foundation ruling (unchanged, restated)

One application, three separated modules, guided-first, engine intact.
The upload's own trajectory proves the point: to become compliant it
would have to regrow the engine, the formats, the checks and the tests —
that is, become this system. The right foundation is the one that
already replays the Ministry's signed samples byte-for-byte; what it
needed from the upload was its face and two conveniences, and it now has
them.

---

# Second upload (2,246 bytes) — verdict

The second uploaded `index.html` is a **shell only**. It is 2,246 bytes
and references fourteen external files — `css/app.css`, ten `js/lib/*.js`
engine modules, three vendored parsers and `js/app/app.js` — **none of
which were uploaded**.

Opened in a real browser exactly as delivered (measured, not assumed):

- **15 resources fail to load** (`net::ERR_FILE_NOT_FOUND` × 15).
- `#stepRail` renders `""`. `#pane` renders `""`.
- The page is **blank below the header**. Three footer buttons are wired
  to a script that does not exist.

There is therefore nothing to compare on substance: no engine, no
documents, no checks, no intake, no examples. What can be judged is the
*intent* the shell declares, and it is sound — and it is the architecture
this system already has:

| The shell declares | This system |
|---|---|
| separate `js/lib/*` engine, `js/app/app.js` wiring | already so: `js/lib/` (pure, Node-tested) + `js/app/` (browser wiring) |
| external `css/app.css` | already so |
| vendored mammoth / xlsx / pdf.js, OCR excluded honestly | already so, and the honest OCR message is fixed text under test |
| a live preview pane beside the work | already so, since the guided rebuild |
| a step rail | already so, with completion ticks and subtitles |
| "every figure typed once, everything else computed" | already so, and proven by 274 tests |

**Verdict: not better — it is a blank page.** The one thing it adds is
independent confirmation that the layered architecture already in place
is the right one. Nothing was adopted from it, because there was nothing
to adopt.

## What this round changed instead — the critique turned inward

With nothing to take from the upload, the same severity was applied to
this system's own code. Three real defects were found and fixed:

1. **The activity cards and the document drop zone were `<div>`s** with
   click handlers — invisible to keyboard and screen-reader users. An
   officer working without a mouse could not start a case at all. They
   now carry `role="button"`, `tabindex="0"`, a visible focus ring, and
   activate on Enter and Space. *(Verified by driving the app with the
   keyboard only.)*
2. **Closing the tab with unsaved work lost it silently.** Autosave is
   crash recovery; the `.json` is the record. The system now tracks a
   dirty flag and warns before the page closes.
3. **The dirty flag was subtly wrong twice, and both were fixed at the
   source rather than papered over:** a `change` event fired on blur with
   no value movement re-flagged a just-saved case (now compared before
   and after, and skipped when nothing moved); and the 800 ms keystroke
   autosave debounce fired *after* a save, re-flagging it (the pending
   timer is now flushed when saving). The flag is also raised on the
   keystroke itself, not on the debounce — closing the tab a moment after
   typing still warns.

All three are now locked into `tools/browser-smoke-guided.js` so they
cannot regress.

---

# "Your product is a 117-line shell that opens to a broken page" — tested

That claim was put to this system directly. It was settled by test, not
by argument. `index.html` here is 118 lines, so the reviewer was plainly
reading **this repository's `index.html` on its own, detached from the
66-file package it belongs to.**

Measured on the shipped ZIP, extracted to a clean folder and opened from
`file://` exactly as a tester would:

- **66 files present** — 52 JavaScript, 1 stylesheet, 17 vendored parser
  files.
- **0 missing resources. 0 console errors. 0 page errors.**
- The start screen renders, all three activity cards appear.
- A worked example loads and computes **Four Hundred Dollars ($400.00)**
  in the live preview.
- A Word document downloads: `The_Provision_of_Boxed_Meals_minute.doc`.

**The claim is false of the product and true only of one file removed
from it.** Any application that loads external scripts is a blank page
in isolation; that is what "not a single-file app" means. The reviewer
applied a single-file expectation to a multi-file architecture — the very
architecture the second upload's own shell declares as correct.

## What the claim got right, and what was done

One part of it landed. The end-user ZIP shipped **no finished example
documents** — a tester had to type something before seeing what the
system produces. Fixed: the package now builds an `example-documents/`
folder (routine minute + certificate, formal evaluation report, COI
declarations, disposal Forms A–H), generated by the same engine the app
uses, never hand-made, and `START-HERE.txt` points to it.

## The one usable idea in the second upload

Its header carried **two pills — case identity and verification state**;
this system had only the verification pill, so in the full form view the
open case's identity appeared solely on Case Details. Adopted: the header
now shows `File number · Subject` from every screen, in every view.

Everything else in that 57-line shell was already present here, and the
architecture it declares — pure engine, separate wiring, external
stylesheet, vendored parsers, honest OCR exclusion, live preview, step
rail — is a description of this system.
