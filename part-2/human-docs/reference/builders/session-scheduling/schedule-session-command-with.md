# `scheduleSessionCommandWith({ payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** the body of `POST /api/commands/schedule-session`: place a session on
a day and time.

```js
import { scheduleSessionCommandWith, scheduleSessionCommandSchema, isValidScheduleSessionCommand } from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

## Shape

`{ payload }` only, with **no** `metaData` on a command. This differs from the flat Proposal command. `payload` is closed.

| `payload.` field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `commandId` | random UUID | `aNonEmptyString`: becomes the fact's `causationId` |
| `correlationId` | random UUID | `aNonEmptyString`: passed through |
| `sessionId` | random UUID | `aNonEmptyString` |
| `day` | `"d-<3 chars>"` | `aNonEmptyString` |
| `time` | random `"HH:MM"` | `matchingPattern(/^\d{2}:\d{2}$/)` |

## Using it

Overrides go **under `payload`**:

```js
const body = scheduleSessionCommandWith({ payload: { sessionId: 's-0142', day: 'd-tue', time: '10:00' } })
```

> ⚠️ `scheduleSessionCommandWith({ day: 'd-tue' })` **silently ignores** `day`. Only `overrides.payload` is
> read, and anything else at the top level is dropped.

## Verifying the shape

```js
expect(body).to.matchSchema(scheduleSessionCommandSchema)
isValidScheduleSessionCommand(body)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-scheduling-contracts/commands/schedule-session.command.example.json`.
`scheduleSessionCommandWith({ payload: example.payload })` deep-equals it.
