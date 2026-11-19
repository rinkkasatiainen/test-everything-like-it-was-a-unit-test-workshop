# Provider contract (query) — the route answers with the published shape

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/cfb-session-discovery/packages/node-js/test/routes/schedule-query.contract.test.js`.
> Copied as-is. It uses `node:test`'s `describe`/`it` and calls the route class directly with a
> hand-rolled `res` double.

The read side has no fact. The **response** is the contract. The test checks three things: the known
event returns the well-known entries, every entry matches `sessionSchema`, and an unknown event answers
**404, not an empty list**. That last one is behaviour the frontend depends on.

```js
import { describe, it } from 'node:test'
import { expect, use } from 'chai'
import { WellKnown, sessionSchema } from '@rinkkasatiainen/cfb-session-discovery-contracts'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'

import { createWellKnownSchedule } from '../../src/adapters/well-known-schedule.js'   // source-repo internals
import { SessionsRoute } from '../../src/routes/sessions-route.js'

use(registerSchemaMatcher)

const knownEvent = { slug: 'codefreeze2025' }

const eventsWith = event => ({
  findBySlug: async slug => (event && slug === event.slug ? event : null),
})

// A res double for cfb-server-shell's json(res, status, payload): writeHead + end(body).
const captureResponse = () => {
  const res = {
    status: null,
    body: null,
    writeHead(status) {
      res.status = status
      return res
    },
    end(body) {
      res.body = body
    },
  }
  return res
}

const invoke = async (Route, eventId, events) => {
  const res = captureResponse()
  const route = new Route({ events, schedule: createWellKnownSchedule() })
  await route.handle({}, res, { params: { eventId } })
  return { status: res.status, payload: res.body === null ? null : JSON.parse(res.body) }
}

describe('schedule query contract', () => {
  describe('GET sessions', () => {
    it('returns the well-known sessions example for a known event', async () => {
      const { status, payload } = await invoke(SessionsRoute, knownEvent.slug, eventsWith(knownEvent))
      const { day0Entries, day1Entries } = WellKnown.sessions

      expect(status).to.equal(200)
      expect(payload.sessions).to.eql([...day0Entries, ...day1Entries])
    })

    it('every session matches the published schema', async () => {
      const { payload } = await invoke(SessionsRoute, knownEvent.slug, eventsWith(knownEvent))

      expect(payload.sessions.length).to.be.greaterThan(0)
      payload.sessions.forEach(session => {
        expect(session).to.matchSchema(sessionSchema)
      })
    })

    it('answers 404 for an unknown event, not an empty list', async () => {
      const { status, payload } = await invoke(SessionsRoute, 'no-such-event', eventsWith(knownEvent))

      expect(status).to.equal(404)
      expect(payload).to.not.have.property('sessions')
    })
  })
})
```

## Doing this from part-2

The two `../../src/...` imports are internal to the source repo. From here, replace `invoke` with an HTTP
call to the running host, for example with `supertest`, which is already a devDependency:
`GET /api/event/{id}/sessions`. Keep the three assertions. The response body is `{ sessions: [...] }`. The
recorded `queries/get-sessions.query.example.json` is the bare array.

The kit side of this query (recording ≡ WellKnown ≡ builder, plus the rejections) is in
`cfb-session-discovery/packages/contracts/test/get-sessions.contract.test.js`. Its failure cases include a
nested one worth copying:

```js
it('rejects a tag with an extra field', () => {
  const session = buildSessionWith({ tags: [{ name: 'Test', type: 'blue', extra: 'x' }] })
  expect(() => expect(session).to.matchSchema(sessionSchema)).to.throw(/extra/)
})
```
