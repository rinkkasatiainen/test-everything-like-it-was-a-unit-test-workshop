# Reference — contract builders

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Look-up companion for test data. One page per **builder** exported from a `@rinkkasatiainen/cfb-*-contracts`
> package: the shape it returns, how to use it in a test, and how to prove a value meets the contract.

## What a builder is

A builder returns a **complete, contract-valid** object with random values in every field. You override only
the field your test is about; the random rest means nothing passes by coincidence.

```js
const fact = buildSessionScheduledFactWith({ payload: { day: 'd-tue' } })
//            ^ every other field is random but valid
```

Three kinds:

- **Event Payload builders** — `build<Fact>With(overrides)`. To build an event payload 
- **Event builders** — `build<Fact>FactWith({ metaData, payload })`. The whole stored event: metadata
  envelope + payload. Each half is overridden on its own, and you can pass a `WellKnown` entry directly.
- **Command builders** — `commandWith`, `scheduleSessionCommandWith`, `setLengthCommandWith`. The body the
  frontend POSTs to `/api/commands/<name>`.

## Verifying a shape against the contract

Each builder has a **schema** next to it. Two ways to check a value against it:

```js
// 1. In a test — the chai matcher (registered by the test, never by the contracts package)
import { expect, use } from 'chai'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'
use(registerSchemaMatcher)

expect(actual).to.matchSchema(sessionScheduledFactSchema)

// 2. As a guard — the isValid* function
isValidSessionScheduledFact(actual)   // returns nothing when valid, THROWS when not
```

Note of warning - name of the `isValid<FactOrCommand>` is misleading, as it's not returning true/false, but is a void
function returning undefined. Instead, if it's not valid, it will throw an exception.

What the schema words mean:

| Word                                                                                                                                       | Meaning                                                                                                              |
|--------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------|
| closed — `matching(...)` / top-level schema                                                                                                | Named fields must be valid **and no other field is allowed**. Used for payloads and bodies.                          |
| open — `containing(...)`                                                                                                                   | Named fields must be valid; extra fields are ignored. Used for the metadata envelope the event-sourcing core stamps. |
| `optional(v)`                                                                                                                              | The field may be absent; if present it must pass `v`.                                                                |
| `exactly(x)`                                                                                                                               | Must be `=== x`.                                                                                                     |
| `aNonEmptyString`, `aString`, `aPositiveInteger` (≥ 1), `aNonNegativeInteger` (≥ 0), `aNumber`, `matchingPattern(re)`, `anArrayOf(schema)` | What they say.                                                                                                       |

## Traps across all packages

- **`metadata` vs `metaData`.** Session Discovery facts use `metadata`; Session Proposal and Session
  Scheduling facts use `metaData`. A fact builder silently ignores the spelling it doesn't use.
- **Overrides are shallow.** `buildSessionWith({ tags: [...] })` replaces the whole array.
- **A builder never makes an invalid value for you.** For a negative-path test, override a field to
  something the schema rejects, or `delete` a required one, and assert the validator throws.
- **`isValidBoardRow` is broken** in `cfb-session-discovery-contracts@1.0.0`: it passes its arguments to
  `conformsTo` in the wrong order and throws on every input. Use `conformsTo(row, boardRowSchema)` or
  `matchSchema` instead. See [`build-board-row-with.md`](session-discovery/build-board-row-with.md).

## The builders

### Session Discovery — `@rinkkasatiainen/cfb-session-discovery-contracts`

| Builder | Builds | Schema / guard |
|---|---|---|
| [`buildSessionWith`](session-discovery/build-session-with.md) | one session in `GET /api/event/{id}/sessions` | `sessionSchema` / `isValidSessionEntry` |
| [`buildBoardRowWith`](session-discovery/build-board-row-with.md) | one materialized board row | `boardRowSchema` / ~~`isValidBoardRow`~~ |
| [`buildBoardRowPushWith`](session-discovery/build-board-row-push-with.md) | the live board-channel frame `{ type, session }` | `boardRowPushSchema` / — |
| [`buildSessionChangeNotedWith`](session-discovery/build-session-change-noted-with.md) | `session-change-noted` payload, board-view variant | inside `sessionChangeNotedBoardViewFactSchema` |
| [`buildSessionChangeNotedFactWith`](session-discovery/build-session-change-noted-fact-with.md) | `session-change-noted` fact, board-view variant | `sessionChangeNotedBoardViewFactSchema` / `isValidSessionChangeNotedBoardViewFact` |
| [`buildInterestNotedWith`](session-discovery/build-interest-noted-with.md) | `session-change-noted` payload, interest-count variant | inside `sessionChangeNotedInterestFactSchema` |
| [`buildInterestNotedFactWith`](session-discovery/build-interest-noted-fact-with.md) | `session-change-noted` fact, interest-count variant | `sessionChangeNotedInterestFactSchema` / `isValidSessionChangeNotedInterestFact` |

### Session Proposal — `@rinkkasatiainen/cfb-session-proposal-contracts`

| Builder | Builds | Schema / guard |
|---|---|---|
| [`buildSessionProposedWith`](session-proposal/build-session-proposed-with.md) | `session-proposed` payload | inside `sessionProposedFactSchema` |
| [`buildSessionProposedFactWith`](session-proposal/build-session-proposed-fact-with.md) | `session-proposed` fact | `sessionProposedFactSchema` / `isValidSessionProposedFact` |
| [`commandWith`](session-proposal/command-with.md) | `propose-session` command body, no duration | `proposeSessionCommandSchema` / `isValidProposeSessionCommand` |
| [`commandWithDuration`](session-proposal/command-with-duration.md) | `propose-session` command body with `duration` | `proposeSessionCommandSchema` / `isValidProposeSessionCommand` |

### Session Scheduling — `@rinkkasatiainen/cfb-session-scheduling-contracts`

| Builder | Builds | Schema / guard |
|---|---|---|
| [`buildSessionScheduledWith`](session-scheduling/build-session-scheduled-with.md) | `session-scheduled` payload | inside `sessionScheduledFactSchema` |
| [`buildSessionScheduledFactWith`](session-scheduling/build-session-scheduled-fact-with.md) | `session-scheduled` fact | `sessionScheduledFactSchema` / `isValidSessionScheduledFact` |
| [`buildSessionLengthSetWith`](session-scheduling/build-session-length-set-with.md) | `session-length-set` payload | inside `sessionLengthSetFactSchema` |
| [`buildSessionLengthSetFactWith`](session-scheduling/build-session-length-set-fact-with.md) | `session-length-set` fact | `sessionLengthSetFactSchema` / `isValidSessionLengthSetFact` |
| [`scheduleSessionCommandWith`](session-scheduling/schedule-session-command-with.md) | `schedule-session` command `{ payload }` | `scheduleSessionCommandSchema` / `isValidScheduleSessionCommand` |
| [`setLengthCommandWith`](session-scheduling/set-length-command-with.md) | `set-session-length` command `{ payload }` | `setSessionLengthCommandSchema` / `isValidSetSessionLengthCommand` |

> `cfb-session-discovery-contracts` also has a `buildSectionWith` in `src/builders/section-models.js`. It is
> **not exported**, and it calls an undefined `randomInt`, so it throws if you call it. Don't reach for it.

See also: [`../nullables/README.md`](../nullables/README.md) for publishing a built fact into a nullable
(`emit(producer).publish(...)`, `consumer.simulate(...)`).
