# Anatomy of a component test — the method, not the API

> AI-facing explanation, self-contained. Human version:
> `part-2/testing/docs/explanation/anatomy-of-a-component-test.md`. For the step-by-step, see
> `../how-to/write-a-component-test.md`.

A component test asks one question: *does my capability do the right thing?* To ask it honestly it
must stop asking a second one — *is the message the right shape?* — which already has an owner, the
contract test. A component test that hand-checks the shape does two jobs half-heartedly; one that
hand-*builds* the message forges its own evidence. So the method has an order.

## 1. The shape is settled first, in a contract, then imported

The contract pins the message (schema + builder + well-known example). A component test does not
restate the shape — it **imports** it:

```js
import { WellKnown, buildSessionProposedFactWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'
const proposedEvent = buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)
```

That line is the whole discipline. The fact in the test is the provider's own, built by the
provider's own tested builder. Rename a field on the producer and its contract test goes red at the
source; the builder carries the new shape in unchanged, because nothing here copied the shape.
**Never hand-roll a message you could build** — a hand-rolled object reads fine, passes today, and
goes silently wrong the day the producer changes the fact while the object does not.

## 2. The test owns the ports and enables the module

A capability talks to the outside through ports. The test **builds the ports** (nullable) and
constructs the module over them, exactly as a real host does — there is no fixture hiding a bus:

```js
store = createPostgresStore.createNull()
consumer = RabbitConsumer.createNull({ consumerGroup: 'cfb-session-discovery' })
const module = new SessionDiscoveryModule({ eventStore: store, consumer, log: false, clock })
await module.activate({ router: {}, apiServedLocally: false })
```

The wiring the test exercises is the wiring production runs — so a passing component test is
evidence about the real composition, not a test-only harness. The integration test for the same
flow keeps this exact shape and swaps the nullable ports for real ones; that is why the two tiers
read alike.

| Collaborator | Is | Drives |
|---|---|---|
| `consumer` | the inbound port (nullable) | `consumer.simulate(fact)` — a fact arrives |
| `store` | the event store (nullable) | the reaction appends here; `store.trackChanges()` records it |
| `output` | the store's OutputTracker | `createTrackerSpy(fromStore(output))` — read what was written |

## 3. Observe the write, not the read-back

A nullable store runs the real store SQL with the database nulled out. It keeps **no state**, so
there is nothing to read back — deliberate, not a limitation. The component test asserts the
capability's **output**: the write it made, off the OutputTracker. The write is the behaviour under
test. Whether that write then reaches the bus rides the relay (which reads the store back, and a
no-state nullable publishes nothing by design) — so "the write reaches the bus" is proven once, in
the integration or component-integration test for the same flow.

## 4. The body reads as the flow happens

Arrange with the builder, act by delivering to the inbound port, assert on what was written. No
fixture threading, no mock, no "was publish called":

```js
await consumer.simulate(proposedEvent)   // a fact ARRIVES — the reaction runs
await createTrackerSpy(fromStore(output))
  .matching(ofOp('append'))
  .matching(appendedType('session-change-noted'))
  .matching(appendedPayload({ sessionId: 's-0142', title: 'Mob testing legacy code', proposer: 'u-casey', duration: 60 }))
  .waitUntilFound(1)
```

Read it as a sentence: a `session-proposed` arrives, and a `session-change-noted` is appended
naming the same session. The matchers (`ofOp`, `appendedType`, `appendedPayload`) sit at the top of
the file, because the altitude they check is the *test's* decision, not the spy's.

## 5. What this frees the test to actually test

Because shape is the contract's problem, the component test spends all its attention on the
behaviour no schema can check:

- **the mapping** — `userId` becomes `proposer`, `duration` rides along, `description` is dropped;
- **idempotency** — a redelivered fact appends no second fact (the thing that bites in production);
- **selectivity** — a fact type the capability does not consume is ignored.

## The loop, stated once

| Test | Question | Leans on |
|---|---|---|
| contract — provider | does the capability emit this shape? | the schema |
| contract — artifact | does the builder reproduce the recorded shape? | the well-known example |
| contract — consumer | does the reader need nothing beyond the shape? | the schema |
| **component** | does the capability behave right, given a real message? | the **builder** (so the message is real) |
| integration | are the two sides actually plugged together? | real Postgres + RabbitMQ |
| e2e | does it work running? | a whole host |

Pull the builder out of the component row and it collapses into a test that is green about a shape
nobody verified. That is why the method starts with the contract, and why a component test's first
import is the provider's package.
