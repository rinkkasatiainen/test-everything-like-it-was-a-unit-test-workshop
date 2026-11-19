# Stub: query / read-model ports (the read-in edge)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.

> A query port is a plain **stub**, not a nullable — but it's the same question ("how do I substitute
> this edge?"), so it lives here. See [`README.md`](README.md) for the family.

When the capability answers a **query** (e.g. an HTTP GET against a read model), it reads from a driven
port — `events.findBySlug`, `board.list`, and so on. This is an *incoming query* (Part 1 Step 3: you
feed behaviour through it, you don't assert it), so the honest double is the simplest one: **a plain
stub that returns the rows you script** — your "simulate what the query returns." No nullable, no spy:

```js
let rows
const module = new SessionDiscoveryModule({
  discovery: {
    events:   { findBySlug: async slug => (slug === EVENT ? { slug } : null) },
    board:    { list: async () => rows },   // ← the query result you script, swapped per test
    schedule: { sessionsFor: () => [], sectionsFor: () => [] },
  },
  log: false,
})
beforeEach(() => { rows = [] })
// in a test: rows = [ { sessionId: 's-0142', … } ]; then GET and assert on res.body
```

You assert the **returned value** directly (the GET response) — no spy, because a query hands you its
answer.

**Not the same as the event store's read-back.** When a *reaction* re-reads the event log to fold
state (a materializer, reaction idempotency), the workshop deliberately does **not** script that read
— it uses a real read-back twin (`createInMemoryEventStore()`, see [`event-store.md`](event-store.md))
seeded with real appends. A scripted read there would only ever agree with what you told it, and could
never exercise the fold or the idempotency guard. **Script the query port; keep the event log real.**
