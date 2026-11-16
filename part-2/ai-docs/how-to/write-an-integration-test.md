# How to write an integration test

> AI-facing recipe, self-contained. The same capability, the same flow, over **real Postgres and
> real RabbitMQ**. One capability, not the whole board.

## Before you start

The db stack must be up. From `../host`:

```bash
yarn db:up               # Postgres + RabbitMQ in Docker, waits for the healthcheck
yarn test:integration
```

RabbitMQ management: http://localhost:15672 (`guest`/`guest`).

## It is the component test with real ports

Same shape: the test builds the ports a host would hand the capability, builds the relay, enables
the module by hand. **Only the ports change — they are real now.**

```js
before(async () => {
  pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=event_store,public' })
  const store = createPostgresStore({ pool })                               // real Postgres
  consumer = await RabbitConsumer.of({ url: RABBIT_URL, exchange: EXCHANGE, consumerGroup: CAPABILITY })
  producer = await RabbitProducer.of({ url: RABBIT_URL, exchange: EXCHANGE })
  const relay = createRelay({ store, producer, batchSize: 10 })
  const module = new SessionDiscoveryModule({ eventStore: store, consumer, log: false, clock: fixedClock })
  await module.activate({ router: {}, apiServedLocally: false })
  // the relay drains the outbox on a cadence, because the inbound fact arrives async:
  relayTimer = setInterval(() => { inflight = valueOf(relay.relayOnce()).catch(() => {}) }, 100)
})
```

## Three things the real ports change

**1. Arrange: publish, do not `simulate`.** `consumer.simulate` is a nullable affordance. A real
channel has none, so drive it the way every capability does — publish the inbound fact:

```js
await emit(producer).publish(proposed)
```

**2. Assert: `eventStream` over a real subscription.** A real producer keeps no recording, so
observe the emitted fact off the bus with a `fromRabbit` listener, read with `eventStream` (NOT
`createTrackerSpy`):

```js
await eventStream(listener)
  .ofCapability(CAPABILITY)
  .ofChannel('session-change-noted')
  .withPayload()
  .matchingPayload({ eventId: exactly(eventId), sessionId: exactly(sessionId), title: exactly(title),
                     proposer: exactly(userId), duration: exactly(duration) })
  .waitUntilFound(3) // SECONDS to wait — same call as the component tier (a real broker wants longer)
```

> `waitUntilFound(seconds)` means the **same thing on both engines** — a timeout in seconds, resolving
> on the first match — because `eventStream` and `createTrackerSpy` are the same `createSpy` engine.
> The only difference at this tier is a longer window, because delivery is over a socket. See
> `../reference/event-stream-dsl.md`.

**3. Drain: the relay runs on a timer**, because a real broker delivers asynchronously (the
component test drove one pass by hand).

## The spy is a per-test subscription

Open the `fromRabbit` listener in `beforeEach` (before the act — a real consumer receives only what
is published after it binds, no replay), close it in `afterEach`:

```js
beforeEach(async () => {
  listener = await fromRabbit({ url: RABBIT_URL, exchange: EXCHANGE,
    binding: { capability: CAPABILITY, type: 'session-change-noted' } })
})
afterEach(async () => { await listener?.close() })
after(async () => { clearInterval(relayTimer); await inflight; await close?.(); await pool?.end() })
```

Its queue is exclusive and server-named — private to this connection, deleted on close, so nothing
leaks between runs.

## Build the fact fresh each run

`buildSessionProposedFactWith()` with no overrides randomises the session and stream ids, so each
run drives a fresh session. The reaction is idempotent on the inbound fact's id and the **real store
remembers across runs** — a reused id would be suppressed and nothing emitted. Match your own fact
by its id; never assert the exchange holds exactly one message.

## What this tier proves that component cannot

- the real exchange routes `<capability>.<type>` to the queue you bound (topic wildcards, vhost,
  bindings);
- schema and SQL run on the real Postgres engine;
- producer and consumer speak over a socket (serialization, connection, acks);
- the relay actually drains the store to the bus, end to end.

If a component test is green and the integration test for the same flow is red, the fault is at the
**edge** (binding, routing key, connection), not in the capability's logic. That split is the
diagnostic value of keeping both.

## Negative over a real transport

There is no certain "nothing, ever" on a real bus, and the spy has **no `waitForNone`**. Assert "none
within a window": let a fixed window pass, then read the source buffer directly and assert nothing of
yours arrived (match by your own unique id, never "the exchange is empty").

```js
await new Promise(r => setTimeout(r, 500))
expect(listener.elements().filter(mine)).to.be.empty
```

## See also

- `write-a-component-test.md` — the same flow, nullable, that this mirrors.
- `../reference/event-stream-dsl.md` — `fromRabbit`, `eventStream`, and the shared `waitUntilFound`.
