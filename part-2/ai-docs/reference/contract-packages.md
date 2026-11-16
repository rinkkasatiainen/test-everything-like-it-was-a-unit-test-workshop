# Reference — the contract packages

> AI-facing reference, self-contained. What each capability publishes as its contract, and what a
> test imports. A contract test (and a tier test's fixtures) must read the **provider-owned**
> artifact as a dependency — never a copy.

## Scheduling — the worked example (exists, published)

Package: **`@rinkkasatiainen/cfb-session-scheduling-contracts`**. In `devDependencies`. Exports:

| Export | Kind |
|---|---|
| `sessionScheduledFactSchema`, `sessionLengthSetFactSchema` | fact schemas (payload closed, metaData open) |
| `scheduleSessionCommandSchema`, `setSessionLengthCommandSchema` | command schemas |
| `buildSessionScheduledFactWith`, `buildSessionLengthSetFactWith` | fact builders |
| `scheduleSessionCommandWith`, `setLengthCommandWith` | command builders (both nest their fields under `command.payload`) |
| `WellKnown.SessionScheduled.CaseyTue`, `WellKnown.SessionLengthSet.CaseyNinety` | named instances (the `eql` pin) |
| `registerSchemaMatcher`, `matching`, `containing`, `optional`, `exactly`, … | the chai-free matcher |

Committed examples (JSON recordings): `events/session-scheduled.example.json`,
`events/session-length-set.example.json`, and the two command examples. The schema is the whole
agreement:

```js
export const sessionScheduledFactSchema = {
  metaData: containing({                       // OPEN — the core adds timestamp, causationId, …
    capability: exactly('cfb-session-scheduling'),
    type: exactly('session-scheduled'),
    streamId: aNonEmptyString, version: aPositiveInteger,
  }),
  payload: matching({                          // CLOSED — an extra key here is a leak
    sessionId: aNonEmptyString, day: aNonEmptyString, time: matchingPattern(/^\d{2}:\d{2}$/),
  }),
}
```

## Proposal — the gap, closed

Package: **`@rinkkasatiainen/cfb-session-proposal-contracts`**. In `devDependencies`. Exports:

| Export | Kind |
|---|---|
| `sessionProposedFactSchema` | fact schema (payload closed, metaData open) |
| `proposeSessionCommandSchema` | command schema |
| `buildSessionProposedWith`, `buildSessionProposedFactWith` | builders — **and the bus → bus component test's inbound fact** |
| `commandWith`, `commandWithDuration` | command builders |
| `WellKnown.SessionProposed.CaseyMob` | named instance (the `eql` pin, and the component test's seed) |
| `registerSchemaMatcher`, `matching`, `containing`, `optional`, `exactly`, … | the chai-free matcher |

```js
export const sessionProposedFactSchema = {
  metaData: containing({
    capability: exactly('cfb-session-proposal'), type: exactly('session-proposed'),
    streamId: aNonEmptyString, version: aPositiveInteger,
  }),
  payload: matching({
    sessionId: aNonEmptyString, title: aNonEmptyString,
    userId: aNonEmptyString,                   // the proposer; a consumer renames it `proposer`
    duration: aPositiveInteger,
    eventId: optional(aNonEmptyString), description: optional(aNonEmptyString),
  }),
}
```

Committed example: `events/session-proposed.example.json`. (Historical note: this package was once a
loose `contracts/` folder with no `package.json` — the cautionary case, because a consumer would
have had to *copy* a schema. Making it a real package, giving it its own chai-free matcher, and
reconciling the envelope to `metaData` with `capability`/`type`/`streamId`/`version` closed the gap.
`session-time-proposed` is a TODO second fact that belongs here too.)

## Discovery — a consumer that is also a provider

Package: **`@rinkkasatiainen/cfb-session-discovery-contracts`**. Reacts to `session-proposed` and
`session-scheduled`; publishes `session-change-noted` in **two variants**. Exports:

| Export | Kind |
|---|---|
| `sessionChangeNotedBoardViewFactSchema`, `sessionChangeNotedInterestFactSchema` | the two fact schemas |
| `buildSessionChangeNotedFactWith`, `buildInterestNotedFactWith` | fact builders, one per variant |
| `isValidSessionChangeNotedBoardViewFact`, `isValidSessionChangeNotedInterestFact` | exported predicates |
| `WellKnown.events.SessionChangeNoted.CaseyTueBoardView`, `…CaseyInterestTwo` | named instances |
| `boardRowSchema`, `sessionSchema`, `buildBoardRowWith`, `isValidBoardRow`, … | read-side (board) contracts |

The two variants are why the Discovery contract test runs the four-happy loop **twice**, once per
variant, and the interest variant adds a value-boundary negative (count of 0 accepted, −1 rejected).

## The dependency note

Both Scheduling and Proposal contracts are in `devDependencies`, resolving from the GitHub registry
(`NODE_AUTH_TOKEN`) or as a `file:` link while iterating locally. When this folder is lifted out,
both come in as normal registry dependencies — the point of a contract shipping as its own package:
the consumer needs the **agreement**, not the implementation.

## The rule (literal)

- **Import the schema, builder, example and WellKnown from the package. Never copy them into a test.**
- Two copies of a schema is the exact drift a contract exists to prevent.

## See also

- `../explanation/contract-testing.md` · `../how-to/write-a-contract-test.md`
- `../how-to/build-a-fact-from-a-contract.md` — using the builders in tier tests.
