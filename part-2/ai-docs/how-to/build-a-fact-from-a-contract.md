# How to build a fact (or command) from a contract — never by hand

> AI-facing recipe, self-contained. The one habit the whole technique rests on.

Every message a test injects — the inbound fact for a reaction, the command for a handler — comes
from the **provider's published builder**, not from an object literal you typed. A hand-rolled
payload is a second, unversioned copy of the agreement; it passes today and goes silently wrong the
day the provider changes the shape while your literal does not.

## Import the builder and the well-known seed

```js
import { buildSessionProposedFactWith, WellKnown } from '@rinkkasatiainen/cfb-session-proposal-contracts'
```

- **`WellKnown.SessionProposed.CaseyMob`** — a fixed, named example fact. Use it when you want a
  known, stable payload you can assert exact values against.
- **`buildSessionProposedFactWith(seed)`** — the factory. Seeded with a well-known it reproduces
  that exact recording; called with overrides it produces a schema-valid fact with your fields.

```js
// a known fact, exact values you can assert on:
const proposed = buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)

// a fresh fact with specific fields (the rest randomised but schema-valid):
const proposed = buildSessionProposedFactWith({ payload: { title: 'ES 101' } })

// no seed at all — a fully random, schema-valid fact (good for integration, where each
// run must be fresh so the real store's idempotency does not suppress a reused id):
const proposed = buildSessionProposedFactWith()
```

Commands have their own builders in the same package. Proposal ships `commandWith({ title: 'ES 101' })`
and `commandWithDuration(...)`, whose fields sit at the top level (`command.sessionId`). Scheduling
ships `scheduleSessionCommandWith(...)` and `setLengthCommandWith(...)`, whose fields are **nested**
under `command.payload` (`command.payload.sessionId`) — so read the two shapes off the builder, never
assume they match.

## Why this is safe

The provider's contract test closes a loop (`../explanation/contract-testing.md`): the builder is
pinned to a committed recording and proven schema-valid across 25 random runs. So a fact from the
builder is **already proven** to match the published schema and the recorded shape. Your test never
re-checks the shape — it was checked once, in the contract test, and inherited here.

## The rule, stated plainly

- **Never** write `const fact = { metaData: {...}, payload: {...} }` by hand in a tier test.
- **Always** import the provider's builder and seed it.
- If no builder exists yet for the message you need, that is a gap in the contract package — flag
  it; do not paper over it with a literal. (See `../reference/contract-packages.md` for what each
  capability ships.)

## See also

- `../explanation/contract-testing.md` — why the builder can be trusted
- `../explanation/anatomy-of-a-component-test.md` — how the builder feeds the tiers
- `../reference/contract-packages.md` — the builders and well-knowns each capability exports
