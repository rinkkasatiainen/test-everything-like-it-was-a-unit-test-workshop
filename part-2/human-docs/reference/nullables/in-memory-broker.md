# Double: in-memory broker (a shared exchange)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.

See [`README.md`](README.md) for the family.

```js
import { inMemoryBroker } from '@rinkkasatiainen/cfb-event-sourcing-testing'
const broker = inMemoryBroker()
```

One object that is *both* the producer's and the consumer's channel, so a publish → deliver flow runs
with no RabbitMQ. A **fresh instance per call** — pass the *same* one to a producer and a consumer to
connect them.

- `broker.simulate(event)` — publish-and-route a fact into the exchange (drive an inbound this way
  when a reaction consumes off this broker).
- `await broker.settled()` — wait until every delivered handler has run (publish-confirm is immediate
  and independent of delivery, as on a real broker).
- `broker.published` — the raw log of everything published; `broker.acks` / `broker.nacks` record the
  ack/nack. Low-level: prefer a producer's `trackChanges()` spy ([`producer.md`](producer.md)) for the
  higher-level view.
