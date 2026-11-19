# `buildSessionProposedWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-proposal-contracts` · **Builds:** the **payload** of a `session-proposed` fact: someone proposed a
session. For the whole fact, see [`buildSessionProposedFactWith`](build-session-proposed-fact-with.md).

```js
import { buildSessionProposedWith, sessionProposedFactSchema } from '@rinkkasatiainen/cfb-session-proposal-contracts'
```

## Shape

**Closed.**

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025/26/27` | `aNonEmptyString` |
| `sessionId` | random UUID | `aNonEmptyString` |
| `title` | `"<4 chars> <6 chars>"` | `aNonEmptyString` |
| `userId` | `"u-<5 chars>"` | `aNonEmptyString`: the **proposer** (a consumer renames it `proposer`) |
| `duration` | random 15–120 | `aPositiveInteger` (minutes) |
| `description` | *not set* | `optional(aNonEmptyString)`: absent is fine, `''` is **not** |

> The comment in the package source says `eventId` is not defaulted. It is out of date: the builder
> **does** set `eventId`. Only `description` is left out.

## Using it

```js
const payload = buildSessionProposedWith({ title: 'Mob testing legacy code', userId: 'u-casey' })
const withBlurb = buildSessionProposedWith({ description: 'Bring a laptop' })
```

To build a whole fact with a custom payload, pass the overrides straight to the fact builder. It calls this
builder for you:

```js
buildSessionProposedFactWith({ payload: { description: 'Bring a laptop' } })
```

## Verifying the shape

No payload-only schema is exported. Use the payload half of the fact schema:

```js
sessionProposedFactSchema.payload(payload, 'payload')   // throws on mismatch
```

Rejected: an extra field, a missing `title`, `description: ''`, `duration: 0`.
