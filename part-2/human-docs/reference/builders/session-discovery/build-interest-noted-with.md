# `buildInterestNotedWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** the **payload** of a `session-change-noted` fact, **interest-count
variant** (a session's interest total changed). For the whole fact, see
[`buildInterestNotedFactWith`](build-interest-noted-fact-with.md).

```js
import { buildInterestNotedWith, sessionChangeNotedInterestFactSchema } from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

## Shape

**Closed.**

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `interestCount` | random 0–99 | `aNonNegativeInteger` (0 is valid) |

## Using it

```js
const payload = buildInterestNotedWith({ sessionId: 's-0142', interestCount: 2 })
const nobody  = buildInterestNotedWith({ interestCount: 0 })   // valid edge
```

## Verifying the shape

No payload-only schema is exported. Use the payload half of the fact schema:

```js
sessionChangeNotedInterestFactSchema.payload(payload, 'payload')   // throws on mismatch
```

Negative paths the contract rejects: `interestCount: -1`, `interestCount: 1.5`, `interestCount: '2'`, or any
extra field, such as a board-view `day` leaking in.
