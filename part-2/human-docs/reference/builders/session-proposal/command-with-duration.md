# `commandWithDuration(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-proposal-contracts` · **Builds:** a `propose-session` command body that **explicitly** carries a
`duration`. It is a thin wrapper: `commandWith({ duration: <random 15–120>, ...overrides })`.

```js
import { commandWithDuration, proposeSessionCommandSchema, isValidProposeSessionCommand } from '@rinkkasatiainen/cfb-session-proposal-contracts'
```

## Shape

The [`commandWith`](command-with.md#shape) shape, plus:

| Field | Builder default | Contract |
|---|---|---|
| `duration` | random 15–120 | `optional(aPositiveInteger)` (minutes) |

## Using it

```js
const body = commandWithDuration({ duration: 90 })
// then: the resulting session-proposed fact carries payload.duration === 90

const defaulted = commandWith()
// then: payload.duration === 60, the core's default
```

The pair is useful for the two branches of "duration given vs defaulted".

## Verifying the shape

```js
expect(body).to.matchSchema(proposeSessionCommandSchema)
isValidProposeSessionCommand(body)   // throws on mismatch
```

The schema rejects `duration: 0`, `-5`, `1.5` and `'90'`. Recording:
`@rinkkasatiainen/cfb-session-proposal-contracts/commands/propose-session-with-duration.command.example.json`.
