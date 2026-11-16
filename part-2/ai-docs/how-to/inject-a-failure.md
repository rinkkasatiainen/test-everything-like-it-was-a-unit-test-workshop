# How to inject a bus failure (resilience tests)

> AI-facing recipe, self-contained. Test what a capability does when a fact fails to reach the bus —
> without throwing, without touching the real adapter.

A command does not publish. It appends the fact to the store; the **relay** drains the outbox and
publishes each fact, marking it published only *after* the producer confirms. So "the send failed"
is a statement about the relay/producer seam — and that is exactly where you inject.

## The tool: a decorator over the producer port

`src/doubles/unreliable-producer.js` wraps any producer satisfying the relay's contract
(`publish(event) -> Eventually`). Because it decorates the **port**, the same double works over the
in-memory broker (component) and a real RabbitProducer (integration). **None of these decorators
throw** — the relay treats a thrown error as a whole-pass store failure, so the decorators speak its
*message-level* channel instead: a resolved or rejected `Eventually`.

## Silent drop — the lost message with no symptom

```js
import { silentlyDrops } from './unreliable-producer.js'
const producer = silentlyDrops(RabbitProducer.createNull({ channel: broker, exchange }))
```

A message whose payload contains `drop` is **not sent** — but `publish` resolves as if accepted. The
relay concludes success and marks the fact published. The fact is durably in the store, the outbox
says delivered, and the bus never received it. **Nothing errors anywhere.**

> Trigger word is `drop`, not `fails`, on purpose: nothing fails, the message vanishes. Override:
> `silentlyDrops(producer, { when: e => e.payload.title.includes('blackhole') })`.

### What to assert — a chain of green that still loses data

```js
await scheduling.scheduleSession(commandWithTitle('drop me'), 'u-casey')  // resolves — no error
await valueOf(relay.relayOnce())                                          // { published: 1, failed: 0 }
await broker.settled()

expect(await eventsOf(store, sessionId)).to.have.length(1)   // the fact IS stored
expect(await unpublished(store)).to.eql([])                  // the outbox says "delivered"
expect(broker.published).to.eql([])                          // yet the bus never saw it
```

Against the **nullable** broker this negative is *certain* — it settles synchronously, so if it is
not in `broker.published` after `settled()`, it is never coming. Over a **real** RabbitMQ you can
only assert "nothing within a window" — let a window pass and read the source buffer directly
(`await new Promise(r => setTimeout(r, 500)); expect(listener.elements().filter(mine)).to.be.empty`),
since the spy has no `waitForNone` — an honest limit of a real transport, worth naming in the room.

### Why it is worse than an error

A *rejected* publish leaves the fact unpublished, so the next relay pass redelivers it —
at-least-once holds, the system self-heals. A silent drop **marks the fact published**, corrupting
the outbox bookkeeping, so no pass ever retries it. The guarantee is defeated precisely *because*
nothing failed. Put both in the test — that contrast is the lesson.

## Transient failure — fail a few times, then succeed

```js
import { succeedsOnAttempt } from './unreliable-producer.js'

const producer = succeedsOnAttempt(realProducer, { when: payloadHasWord('retry'), attempt: 5 })
```

A message containing `retry` is **nacked** (rejected, not thrown) on its first four relay passes and
delivered on the fifth — proving the reassuring property: the fact sits safe in the store across the
nacks and lands once the bus recovers. Assert pass by pass with `relayOnce()`:
`{ published: 0, failed: 1 }` four times, then `{ published: 1, failed: 0 }`, then it is on the bus.

> You **cannot** have "silent *and* retried". The only thing that makes the relay retry is being
> told the publish failed. Silent drop never retries; the transient one is never silent (each failed
> pass is counted). That is the relay's contract, seen from both sides — not a limitation to hide.

## Classifying these tests

A fault-injecting double is a **nullable with a configured response, not a mock**
(`../explanation/nullables-not-mocks.md`). These are **resilience** tests — off the behaviour tiers,
on the failure axis (`../explanation/which-test-is-this-box.md`). The same decorator runs at
component (certain negative) or integration (windowed negative) fidelity.

## See also

- `../explanation/nullables-not-mocks.md` · `../explanation/testing-levels.md`
- `cfb-event-sourcing/packages/relay/src/relay.js` — the contract these decorators speak to.
