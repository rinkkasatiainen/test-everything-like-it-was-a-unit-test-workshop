# The tiers — how real the edges are

> AI-facing explanation, self-contained.

Every tier tests the **same capability doing the same job**. They differ only in how much of
the edges (store, broker, socket) is the real thing. One axis, a dial — not a ladder:

```
   real system ◀─────────────────────────────────────────▶ fast & deterministic
   e2e                    integration                    component
   whole running host     one capability + real infra    one capability + nullable infra
   poke from outside      real Rabbit / real Postgres     in-process, no Docker
```

There is a **second axis at right angles** — *how much of the capability goes in one test*
(one reaction vs the whole pipeline). That is breadth, and it has its own page:
`where-to-cut-the-flow.md`. Most "my component test feels wrong" moments are a breadth problem,
not a fidelity one.

## component — the one the workshop is named after

Boot one capability inside its real composition, in this process. The module is constructed and
`activate`d exactly as a host would. HTTP is real (real routing, real handler). What is *not* a
live process: the store (`createPostgresStore.createNull()` / `createInMemoryEventStore()` — real
SQL, in-process) and the bus (an in-memory topic exchange). Those are **nullables**, not mocks —
the capability's own code runs end to end against them, unchanged.

Reads and runs like a unit test — milliseconds, no Docker, no ports, no `sleep` — yet exercises
HTTP routing, the handler, the store, the relay, the publish.

- **Can see:** the HTTP response; every fact that reached the bus (`broker.published` /
  `producer.trackChanges()`); the capability's own write/read model, read back.
- **Cannot see (and must not fake):** whether a *real* broker routes it, whether the SQL runs on
  *real* Postgres, whether two processes connect. That is the next tier.

## integration — one capability, real infrastructure

Same capability, same test *intent*. Store is real Postgres; bus is real RabbitMQ. One capability
still — not the whole board — so the blast radius stays small. The **test body is nearly
identical to the component one; a single line changes**: the *source* of events is a real Rabbit
subscription (`fromRabbit`), not the in-memory exchange. Costs Docker and time (delivery is
genuinely async, so the test waits), and that cost *is information* — the price of the real edge.

Earns its keep on exactly what a nullable cannot answer: does the real exchange route
`<capability>.<type>` to the queue you bound; does the migration run on the real engine; do two
processes speak over a socket.

## e2e — a whole running host, poked from outside

No fixture boots anything. A host is already running (`npm run start:pg` for the e2e test, which seeds the Docker Postgres; `npm start` is the in-memory host);
the test is a client — HTTP in, WebSocket out, like a browser. Proves the wiring that only exists
when everything is up: relay draining, projection building, live channel pushing.

Powerful and fragile for the same reason — it tests reality, and reality has leftover state and
real timing. So assertions are **tolerant**: match *your* event by a correlation id you minted,
wait for "found at least one", never assert exact counts against a shared log. Keep few.

## Why not one kind of test

"Does it work for real" and "tell me exactly what broke, fast" pull in opposite directions; no
single tier gives both. Component is where you design and live day to day — fast enough for every
save, precise enough to name the fault. Integration is a *few*, aimed at the real edges. e2e are
*fewer still*, aimed at the seams between running parts. The shape is a pyramid for a reason.

## See also

- `where-to-cut-the-flow.md` — the breadth axis, and the "component-integration" name trap
- `nullables-not-mocks.md` — why the nullable edges are honest
- `../how-to/write-a-component-test.md` · `../how-to/write-an-integration-test.md` · `../how-to/write-an-e2e-test.md`
