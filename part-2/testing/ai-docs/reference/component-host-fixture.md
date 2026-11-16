# Reference — the component-host fixture and the ports

> AI-facing reference, self-contained. The optional `componentHost` fixture (`src/component-host.js`)
> and the port vocabulary every tier test is written in.

## It is NOT a factory that hides a bus

The **test** builds the ports — the inbound `consumer`, the outbound `producer`, the event `store` —
and injects them, exactly as a real host hands them to the module. `componentHost`'s only job is
what a host actually does: subscribe the capability's reaction onto the consumer, and run the outbox
relay (store → producer). The test reads in the vocabulary of the ports it owns.

```js
import { componentHost } from '../../src/component-host.js'

const store = createInMemoryEventStore()
const consumer = RabbitConsumer.createNull({ consumerGroup: CAPABILITY })
const producer = RabbitProducer.createNull()
const { settle, close } = await componentHost({ module: SessionDiscoveryModule, store, consumer, producer })
try {
  await consumer.simulate(aFactFromAnotherCapability)   // a message ARRIVES, the reaction runs
  await settle()                                        // the host's relay drains the outbox
  await createTrackerSpy(fromProducer(producer.trackChanges()))
    .ofChannel('session-change-noted').waitUntilFound(1)
} finally { await close() }
```

## Signature

```js
componentHost({
  module,                                  // the capability's Module class (required)
  store    = createInMemoryEventStore(),
  consumer = RabbitConsumer.createNull({ consumerGroup: 'cfb-session-discovery' }),
  producer = RabbitProducer.createNull(),
  board = null,                            // only for a store-owning materializer (seam D)
  deliveryProducer = null,                 // the producer the materializer announces view-updated on
  clock = () => '2026-11-06T10:00:00+02:00',
}) => { settle, store, deliveryProducer, close }
```

- **`settle()`** pumps the outbox onto the producer until nothing new is published (a fixpoint on
  the producer's published count; a real producer has no recording channel, so one pass runs).
- **`close()`** closes module, consumer and producer.

The module is driven through its **real** `activate({ router: {}, apiServedLocally: false })` with
`{ eventStore, consumer }`. `apiServedLocally: false` keeps HTTP routes and their Postgres pool out
of the way — this fixture is about the bus.

## Standalone vs looped-back ports

Default (standalone) ports **do not loop back** — the producer's output does not reach the consumer,
which is right for a reaction whose **output** you assert. When a test needs the capability to react
to its *own* emitted fact, build consumer and producer on one shared `inMemoryBroker` and drive the
inbound through `broker.simulate`; the fixture wiring is unchanged.

## Same fixture at the integration tier

The integration tier uses this **same fixture, same shape** — the test still builds and owns the
ports. It just builds **real** ones: a Postgres-backed `store`, `RabbitConsumer.of(...)` and
`RabbitProducer.of(...)` on one exchange. Because `simulate` is a nullable affordance, the real tier
**arranges by publishing** the inbound fact through a producer and **asserts with `fromRabbit`**, not
`fromProducer`. `settle()` still pumps the relay — once by hand in the component tier, on a timer in
integration (a real broker delivers asynchronously). The fixture does not change; the ports and the
cadence do.

## The port vocabulary (used with or without the fixture)

| Port | Nullable builder | Real builder | Observe via |
|---|---|---|---|
| event `store` | `createPostgresStore.createNull()` / `createInMemoryEventStore()` | `createPostgresStore({ pool })` | `store.trackChanges()` → `fromStore` |
| inbound `consumer` | `RabbitConsumer.createNull({ consumerGroup })` | `await RabbitConsumer.of({ url, exchange, consumerGroup })` | drive: `consumer.simulate(fact)` |
| outbound `producer` | `RabbitProducer.createNull({ channel?, exchange? })` | `await RabbitProducer.of({ url, exchange })` | `producer.trackChanges()` → `fromProducer` |
| live `channel` | `createLiveChannel()` (real, observed) | same | `channel.trackChanges()` → `fromChannel` |
| shared exchange | `inMemoryBroker()` | real RabbitMQ | `fromBroker` / `fromRabbit` |

- **`createPostgresStore.createNull()`** runs the real store SQL with the DB nulled out — **keeps no
  state**, so you assert the **write** (off `trackChanges()`), never a read-back.
- **`.simulate(fact)`** is a nullable-only shortcut delivering a fact straight to the reaction. Real
  channels have none — publish instead.
- **`.trackChanges()`** attaches an OutputTracker that records from the moment it subscribes — open
  it **before** the act.

## A store-owning materializer (seam D)

`materializeBoard` writes a store and announces `view-updated` on its **own** delivery producer, not
the outbox. Hand `componentHost` a `board` and a `deliveryProducer`; it wires them the way a real
host does, and you read the announcement off that `deliveryProducer` with `fromProducer`. The
delivery **consumer** (the socket push) is left null on purpose — that is a different seam with its
own test.

## See also

- `event-stream-dsl.md` — the spies and sources these ports feed.
- `../how-to/write-a-component-test.md` — the fixture (and no-fixture) shapes in use.
- `../explanation/anatomy-of-a-component-test.md` — why the test owning the ports matters.
