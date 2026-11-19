# `buildSessionLengthSetWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** the **payload** of a `session-length-set` fact: a session's length
in minutes. This fact is separate from `session-scheduled`. For the whole fact, see
[`buildSessionLengthSetFactWith`](build-session-length-set-fact-with.md).

```js
import { buildSessionLengthSetWith, sessionLengthSetFactSchema } from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

## Shape

**Closed.**

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `length` | random 1–480 | `aPositiveInteger` (minutes) |

## Using it

```js
const payload = buildSessionLengthSetWith({ sessionId: 's-0142', length: 90 })
```

## Verifying the shape

```js
sessionLengthSetFactSchema.payload(payload, 'payload')   // throws on mismatch
```

Rejected: `length: 0`, `-1`, `1.5`, `'90'`.
