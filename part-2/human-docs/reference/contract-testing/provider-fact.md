# Provider contract (fact) — the real capability emits the agreed shape

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/cfb-session-scheduling/packages/core/test/schedule-session.contract.test.js`.
> Copied as-is. It drives the capability's **core** (`scheduleSession`) against an in-memory event store.

The self-test proves the kit is consistent. This test proves the **producer** really emits that shape. It
runs the real command with the inputs of a well-known and checks two things:

1. the stored fact `matchSchema`s the published schema, and
2. for the well-known input, it reproduces the well-known's payload and the **agreed** metaData keys. The
   envelope is open, so compare only the keys the schema names, not the whole `metaData`.

```js
import { AssertionError, expect, use } from 'chai'
import { createInMemoryEventStore } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'
import { WellKnown, sessionScheduledFactSchema } from '@rinkkasatiainen/cfb-session-scheduling-contracts'

import { CAPABILITY, scheduleSession } from '../index.js'   // the capability's core, in the source repo

use(registerSchemaMatcher)

const timestamp = '2026-02-02T19:30:00+01:00'
const ports = { userId: 'u-casey', clock: () => timestamp }

const resolveOf = eventually => eventually.fold(
  reason => {
    throw new AssertionError(`expected resolve, got reject: ${JSON.stringify(reason)}`)
  },
  value => value,
)

const eventsOf = async (store, id) => resolveOf(await store.read(CAPABILITY, id))

// The command the frontend would send to produce the well-known fact.
const commandFor = wellKnown => ({
  payload: {
    eventId: 'codefreeze-2027',
    commandId: 'c-8f31',
    correlationId: 'r-55a',
    ...wellKnown.payload,
  },
})

describe('session-scheduled provider contract', () => {
  it('scheduleSession emits a fact matching the published schema', async () => {
    const store = createInMemoryEventStore()

    await scheduleSession(store, ports)(commandFor(WellKnown.SessionScheduled.CaseyTue))

    const [fact] = await eventsOf(store, WellKnown.SessionScheduled.CaseyTue.payload.sessionId)
    expect(fact).to.matchSchema(sessionScheduledFactSchema)
  })

  it('the emitted fact reproduces the well-known payload and agreed metaData', async () => {
    const wellKnown = WellKnown.SessionScheduled.CaseyTue
    const store = createInMemoryEventStore()

    await scheduleSession(store, ports)(commandFor(wellKnown))

    const [fact] = await eventsOf(store, wellKnown.payload.sessionId)
    expect(fact.payload).to.eql(wellKnown.payload)
    const { capability, type, streamId, version } = fact.metaData
    expect({ capability, type, streamId, version }).to.eql(wellKnown.metaData)
  })
})
```

## Doing this from part-2

`scheduleSession` and `CAPABILITY` are the capability's **internal** core. This repo uses the capability as
an installed package, so the `../index.js` import does not exist here. Keep the two assertions and change
**where the fact comes from**: send the command through the running host, then read the fact off the edge
it crosses, the event store or the producer. Use a spy as shown in
[`../nullables/README.md`](../nullables/README.md) (`createTrackerSpy` at the component tier, `eventStream`
at the integration tier). Both hand you `{ metaData, payload }` records you can `matchSchema`.
