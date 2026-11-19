# Nullable: consumer (bus in)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.


## How to use a nullable in tests:



See [`README.md`](README.md) for the spy engines.

```js
import { RabbitConsumer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
const consumer = RabbitConsumer.createNull({ channel, exchange, consumerGroup })
```

- **Real API:** `await consumer.subscribe({ capability, type }, handler)` — production code; how a
  reaction listens. The capability's module usually calls it for you in `activate`.
- **Nullable-only (drive):** `await consumer.simulate(fact)` — **"a fact arrives."** It delivers the
  fact to *this* consumer the way the broker would: routed by the fact's own `(capability, type)` to
  the queue a matching `subscribe()` bound. A fact the consumer never subscribed to is ignored (no
  bound queue) — like an unrouted key on a real broker. It returns the handler's promise, so
  `await consumer.simulate(fact)` means **"the reaction has finished running."**

You don't *spy on* the consumer — you **drive** it with `simulate`, then observe the capability's
**output** (its store write via [`event-store.md`](event-store.md), or its publish via
[`producer.md`](producer.md)). If the consumer shares an `inMemoryBroker` channel, drive the inbound
through `broker.simulate(fact)` instead — see [`in-memory-broker.md`](in-memory-broker.md).
