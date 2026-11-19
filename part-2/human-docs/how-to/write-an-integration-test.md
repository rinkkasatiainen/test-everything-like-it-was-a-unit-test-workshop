# Writing an integration test — a participant's guide

This uses my vocabulary. If yours differs, rename the folders to the names that work for you.
Names matter, and working with the names from your own context matters.

## What an integration test is, in one breath

An integration test is **the component test again, with the edges made real**. It uses the same
capability, the same flow and the same 3-by-2 matrix, but the nullables are swapped for a **real
Postgres** and a **real RabbitMQ**, running in Docker.

How you decide what you test, depends on the boxes. Remember:
> Imagine a box around the unit.
> Is the incoming message a query or a command?
> Does it have outgoing queries or commands?
> What happens inside, we don't care

Your capability's code doesn't change. Only the ports it's handed do. That's the point: if the
[component test](write-a-component-test.md) for a flow is green and the integration test for the same
flow is red, the bug is **at the edge**, not in your logic. The edge here means a binding, a routing
key, a connection or the SQL.

What only this tier can prove:

- the real exchange routes `<capability>.<type>` to the queue you bound - configuration and binding at the starup of the
  app;
- the schema and SQL run on the real Postgres engine;
- producer and consumer communication over a real socket (serialization, connection, acks);
- the relay really drains the store's outbox onto the bus.

An integration test can be made to run the whole app or, similarly as in component test, only some capabilities. The
test setup can also boot up the Docker containers needed - including the app, and run tests against that. That's what
I've done earlier, and it's pretty smooth. Please do ask for more, if you are interested.

## Before you start — start the infrastructure

```bash
npm run db:up              # Postgres + RabbitMQ in Docker; waits until they're healthy
npm run test:integration   # runs test/integration/**/*.test.js
```

RabbitMQ has a management UI at http://localhost:15672 (`guest` / `guest`). It's useful for
seeing queues and bindings appear while your test runs. `npm run db:down` stops the stack, and
`npm run db:reset` wipes it and re-seeds it.

But, as we're actually using RabbitMQ, we can also just register another listener for the queues, to see
what messages are actually executed. And it so happens, that we have ways to do it:

```shell
$ node part-2/scripts/amqp-spy.js 
Listening on topic: cfb-session-discovery
Received message: cfb-session-proposal-session-proposed
Received message: cfb-session-discovery-session-change-noted
Received message: cfb-session-scheduling-session-scheduled
Received message: cfb-session-discovery-session-change-noted
```

This script is provided and when executing integration tests, you should see events that are sent through RabbitMQ.

## Setup — paste this and move on

This is the setup for the **second beat**: Session Discovery reacts to a `session-proposed` fact on
the bus and emits `session-change-noted`. It's the bus → bus flow.

It's important to note and remember, that component test only tests bus -> event store. By running the host with needed
capabilities, and the _relay_ that dispatches the events from event store to the message bus, this whole flow can be
tested. That's one reason for having an integration test.

That's Make a new file under `test/integration` (call it `whatever-you-like.test.js` and it will run), and paste this
block:

```js
import pg from 'pg'
import { SessionDiscoveryModule } from '@rinkkasatiainen/cfb-session-discovery-node-js'
import { RabbitConsumer, RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { createPostgresStore } from '@rinkkasatiainen/cfb-event-sourcing-store-postgres'
import { createRelay } from '@rinkkasatiainen/cfb-event-sourcing-relay'
import { buildSessionProposedFactWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'

import { exactly } from '../../src/dsl/exactly.js'
import { eventStream, fromRabbit } from '../../src/dsl/index.js'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://cfb:cfb-local-dev@localhost:55432/cfb_local'
const RABBIT_URL = process.env.RABBIT_URL ?? 'amqp://localhost'
// A dedicated exchange keeps the workshop's facts off the exchange a running host uses.
const EXCHANGE = process.env.CFB_WORKSHOP_EXCHANGE ?? 'cfb-workshop-events'
const CAPABILITY = 'cfb-session-discovery'
// A dedicated consumer group — see "Why its own consumer group" below.
const CONSUMER_GROUP = `${CAPABILITY}-integration-test`

const fixedClock = () => '2026-11-06T10:00:00+02:00'

// Unwrap a relay pass to its value, throwing its reason on reject.
const valueOf = async eventually => (await eventually).fold(
  reason => {
    throw new Error(reason?.message ?? reason?.code ?? JSON.stringify(reason))
  },
  value => value,
)

describe('integration · Discovery · bus → bus  (needs Docker: npm run db:up)', () => {
  let pool
  let consumer
  let producer
  let close
  let relayTimer
  let inflight
  let listener

  before(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=event_store,public' })
    const store = createPostgresStore({ pool })
    consumer = await RabbitConsumer.of({ url: RABBIT_URL, exchange: EXCHANGE, consumerGroup: CONSUMER_GROUP })
    producer = await RabbitProducer.of({ url: RABBIT_URL, exchange: EXCHANGE })
    const relay = createRelay({ store, producer, batchSize: 10 })

    const module = new SessionDiscoveryModule({ eventStore: store, consumer, log: false, clock: fixedClock })
    await module.activate({ router: {}, apiServedLocally: false })
    close = async () => {
      await module.close?.()
      await consumer.close?.()
      await producer.close?.()
    }

    // The relay drains the outbox (store → bus) on a timer; a real broker delivers asynchronously.
    inflight = Promise.resolve()
    relayTimer = setInterval(() => {
      inflight = valueOf(relay.relayOnce()).catch(() => {
      })
    }, 100)
  })

  // The spy: a fresh subscription per test, opened BEFORE the act.
  beforeEach(async () => {
    listener = await fromRabbit({
      url: RABBIT_URL,
      exchange: EXCHANGE,
      binding: { capability: CAPABILITY, type: 'session-change-noted' },
    })
  })

  afterEach(async () => {
    await listener?.close()         // its queue is exclusive — it dies with the connection
  })

  after(async () => {
    clearInterval(relayTimer)
    await inflight                  // let a relay pass in flight finish before teardown
    await close?.()
    await pool?.end()
  })

  // your test goes here
})
```

Let's go through that code piece by piece.

### before-block — the same wiring, real ports

If you've done the component test, this will look familiar, because it's the same composition. What's
different is what each port *is*:

| Port         | Component test                     | Here                                                  |
|--------------|------------------------------------|-------------------------------------------------------|
| event store  | `createPostgresStore.createNull()` | `createPostgresStore({ pool })`, a real `pg.Pool`     |
| inbound bus  | the nullable consumer              | `RabbitConsumer.of({ url, exchange, consumerGroup })` |
| outbound bus | the nullable producer              | `RabbitProducer.of({ url, exchange })`                |
| relay        | you drive one pass by hand         | runs on a **timer** (`setInterval`, every 100 ms)     |

`new SessionDiscoveryModule(...)` and `module.activate(...)` are the same production code a real host
runs. `router: {}` and `apiServedLocally: false` mean this capability doesn't serve its HTTP query
routes in this test, because you only need its reaction.

**Why the relay runs on a timer.** A capability never publishes directly. It *appends* the fact to its
store, and the relay moves facts from the store's outbox to the bus. In a component test you'd step
that by hand. Over a real broker everything is asynchronous, so the relay simply keeps running, like it
does in a real host.

**Why its own consumer group.** A RabbitMQ queue is named after the consumer **group**, not the
exchange. If your test used the host's own group (`cfb-session-discovery`), it would share the host's
queue. A running host would then take turns with your test for the messages, and your test would
starve. A test-only group gives you a private queue.

### beforeEach & afterEach — the spy is a subscription

At this tier there's no output tracker to read. Well, you could - but that would defeat the purpose of the test.
But you could use the output tracker to debug your test. It's useful concept in it's own.

Instead of using the output tracker, we do **listen on the real exchange**: `fromRabbit(...)` binds a fresh, private,
server-named queue for `<capability>.<type>`.

Two rules come with it:

- **Open it before you act.** A real consumer only receives what's published *after* it binds, and a
  late listener gets no replay. That's why it lives in `beforeEach`.
- **Close it after.** The queue is exclusive and is deleted when the connection closes, so nothing leaks
  into the next test or the next run.

### after — tear down in order

Stop the relay, wait for a relay pass that's still in flight, close the module, consumer and producer,
then close the pool. **If you skip this**, mocha hangs on the open connections.

## Now write the test

It's the same thinking as before: what's the *incoming message*, and what *outgoing message* do you
expect? Here:

1. **Incoming:** a `session-proposed` fact, from another capability, arriving on the bus.
2. **Outgoing:** Discovery emits `session-change-noted`, naming the same session.

There's one change from the component test in how you **act**. `consumer.simulate(...)` only exists on
the nullable, and a real channel has nothing like it. So you do what any other capability would do,
which is **publish** the fact:

```js
it('emits session-change-noted naming the same session when a session-proposed arrives', async () => {
  const proposed = buildSessionProposedFactWith()
  const { sessionId, title, userId, duration, eventId } = proposed.payload

  await producer.publish(proposed)

  // ← your assertion: read the bus off `eventStream(listener)`.
  //    Narrow it to Discovery's capability and the 'session-change-noted' channel, then check
  //    the payload fields you named when you drew the box (`.matchingPayload({ ... exactly(...) })`).
  //    Finish with `.waitUntilFound(seconds)`.
})
```

`eventStream` is the integration-tier twin of the `createTrackerSpy` you used in the component test:
same engine, same `.waitUntilFound(...)`. The vocabulary is listed in
[`../reference/nullables/real-transports.md`](../reference/nullables/real-transports.md).

> **`waitUntilFound(n)` takes seconds, not a count.** It resolves on the first match within `n`
> seconds. Over a real broker, give it a few seconds, for example `3`. (Mocha's own timeout here is
> 10 seconds, set in `.mocharc.json`.)

### Build the fact fresh each run

`buildSessionProposedFactWith()` with no overrides gives every run a **new random session id**. That
matters here, because **the real Postgres remembers across runs**. The reaction ignores a fact it has
already handled (it's idempotent), so a hard-coded id would be suppressed on the second run, nothing
would be emitted, and your test would fail for a reason that has nothing to do with your code.

For the same reason, **match your own fact by its id**. Never assert "the exchange holds exactly one
message".

### Asserting that nothing happened

A real bus has no certain "nothing, ever", and the spy has no `waitForNone`. Assert "none within a
window" instead. Let a fixed window pass, then read the listener's buffer and check that nothing of
*yours* arrived:

```js
await new Promise(resolve => setTimeout(resolve, 500))
expect(listener.elements().filter(fact => fact.payload?.sessionId === sessionId)).to.be.empty
```

## The other flows

### bus → WebSocket — the board live channel

This is also an interesting test case. Another test that integration test would show it's powers. Let's do the steps 
to see what we're testing.

1. Let's imagine a box around a unit:
 - it's the beat from 'session-change-noted' to update is sent through websocket
2. Is there incoming commands or queries:
 - an event 'session-change-noted' comes in
3. Is there outgoing commands or queries:
 - a message is published over webSocket connection.
4. what happens inside, we don't care.
 - actually, another event is in the rabbitmq, called 'view-updated', but we don't test that.

Note: code below is AI made for this reference - please do not take that at a face value. It does not follow the 
convention and fluent language of streams we have everywhere else. This now shows that it takes effort to build the 
DSL for fluent language in tests. And I think personally it's worth it.

<details>
<summary>Setup for bus → WebSocket (click to open)</summary>

```js
import { createServer } from 'node:http'
import pg from 'pg'
import { WebSocketServer } from 'ws'
import { expect } from 'chai'
import {
  SessionDiscoveryModule,
  createPostgresBoard,
  createPostgresEvents
} from '@rinkkasatiainen/cfb-session-discovery-node-js'
import { RabbitConsumer, RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { createPostgresStore } from '@rinkkasatiainen/cfb-event-sourcing-store-postgres'
import { createRelay } from '@rinkkasatiainen/cfb-event-sourcing-relay'
import { Router } from '@rinkkasatiainen/cfb-server-shell'
import { buildSessionProposedFactWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'

import { eventStream, fromWebSocket } from '../../src/dsl/index.js'

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://cfb:cfb-local-dev@localhost:55432/cfb_local'
const RABBIT_URL = process.env.RABBIT_URL ?? 'amqp://localhost'
const EXCHANGE = process.env.CFB_WORKSHOP_EXCHANGE ?? 'cfb-workshop-events'
// Discovery's delivery bus: materializing the board announces `view-updated`, the push consumes it.
const DELIVERY_EXCHANGE = process.env.CFB_WORKSHOP_DELIVERY_EXCHANGE ?? 'cfb-workshop-delivery'
const EVENT_SLUG = 'codefreeze-2025' // the one conference the seeded database knows
const CONSUMER_GROUP = 'cfb-session-discovery-integration-test'
const DELIVERY_GROUP = 'cfb-session-discovery-delivery-integration-test'

const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

// A minimal listening host that only serves WebSocket upgrades through the router.
const listeningHostFor = async router => {
  const wss = new WebSocketServer({ noServer: true })
  const server = createServer((_req, res) => {
    res.writeHead(426)
    res.end()
  })
  server.on('upgrade', (req, socket, head) => {
    const { pathname } = new URL(req.url, 'http://localhost')
    const match = router.resolveUpgrade(pathname)
    if (!match) {
      socket.destroy()
      return
    }
    wss.handleUpgrade(req, socket, head, ws => match.handler(ws, req, { params: match.params }))
  })
  const port = await new Promise(resolve => server.listen(0, () => resolve(server.address().port)))
  return { server, port }
}

const pump = async relay => {
  const outcome = await relay.relayOnce()
  outcome.fold(() => {
  }, () => {
  })
}

describe('integration · Board · bus → WebSocket  (needs Docker: npm run db:up)', () => {
  let pool
  let consumer
  let producer
  let deliveryBus
  let server
  let port
  let relayTimer
  let inflight
  let board // the live ws client — the spy at this tier

  before(async () => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=event_store,public' })
    const db = { query: async (text, params) => (await pool.query(text, params)).rows }

    const store = createPostgresStore({ pool })
    const boardStore = createPostgresBoard({ db })
    const events = createPostgresEvents({ db })

    consumer = await RabbitConsumer.of({ url: RABBIT_URL, exchange: EXCHANGE, consumerGroup: CONSUMER_GROUP })
    producer = await RabbitProducer.of({ url: RABBIT_URL, exchange: EXCHANGE })
    deliveryBus = {
      producer: await RabbitProducer.of({ url: RABBIT_URL, exchange: DELIVERY_EXCHANGE }),
      consumer: await RabbitConsumer.of({
        url: RABBIT_URL,
        exchange: DELIVERY_EXCHANGE,
        consumerGroup: DELIVERY_GROUP
      }),
      close: async () => {
      },
    }

    const router = new Router()
    const module = new SessionDiscoveryModule({
      eventStore: store,
      consumer,
      board: boardStore,
      events,
      deliveryBus,
      log: false
    })
    await module.activate({ router, apiServedLocally: false })

    ;({ server, port } = await listeningHostFor(router))

    const relay = createRelay({ store, producer, batchSize: 10 })
    inflight = Promise.resolve()
    relayTimer = setInterval(() => {
      inflight = pump(relay)
    }, 100)
  })

  // Connect BEFORE publishing — a late client gets no replay.
  beforeEach(async () => {
    board = await fromWebSocket(`ws://localhost:${port}/api/event/${EVENT_SLUG}/sessions/live`)
  })

  afterEach(async () => {
    await board?.close()
  })

  after(async () => {
    clearInterval(relayTimer)
    await inflight
    await new Promise(resolve => (server ? server.close(resolve) : resolve()))
    await consumer?.close?.()
    await producer?.close?.()
    await deliveryBus?.producer?.close?.()
    await deliveryBus?.consumer?.close?.()
    await pool?.end()
  })

  // your test goes here
})
```

</details>

Things to know when you write the test:

- **The `eventId` threads both ends.** The fact you publish must carry `eventId: EVENT_SLUG`, because
  the push is scoped to the socket's event. If you leave it random, the frame goes to a different
  event's socket, and your test waits for nothing.
- **Pick your frame by your own session id**, made with `uniqueId('s')`:
  `eventStream(board).where(f => f.type === 'session' && f.session?.sessionId === sessionId)`.
  `.ofChannel(...)` doesn't apply here, because a frame has no `metaData`.
- **For a deep check, read the frame off the source after waiting**:
  `board.elements().find(...)`, then `expect(frame.session).to.include({ ... })`.

### HTTP → bus

This one isn't worked out yet. It has the same shape as bus → bus, with the Proposal capability
activated on a real `Router` over a real store and producer. The act is an HTTP `POST` of
[`commandWith(...)`](../reference/builders/session-proposal/command-with.md) (with `supertest`,
like the component test), and the assertion is `session-proposed` observed with `fromRabbit` on the
real exchange.

## The rules of thumb

1. **Same capability, same flow, real ports.** If you're changing *what* you assert compared with the
   component test, ask yourself why.
2. **Open the listener before you act**, and close it after.
3. **Build the message from the contract builder**, with a fresh id every run, and match on that id.
4. **Use a test-only exchange and consumer group**, never the ones a running host uses.
5. **Give `waitUntilFound` seconds, not a count.**

## Stuck?

Writing the assertion yourself *is* the exercise, so have a go before asking. But if you get wedged
(a listener that finds nothing, a hang at the end of the run), **come back to the coach with a link to
your test** and say where it's stuck. The coach will read it and help you work out what's wrong. If you'd
rather, ask it to do it together with you.

The usual suspects at this tier: Docker isn't up (`npm run db:up`); the listener was opened after the
act; a hard-coded id that the real store has already seen; a missing `eventId` on the WebSocket flow; or
a connection left open in `after`.

## See also

- [`write-a-component-test.md`](write-a-component-test.md) — the same flows, nullable. This guide
  mirrors it.
- [`write-an-e2e-test.md`](write-an-e2e-test.md) — the next step out: a whole running host.
- [`../reference/nullables/real-transports.md`](../reference/nullables/real-transports.md) —
  `fromRabbit`, `fromWebSocket` and `eventStream`.
- [`../reference/builders/index.md`](../reference/builders/index.md) — every message builder and its
  shape.
