# `buildSessionChangeNotedFactWith({ metadata = {}, payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** a whole `session-change-noted` fact, **board-view variant**: the fact
Session Discovery's board view writes when a session moved on the board.

```js
import {
  buildSessionChangeNotedFactWith,
  sessionChangeNotedBoardViewFactSchema,
  isValidSessionChangeNotedBoardViewFact,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

> ⚠️ The envelope key is **`metadata`** (lowercase), not `metaData` as in the Proposal and Scheduling
> facts. `buildSessionChangeNotedFactWith({ metaData: {...} })` silently ignores your override.

## Shape

```js
{
  metadata: {                    // OPEN — these must be valid, extras are allowed
    type: 'session-change-noted',    // exactly
    who: 'u-<5 chars>',              // aNonEmptyString
    when: '<now, ISO string>',         // aNonEmptyString
    eventId: 'e-<4 chars>',          // aNonEmptyString — the fact's own id, NOT the conference id
    causationId: 'e-<4 chars>',      // aNonEmptyString
    correlationId: 'r-<4 chars>',    // aNonEmptyString
    version: <1–50>,                 // aNonNegativeInteger
    why: 'board-view',               // aNonEmptyString — the variant tag
  },
  payload: <buildSessionChangeNotedWith(payload)>,   // CLOSED: eventId, sessionId, day, time
}
```

`metadata.eventId` is the fact's id, for example `e-2b7`. `payload.eventId` is the conference, for example `codefreeze-2027`. Don't mix them up.

## Using it

```js
// From a well-known: Casey's s-0142 on Tuesday 10:00
const fact = buildSessionChangeNotedFactWith(WellKnown.events.SessionChangeNoted.CaseyTueBoardView)

// Override one half independently
const moved = buildSessionChangeNotedFactWith({ payload: { day: 'd-wed' } })
const caused = buildSessionChangeNotedFactWith({ metadata: { causationId: 'e-1a0' } })
```

The builder always sets `why: 'board-view'`. Overriding `metadata.why` still passes the schema
(`why` is only `aNonEmptyString`), but it no longer describes this variant.

## Verifying the shape

```js
expect(fact).to.matchSchema(sessionChangeNotedBoardViewFactSchema)
isValidSessionChangeNotedBoardViewFact(fact)    // throws on mismatch
```

The committed recording is `events/session-change-noted.example.json` in the package. A provider-side
contract test can compare a real written fact to it.
