# Reference — contract tests

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Look-up companion for contract tests against the `@rinkkasatiainen/cfb-*-contracts` packages. Each page is a
> **worked example copied from the codefreeze-board source** (path given on the page), with the imports
> adapted to run from this repo's `test/contract/` (`npm run test:contract`).

## What a contract test proves here

A contracts package is the **one artifact** two capabilities agree on: the producer emits it and the
consumer reads it. A contract test proves one side of that agreement against the **installed package**,
never against a copied schema.

| Kind | Proves | Page |
|---|---|---|
| **Kit self-test** | schema, recording, `WellKnown` and builder agree, and the schema rejects bad values | [`kit-self-test.md`](kit-self-test.md) |
| **Command contract** | the command body the frontend sends matches what the handler accepts | [`command.md`](command.md) |
| **Provider (fact)** | the real capability *emits* a fact matching the schema | [`provider-fact.md`](provider-fact.md) |
| **Consumer (fact)** | the fact the consumer builds its tests on is, and stays, contract-valid | [`consumer-fact.md`](consumer-fact.md) |
| **Provider (query)** | an HTTP route *answers* with the published shape | [`provider-query.md`](provider-query.md) |
| **Consumer (live channel)** | the board-channel frame the UI relies on matches the push schema | [`consumer-channel.md`](consumer-channel.md) |

## The shared setup

Every contract test starts the same way:

```js
import { expect, use } from 'chai'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'

use(registerSchemaMatcher)   // adds expect(x).to.matchSchema(schema)
```

The recordings ship inside the packages. Import them from there:

```js
import example from '@rinkkasatiainen/cfb-session-scheduling-contracts/events/session-scheduled.example.json' with { type: 'json' }
```

| Package | Recordings |
|---|---|
| `cfb-session-discovery-contracts` | `events/session-change-noted.example.json`, `events/session-change-noted.interest.example.json`, `queries/get-sessions.query.example.json` |
| `cfb-session-proposal-contracts` | `events/session-proposed.example.json`, `commands/propose-session.command.example.json`, `commands/propose-session-with-duration.command.example.json` |
| `cfb-session-scheduling-contracts` | `events/session-scheduled.example.json`, `events/session-length-set.example.json`, `commands/schedule-session.command.example.json`, `commands/set-session-length.command.example.json` |

## Rules of thumb (from the source how-to)

- **Depend on the contracts package. Never copy a schema or example into a test.** Two copies is the drift
  the contract exists to prevent.
- **`eql` for the pins, `matchSchema` for the spec checks.** Equality asks "is my fixture the real
  recording". The schema asks "is the shape agreed".
- **Use a well-known for the pin and random values for the schema runs.** Run the builder 25 times to show
  the schema holds across values, not just one.
- **Start from a valid value and break one thing** in each failure test, so the test proves the schema
  rejects *that* thing.
- **Check rejections through both entry points**: `matchSchema` and the `isValid…` guard. A consumer may use either.
- **A green contract test does not mean the value is right or the wiring exists.** It means the shape is
  agreed. Behaviour stays in component and integration tests.

## Known gaps in the published packages

- `isValidBoardRow` (discovery contracts 1.0.0) has its arguments swapped and throws on every input. Use
  `conformsTo(row, boardRowSchema)` or `matchSchema`.
- There is no `isValidBoardRowPush`. Use `boardRowPushSchema`.
- The payload builders have no payload-only schema. Validate a bare payload with the fact schema's half:
  `sessionScheduledFactSchema.payload(payload, 'payload')`.

See also: [`../builders/index.md`](../builders/index.md) for every builder's shape. Source of these
examples: the `codefreeze-board` repo, `local-dev/testing/docs/how-to/write-a-contract-test.md` and the
`*.contract.test.js` files named on each page.
