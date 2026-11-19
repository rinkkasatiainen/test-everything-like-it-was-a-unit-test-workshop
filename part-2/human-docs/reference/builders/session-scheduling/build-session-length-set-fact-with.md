# `buildSessionLengthSetFactWith({ metaData = {}, payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** a whole `session-length-set` fact.

```js
import {
  buildSessionLengthSetFactWith,
  sessionLengthSetFactSchema,
  isValidSessionLengthSetFact,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

## Shape

```js
{
  metaData: {                            // OPEN
    capability: 'cfb-session-scheduling',    // exactly
    type: 'session-length-set',              // exactly
    streamId: <uuid>,                        // aNonEmptyString
    version: <1–50>,                         // aPositiveInteger
  },
  payload: <buildSessionLengthSetWith(payload)>,   // CLOSED: eventId, sessionId, length
}
```

## Using it

```js
// The well-known: s-0142 is 90 minutes
const fact = buildSessionLengthSetFactWith(WellKnown.SessionLengthSet.CaseyNinety)

buildSessionLengthSetFactWith({ payload: { length: 45 } })
```

## Verifying the shape

```js
expect(fact).to.matchSchema(sessionLengthSetFactSchema)
isValidSessionLengthSetFact(fact)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-scheduling-contracts/events/session-length-set.example.json`.
