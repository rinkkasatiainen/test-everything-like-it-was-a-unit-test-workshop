# How to write a contract test

> AI-facing recipe, self-contained. Prove a published contract kit is internally consistent, so
> every capability that imports it can trust it. Worked on `session-scheduled`; the same shape fits
> `session-proposed` and `session-change-noted`.
>
> **Send the participant to:** [`human-docs/reference/contract-testing/kit-self-test.md`](../../human-docs/reference/contract-testing/kit-self-test.md) (and the other pages in that folder). This file is for the coach.

## What this test covers

A contract kit ships four things that must agree: the **schema** (spec — payload closed, metaData
open), the **example** (a committed JSON recording of one real fact), the **WellKnown** (a named
constant fixture), and the **builder** (the factory every test uses). This test pins the four into
one closed loop, then proves the schema rejects bad facts. It does not run the real command or
reaction — those provider-end and consumer-end tests live in the capability's own packages.

## Before you start

Depend on the provider's contracts package — **never a copied schema** — and register its chai-free
matcher with your own chai. No Docker, no host, no network; `npm run test:contract` runs offline.

```js
import { use, expect } from 'chai'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'
import example from './examples/session-scheduled.example.json' with { type: 'json' }
import { sessionScheduledFactSchema, buildSessionScheduledFactWith, isValidSessionScheduledFact, WellKnown }
  from '@rinkkasatiainen/cfb-session-scheduling-contracts'

use(registerSchemaMatcher) // adds .matchSchema to your chai
```

## The happy flow — four tests pin the kit together

```js
describe('happy flow', () => {
  it('the committed example matches the fact schema', () => {
    expect(example).to.matchSchema(sessionScheduledFactSchema)
  })
  it('WellKnown.SessionScheduled.CaseyTue equals the committed example', () => {
    expect(WellKnown.SessionScheduled.CaseyTue).to.eql(example)
  })
  it('the builder seeded from CaseyTue reproduces the recording', () => {
    expect(buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue)).to.eql(example)
  })
  it('the default builder matches the schema across 25 random runs', () => {
    for (let i = 0; i < 25; i += 1) {
      expect(buildSessionScheduledFactWith()).to.matchSchema(sessionScheduledFactSchema)
    }
    isValidSessionScheduledFact(buildSessionScheduledFactWith())
  })
})
```

Read the four as a chain: (1) example ⊨ schema, (2) WellKnown ≡ example, (3) builder(WellKnown) ≡
example, (4) builder() ⊨ schema ×25. **`eql` for the pins** (is my fixture the real recording),
**`matchSchema` for the spec checks** (is the shape agreed). Why four is enough — not one per
field — is `../explanation/contract-testing.md`.

## The failures flow — prove the schema bites, both ways

Each rejection checked through the chai matcher **and** the exported predicate (a consumer may use
either). Start from a valid fact and break **one** thing, so the failure is isolated.

```js
describe('failures flow', () => {
  it('rejects an extra payload key', () => {
    const fact = buildSessionScheduledFactWith(); fact.payload.extra = 'nope'
    expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/extra/)
    expect(() => isValidSessionScheduledFact(fact)).to.throw(/extra/)
  })
  it('rejects a payload missing time', () => {
    const fact = buildSessionScheduledFactWith(); delete fact.payload.time
    expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/time/)
    expect(() => isValidSessionScheduledFact(fact)).to.throw(/time/)
  })
  it('rejects metaData with the wrong capability', () => {
    const fact = buildSessionScheduledFactWith({ metaData: { capability: 'cfb-other' } })
    expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/capability/)
  })
})
```

Three failures show it discriminates where it matters: an **extra payload key** (the closed-payload
rule), a **missing required field**, a **misrouted envelope**. A domain boundary adds one more —
`session-change-noted`'s interest variant accepts a count of 0 and rejects −1, a value rule a
required-field check never reaches.

## Variants: run the loop once per variant

When a fact has variants (Discovery's `session-change-noted` has a board-view and an interest-count
variant), run the four-happy loop **once per variant**, each with its own schema, example, WellKnown
and builder, and add the interest variant's value-boundary negative.

## Where the provider and consumer tests live

This file guards the **kit**. Two more complete the agreement and in production live elsewhere: the
**provider end** (the real capability emits a schema-matching fact) in the capability's core; the
**consumer end** (the reaction reads nothing beyond the schema) in the consuming capability. They
are co-located here only to teach the technique in one place.

## Rules of thumb (literal)

- **Depend on the contracts package; never copy a schema or example into a test.**
- **`eql` for the pins, `matchSchema` for the spec checks.**
- **WellKnown for the pin, a random builder ×25 for the schema runs.**
- **Check rejections through both validators** (`to.matchSchema` and `isValid…Fact`).
- **A green contract test does not mean the value is right or the wiring exists** — keep the
  component and integration tiers for the rest.

## See also

- `../explanation/contract-testing.md` — why the gap exists, why four happy cases are enough.
- `../reference/contract-packages.md` — what each capability's kit ships.
