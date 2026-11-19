# Nullables

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.

If you've written tests before, you've probably reached for a mock or a stub to stand in for a
database or a message bus. This workshop doesn't. It uses **nullables** instead, a technique from
James Shore's *Testing Without Mocks*.

## A nullable is the real adapter, without the process

A nullable is not a fake you write. It is the **real adapter** — the same production code that talks
to Postgres or RabbitMQ — built so it can run with the out-of-process part switched off:

- the event store is a real Postgres (pglite, compiled to WebAssembly and running inside the test
  process) instead of a container;
- the message bus is a real topic exchange that routes messages in memory instead of over a socket.

The capability under test can't tell the difference: its code path is the same whether the bus is a
nullable or a real RabbitMQ. So you test your real code against a stand-in for the world (the network
and the disk) rather than against a stand-in for your own code. A mock replaces your collaborator with
a script you wrote. A nullable replaces only the network and the disk, and leaves your code real.

James Shore puts it this way: nullables "look like test doubles, but they're actually production code
with an off switch." He is also clear that it is a trade-off. The off switch lives in your production
code, and nullables carry costs like any other approach. This workshop takes that trade on purpose.
It's worth knowing it is one.

## Why no mocks

A mock is an expectation you set up *before* you act. You declare that `publish` will be called, once,
with certain arguments, and the test checks that the call happened. That couples the test to *how* the
capability talks to its edge: which method, in what order, how many times. Reshape the adapter and a
pile of mocks turns red even though nothing is broken.

A nullable lets you check the other thing: *what* actually crossed the edge. You read the fact that
was written or published, with its type and payload, after the capability has run. That is the part of
the contract that matters, and the part least likely to change. So a test here never asks whether
`publish` was called. It checks that a `session-proposed` with the right payload was written, read
back off the real adapter.

## How you see what happened: output tracking

Reading back what came out uses another of Shore's patterns, **output tracking**. The adapter records
what it emitted, and the test reads that recording afterwards, with calls like `store.trackChanges()`
and `producer.trackChanges()`. You assert on state, after the fact: nothing is arranged up front, and a
test won't fail just because calls arrived in a different order. Output tracking works on the real
adapter too, not only the nullable, so it isn't a test-only crutch.

The short version, the way this workshop says it:

| | set up when? | couples the test to | fails when |
|---|---|---|---|
| **nullable** | — (it just runs) | nothing; it is the real adapter | — |
| **spy** (output tracking) | read *after* the act | *what* crossed the edge (the fact) | the wrong output, or none |
| **mock** | arranged *before* the act | *how* the edge was called | the interaction differs |

"Test everything like a unit test" works because of the first two, and in spite of the third.

## How this workshop uses them

You rarely build a nullable yourself. The CodeFreeze adapters ship their own:
`RabbitProducer.createNull()`, `createPostgresStore.createNull()`, `createInMemoryEventStore()`, and an
`inMemoryBroker()`. In a test you construct the capability over them, drive one input, and read one
output. For the per-edge specifics (how to build, drive, and spy on each one), see the reference:

- [`../reference/nullables/`](../reference/nullables/README.md) — one page per edge (store, producer,
  consumer, broker, live channel, query ports, real transports).
- [`../how-to/write-a-component-test.md`](../how-to/write-a-component-test.md) — the shape in use.

## Further reading — James Shore

- [Testing With Nullables](https://www.jamesshore.com/v2/projects/nullables): the hub, with
  screencasts, training, and the pattern language.
- [Testing Without Mocks: A Pattern Language](https://www.jamesshore.com/v2/projects/nullables/testing-without-mocks):
  the full write-up, including the Nullable Infrastructure and Output Tracking patterns this page
  leans on.
- [A Light Introduction to Nullables](https://www.jamesshore.com/v2/projects/nullables/a-light-introduction-to-nullables):
  the shortest way in.
