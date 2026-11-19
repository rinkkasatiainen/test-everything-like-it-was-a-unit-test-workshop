# Contract testing — the agreement axis

> AI-facing explanation, self-contained.
>
> **Send the participant to:** [`human-docs/reference/contract-testing/README.md`](../../human-docs/reference/contract-testing/README.md) — what each kind of contract test proves. There is no human *explanation* yet; explain the why yourself.

The tiers all ask *does my capability behave correctly?* A contract test asks what none of them
can: **do two capabilities still agree on the message that passes between them?** A different
axis, not a rung on the ladder.

## Why the gap exists

Nothing imports anything. Scheduling publishes `session-scheduled`; Discovery reacts to it.
Neither holds a reference to the other — that decoupling is the design, and it is exactly what
removes the compiler's ability to tell you when the two sides stop agreeing. So:

- Scheduling's component test: "scheduling publishes `session-scheduled` with *this* payload" — green.
- Discovery's component test: "given *this* fact, note the change" — green.

Both green, both honest, board still broken — because *this* on each side is an independently
maintained copy of the same idea. Rename `time` to `slot` on the producer and every test stays
green. **The bug lives in the gap between the two suites, so only a test about the gap catches it.**

## The shape contract

The published fact *is* the protocol: its type routes it, its payload is the agreement. Write the
protocol down as a schema and have **both sides validate against the same copy**. Three properties
turn that into a contract:

1. **One copy, fetched — never duplicated.** Schema, builders and a committed example live in the
   capability's `contracts/` package; both sides depend on it. Two copies = not a contract.
2. **Both sides check; the consumer's half is the one people skip.** Provider proves it *sends* the
   shape; consumer proves it *reads nothing beyond* it. A consumer that quietly reads
   `payload.internalRank` has turned a private field into public API.
3. **Payload closed, metaData open.** Payload matched with `matching` (closed — an extra key is a
   leak). Envelope matched with `containing` (open — the core legitimately stamps `timestamp`,
   `causationId`, `correlationId`, `userId`). Two validators, never one with a flag.

> An unagreed envelope field is infrastructure. An unagreed payload field is a leak.

## The closed loop — why four happy cases are enough

A contract kit has four parts that must stay in step: the **schema** (spec), the **example** (a
committed recording of one real fact), the **WellKnown** (a named constant used as a fixture), and
the **builder** (the factory every other test uses). The happy flow is four edges of a closed loop:

```
  (1) example            ⊨ schema       the recording obeys the spec       (matchSchema)
  (2) WellKnown          ≡ example       the named constant IS that recording  (eql)
  (3) builder(WellKnown) ≡ example       the builder, seeded, reproduces it     (eql)
  (4) builder()          ⊨ schema (×25)  the builder, unseeded, always obeys    (matchSchema)
```

Close the loop and every downstream `buildXFactWith(...)` inherits a proof by transitivity: a
seeded build equals the recording (3), which is valid (1) and is the named constant (2); an
overridden build is schema-valid across values (4). So when a component test writes
`buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)`, the fact is already proven to
match the published schema and the recorded shape — it never re-checks the shape. **That is the
link between this axis and the tiers: the contract is where a component test gets its messages.**

A fifth happy assertion ("title is a string") would only restate what the schema already encodes
and test 4 enforces across 25 runs. Four is enough because they anchor the one factory to both the
spec and a recording.

## The failures flow — prove the schema bites

A contract test that cannot fail is theatre. Drive a known-bad fact and prove rejection, checked
**both ways** (the chai matcher `to.matchSchema` *and* the kit's exported predicate
`isValid…Fact` — a consumer may use either). Three failures show it discriminates where it
matters: an **extra payload key** (the closed-payload rule), a **missing required field**, a
**misrouted envelope** (wrong capability/type). A value boundary adds one more (interest count: 0
accepted, −1 rejected). Start from a valid fact and break one thing, so the failure is isolated.

## Reading a red CI

| Failing test | Meaning | Fix |
|---|---|---|
| provider emits the schema | the producer changed the wire shape | intended? update schema + example in a reviewed diff |
| the builder pin (`eql`) | the test data drifted from the recording | fix the builder — **never** the recording |
| consumer `matchSchema` | the consumer reads a field nobody promised | stop reading it, or negotiate it into the contract |

## Where these really live (and why they are here)

In production: the provider contract test lives in the capability's core; the consumer's in the
consuming capability; the artifact test in the contracts package. The workshop **co-locates** them
under `test/contract/` so the technique is visible in one place. Lifting out, each moves to the
package that owns that end.

## The other kind, in one paragraph

A second thing is also called a contract test: a **substitutability contract** — one test run
against both a real adapter and its nullable, proving the fake still tells the truth (the in-memory
broker still behaves like RabbitMQ, pglite still behaves like Postgres). That is what *licenses*
the nullables the component tier leans on. The event-sourcing packages own their nullable and its
substitutability contract; we do not re-prove it here — but your fast component suite is only as
honest as that contract, and it is a real test someone keeps green.

## What a contract test does NOT do

- It does not replace the component test: `{ sessionId: 'x', time: '99:99' }` can satisfy a schema
  and still be a bug — schema checks *shape*, never *value*.
- It does not prove the wiring exists — that is integration and e2e.

## See also

- `../how-to/write-a-contract-test.md` · `../reference/contract-packages.md`
- `anatomy-of-a-component-test.md` — how the builder feeds the tiers
