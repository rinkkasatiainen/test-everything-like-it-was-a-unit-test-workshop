# Nullable: producer (bus out)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.

See [`README.md`](README.md) for the spy engines.

```js
import { RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
const producer = RabbitProducer.createNull({ channel, exchange })
```

- **Real API:** `await producer.publish(event)` → an `Eventually` (resolve = accepted, reject = nack).
  Production code — the relay calls it to put a fact on the bus.
- **Observe (output tracking — a production seam):** `producer.trackChanges()` → a tracker.
- **Spy:** `createTrackerSpy(fromProducer(producer.trackChanges())).matching(…).waitUntilFound(1)`.
  Record: `{ routingKey, event }`.

Prefer the tracker over poking `broker.published` — it observes the real producer and works unchanged
against a real one.
