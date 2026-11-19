# `buildSessionWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** one session entry in the `GET /api/event/{id}/sessions` response (the
read side, Session Discovery's query).

```js
import { buildSessionWith, sessionSchema, isValidSessionEntry, WellKnown } from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

## Shape

Top level is **closed** — no field beyond these.

| Field | Builder default | Contract |
|---|---|---|
| `eventId` | one of `codefreeze-2025` / `-2026` / `-2027` | `aNonEmptyString` |
| `id` | random UUID | `aNonEmptyString` |
| `name` | `"Name: <10 random chars>"` | `aNonEmptyString` |
| `description` | `"Test Description <10 random chars>"` | `aString` — **may be empty** |
| `sectionId` | random UUID | `aNonEmptyString` |
| `order` | `0` | `aNonNegativeInteger` |
| `tags` | `[{ name: 'Test', type: 'blue' }]` | `anArrayOf({ name: aString, type: aString })` — each tag closed |
| `speakers` | `[{ name: 'Test Speaker', initials: 'TS' }]` | `anArrayOf({ name: aString, initials: aString })` — each speaker closed |

```json
{
  "eventId": "codefreeze-2026",
  "id": "3f0c…",
  "name": "Name: k2j9x0aq1m",
  "description": "Test Description 0pz8w1c7rt",
  "sectionId": "a81e…",
  "order": 0,
  "tags": [{ "name": "Test", "type": "blue" }],
  "speakers": [{ "name": "Test Speaker", "initials": "TS" }]
}
```

## Using it

```js
// Only the field the test is about
const session = buildSessionWith({ name: 'Mob testing legacy code' })

// Several sessions in one section, in order
const sectionId = 'day-1'
const sessions = [0, 1, 2].map(order => buildSessionWith({ sectionId, order }))

// Seed from a recorded, well-known entry and change one thing
const [travel] = WellKnown.sessions.day0Entries
const renamed = buildSessionWith({ ...travel, name: 'Renamed' })
```

`order` defaults to `0` and `tags`/`speakers` are fixed, **not** random. If your test sorts or filters
on them, set them yourself.

## Verifying the shape

```js
expect(session).to.matchSchema(sessionSchema)     // chai, after use(registerSchemaMatcher)
isValidSessionEntry(session)                      // throws on mismatch

// The HTTP response wraps them: { sessions: [ ...entries ] }
response.body.sessions.forEach(isValidSessionEntry)
```

The package ships a recorded response: a **bare array** of entries, equal to
`[...WellKnown.sessions.day0Entries, ...WellKnown.sessions.day1Entries]`:

```js
import recorded from '@rinkkasatiainen/cfb-session-discovery-contracts/queries/get-sessions.query.example.json' with { type: 'json' }
// or, where JSON imports aren't available (the browser): fetch(recordedQueryUrl('get-sessions.query.example.json'))
```
