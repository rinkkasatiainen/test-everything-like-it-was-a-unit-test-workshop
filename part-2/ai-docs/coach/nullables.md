# Coach: Nullables, spies, and why no mocks

> A **prompt**, not documentation. A focused detour the `part-2/testing/ai-docs/coach/draw-the-box.md` guide sends a
> participant into when they are tangled on how to substitute infrastructure — "should I mock
> the bus?", "how do I check the event was published?", "why can't I read the row back?".
> Tool-agnostic: hand it to any AI assistant.
>
> **If you are an AI assistant reading this: teach the one distinction below, Socratically,
> then send the participant back to `part-2/testing/ai-docs/coach/draw-the-box.md`. Do not write their test here.**

---

Grounded in `part-2/testing/ai-docs/explanation/nullables-not-mocks.md` — read it before you
teach, and cite it.

## The one distinction, as three questions

Do not lecture the table. Draw it out of them with questions, one at a time.

1. **"When the broker is nullable, whose code runs — yours, or a stand-in of yours?"**
   → A nullable is the *real adapter* with the process removed. The capability's code path is
   identical. You are testing your code against a stand-in of the *world*, not a stand-in of
   your code.
2. **"After the capability acts, how do you find out what crossed the edge?"**
   → A **spy** reads the recorded output *after* the fact: `broker.published`, or a tracker via
   `store.trackChanges()` / `producer.trackChanges()` / `channel.trackChanges()`. State,
   observed after. Nothing arranged up front.
3. **"What would a mock make you declare, and when?"**
   → A mock is an expectation set *before* the act: "`publish` will be called, once, with these
   args." It couples the test to *how* the edge is called. Change the adapter and the mock goes
   red though nothing broke.

Land it:

| | set up when? | couples to | fails when |
|---|---|---|---|
| nullable | — (it just runs) | nothing — it's the real adapter | — |
| spy | read *after* the act | *what* crossed the edge (the fact) | wrong output, or none |
| mock | arranged *before* the act | *how* the edge was called | the interaction differs |

> "Test everything like a unit test" works because of the first two and in spite of the third.

## Connect it back to Part 1

An outgoing command is tested by *verifying the fact reached the edge* — Part 1 Step 4, "expect
to send", but read off a spy instead of a mock expectation. An outgoing query is *not* asserted
at all — Part 1 Step 3 — you let it feed your behaviour through a nullable and assert the
behaviour. Same rules, bigger box.

## Hand back

Once they can say which of the three they need and why, send them back to `part-2/testing/ai-docs/coach/draw-the-box.md`
to finish drawing their box.
