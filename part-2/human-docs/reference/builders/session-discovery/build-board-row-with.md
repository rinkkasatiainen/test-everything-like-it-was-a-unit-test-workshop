# `buildBoardRowWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** one **materialized board row**: the folded state of one session the
live board shows. Wrapped in a frame, it travels on the board channel (see
[`buildBoardRowPushWith`](build-board-row-push-with.md)).

```js
import { buildBoardRowWith, boardRowSchema } from '@rinkkasatiainen/cfb-session-discovery-contracts'
import { conformsTo } from '@rinkkasatiainen/cfb-schema-matcher'
```


## Shape

**Closed.** Only `sessionId` and `version` are required. A proposed-but-unscheduled session legitimately
has no `day`/`time`/`place`/`interestCount`. The builder's default is a **fully-scheduled** row.

| Field | Builder default | Contract |
|---|---|---|
| `sessionId` | random UUID | `aNonEmptyString` (required) |
| `version` | random 1–50 | `aNonNegativeInteger` (required) |
| `eventId` | one of `codefreeze-2025/26/27` | `optional(aNonEmptyString)` |
| `title` | 12 random chars | `optional(aString)` |
| `proposer` | `"u-<5 chars>"` | `optional(aString)` |
| `day` | `"d-<3 chars>"` | `optional(aNonEmptyString)` |
| `time` | random `"HH:MM"` | `optional(matchingPattern(/^\d{2}:\d{2}$/))` |
| `place` | 6 random chars | `optional(aString)` |
| `length` | random 15–90 | `optional(aNumber)` |
| `interestCount` | random 0–99 | `optional(aNonNegativeInteger)` |
| `status` | `'scheduled'` | `optional(aNonEmptyString)` |

## Using it

```js
const row = buildBoardRowWith({ sessionId: 's-0142', day: 'd-tue', time: '10:00' })

// A partial row: proposed, not yet scheduled. Overriding with undefined is NOT the same as absent:
// the key still exists. Delete it.
const proposed = buildBoardRowWith({ status: 'proposed' })
delete proposed.day; delete proposed.time; delete proposed.place; delete proposed.interestCount
```

## Verifying the shape

```js
import { conformsTo } from '@rinkkasatiainen/cfb-schema-matcher'

expect(row).to.matchSchema(boardRowSchema)   // chai, after use(registerSchemaMatcher)
conformsTo(row, boardRowSchema)              // throws on mismatch
```

> ⚠️ **Do not use `isValidBoardRow`** in `@rinkkasatiainen/cfb-session-discovery-contracts@1.0.0`. It is written as
> `conformsTo(boardRowSchema, input)`, with the arguments swapped, so it treats your row as the schema. It
> throws on **every** input: `"eventId" does not match the contract: validator is not a function` for a
> valid row, `missing required field "nonsense"` for garbage. A fix belongs in the package. Until then, call
> `conformsTo(row, boardRowSchema)` directly.

`undefined` passes `optional(...)`, so `{ ...row, day: undefined }` validates. That is not proof the
provider *omits* the field. If absence is the behaviour under test, assert `expect(row).not.to.have.property('day')`.
