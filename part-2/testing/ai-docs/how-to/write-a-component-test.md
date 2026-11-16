# How to write a component test

> AI-facing recipe, self-contained. One capability, enabled by hand over nullable ports, no Docker,
> nothing running. Five shapes are worked here. Human version:
> `part-2/testing/docs/how-to/write-a-component-test.md`.

## The shape every component test shares

1. **Build the nullable ports and construct the module over them** — once, in `before`. A nullable
   store keeps no state, so there is nothing to reset between tests.
2. **Open the output tracker in `beforeEach`, before the act.** It records from the moment it
   subscribes; open it late and it misses the write.
3. **Arrange** with a fact or command from the provider's **builder** (never hand-rolled — see
   `build-a-fact-from-a-contract.md`).
4. **Act** by driving the one inbound seam (`consumer.simulate`, an HTTP `post`, or a `get`).
5. **Assert** on the capability's own output (its write, publish, or response), read off a spy.

No `componentHost` required (though `../reference/component-host-fixture.md` offers one), no mock, no
"was publish called". The matchers that read a write record live at the top of the file:

```js
const ofOp = op => ({ matches: r => r.op === op })
const appendedType = type => ({ matches: r => (r.events ?? []).some(e => e.metaData?.type === type) })
const appendedPayload = expected => ({
  matches: r => (r.events ?? []).some(e =>
    e.payload && Object.keys(expected).every(key => e.payload[key] === expected[key])),
})
```

---

## Shape A — bus → append (a reaction)

Discovery consumes a fact another capability publishes and appends one of its own.

```js
let store, output, consumer
before(async () => {
  store = createPostgresStore.createNull()
  consumer = RabbitConsumer.createNull({ consumerGroup: CAPABILITY })
  const module = new SessionDiscoveryModule({
    eventStore: store, consumer, log: false, clock: () => '2026-11-06T10:00:00+02:00',
  })
  await module.activate({ router: {}, apiServedLocally: false })
})
beforeEach(() => { output = store.trackChanges() })
afterEach(() => { output?.close() })

it('session-proposed -> session-change-noted', async () => {
  const proposedEvent = buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)
  await consumer.simulate(proposedEvent)            // ACT: a fact arrives, the reaction runs
  await createTrackerSpy(fromStore(output))
    .matching(ofOp('append'))
    .matching(appendedType('session-change-noted'))
    .matching(appendedPayload({ sessionId: 's-0142', title: 'Mob testing legacy code', proposer: 'u-casey', duration: 60 }))
    .waitUntilFound(1) // seconds (a timeout, NOT a count — see reference/event-stream-dsl.md)
})
```

## Shape B — HTTP → append (a command)

Proposal accepts a command over HTTP and appends the fact it decides on. The inbound seam is a
`supertest` agent against an **unlistened** server. A command has two lifecycle phases a reaction
does not: `module.register()` composes the capability; `module.activate({ router, auth })` registers
the real POST route. Identity is server-derived, so inject a trivial `auth`.

```js
before(async () => {
  const broker = inMemoryBroker()
  store = createPostgresStore.createNull()
  const producer = RabbitProducer.createNull({ channel: broker, exchange: EXCHANGE })
  const module = new SessionProposalModule({ store, producer, broker, clock: () => '2026-11-06T10:00:00+02:00' })
  await module.register()
  const router = new Router()
  await module.activate({ router, auth: { userIdFromRequest: async () => 'u-casey' } })
  agent = request(createHttpHost(router)) // unlistened; supertest drives it directly
})

it('appends exactly one session-proposed fact when a valid command is posted', async () => {
  const command = commandWith({ title: 'ES 101' })
  await agent.post('/api/commands/propose-session').send(command).expect(200)
  await createTrackerSpy(fromStore(output))
    .matching(ofOp('append'))
    .matching(appendedType('session-proposed'))
    .matching(appendedPayload({ sessionId: command.sessionId, title: 'ES 101', userId: 'u-casey', duration: 60 }))
    .waitUntilFound(1)
})
```

(Scheduling's `HTTP → append` is identical in shape — `commandWith` + `supertest` + assert the
append — with `session-scheduled` instead of `session-proposed`.)

## Shape C — HTTP → query (a read model)

A GET against the read model. No bus, no socket — request/response. The read ports are plain
**stubs** (a view, not a database); with no fact bus on the context, the module wires no reaction.

```js
before(async () => {
  const router = new Router()
  const module = new SessionDiscoveryModule({
    discovery: { events: { findBySlug: async s => (s === EVENT ? { slug: EVENT } : null) },
                 schedule: { sessionsFor: () => [], sectionsFor: () => [] },
                 board: { list: async () => rows } },
    log: false,
  })
  await module.activate({ router })        // apiServedLocally unset → catalogue routes serve
  agent = request(createHttpHost(router))
})
beforeEach(() => { rows = [] })

it('returns the sessions on the board for the event', async () => {
  rows = [{ sessionId: 's-0142', eventId: EVENT, title: 'Mob testing legacy code', proposer: 'u-casey', status: 'idea' }]
  const res = await agent.get(`/api/event/${EVENT}/sessions`).expect(200)
  expect(res.body).to.eql({ eventId: EVENT, sessions: rows })   // ASSERT: the response body
})
```

The query returns a value, so you assert the **return value** directly (Part 1, incoming query) —
no spy needed.

## Shape D — bus → store → bus (a store-owning reaction: materialize)

`materializeBoard` reacts to `session-change-noted`, writes the view, and announces `view-updated`
on its **own delivery producer** (not the outbox). This reaction legitimately owns a store, so the
test may touch the view. Wire the board + a `deliveryProducer`, drive the inbound fact, assert the
`view-updated` announcement off that producer (`fromProducer`). Negatives: a redelivery announces no
second `view-updated`; an older version does not overwrite a newer row.

## Shape E — bus → WebSocket (a read-only push reaction)

`pushBoardRow` reacts to `view-updated`, reads the fresh row back, pushes a frame on the channel.
**Cut the flow here** (`../explanation/where-to-cut-the-flow.md`): no store, no relay. Board is a
read-only `get` stub; channel is the **real** one, observed via `channel.trackChanges()`.

```js
const board = { get: async () => asBoardRow(currentRow) } // only get() is used
before(async () => {
  broker = inMemoryBroker()
  const consumer = RabbitConsumer.createNull({ channel: broker, exchange: EXCHANGE, consumerGroup: CAPABILITY })
  channel = createLiveChannel()
  await consumer.subscribe(VIEW_UPDATED, pushBoardRow(board, channel))
})
beforeEach(() => { currentRow = null; tracker = channel.trackChanges() })
afterEach(() => { tracker?.stop() })

it('pushes a frame on the channel when a view-updated for a materialized session arrives', async () => {
  currentRow = { eventId: 'codefreeze-2025', version: 1, document: { title: 'Mob testing legacy code', proposer: 'u-casey', status: 'idea' } }
  broker.simulate(viewUpdated('s-0142', 1))
  await broker.settled()
  await createTrackerSpy(fromChannel(tracker)).matching(session('s-0142')).waitUntilFound(1)
})
```

The frame is `{ type: 'session', session: { …row, sessionId, version } }`, so the matcher reads
`r.message.session`. The push is scoped to the **row's** own `eventId`, never the signal's — prove
it with a `get` stub carrying a different `eventId`.

---

## Assert the negatives too — the behaviour a schema cannot check

- **idempotency** — deliver the same fact twice, assert one appended fact.
- **selectivity** — `simulate` a fact type the capability does not subscribe to; assert nothing was
  written.

There is no `waitForNone` on `createTrackerSpy`. To assert nothing happened, drain and read the
tracker directly:

```js
await broker.settled()
expect(output.data()).to.be.empty   // or expect(tracker.data()).to.be.empty
```

## Why the component tier stops at the write

A reaction does not publish directly; it appends, and a relay later drains the outbox. The relay
reads the store back, and a nullable store keeps no state, so it publishes nothing by design. "The
write reaches the bus" is proven once — in the component-integration weld
(`write-a-component-integration-test.md`) or the integration test.

## Rules of thumb (literal)

- **Build inbound facts/commands from the provider's builder, never by hand.**
- **Open the tracker before you act.** Keep the habit even where the nullable would forgive you.
- **Let the matcher carry the altitude** — `{ matches: record => boolean }` reads only the part it
  cares about.
- **Assert on the output, never on "was publish called".** Reaching for a mock here → re-read
  `../explanation/nullables-not-mocks.md`.
