# Consumer contract (live channel) — the board frame the UI relies on

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

> Source: `codefreeze-board/cfb-session-discovery/packages/ui/test/contract-test/board-channel.contract.test.js`.
> Copied as-is. The matching provider-side test is
> `cfb-session-discovery/packages/node-js/test/channel/board-channel-listener.test.js`.

The UI's runtime guard on incoming frames is lenient on purpose. **This** test is where the full shape is
pinned, so the element doesn't need to re-validate every field.

```js
import { use, expect } from 'chai'
import {
  boardRowPushSchema,
  buildBoardRowPushWith,
  buildBoardRowWith,
} from '@rinkkasatiainen/cfb-session-discovery-contracts'
import { registerSchemaMatcher } from '@rinkkasatiainen/cfb-schema-matcher'

use(registerSchemaMatcher)

describe('board channel push contract (consumer)', () => {
  it('the builder matches the push schema', () => {
    expect(buildBoardRowPushWith()).to.matchSchema(boardRowPushSchema)
  })

  it('a proposed-but-unscheduled row (no day/time/place/interestCount) still matches', () => {
    const { day: _day, time: _time, place: _place, interestCount: _ic, ...idea } = buildBoardRowWith()

    expect({ type: 'session', session: idea }).to.matchSchema(boardRowPushSchema)
  })

  it('the row carries at least sessionId and version', () => {
    const { session } = buildBoardRowPushWith()

    expect(session.sessionId).to.be.a('string').and.not.be.empty
    expect(session.version).to.be.a('number')
  })

  it('is a CLOSED payload — an unknown field in the row is a contract violation', () => {
    const push = buildBoardRowPushWith()
    push.session.somethingNew = 'leak'

    expect(() => expect(push).to.matchSchema(boardRowPushSchema)).to.throw()
  })
})
```

Notes:

- The partial row is made by **destructuring the fields away**, not by setting them to `undefined`. That way
  the keys are really absent.
- There is no `isValidBoardRowPush`, and `isValidBoardRow` is broken in 1.0.0. That is why this test uses
  only `matchSchema`.
- For the provider end from part-2, connect to the board websocket, trigger a change, `JSON.parse` the
  frame and `matchSchema(boardRowPushSchema)` it. The live-channel spy in
  [`../nullables/live-channel.md`](../nullables/live-channel.md) gives you the frames.
