# Reference — the spies, `emit`, and the sources

> AI-facing reference, self-contained. The listening/sending API under `src/dsl/`
> (`event-stream.js`, `emit.js`, `exactly.js`, `sources/`) plus `createTrackerSpy` from
> `@rinkkasatiainen/cfb-event-sourcing-testing`. Human version:
> `part-2/testing/docs/reference/event-stream-dsl.md`.

## Two spy engines — pick by tier

| Engine | Polls | Tier | Over these sources |
|---|---|---|---|
| `createTrackerSpy(source)` | `source.elements()` | **component** | `fromStore`, `fromProducer`, `fromChannel`, `fromBroker` |
| `eventStream(source)` | `source.events()` | **integration** | `fromRabbit`, `fromWebSocket` |

A component test watches a nullable port's **output tracker** (the raw records a write/publish left
behind) → `createTrackerSpy`. An integration test watches a **real transport** (facts off Rabbit,
frames off a socket) → `eventStream`. The send side, `emit`, is shared. Import from `src/dsl`:

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

A fluent spy over a source exposing `events()`. Every filter returns a new stream (immutable);
construction never blocks, so build before you act, call a terminal after.

```js
await eventStream(source)
  .ofCapability('cfb-session-discovery')
  .ofChannel('session-change-noted')
  .withPayload()
  .matchingPayload({ sessionId: exactly(mine), title: exactly('ES 101') })
  .waitUntilFound(1)
```

Filters (compose in any order): `.ofChannel(type)` (`metaData.type`), `.ofCapability(cap)`
(`metaData.capability`), `.withPayload()` (present; call before `matchingPayload`),
`.matchingPayload(schema)` (closed conformance over `event.payload`), `.where(predicate)` (escape
hatch), `.log(label?)`.

- **`matchingPayload` is a CLOSED check** — every schema key present and valid, no key outside the
  schema. Values are validators; `exactly(v)` is the common one. It always reads `event.payload`, so
  for data under another key (a WebSocket frame's `session`) use `.where(f => f.session?.sessionId === mine)`.
- There is **no `.ofType`** and **no bare `.matching`** on this engine — use `.ofChannel` and
  `.matchingPayload`.

Terminals: `.waitUntilFound(n = 1, { timeout } = {})` (wait for **n matches**, `timeout` ms default
from source), `.found()` (snapshot so far, never rejects), `.waitForNone({ during })` (`[]` after
`during` ms with no match; rejects if a match arrives — the only honest negative over a real
transport).

## The two `waitUntilFound` — do not copy the wrong one

| Engine | Call | First arg | Timeout |
|---|---|---|---|
| `createTrackerSpy` | `.waitUntilFound(seconds)` | seconds to wait | the argument itself |
| `eventStream` | `.waitUntilFound(n = 1, { timeout } = {})` | **count** of matches | `timeout` ms (`fromRabbit` default 3000) |

So `createTrackerSpy(...).waitUntilFound(1)` waits one second for any match;
`eventStream(...).waitUntilFound(3)` waits for **three** matching events.

## Sources

`createTrackerSpy` wants `{ elements(): object[], close() }`; `eventStream` wants `{ events():
object[], defaultTimeout?, close() }`.

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
`fromRabbit` for `fromWebSocket` and the `eventStream` chain above does not change. The seam between
the two engines **is** the tier boundary: component reads a tracker's `elements()`, integration
reads a transport's `events()`.
