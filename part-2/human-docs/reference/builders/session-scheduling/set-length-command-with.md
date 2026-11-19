# `setLengthCommandWith({ payload = {} } = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-scheduling-contracts` · **Builds:** the body of `POST /api/commands/set-session-length`.

```js
import { setLengthCommandWith, setSessionLengthCommandSchema, isValidSetSessionLengthCommand } from '@rinkkasatiainen/cfb-session-scheduling-contracts'
```

> Naming: the builder is `setLengthCommandWith`, but the schema and guard use the long name
> `setSessionLengthCommand…`.

## Shape

`{ payload }` only. `payload` is closed.

| `payload.` field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `commandId` | random UUID | `aNonEmptyString`: becomes the fact's `causationId` |
| `correlationId` | random UUID | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `length` | random 1–480 | `aPositiveInteger` (minutes) |

## Using it

```js
const body = setLengthCommandWith({ payload: { sessionId: 's-0142', length: 90 } })
```

> ⚠️ Top-level overrides are dropped. Use `{ payload: { length } }`, not `{ length }`.

## Verifying the shape

```js
expect(body).to.matchSchema(setSessionLengthCommandSchema)
isValidSetSessionLengthCommand(body)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-scheduling-contracts/commands/set-session-length.command.example.json`.
