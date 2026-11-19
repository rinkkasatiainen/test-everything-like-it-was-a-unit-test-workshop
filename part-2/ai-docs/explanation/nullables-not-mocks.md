# Nullables, spies and mocks — the hinge

> AI-facing explanation. Self-contained: everything an assistant needs to coach this point
> without reading the rest of the repo. This is the condensed, coach-ready cut.
>
> **Send the participant to:** [`human-docs/explanation/nullables.md`](../../human-docs/explanation/nullables.md). This file is for the coach.

Three words get used as if they were the same thing. They are not, and the difference decides
whether a Part 2 test reads like a unit test or like a cage of expectations.

## Nullable — infrastructure that runs, without the process

A **nullable** is the real adapter, built so it needs nothing outside the process.

- The pglite store *is* Postgres — real SQL, real schema, `gen_random_uuid()` — in-process
  instead of a container.
- The in-memory broker *is* a topic exchange — real `*`/`#` routing, a publish confirmed
  independently of delivery, fan-out to bound queues — holding messages in a `Map` instead of
  over a socket.

The capability does not know. Its code path is identical whether the bus is nullable or real
RabbitMQ. That is what makes a component test trustworthy: **you test your code against a
stand-in of the *world*, not a stand-in of your code.** The CodeFreeze adapters ship their own
nullable — `RabbitProducer.createNull()`, `RabbitConsumer.createNull()`,
`createInMemoryEventStore()`, `createPostgresStore.createNull()`. Participants *use* these; they
do not build them.

## Spy — reading back what crossed the edge

A **spy** (James Shore: *output tracking*) is how a nullable lets you observe its outputs. It is
a *state* assertion made *after* the act. You let the capability run, then look at what came out.

```js
output = store.trackChanges()        // attach BEFORE the act — it records from subscribe
await consumer.simulate(aFact)       // the reaction runs
await createTrackerSpy(fromStore(output))
  .matching(ofOp('append'))
  .waitUntilFound(1)                 // seconds: wait up to 1s for ≥1 matching record
```

Nothing is pre-arranged; nothing fails because a call did or did not happen in some order. The
trackers: `store.trackChanges()`, `producer.trackChanges()`, `channel.trackChanges()`, and the
raw `broker.published` array. Output tracking even works on the *real* adapter — it is a seam you
turn on at runtime, not a property of being nullable.

## Mock — an expectation set before the act

A **mock** declares, up front, that a method *will* be called, with these args, this many times,
and fails on the interaction itself.

```js
// NOT how we test here
const bus = sinon.mock()
bus.expects('publish').once().withArgs(/* ... */)
// ... act ...
bus.verify()
```

There are **no mocks in this folder**, deliberately. A mock couples the test to *how* the
capability talks to its edge — which method, in which order. Change the adapter's shape and a
hundred mocks go red though nothing is broken. A spy couples only to *what* reached the edge —
the fact, its type, its payload — the contract that actually matters and the one least likely to
churn.

## The one-line version

| | set up when? | couples the test to | fails when |
|---|---|---|---|
| **nullable** | — (it just runs) | nothing — it's the real adapter | — |
| **spy** | read *after* the act | *what* crossed the edge (the fact) | the wrong output, or none |
| **mock** | arranged *before* the act | *how* the edge was called | the interaction differs |

"Test everything like a unit test" works because of the first two and in spite of the third.

## Why this is just Part 1, one box larger

- **Outgoing command** → Part 1 Step 4, "expect to send." Here you verify the fact reached the
  edge by reading a **spy**, not by setting a mock expectation.
- **Outgoing query** → Part 1 Step 3, "don't test it." Here you feed the capability's behaviour
  through a **nullable** and assert the behaviour, never the call.

Same rules. Bigger box.
