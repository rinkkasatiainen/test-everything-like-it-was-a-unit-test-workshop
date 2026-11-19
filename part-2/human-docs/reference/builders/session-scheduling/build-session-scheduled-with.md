# `buildSessionScheduledWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** the **payload** of a `session-scheduled` fact: a session was placed
on a day and time. For the whole fact, see [`buildSessionScheduledFactWith`](build-session-scheduled-fact-with.md).

```js
import { buildSessionScheduledWith, sessionScheduledFactSchema } from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

## Shape

**Closed.**

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `day` | `"d-<3 chars>"` | `aNonEmptyString` |
| `time` | random `"HH:MM"` | `matchingPattern(/^\d{2}:\d{2}$/)` |

The pattern only checks the format. `'99:99'` passes, `'9:00'` does not.

## Using it

```js
const payload = buildSessionScheduledWith({ sessionId: 's-0142', day: 'd-tue', time: '10:00' })
```

## Verifying the shape

```js
sessionScheduledFactSchema.payload(payload, 'payload')   // throws on mismatch
```
