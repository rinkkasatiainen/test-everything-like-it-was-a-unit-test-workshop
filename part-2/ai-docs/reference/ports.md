# Reference — the port vocabulary

> AI-facing reference, self-contained. The ports every tier test is written in — how to build each
> one nullable or real, and how to observe what crossed it. The spies that read these ports live in
> `event-stream-dsl.md`.
>
> **Send the participant to:** [`human-docs/reference/nullables/README.md`](../../human-docs/reference/nullables/README.md) and the page for the edge in question. This file is for the coach.

## The test builds the ports — there is no fixture

A capability talks to the outside through ports: the inbound `consumer`, the outbound `producer`,
the event `store`, the live `channel`. The **test** builds those ports and injects them when it
constructs the module — exactly as a real host does — then enables the module by hand:

```js
const store = createPostgresStore.createNull()
const consumer = RabbitConsumer.createNull({ consumerGroup: CAPABILITY })
const module = new SessionDiscoveryModule({ eventStore: store, consumer, log: false, clock })
await module.activate({ router: {}, apiServedLocally: false })
```

`activate({ router: {}, apiServedLocally: false })` is the real activation path, with the HTTP routes
(and their Postgres pool) kept out of the way so the test is about the bus. A **command** capability
needs `module.register()` first, then `activate({ router, auth })` to register its POST route — see
`../how-to/write-a-component-test.md`. The wiring the test exercises is the wiring production runs:
that is what makes a component test evidence about the real composition, not a test-only harness.

## The port vocabulary

| Port | Nullable builder | Real builder | Observe via |
|---|---|---|---|
| event `store` | `createPostgresStore.createNull()` / `createInMemoryEventStore()` | `createPostgresStore({ pool })` | `store.trackChanges()` → `fromStore` |
| inbound `consumer` | `RabbitConsumer.createNull({ consumerGroup })` | `await RabbitConsumer.of({ url, exchange, consumerGroup })` | drive: `consumer.simulate(fact)` |
| outbound `producer` | `RabbitProducer.createNull({ channel?, exchange? })` | `await RabbitProducer.of({ url, exchange })` | `producer.trackChanges()` → `fromProducer` |
| live `channel` | `createLiveChannel()` (real, observed) | same | `channel.trackChanges()` → `fromChannel` |
| shared exchange | `inMemoryBroker()` | real RabbitMQ | `fromBroker` / `fromRabbit` |

Where each builder is imported from:

```js
import { createPostgresStore } from '@rinkkasatiainen/cfb-event-sourcing-store-postgres'
import { createInMemoryEventStore, inMemoryBroker, createTrackerSpy } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { RabbitConsumer, RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { createLiveChannel, createInMemoryBoard } from '@rinkkasatiainen/cfb-session-discovery-node-js'
```

- **`createPostgresStore.createNull()`** runs the real store SQL with the DB nulled out — **keeps no
  state**, so you assert the **write** (off `trackChanges()`), never a read-back.
- **`createInMemoryEventStore()`** is a contract-tested read-back twin — use it when the behaviour
  **re-reads** the log (a materializer, or reaction idempotency), where an empty read-back would lie.
- **`.simulate(fact)`** is a nullable-only shortcut delivering a fact straight to the reaction. Real
  channels have none — at the integration tier you **publish** the inbound fact instead.
- **`.trackChanges()`** attaches an OutputTracker that records from the moment it subscribes — open
  it **before** the act. (The live channel's tracker exposes `.data()` / `.stop()` rather than
  `.close()`.)

## The integration tier is the same shape, real ports

The integration test builds and owns the ports exactly the same way — it just builds **real** ones: a
Postgres-backed `store` (`createPostgresStore({ pool })`), `RabbitConsumer.of(...)` and
`RabbitProducer.of(...)` on one exchange. Because `simulate` is a nullable affordance, the real tier
**arranges by publishing** the inbound fact and **asserts with `fromRabbit`**, not `fromProducer`.
The relay drains the outbox — once by hand (`relay.relayOnce()`) in the component tier, on a timer in
integration, because a real broker delivers asynchronously. The ports and the cadence change; the
shape does not.

## A store-owning materializer (the materialize seam)

`materializeBoard` writes a store and announces `view-updated` on its **own** delivery producer, not
the outbox. Build the capability with a `board` and a `deliveryBus` whose producer you keep a handle
on, and read the announcement off that producer with `fromProducer`:

```js
const store = createInMemoryEventStore()
const board = createInMemoryBoard({ store })               // the view face of the same store
const deliveryProducer = RabbitProducer.createNull()
const module = new SessionDiscoveryModule({
  eventStore: store, consumer, board,
  deliveryBus: { producer: deliveryProducer, consumer: null, close: async () => {} },
  log: false, clock,
})
await module.activate({ router: {}, apiServedLocally: false })
```

The delivery **consumer** is left null on purpose — the socket push is a different seam with its own
test (`../how-to/write-a-component-test.md`, shape E). Because this reaction re-reads the log, both
the `store` and the `board` are read-back twins backed by the same in-memory store, and each test
drives a **fresh** session id (the shared store remembers across tests).

## See also

- `event-stream-dsl.md` — the spies and sources these ports feed.
- `../how-to/write-a-component-test.md` — the ports in use, all five shapes.
- `../explanation/anatomy-of-a-component-test.md` — why the test owning the ports matters.
