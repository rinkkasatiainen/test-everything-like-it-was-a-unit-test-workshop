# `local-dev/testing` — test a capability in isolation, while it runs in a host

Workshop material for **"test everything like (it was) a unit test"**.

The claim in the title is not a wish. A capability here runs inside a real host — composed
through the real composition root, driven over real HTTP — and the test that checks it still
reads like a unit test: arrange, act, assert, no mocking framework. What makes that possible is
that the infrastructure at the edges is **nullable**: the event store is a Postgres compiled to
WASM running in-process, the message bus is an in-memory topic exchange, and the test observes
what crossed each boundary by reading it back, not by setting expectations up front.

One capability. Its own host. Poked from outside. Observed at the edge. Three flows:

| Flow | Example in this folder | Tier it shines at |
|---|---|---|
| **HTTP → bus** | `POST /api/commands/propose-session` publishes `session-proposed` | component |
| **bus → bus** | Discovery reacts to `session-proposed`, emits `session-change-noted` | component |
| **bus → WebSocket** | a board update is pushed to a connected client | e2e (feature under construction) |

## The three tiers

Same intent, more of the real system each step down. The *test body barely changes* — only
where the events come from.

| Tier | What's real | Docker? | Run it |
|---|---|---|---|
| **component** | the capability + host; store and bus are nullable | **no** | `yarn test` |
| **integration** | + real Postgres and real RabbitMQ (one capability) | yes | `yarn db:up` (in `../host`), then `yarn test:integration` |
| **e2e** | a whole running host, poked from outside | a running host | `yarn test:e2e` |

The seam between component and integration is a single swapped *source*, not a rewrite. That
seam is the lesson, so it is drawn on purpose rather than hidden — see
[`docs/explanation/testing-levels.md`](docs/explanation/testing-levels.md).

## Contract tests — a different axis, not a tier

The three tiers above all ask *does my capability do the right thing*. A **contract test** asks a
different question — *do two capabilities still agree on the message between them* — and it does
not sit on the fast↔real dial at all. It guards the seams the pyramid tests across.

A component test proves Proposal *publishes* `session-proposed`. It cannot prove that shape is the
one Discovery *expects* — both sides can be green while the payload quietly drifted. The contract
test closes that gap: provider and consumer both validate against **one published artifact**.

```bash
yarn test:contract     # offline — reads the provider's published contract package
```

Both capabilities now ship one — `@rinkkasatiainen/cfb-session-scheduling-contracts` and
`@rinkkasatiainen/cfb-session-proposal-contracts` (the `session-proposed` event + `propose-session`
command, with schema, builders and a well-known example). See
[`docs/explanation/contract-testing.md`](docs/explanation/contract-testing.md).

**And the axis feeds the tiers.** The contract is not only a drift-check off to the side — it is
where a component test gets its messages. A bus → bus component test builds the fact it injects
with the provider's own tested *builder*, never by hand, so the shape is verified once and reused
everywhere. That method is [`docs/explanation/anatomy-of-a-component-test.md`](docs/explanation/anatomy-of-a-component-test.md).

## The documentation ([Diátaxis](https://diataxis.fr))

- **Learn** — [tutorial/your-first-component-test.md](docs/tutorial/your-first-component-test.md): write the HTTP→bus test from an empty file.
- **Do** — how-to, one per tier: [component](docs/how-to/write-a-component-test.md) · [integration](docs/how-to/write-an-integration-test.md) · [e2e](docs/how-to/write-an-e2e-test.md) · [contract](docs/how-to/write-a-contract-test.md) · [inject a failure](docs/how-to/inject-a-failure.md).
- **Look up** — reference: the [event-stream DSL](docs/reference/event-stream-dsl.md) · the [port vocabulary](docs/reference/ports.md) · the [contract packages](docs/reference/contract-packages.md).
- **Understand** — explanation: [the tiers, and why they exist](docs/explanation/testing-levels.md) · [where to cut the flow](docs/explanation/where-to-cut-the-flow.md) · [anatomy of a component test](docs/explanation/anatomy-of-a-component-test.md) · [nullables, spies and mocks](docs/explanation/nullables-and-spies.md) · [contract testing](docs/explanation/contract-testing.md).

## Status

The **test lists are written; the bodies are not** — every `it` is pending (`todo`). That is the
house order: a test list, then a design the author confirms, then the code. The design the bodies
need — the `eventStream` DSL and the port vocabulary — lives in `docs/reference/` and has
**no implementation under `src/` yet**. Writing `src/` is the next step, once the reference is
agreed.

Flow 3 (bus → WebSocket) has no server to connect to yet — the host has no WebSocket endpoint.
Those tests are pending against a feature being built in parallel, and are marked as such.

The **contract** test lists are the exception that can go green now: Scheduling's needs no DSL and
no host — only the published `cfb-session-scheduling-contracts` package, which already exists. They
mirror the tests already living in that package, co-located here to teach the technique in one
place. Proposal's contract list is pending a contracts package that does not exist yet.
