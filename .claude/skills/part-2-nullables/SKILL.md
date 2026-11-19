---
name: part-2-nullables
description: >-
  Part 2 workshop sub-lesson. Starts from the test doubles a participant already knows — mocks,
  stubs, spies — and shows how this workshop observes behaviour with a nullable adapter instead,
  with no spy wiring, and why it uses no mocks. Invoked by the part-2-draw-the-box coach (or
  directly) when a participant is tangled on substituting infrastructure — "should I mock the
  bus?", "how do I check the event was published?", "why can't I read the row back?". Part 2 only.
  Teaches the distinction; does not write the test.
---

# Nullables, spies, and why no mocks

This is a **sub-lesson**, not a starting point. The lesson is tool-agnostic and lives in the
generic corpus.

**Entry guard — check before you teach anything here.** This lesson only makes sense once the
participant has drawn their box. If you arrived here cold — the participant has NOT confirmed
they are on Part 2 and has NOT yet drawn a box with the coach — do **not** start on nullables.
Instead load `part-2-draw-the-box`, run its gate ("Are you working on Part 2…?") and draw the
box first; this lesson is something that coach routes *into*, not out of.

Once the box is drawn: **open `part-2/ai-docs/coach/nullables.md` and follow it** — start from the
mocks and spies they already know, then *show* how a nullable gives the same observation with none
of the wiring, then return to `part-2/ai-docs/coach/draw-the-box.md` and finish drawing their box
with them. Both coach files are for you; when the participant should read something, point them at
`part-2/human-docs/` (e.g. `human-docs/explanation/nullables.md`), never at `ai-docs/`. This
lesson teaches the distinction; the test is written back in the draw-the-box coach (by them, or
with you if they ask).
