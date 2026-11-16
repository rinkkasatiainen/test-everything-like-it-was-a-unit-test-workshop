# How to write a component-integration test (the weld)

> AI-facing recipe, self-contained. A **wide, nullable** test — several units wired together, no
> Docker. The breadth axis, not the integration tier. Read
> `../explanation/where-to-cut-the-flow.md` first, and only reach for this when the wiring *is* the
> subject.

## What it proves that its neighbours cannot

Between two component tests there is a gap. The HTTP→append component test asserts the command's
**write** off the store's tracker and stops (the outbox is the capability's output). A relay test
starts from a **hand-built** event and asserts `outbox → bus`. In both, "the fact the command
wrote" and "the fact on the bus" are two *different* hand-built facts — nothing welds them.

The weld uses one piece of extra realness to join them: a **real read-back store twin**
(`createInMemoryEventStore`) that both the command appends into **and** the relay drains from. Now
they are one object. The producer is a nullable (no broker); there is **no timer** — you drive the
relay **by hand** with `relayOnce()`. It proves: the fact the command *appended* is, unchanged, the
fact the relay *publishes* — same payload, same outbox identity (`capability` → exchange, `streamId`
→ per-session order), same `causationId` tracing back to the command.

## Wire it: real core + real relay + shared real-twin store + nullable producer

```js
import { proposeSession, CAPABILITY, SESSION_PROPOSED } from '@rinkkasatiainen/cfb-session-proposal-core'
import { commandWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'
import { createRelay } from '@rinkkasatiainen/cfb-event-sourcing-relay'
import { createInMemoryEventStore, createTrackerSpy } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { fromProducer } from './index'

let store, producer, relay, propose, output
before(() => {
  store = createInMemoryEventStore()                 // the real-twin, read-back store
  producer = RabbitProducer.createNull()             // nullable — no broker
  relay = createRelay({ store, producer })
  propose = proposeSession(store, { clock, userId: 'u-casey', correlationId: 'r-casey' })
})
beforeEach(() => {
  output = producer.trackChanges()
}) // producer records { routingKey, event }
afterEach(() => {
  output?.close()
})
```

Matchers here read a **producer** record `{ routingKey, event }`, not a store write record:

```js
const ofType = type => ({ matches: r => r.event?.metaData?.type === type })
const ofCapability = cap => ({ matches: r => r.event?.metaData?.capability === cap })
const ofStream = id => ({ matches: r => r.event?.metaData?.streamId === id })
const causedBy = cmdId => ({ matches: r => r.event?.metaData?.causationId === cmdId })
const payloadMatching = exp => ({ matches: r => {
  const p = r.event?.payload; return !!p && Object.keys(exp).every(k => p[k] === exp[k]) } })
```

## The body: append by hand, drain by hand, assert on the bus

```js
it('a proposed session reaches the bus unchanged once the relay drains the outbox', async () => {
  const sessionId = uniqueId('s')
  const command = commandWith({ sessionId, title: 'ES 101', commandId: 'c-1' })

  await valueOf(propose(command))     // Half 1: the command appends session-proposed to the store
  await valueOf(relay.relayOnce())    // the infra beat: ONE hand-driven relay pass drains the outbox

  // Half 2: the SAME fact is now on the bus — payload, outbox identity, causationId
  await createTrackerSpy(fromProducer(output))
    .matching(ofType(SESSION_PROPOSED))
    .matching(ofCapability(CAPABILITY))
    .matching(ofStream(sessionId))
    .matching(causedBy('c-1'))
    .matching(payloadMatching({ sessionId, title: 'ES 101', userId: 'u-casey', duration: 60 }))
    .waitUntilFound(1) // seconds
})
```

`uniqueId` randomises the session id per run, because the real-twin store remembers across tests.

## Altitude discipline — what this tier must NOT re-test

One test, one assertion. Keep each of these in its named home:

- **relay mechanics** (order, nack-blocking, batch, mark-after-confirm) → the relay's own
  acceptance test.
- **the command decision** (refusals, duration default) → the HTTP → append component test.
- **the real broker + real Postgres edges, async delivery** → the integration test.

A second relay pass publishing nothing (the drained event is marked, not re-sent) is a legitimate
weld assertion; command idempotency on the same `commandId` is too (and may be RED until the core
appends through `idempotentAct(commandId)` — document it as a known gap, do not fake it green).

## See also

- `../explanation/where-to-cut-the-flow.md` — breadth vs fidelity, and why wide-nullable is usually
  the wrong home (prefer the integration tier unless isolating one claim like this).
- `write-an-integration-test.md` — the same weld with real edges.
