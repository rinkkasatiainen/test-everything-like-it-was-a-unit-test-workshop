# How to write an integration test

> AI-facing recipe, self-contained. The same capability, the same flow, over **real Postgres and
> real RabbitMQ**. One capability, not the whole board.
>
> **Send the participant to:** [`human-docs/how-to/write-an-integration-test.md`](../../human-docs/how-to/write-an-integration-test.md) (setup to paste, the bus → WebSocket variant, the rules). This file is for the coach.

## Before you start

From `part-2/`:

```bash
npm run db:up              # Postgres (localhost:55432) + RabbitMQ (localhost:5672) in Docker, waits healthy
npm run test:integration   # mocha 'test/integration/**/*.test.js'
```

RabbitMQ management UI: http://localhost:15672 (`guest`/`guest`). `npm run db:reset` wipes and
re-seeds. Mocha's global timeout is 10 s (`.mocharc.json`).

Worked answers (answer key): `test/integration/discovery-bus-to-bus.integration.test.js` (bus → bus)
and `board-bus-to-websocket.integration.test.js` (bus → WebSocket). HTTP → bus
(`proposal-http-to-bus`) is still a todo list there — there is no worked answer.

## It is the component test with real ports

Same composition; only the ports change:

| Port | Component | Integration |
|---|---|---|
| store | `createPostgresStore.createNull()` | `createPostgresStore({ pool })`, `pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=event_store,public' })` |
| bus in | nullable consumer + `simulate` | `RabbitConsumer.of({ url, exchange, consumerGroup })` |
| bus out | nullable producer + `trackChanges` | `RabbitProducer.of({ url, exchange })` |
| relay | one pass by hand | `setInterval(() => relay.relayOnce(), 100)`, awaited in teardown |
| spy | `createTrackerSpy(fromX(tracker))` | `eventStream(await fromRabbit(...))` / `eventStream(await fromWebSocket(url))` |

```js
before(async () => {
  pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=event_store,public' })
  const store = createPostgresStore({ pool })
  consumer = await RabbitConsumer.of({ url: RABBIT_URL, exchange: EXCHANGE, consumerGroup: CONSUMER_GROUP })
  producer = await RabbitProducer.of({ url: RABBIT_URL, exchange: EXCHANGE })
  const relay = createRelay({ store, producer, batchSize: 10 })
  const module = new SessionDiscoveryModule({ eventStore: store, consumer, log: false, clock: fixedClock })
  await module.activate({ router: {}, apiServedLocally: false })
  inflight = Promise.resolve()
  relayTimer = setInterval(() => { inflight = valueOf(relay.relayOnce()).catch(() => {}) }, 100)
})
```

Imports: `pg`, `@rinkkasatiainen/cfb-event-sourcing-store-postgres`, `-bus-rabbitmq`, `-relay`, the
capability's `-node-js` module, the provider's `-contracts` builder, and `../../src/dsl/index.js`
(`eventStream`, `fromRabbit`, `fromWebSocket`) + `../../src/dsl/exactly.js`.

## Two traps the real broker sets (both literal)

1. **Own exchange.** `EXCHANGE = process.env.CFB_WORKSHOP_EXCHANGE ?? 'cfb-workshop-events'` — never the
   host's `CFB_EXCHANGE`, so a running host's traffic and the test's do not mix.
2. **Own consumer group.** A Rabbit queue is named by its **group**, not its exchange. With
   `consumerGroup: 'cfb-session-discovery'` the test shares a running host's queue; the broker
   round-robins the test's facts to the host and the test **starves** (red, nothing wrong with the
   code). Use `CONSUMER_GROUP = 'cfb-session-discovery-integration-test'`.

## Three things the real ports change

**1. Arrange: publish, do not `simulate`.** `simulate` is nullable-only. Put the inbound fact on the
bus like another capability would: `await producer.publish(proposed)`.

**2. Assert: `eventStream` over a per-test subscription**, opened in `beforeEach` (no replay for a
late binder) and closed in `afterEach` (exclusive, server-named queue — dies with the connection):

```js
beforeEach(async () => {
  listener = await fromRabbit({ url: RABBIT_URL, exchange: EXCHANGE,
    binding: { capability: CAPABILITY, type: 'session-change-noted' } })
})
afterEach(async () => { await listener?.close() })

// in the it:
await eventStream(listener)
  .ofCapability(CAPABILITY)
  .ofChannel('session-change-noted')
  .withPayload()
  .matchingPayload({ eventId: exactly(eventId), sessionId: exactly(sessionId), title: exactly(title),
                     proposer: exactly(userId), duration: exactly(duration) })
  .waitUntilFound(3)
```

> **`waitUntilFound(n)` is SECONDS**, on both engines (`eventStream` and `createTrackerSpy` are the
> same `createSpy`): resolve on the first match within `n` s. The answer key's comment calling it a
> "match count" is wrong — see `src/dsl/event-stream.js`. Deep assertion: after the wait, read
> `listener.elements().find(...)` and `expect` on it.

**3. Teardown in order:** `clearInterval(relayTimer)`, `await inflight`, close module/consumer/producer,
`await pool.end()`. Skip it and mocha hangs.

## Build the fact fresh each run

`buildSessionProposedFactWith()` with no overrides randomises ids. The **real store remembers across
runs** and the reaction is idempotent on the inbound fact — a reused id is suppressed and nothing is
emitted. Match your own fact by its id; never assert the exchange holds exactly one message.

## bus → WebSocket (the board live channel)

Extra wiring over bus → bus (worked in `board-bus-to-websocket.integration.test.js`; full setup in the
human how-to):

- **Delivery bus**: a second exchange (`CFB_WORKSHOP_DELIVERY_EXCHANGE ?? 'cfb-workshop-delivery'`,
  group `cfb-session-discovery-delivery-integration-test`) injected as `deliveryBus: { producer,
  consumer, close }` — materialize announces `view-updated` on it, the push consumes it.
- **Postgres read side**: `createPostgresBoard({ db })`, `createPostgresEvents({ db })` with
  `db = { query: async (t, p) => (await pool.query(t, p)).rows }`, passed as `board`, `events`.
- **A listening host**: a real `Router`, the module activated onto it, and a hand-rolled `node:http`
  server + `ws` `WebSocketServer({ noServer: true })` that routes upgrades via
  `router.resolveUpgrade(pathname)`. (`createHttpHost` cannot be used here: it calls ws v7's
  `WebSocket.Server`, the repo runs ws 8.)
- **Spy**: `board = await fromWebSocket(\`ws://localhost:${port}/api/event/${EVENT_SLUG}/sessions/live\`)`
  in `beforeEach`.
- **`eventId` threads both ends**: publish with `eventId: 'codefreeze-2025'` (the seeded slug) and
  subscribe on the same slug — a random `eventId` pushes to another scope and the test waits for nothing.
- Frame is `{ type: 'session', session: {...} }` — no `metaData`, so `.ofChannel` does not apply:
  `.where(f => f.type === 'session' && f.session?.sessionId === sessionId).waitUntilFound(10)`, then
  `expect(board.elements().find(...).session).to.include({ sessionId, title, proposer, eventId })`.

## What this tier proves that component cannot

- the real exchange routes `<capability>.<type>` to the bound queue;
- schema and SQL run on the real Postgres engine;
- producer and consumer speak over a socket (serialization, connection, acks);
- the relay actually drains the store to the bus.

Component green + integration red for the same flow → the fault is at the **edge** (binding, routing
key, connection, SQL), not the capability's logic.

## Negative over a real transport

No `waitForNone`. Assert "none within a window", matching only your own id:

```js
await new Promise(r => setTimeout(r, 500))
expect(listener.elements().filter(f => f.payload?.sessionId === sessionId)).to.be.empty
```

## When the participant is stuck — check these first

Docker not up · listener opened after the act · `consumerGroup` shared with a host (starvation) · a
fixed id the real store already saw · missing `eventId` on the WebSocket flow · `waitUntilFound` read as
a count · a connection left open in `after`.

## See also

- `write-a-component-test.md` — the same flow, nullable, that this mirrors.
- `../reference/event-stream-dsl.md` — `fromRabbit`, `fromWebSocket`, `eventStream`, `waitUntilFound`.
