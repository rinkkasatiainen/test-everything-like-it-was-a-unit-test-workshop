# `buildSessionChangeNotedWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** the **payload** of a `session-change-noted` fact, **board-view
variant** (a session moved on the board). For the whole fact, see
[`buildSessionChangeNotedFactWith`](build-session-change-noted-fact-with.md).

```js
import { buildSessionChangeNotedWith, sessionChangeNotedBoardViewFactSchema } from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

## Shape

**Closed.**

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `day` | `"d-<3 chars>"` | `aNonEmptyString` |
| `time` | random `"HH:MM"` | `matchingPattern(/^\d{2}:\d{2}$/)` |

## Using it

```js
const payload = buildSessionChangeNotedWith({ sessionId: 's-0142', day: 'd-tue', time: '10:00' })
```

Use it on its own when the thing under test only sees the payload, for example a read-model fold or a
projection step. If anything reads `metadata`, build the fact instead.

## Verifying the shape

No payload-only schema is exported. Validate against the payload half of the fact schema:

```js
import { conformsTo } from '@rinkkasatiainen/cfb-schema-matcher'

const { payload: payloadSchema } = sessionChangeNotedBoardViewFactSchema   // matching({...}), a validator
payloadSchema(payload, 'payload')                                          // throws on mismatch

// Or check the whole fact:
expect(fact).to.matchSchema(sessionChangeNotedBoardViewFactSchema)
```
