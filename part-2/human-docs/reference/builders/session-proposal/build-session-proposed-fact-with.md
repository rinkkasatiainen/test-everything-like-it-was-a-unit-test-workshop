# `buildSessionProposedFactWith({ metaData = {}, payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-proposal-contracts` · **Builds:** a whole `session-proposed` fact, the way the event-sourcing core
stores it. Session Discovery reacts to it and shows the new session on the board.

```js
import {
  buildSessionProposedFactWith,
  sessionProposedFactSchema,
  isValidSessionProposedFact,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-proposal-contracts'
```

## Shape

```js
{
  metaData: {                          // OPEN — these four must be valid, the core adds more
    capability: 'cfb-session-proposal',    // exactly
    type: 'session-proposed',              // exactly
    streamId: <uuid>,                      // aNonEmptyString — the session is its stream
    version: <1–50>,                       // aPositiveInteger (0 is NOT valid here)
  },
  payload: <buildSessionProposedWith(payload)>,   // CLOSED
}
```

The real core also stamps `timestamp`, `causationId`, `correlationId`, `userId` and `why` on
`metaData`. The builder leaves them out. Because the envelope is open, a fact with or without them is
valid.

## Using it

```js
// The well-known: Casey proposes s-0142, "Mob testing legacy code", 60 min
const fact = buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)

// Publish it into a nullable producer / simulate it into a consumer
await emit(host.broker.producer).publish(fact)

// Negative paths: misrouted fact
buildSessionProposedFactWith({ metaData: { capability: 'cfb-session-scheduling' } })
buildSessionProposedFactWith({ metaData: { type: 'session-scheduled' } })
```

## Verifying the shape

```js
expect(fact).to.matchSchema(sessionProposedFactSchema)
isValidSessionProposedFact(fact)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-proposal-contracts/events/session-proposed.example.json`. `buildSessionProposedFactWith(WellKnown.SessionProposed.CaseyMob)` deep-equals it.
