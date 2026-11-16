# The event model — what actually happens, and why it is the box map

> AI-facing explanation, self-contained. The event model is the picture of what the CodeFreeze
> system *actually does*: every command, every fact, every read model, laid out as beats over time.
> It is not decoration — it is the **map the participant draws boxes on**. Each coloured transition
> is a candidate box, and the three Part 2 flows are three kinds of beat. Teach the participant to
> read it and "draw the box" stops being abstract. The **authoritative, human-facing walkthrough** —
> the legend in prose, Casey's beats one by one, and the Sandi Metz box-drawing worked through on
> them — is Aki's own write-up:
> [`human-docs/explanation/event-modeling.md`](../../human-docs/explanation/event-modeling.md).
> **Send the participant there to read it** (but mind its spoiler note — the back half works a box
> in detail). This file distills what the coach needs. Source pictures:
> [`images/event-model-legend.png`](../../../images/event-model-legend.png) (the vocabulary) and
> [`images/event-model-host.png`](../../../images/event-model-host.png) (Casey the host's day).

## The vocabulary (the legend)

Colour is meaning. Learn these five and you can read any beat:

| Shape | Colour | What it is |
|---|---|---|
| **Screen** | grey | a UI a persona looks at ("Board View, Ideas column") |
| **Command** | blue | an intent — *do-something* (`propose-session`). A request to change the world. |
| **Fact / event** | orange | a business decision that *happened* — *something-happened* (`session-proposed`). Past tense, immutable, logged. |
| **Read model / view** | green ◆ | data projected from facts, shaped for a screen (`board projection`). The ◆ is a read side. |
| **Cog** | ⚙ gear | an automation — work a persona would otherwise do by hand. |

**Lanes** run horizontally, one per [capability](capabilities.md) (A, B, C, E, F…) plus persona
lanes on top. **Time runs left→right.** A capability's lane is its box drawn out over time.

## The three beats — and they are the three Part 2 flows

Reading the legend, every transition in the model is one of three beats. **Each beat is a box**, and
each maps to a flow the workshop teaches:

### 1. Command beat → `HTTP → bus`
A persona acts on a screen → a **command** → a command handler decides → a **fact** lands in the
capability's lane. Arrows go **top→bottom**.

```
Casey (Board View) ──▶ propose-session ──▶ [handler] ──▶ session-proposed   (lane A)
```
→ The box is capability A. Arrow **in** = the command; arrow **out** = the fact. This is a
**component test** (`HTTP → append`). See [`../how-to/write-a-component-test.md`](../how-to/write-a-component-test.md).

### 2. Cog / listen-to-react → `bus → bus`
A fact in one lane triggers a **cog** in another capability's lane, which issues that capability's own
command and lands its own fact. The second capability **listened** to the first's fact — it did not
read its stream.

```
session-proposed ──▶ ⚙ ──▶ note-session-change ──▶ session-change-noted   (lane E, Discovery)
```
→ The box is capability E reacting. Arrow **in** = the upstream fact; arrow **out** = E's own fact.
This is the **bus → bus** reaction (component, or integration at real fidelity).

### 3. View beat / push → `bus → WebSocket`
A fact triggers a **projection** that updates a **read model** (◆), which is pushed to the next
screen. Arrows carry the fact forward into a new vertical slice.

```
session-change-noted ──▶ board projection ◆ ──▶ Board View (next screen)
```
→ The box is the projection + push. Arrow **in** = the fact; arrow **out** = the read-model
write / the frame on the socket. This is the **bus → WebSocket** push.

## Reading Casey's day end-to-end (the host model)

The host model is these beats chained. Follow the colours:

1. Casey on **Board View / Ideas** → `propose-session` → **`session-proposed`** *(A)*.
2. ⚙ cog → `note-session-change` → **`session-change-noted`** *(E)* → **board projection** ◆.
3. Casey drags a card onto a day+time → `schedule-session` → **`session-scheduled`** *(B)*; the
   **`session-view`** composition shows that single session.
4. Another ⚙ → `note-session-change` → **`session-change-noted`** *(E)* → **board projection** ◆.
5. Casey drags it back to ideas → `unschedule-session` → **`session-unscheduled`** *(B)*; cog →
   `session-change-noted` *(E)* → **board projection** → **board (IndexedDB)** ◆.
6. Casey *hosts the session* — **outside the boundary**: no command, no fact. The software stops here.

Notice `week's days` (◆, lane F) feeds the board layout, and the **board** read model is composed and
pushed — the Board View is a **composition** reading several capabilities' read sides, *not* a lane of
its own.

## Why the model is the box map — the four coaching moves

1. **The arrows in the model are the arrows of your box.** "Arrows in / arrows out" (Part 1, the
   [Sandi Metz model](../../../part-1/how-to-test-anything/README.md), one box larger) are literally
   the command/fact coming in and the fact/read-model going out of a lane. The participant does not
   invent the box — they trace it off the model.
2. **The lane boundary is the box boundary.** A component test stops at the capability's *own*
   publish or write. The moment the claim crosses into the next lane — the *real* bus delivering to
   the next cog, or a browser rendering — the box has grown past component. That "where does the box
   stop?" is the crux of [`which-test-is-this-box.md`](which-test-is-this-box.md).
3. **One beat is one box is one test.** When the goal spans several beats ("propose *and* see it on
   the board"), it spans several capabilities — split it by beat and test one at a time
   ([`capabilities.md`](capabilities.md), [`where-to-cut-the-flow.md`](where-to-cut-the-flow.md)).
4. **The "no reading another's stream" rule is why you assert at the edge.** A capability listens to
   a fact or asks a read side — never peeks into a neighbour's internals. So the test asserts the
   **fact at the edge**, not an internal call: *outgoing on your side is incoming on theirs*
   ([`nullables-not-mocks.md`](nullables-not-mocks.md)).

Once the box is traced off the model, classify it with
[`which-test-is-this-box.md`](which-test-is-this-box.md) and pick a fidelity with
[`testing-levels.md`](testing-levels.md).
