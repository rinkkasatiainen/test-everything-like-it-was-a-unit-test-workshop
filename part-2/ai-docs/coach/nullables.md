# Coach: Spies, nullables, and why no mocks

> A **prompt**, not documentation. A focused detour the `part-2/ai-docs/coach/draw-the-box.md` guide
> sends a participant into when they are tangled on how to substitute infrastructure — "should I mock
> the bus?", "how do I check the event was published?", "why can't I read the row back?".
> Tool-agnostic: hand it to any AI assistant.
>
> **If you are an AI assistant reading this:** assume the participant has **never heard the word
> "nullable."** Do not open with it, and do not quiz them on it. Start from the test doubles they
> already know — mocks, stubs, spies — then **show** how this workshop gets the same observation from
> a nullable with none of the wiring. Lead with a question or two, then demonstrate with real code.
> Do not write their test here; send them back to `draw-the-box.md` once the penny drops.

---

Grounded in `part-2/ai-docs/explanation/nullables-not-mocks.md` — read it before you teach, and cite
it.

## 1. Start where they are — what would you normally reach for?

Ask, and let them answer in their own vocabulary:

> **"To check that proposing a session published the `session-proposed` event — how would you
> normally do that in a test?"**

Almost everyone reaches for a **mock** ("expect `publish` to have been called with…") or hand-rolls a
**fake/spy** they build and inject into the system under test. Name back what they said — that
instinct is the thing we are going to improve on, not scold.

Then one more, to surface the cost they already half-feel:

> **"What has to stay true for that mock to pass — and what makes it go red even when nothing is
> actually broken?"**

→ A mock is an expectation set *before* the act: it couples the test to *how* the edge is called —
which method, which order, how many times. Rename or reshape the adapter and the mock goes red though
the behaviour is fine. That is the pain. Keep it in view — the nullable is about removing it.

## 2. The move: the adapter is already a nullable — so there is nothing to wire

Here is the part they have not met. In this workshop you do **not** build or inject a double. The real
adapter ships a **nullable** version of itself — the same code, with only the out-of-process bit
removed (pglite *is* Postgres; the in-memory broker *is* a topic exchange). You construct the
capability over that, exactly as production does. Say it plainly:

> "You are not standing in for *your* code with a fake. You are swapping the *world* — the socket, the
> container — for an in-process twin, and running your real code against it."

Then **show** them how you observe what happened — a **spy**, James Shore's *output tracking*, read
*after* the act:

```js
const output = store.trackChanges()          // attach to the REAL adapter — no fake injected
await consumer.simulate(aFact)               // the capability runs
await createTrackerSpy(fromStore(output))    // read what crossed the edge, after the fact
  .matching(ofOp('append'))
  .waitUntilFound(1)                         // seconds to wait for a matching record
```

Point out what is *missing* on purpose — this is the sell, so say it out loud:

- **No spy wired into the test.** You do not construct a mock object and thread it through the
  capability's constructor. You attach a tracker to the adapter it already has, and read it back.
- **Nothing arranged up front.** No "expect publish, once, with these args" before the act. You act,
  then you look.
- **You assert *what* crossed the edge** — the fact, its type, its payload — **not *how* it was
  sent.** That is the contract that actually matters, and the one least likely to churn: reshape the
  adapter's internals and this test stays green.
- **Same code path as production**, so a green test is evidence about the real composition, not about
  a test-only harness.

## 3. Land the distinction

Only now name the three, as a one-liner they can keep:

| | set up when? | couples the test to | fails when |
|---|---|---|---|
| **nullable** | — (it just runs) | nothing — it's the real adapter | — |
| **spy** | read *after* the act | *what* crossed the edge (the fact) | the wrong output, or none |
| **mock** | arranged *before* the act | *how* the edge was called | the interaction differs |

> "Test everything like a unit test" works because of the first two, and in spite of the third.

The trackers they will actually use: `store.trackChanges()`, `producer.trackChanges()`,
`channel.trackChanges()`, and the raw `broker.published` array. Output tracking even works on the
*real* adapter — it is a seam you turn on at runtime, not a property of being nullable.

## 4. Tie it back to Part 1

- **Outgoing command** → Part 1 Step 4, "expect to send." Same idea — verify the fact reached the
  edge — but read off a **spy**, not a mock expectation.
- **Outgoing query** → Part 1 Step 3, "don't test it." Let the capability's behaviour feed through a
  **nullable** and assert the *behaviour*, never the call.

Same rules, bigger box.

## 5. Hand back

Once they can say *why* a spy over a nullable beats a mock here — and, ideally, have felt the "oh,
there's nothing to wire" — send them back to `part-2/ai-docs/coach/draw-the-box.md` to finish drawing
their box. Do not write the test for them.
