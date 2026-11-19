# Consumer contract (fact) — what I react to is, and stays, contract-valid

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/cfb-session-discovery/packages/core/test/session-scheduled.contract.test.js`.
> Copied as-is. Session Discovery is the consumer of Scheduling's `session-scheduled`.

This test runs in the **consumer's** suite against the **installed** provider package. When the provider
ships a new shape, the consumer's CI goes red at upgrade time, not at integration time. It doesn't test the
reaction's behaviour. That stays in the reaction's own tests. It only pins that the fixtures the consumer
builds on are contract-valid.

```js
import { expect, use } from 'chai'
import {
  WellKnown,
  buildSessionScheduledFactWith,
  sessionScheduledFactSchema,
} from '@rinkkasatiainen/cfb-session-scheduling-contracts'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'

use(registerSchemaMatcher)

describe('session-scheduled consumer contract', () => {
  it('the well-known fact Discovery reacts to matches the published schema', () => {
    expect(WellKnown.SessionScheduled.CaseyTue).to.matchSchema(sessionScheduledFactSchema)
  })

  it('a builder-made fact matches the published schema across 25 runs', () => {
    for (let i = 0; i < 25; i += 1) {
      expect(buildSessionScheduledFactWith()).to.matchSchema(sessionScheduledFactSchema)
    }
  })
})
```

The same two tests apply to every fact a capability consumes. Swap the package, `WellKnown` entry, builder
and schema:

| Consumes | WellKnown | Builder | Schema |
|---|---|---|---|
| `session-proposed` | `WellKnown.SessionProposed.CaseyMob` | `buildSessionProposedFactWith` | `sessionProposedFactSchema` |
| `session-scheduled` | `WellKnown.SessionScheduled.CaseyTue` | `buildSessionScheduledFactWith` | `sessionScheduledFactSchema` |
| `session-length-set` | `WellKnown.SessionLengthSet.CaseyNinety` | `buildSessionLengthSetFactWith` | `sessionLengthSetFactSchema` |
