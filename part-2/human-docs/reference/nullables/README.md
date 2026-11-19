# Reference — nullables & their spies

> Look-up companion to the how-to's. One page per **edge** a capability talks to: how to build it as a
> nullable (no Docker, no IO), how to drive it, and how to observe what crossed it with a spy. The
> how-to's give the generic shape; come here for the per-edge specifics.

## The three kinds of method

- **The factory** — `createNull(...)` (and `createInMemoryEventStore()`, `inMemoryBroker()`). How you
  *build* the nullable / in-memory version of an adapter. Not a behaviour the thing adds — the
  constructor.
- **Real API (production code)** — `publish()`, `subscribe()`, **and `trackChanges()`**. What the
  capability and the host use for real. `trackChanges()` belongs here: output tracking (James Shore)
  is a runtime seam that works against the **real** adapter too — it is *not* a property of being
  nullable.
- **Nullable-only** — `simulate()`. The one genuine test-only affordance: deliver an inbound fact with
  no broker and no IO. (The in-memory broker *double* adds its own observation surface — see its page.)

## The two spies

Same engine, different source:

```js
import { createTrackerSpy } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { eventStream, fromStore, fromProducer, fromChannel, fromRabbit, fromWebSocket } from '../../src/dsl/index.js'
```

- `createTrackerSpy(source)` — **component tier**, reads a nullable port's output tracker.
- `eventStream(source)` — **integration tier**, reads a real transport.

Both give `.matching({ matches: r => … })`, the vocabulary sugar, and `.waitUntilFound(seconds)` — the
argument is **seconds to wait**, not a count of matches. For a deep check, wait, then read
`source.elements()` (or the tracker's `.data()`). *(Writing the matcher, and the record shape each
source hands you, will get its own reference — "matchers & record shapes" — coming next.)*

## The edges

| Edge | Page |
|---|---|
| event store (DB) | [`event-store.md`](event-store.md) |
| query / read-model ports (read-in) | [`query-ports.md`](query-ports.md) |
| producer (bus out) | [`producer.md`](producer.md) |
| consumer (bus in) | [`consumer.md`](consumer.md) |
| in-memory broker (shared exchange) | [`in-memory-broker.md`](in-memory-broker.md) |
| live channel (websocket out) | [`live-channel.md`](live-channel.md) |
| real transports (integration) | [`real-transports.md`](real-transports.md) |

See also: [`../../how-to/write-a-component-test.md`](../../how-to/write-a-component-test.md).
