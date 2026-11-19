# `buildInterestNotedFactWith({ metadata = {}, payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** a whole `session-change-noted` fact, **interest-count variant**.

```js
import {
  buildInterestNotedFactWith,
  sessionChangeNotedInterestFactSchema,
  isValidSessionChangeNotedInterestFact,
  WellKnown,
} from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

> ⚠️ The envelope key is **`metadata`** (lowercase). `metaData` is silently ignored.

## Shape

```js
{
  metadata: {                    // OPEN — same envelope as the board-view variant
    type: 'session-change-noted', who, when, eventId, causationId, correlationId, version,
    why: 'interest-count',       // the variant tag
  },
  payload: <buildInterestNotedWith(payload)>,   // CLOSED: eventId, sessionId, interestCount
}
```

For the envelope fields, see [`buildSessionChangeNotedFactWith`](build-session-change-noted-fact-with.md#shape).

## Using it

```js
// From a well-known: s-0142 now has two interested. causationId points at another capability's fact
const fact = buildInterestNotedFactWith(WellKnown.events.SessionChangeNoted.CaseyInterestTwo)

const bumped = buildInterestNotedFactWith({ payload: { sessionId: 's-0142', interestCount: 3 } })
```

## Verifying the shape

```js
expect(fact).to.matchSchema(sessionChangeNotedInterestFactSchema)
isValidSessionChangeNotedInterestFact(fact)   // throws on mismatch
```

The two variants share `type: 'session-change-noted'`. Only `metadata.why` tells them apart. A
board-view fact fails the interest schema, because its payload has `day`/`time` and no `interestCount`.
Validate against the schema for the variant you expect. The committed recording is
`events/session-change-noted.interest.example.json`.
