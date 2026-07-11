# Adversarial critique of the product as built — and the decisions that follow

Date: July 2026. Commissioned by the owner after testing the package.
The brief: criticise severely, user-first, then rebuild on the right
foundation. This document is the critique and the record of the
decisions. It is deliberately unkind to the work so far.

## The verdict in one paragraph

The engine is right and the interface is wrong. Everything underneath —
exact integer-cents arithmetic, words-from-figures, the check framework,
the OPR-faithful documents, the three-module separation, the migration
guarantees — is solid, tested and worth keeping. But the screens were
organised around the **data model and the statute**, not around **a
person with a folder of papers who needs to produce a minute by lunch**.
The result is technically correct and practically exhausting.

## The specific failures

1. **The wall of fields.** The disposal screen presents roughly a
   hundred inputs in a dozen fieldsets on one tab. The formal screen is
   similar. Nobody's first hour survives that. A clerk's real work is
   sequential — request, papers, people, property, money, approval — and
   the screen should be too. *Verdict: forms mirror the JSON, not the
   journey.*

2. **Tabs named for the architecture, not the task.** "Case Details /
   Working Papers / Vote & Funding / Folios / Verification / Documents"
   is the developer's decomposition. A first-time user does not know
   what a folio register is, why "Working Papers" differs from "Case
   Details", or that the thing they actually want — the printed minute —
   is hiding behind the seventh tab. *Verdict: the output is the point,
   and it was put last.*

3. **Documents-in, bolted on.** The user starts with documents in hand —
   quotations, a requisition, an inventory. The natural first gesture is
   "here are my papers, read them". Instead, intake is a modal behind a
   header button, opening with three abstract A/B/C radio choices, a
   support-matrix lecture, a jargon staging table ("candidates",
   "canonical", "confidence"), a second Apply step, then badges and
   hover-triangles. Six concepts before any value. The layout modes (B/C)
   — an edge case — got equal billing with the everyday case. *Verdict:
   the most valuable accelerant in the system was made the most
   ceremonious.*

4. **No guidance through emptiness.** Every screen renders empty tables
   and "+ Add" buttons. The system knows what a routine case needs; it
   should ask for it, one thing at a time, with the next question
   following from the last answer.

5. **Verification as a wall of codes.** "D4.1b FAIL" is meaningless to a
   clerk. The check engine is excellent; its presentation is an audit
   log, not help. Failures should read as plain sentences with a button
   that takes you to the fix.

6. **Jargon and over-explanation at once.** "Pathway", "presentation",
   "output profile", "staging", "folio start", "hybrid minute" — and,
   where plain language was attempted, paragraphs of it. Long hints are
   also a failure mode: the screen should need less explaining, not
   explain more.

7. **No live output.** The user types blind across seven tabs and only
   later discovers what the minute looks like. The single most
   motivating, most error-catching element — watching the actual
   document assemble as you answer — was absent.

8. **Hover-only conflict controls,** wide unbreakable tables, labels a
   sentence long, and a start screen that lectures before it helps.

## The foundational decisions

**One application or several?** Considered seriously: three separate
apps (one per module) would make each simpler, but every split copy of
the shared core (money, words, checks, storage, intake) must then be
maintained three times, and multi-page HTML from `file://` loses
in-memory state between pages, forcing save/load round-trips mid-work.
The module isolation the Act demands is already enforced in the model
and menus. **Decision: one application, three fully separated
workspaces — but each workspace rebuilt as a guided journey.**

**Rebuild or re-skin?** The 249 tests, byte-parity guarantees and OPR
formats live in `js/lib/` and are untouched by any of the criticism
above. Throwing them away to rewrite from scratch would be vanity, not
judgement. **Decision: keep the engine; replace the interaction layer.**

**The new interaction model — Guided Mode (the default):**

- Every module is a **step-by-step journey**: one plain question per
  step ("What is this purchase?", "Who did you ask for prices?", "What
  money pays for it?"), a progress rail showing where you are and what
  is left, Next/Back, and nothing else on screen.
- **Documents first.** An early step in every journey is a drop zone:
  "Put your quotations or lists here and the system reads them." What it
  finds appears as a simple tick-list — ticked items go straight into
  the case; amounts must be ticked one by one (the statutory safeguard
  survives, the ceremony does not).
- **The document is always on screen.** A live preview of the actual
  output (minute, evaluation report, Form A…) sits beside the questions
  and re-assembles as you type. The user watches the product form; errors
  become visible the moment they are made.
- **Checks become sentences.** The final step lists anything missing in
  plain words with a "Go" button straight to the step that fixes it.
- **The full form view survives** as the expert mode, one click away,
  unchanged — it is the power-user surface and the regression-tested
  surface. Guided Mode writes to exactly the same case file; the two
  views are interchangeable mid-case.
- **A/B/C intake stays real but re-housed.** Information-only is the
  default everywhere; the layout options remain in the Upload window for
  those who want them, not in everyone's path.

**What must never change under any redesign:** the deterministic core;
the approved printed layouts (byte-parity tests); the official OPR
structures; every figure typed or ticked by a person; the audit trail.
Beauty is bounded by compliance — that rule stands.
