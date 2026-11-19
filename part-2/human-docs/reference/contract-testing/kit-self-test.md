# Kit self-test — schema, recording, WellKnown and builder agree

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/local-dev/testing/test/contract/scheduling-session-scheduled.contract.test.js`.
> Change: the recording is imported from the installed package instead of a copied `./examples/` file.
> The same shape exists for `session-proposed` (`proposal-session-proposed.contract.test.js`) and
> `session-change-noted` (`discovery-session-change-noted.contract.test.js`).

## The four happy cases, read as a chain

1. **example ⊨ schema**: the committed recording obeys the spec.
2. **WellKnown ≡ example**: the named constant *is* that recording (`eql`).
3. **builder(WellKnown) ≡ example**: the builder, seeded with the constant, reproduces the recording.
4. **builder() ⊨ schema** ×25: the builder with random data is always valid.

Together they tie the one factory every test uses (the builder) to both the spec and a real recording. So
every `buildXFactWith(...)` in your other tests inherits the proof.

## The failure cases

You need three: an **extra payload key** (the closed-payload rule), a **missing required field**, and a
**misrouted envelope** (wrong `capability` or `type`). Add a **domain boundary** where the fact has one,
for example `interestCount: 0` accepted and `-1` rejected.

## Example

```js
// test/contract/session-scheduled.contract.test.js
import { expect, use } from 'chai'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'
import example from '@rinkkasatiainen/cfb-session-scheduling-contracts/events/session-scheduled.example.json' with { type: 'json' }
import {
  buildSessionScheduledFactWith,
  isValidSessionScheduledFact,
  sessionScheduledFactSchema,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-scheduling-contracts'

use(registerSchemaMatcher)

describe('session-scheduled event contract', () => {
  describe('happy flow', () => {
    it('the committed example matches the fact schema', () => {
      expect(example).to.matchSchema(sessionScheduledFactSchema)
    })

    it('WellKnown.SessionScheduled.CaseyTue equals the committed example', () => {
      expect(WellKnown.SessionScheduled.CaseyTue).to.eql(example)
    })

    it('the builder seeded from CaseyTue reproduces the recording', () => {
      const fact = buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue)

      expect(fact).to.eql(example)
    })

    it('builder -> matches schema', () => {
      for (let i = 0; i < 25; i += 1) {
        expect(buildSessionScheduledFactWith()).to.matchSchema(sessionScheduledFactSchema)
      }
      isValidSessionScheduledFact(buildSessionScheduledFactWith())
    })
  })

  describe('failures flow', () => {
    it('rejects an extra payload key', () => {
      const fact = buildSessionScheduledFactWith()
      fact.payload.extra = 'nope'

      expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/extra/)
      expect(() => isValidSessionScheduledFact(fact)).to.throw(/extra/)
    })

    it('rejects a payload missing time', () => {
      const fact = buildSessionScheduledFactWith()
      delete fact.payload.time

      expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/time/)
      expect(() => isValidSessionScheduledFact(fact)).to.throw(/time/)
    })

    it('rejects metaData with the wrong capability', () => {
      const fact = buildSessionScheduledFactWith({ metaData: { capability: 'cfb-other' } })

      expect(() => expect(fact).to.matchSchema(sessionScheduledFactSchema)).to.throw(/capability/)
    })
  })
})
```

## Extra cases worth copying from the other kits

From `proposal-session-proposed.contract.test.js`. These cover an optional field and an **open** envelope:

```js
it('eventId and description are optional but validated when present', () => {
  const withBoth = buildSessionProposedFactWith({
    payload: buildSessionProposedWith({ eventId: 'codefreeze-2025', description: 'Bring a laptop' }),
  })
  expect(withBoth).to.matchSchema(sessionProposedFactSchema)
})

it('the envelope is matched open — the core adds causationId, correlationId, timestamp', () => {
  const fact = buildSessionProposedFactWith()
  fact.metaData.timestamp = '2026-02-02T19:30:00+01:00'
  fact.metaData.causationId = 'c-8f31'
  fact.metaData.correlationId = 'r-55a'
  fact.metaData.userId = 'u-casey'
  fact.metaData.why = 'scheduling'
  expect(fact).to.matchSchema(sessionProposedFactSchema)
})

it('rejects an empty description when present', () => {
  const fact = buildSessionProposedFactWith({ payload: buildSessionProposedWith({ description: '' }) })
  expect(() => expect(fact).to.matchSchema(sessionProposedFactSchema)).to.throw(/description/)
})
```

From `discovery-session-change-noted.contract.test.js`. These cover a **domain boundary**, and the Discovery
`metadata` spelling:

```js
it('accepts an interest count of zero', () => {
  const fact = buildInterestNotedFactWith({ payload: { interestCount: 0 } })
  expect(fact).to.matchSchema(sessionChangeNotedInterestFactSchema)
})

it('rejects a negative interest count', () => {
  const fact = buildInterestNotedFactWith({ payload: { interestCount: -1 } })
  expect(() => expect(fact).to.matchSchema(sessionChangeNotedInterestFactSchema)).to.throw(/interestCount/)
  expect(() => isValidSessionChangeNotedInterestFact(fact)).to.throw(/interestCount/)
})

it('rejects metadata with the wrong type', () => {
  const fact = buildSessionChangeNotedFactWith({ metadata: { type: 'something-else' } })   // metadata, lowercase
  expect(() => expect(fact).to.matchSchema(sessionChangeNotedBoardViewFactSchema)).to.throw(/type/)
})
```
