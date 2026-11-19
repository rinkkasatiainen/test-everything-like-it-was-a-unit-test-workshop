# Command contract — the body the frontend sends

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/cfb-session-scheduling/packages/contracts/test/schedule-session-command.contract.test.js`.
> Change: imports point at the installed package instead of `../index.js` / `../commands/...`.

A command has no `WellKnown`. The recording is the pin, and the builder seeded with the recording's payload
must reproduce it. The same test works for `set-session-length` (`setLengthCommandWith`,
`setSessionLengthCommandSchema`). For `propose-session` the body is **flat** (no `payload` wrapper), so the
seed is `commandWith(example)`.

```js
// test/contract/schedule-session-command.contract.test.js
import { expect, use } from 'chai'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'
import example from '@rinkkasatiainen/cfb-session-scheduling-contracts/commands/schedule-session.command.example.json' with { type: 'json' }
import {
  isValidScheduleSessionCommand,
  scheduleSessionCommandSchema,
  scheduleSessionCommandWith,
} from '@rinkkasatiainen/cfb-session-scheduling-contracts'

use(registerSchemaMatcher)

describe('schedule-session command contract', () => {
  describe('happy flow', () => {
    it('the committed example matches the schema', () => {
      expect(example).to.matchSchema(scheduleSessionCommandSchema)
    })

    it('the builder seeded from the recorded example reproduces it', () => {
      expect(scheduleSessionCommandWith({ payload: example.payload })).to.eql(example)
    })

    it('builder -> matches schema', () => {
      for (let i = 0; i < 25; i += 1) {
        expect(scheduleSessionCommandWith()).to.matchSchema(scheduleSessionCommandSchema)
      }
      isValidScheduleSessionCommand(scheduleSessionCommandWith())
    })
  })

  describe('failures flow', () => {
    it('rejects an extra payload key', () => {
      const command = scheduleSessionCommandWith()
      command.payload.extra = 'nope'

      expect(() => expect(command).to.matchSchema(scheduleSessionCommandSchema)).to.throw(/extra/)
      expect(() => isValidScheduleSessionCommand(command)).to.throw(/extra/)
    })

    it('rejects a payload missing time', () => {
      const command = scheduleSessionCommandWith()
      delete command.payload.time

      expect(() => expect(command).to.matchSchema(scheduleSessionCommandSchema)).to.throw(/time/)
      expect(() => isValidScheduleSessionCommand(command)).to.throw(/time/)
    })
  })
})
```

A frontend-side version, adapted from `cfb-session-proposal/packages/ui/test/propose-session.contract.test.js`,
pins what the UI must **not** send:

```js
it('rejects an extra key — userId is the backend\'s', () => {
  const command = { ...example, userId: 'u-alex' }
  expect(() => expect(command).to.matchSchema(proposeSessionCommandSchema)).to.throw(/userId/)
})
```
