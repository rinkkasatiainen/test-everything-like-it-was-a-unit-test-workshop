# Reference — the spies, `emit`, and the sources

> AI-facing reference, self-contained. The listening/sending API under `src/dsl/`
> (`event-stream.js`, `emit.js`, `exactly.js`, `sources/`) plus `createTrackerSpy` from
> `@rinkkasatiainen/cfb-event-sourcing-testing`.
>
> **Send the participant to:** [`human-docs/reference/nullables/README.md`](../../human-docs/reference/nullables/README.md) ("The two spies"), [`real-transports.md`](../../human-docs/reference/nullables/real-transports.md), and the "How does the fluent api work" section of [`human-docs/how-to/write-a-component-test.md`](../../human-docs/how-to/write-a-component-test.md). This file is for the coach.

## Two spy engines — pick by tier

| Engine | Builds on | Tier | Over these sources |
|---|---|---|---|
| `createTrackerSpy(source)` | `createSpy(source, messageVocabulary)` | **component** | `fromStore`, `fromProducer`, `fromChannel`, `fromBroker` |
| `eventStream(source)` | `createSpy(source, eventVocabulary)` | **integration** | `fromRabbit`, `fromWebSocket` |

**They are the same engine.** Both are `createSpy` from `@rinkkasatiainen/cfb-event-sourcing-tracking`
over the same source interface: each polls `source.elements()` and resolves on the first poll where
≥1 record passes every filter. They differ in only two ways — the **source** (a nullable port's
output tracker vs. a real transport) and the **vocabulary** (the fluent sugar mixed on:
`messageVocabulary` reads `{ routingKey, event }` records, `eventVocabulary` reads bare
`{ metaData, payload }` events). So a component test watches a nullable port's **output tracker** (the
raw records a write/publish left behind) → `createTrackerSpy`; an integration test watches a **real
transport** (facts off Rabbit, frames off a socket) → `eventStream`. The send side, `emit`, is
shared. Import from `src/dsl`:

```js
import {
  eventStream,
  liveEventStream,
  emit,
  fromBroker,
  fromChannel,
  fromProducer,
  fromStore,
  fromRabbit,
  fromWebSocket
} from './index'
import { createTrackerSpy } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { exactly } from './exactly.js'
```

## `createTrackerSpy(source)` — the component-tier spy

A buffering spy over a source exposing `elements()`. Polls until ≥1 record passes **every** filter,
or the window elapses.

```js
await createTrackerSpy(fromStore(output))
  .matching(ofOp('append'))
  .matching(appendedType('session-change-noted'))
  .waitUntilFound(1) // SECONDS to wait (a timeout, NOT a count)
```

| Method | Does |
|---|---|
| `.matching(matcher)` | adds a filter; `matcher` is any `{ matches: record => boolean }`. Chain several; a record must pass all |
| `.ofChannel(type)` · `.withPayload(key)` | message-vocabulary sugar; store tests match the raw record instead |
| `.log()` | prints buffered records (debug) |
| `.waitUntilFound(seconds)` | **waits up to `seconds` for ≥1 matching record.** Passes on first match, fails on timeout |

The matcher carries the altitude. A store write record is `{ op, capability, streamId, events }`;
the test defines `ofOp`, `appendedType`, `appendedPayload` at the top of the file rather than using
a built-in. **No `waitForNone`** — to assert nothing was written, drain and read directly:

```js
await broker.settled()
expect(tracker.data()).to.be.empty
```

## `eventStream(source)` — the integration-tier spy

The **same `createSpy` engine** as `createTrackerSpy`, over a source exposing `elements()`, carrying
the **event** vocabulary (records are bare `{ metaData, payload }` wire events). Every filter returns
a new stream (immutable); construction never blocks, so build before you act, call the terminal after.

```js
await eventStream(source)
  .ofCapability('cfb-session-discovery')
  .ofChannel('session-change-noted')
  .withPayload()
  .matchingPayload({ sessionId: exactly(mine), title: exactly('ES 101') })
  .waitUntilFound(3) // SECONDS to wait (a timeout) — identical to createTrackerSpy
```

Vocabulary sugar (compose in any order): `.ofChannel(type)` (`metaData.type`), `.ofCapability(cap)`
(`metaData.capability`), `.withPayload()` (present; call before `matchingPayload`),
`.matchingPayload(schema)` (closed conformance over `event.payload`), `.where(predicate)` (escape
hatch). Plus the base engine's `.matching(matcher)` and `.log()`, shared with `createTrackerSpy`.

- **`matchingPayload` is a CLOSED check** — every schema key present and valid, no key outside the
  schema. Values are validators; `exactly(v)` is the common one. It always reads `event.payload`, so
  for data under another key (a WebSocket frame's `session`) use `.where(f => f.session?.sessionId === mine)`.
- There is **no `.ofType`** — use `.ofChannel`. `.matching(matcher)` *is* available (it is the base
  engine method), but prefer the vocabulary where it fits.

Terminal: `.waitUntilFound(seconds)` — the one terminal, identical to `createTrackerSpy`: it polls
every 300 ms and resolves on the first poll where ≥1 record passes every filter, and throws on
timeout. There is **no `.found()` and no `.waitForNone()`** on this engine, and **no `{ timeout }`
option** — the single argument is the number of seconds to wait.

**Deep assertions and negatives — read the buffer directly.** To assert on the matched record's inner
values, wait, then read it off the source: `source.elements().find(...)` (the integration twin of the
component tier's `tracker.data().find(...)`). There is no negative terminal; to assert "none within a
window" over a real transport, let a fixed window pass and assert the buffer holds no matching record:

```js
await new Promise(r => setTimeout(r, 500))
expect(source.elements().filter(mine)).to.be.empty
```

## `waitUntilFound` — one meaning on both engines

`waitUntilFound(seconds)` is the **same call** on `createTrackerSpy` and `eventStream`, because both
*are* `createSpy`: the argument is **seconds to wait**, and the spy resolves on the first poll where
≥1 record passes every filter, or throws on timeout. It is **never** a count of matches, and there is
no `{ timeout }` option.

So `createTrackerSpy(...).waitUntilFound(1)` waits up to one second for any match, and
`eventStream(...).waitUntilFound(3)` waits up to **three seconds** — not for three events. Pick the
window by how long the path can take: a nullable port settles in ~1 s; a real broker or socket wants
longer (the integration tests use 3 s for bus→bus, 10 s for bus→WebSocket). The real-transport
sources carry a `defaultTimeout` field (`fromRabbit` 3000, `fromWebSocket` 5000) used by the *live*
spy; `waitUntilFound` does not read it — always pass the seconds explicitly.

## Sources

Both engines want the **same** source interface — `{ elements(): object[], close() }` — and poll
`elements()`. A real-transport source adds `liveStream(cb)` and a `defaultTimeout` for the live spy.

| Source | Tier | Reads | Record shape |
|---|---|---|---|
| `fromStore(tracker)` | component | what a capability wrote | `{ op, capability, streamId, events }` |
| `fromProducer(tracker)` | component | what it published | `{ routingKey, event }` |
| `fromChannel(tracker)` | component | what the live channel pushed | `{ eventId, message }` (frame under `message.session`) |
| `fromBroker(broker)` | component | a shared in-memory exchange | broker records |
| `fromRabbit({ url, exchange, binding })` | integration | real RabbitMQ deliveries | events; needs Docker |
| `fromWebSocket(url)` | integration | JSON frames off a socket | frames `{ type: 'session', session }` |

- `fromStore` / `fromProducer` / `fromChannel` take a tracker you open **before the act**
  (`store.trackChanges()`, `producer.trackChanges()`, `channel.trackChanges()`). They observe the
  **real** object, so they point at a nullable or a real one unchanged.
- `fromRabbit` opens a real `RabbitConsumer`, binds a throwaway **exclusive, server-named** queue
  (private, auto-deleted), buffers deliveries into `events()`. Build before you act (no replay for a
  late bind); always `close()` in teardown.
- `fromWebSocket` connects a `ws` client, buffers each JSON frame. Connect before you publish; the
  frame's top-level `type` is the literal `'session'`, so narrow with `.where`.

## `emit(producer)` — the send side

The arrange for a bus → bus or bus → WebSocket test. Prefer a ready-made fact from the provider's
builder:

```js
await emit(producer).publish(buildSessionProposedFactWith())
```

Or build fluently for a shape no builder owns yet: `.aFact(type).forCapability(cap).onStream(id,
version).by(userId).withPayload(obj).publish()` (also `.version(n)`, `.at(ts)`, `.causedBy(id)`,
`.correlatedBy(id)`, `.build()`). The chain is immutable; `publish()` returns the producer's
`Eventually` (resolve = accepted, reject = nack). Any producer satisfying `publish(event) ->
Eventually` works, so the same call drives an in-memory broker and a real `RabbitProducer`.

## The property this buys

Within one engine, filters and terminals know nothing about the transport underneath. Swap
`fromRabbit` for `fromWebSocket` and the `eventStream` chain above does not change. The tier boundary
is only the **source and vocabulary** you hand the one engine: component reads a nullable port's
output tracker through `elements()`, integration reads a real transport through the same `elements()`.
