# `buildSessionScheduledFactWith({ metaData = {}, payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** a whole `session-scheduled` fact. Session Discovery's
note-session-change reacts to it and moves the session on the board.

```js
import {
  buildSessionScheduledFactWith,
  sessionScheduledFactSchema,
  isValidSessionScheduledFact,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

## Shape

```js
{
  metaData: {                            // OPEN
    capability: 'cfb-session-scheduling',    // exactly
    type: 'session-scheduled',               // exactly
    streamId: <uuid>,                        // aNonEmptyString
    version: <1–50>,                         // aPositiveInteger
  },
  payload: <buildSessionScheduledWith(payload)>,   // CLOSED: eventId, sessionId, day, time
}
```

## Using it

```js
// The well-known: Casey drops s-0142 on Tuesday 10:00
const fact = buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue)

// Into a component test (from src/dsl/emit.js)
await emit(host.broker.producer).publish(buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue))

// One field changed, the rest random
buildSessionScheduledFactWith({ payload: { day: 'd-wed' } })
```

`streamId` is random and **not** tied to `payload.sessionId`. In the real system they are equal, because the session is
its stream. If the code under test relies on that, set both:
`buildSessionScheduledFactWith({ metaData: { streamId: id }, payload: { sessionId: id } })`.

## Verifying the shape

```js
expect(fact).to.matchSchema(sessionScheduledFactSchema)
isValidSessionScheduledFact(fact)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-scheduling-contracts/events/session-scheduled.example.json`. It deep-equals
`buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue)`.
