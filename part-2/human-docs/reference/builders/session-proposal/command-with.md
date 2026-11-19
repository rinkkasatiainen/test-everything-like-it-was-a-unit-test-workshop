# `commandWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-proposal-contracts` · **Builds:** the body of `POST /api/commands/propose-session` **without**
`duration`. That is what the UI sends. With no `duration`, the core defaults to 60 minutes.

```js
import { commandWith, proposeSessionCommandSchema, isValidProposeSessionCommand } from '@rinkkasatiainen/cfb-session-proposal-contracts'
```

## Shape

**Closed.** The body is flat: there is **no** `payload`/`metaData` envelope. This differs from the
Scheduling commands.

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString`: minted by the frontend |
| `title` | `"<4 chars> <6 chars>"` | `aNonEmptyString` |
| `commandId` | `"c-<6 chars>"` | `aNonEmptyString`: minted by the frontend |
| `duration` | *not set* | `optional(aPositiveInteger)` |

`userId`, `who`, `why` and `correlationId` belong to the backend and must **not** be on the body. Adding
them fails the closed schema.

## Using it

```js
const body = commandWith({ title: 'Mob testing legacy code' })

await request(host.server).post('/api/commands/propose-session').send(body)
// the route answers 200 on success, 400 for a body that fails the schema, 401 without an authenticated user
```

`description` is in the fact schema but **not** in this command schema. `commandWith({ description })`
builds a body the schema rejects.

## Verifying the shape

```js
expect(body).to.matchSchema(proposeSessionCommandSchema)
isValidProposeSessionCommand(body)   // throws on mismatch
```

Recording: `@rinkkasatiainen/cfb-session-proposal-contracts/commands/propose-session.command.example.json`.
