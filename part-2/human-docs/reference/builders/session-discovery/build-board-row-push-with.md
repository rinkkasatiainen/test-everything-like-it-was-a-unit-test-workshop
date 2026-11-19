# `buildBoardRowPushWith(overrides = {})`

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

**Package:** `@rinkkasatiainen/cfb-session-discovery-contracts` · **Builds:** one **live board-channel frame**, the message a client receives on the
websocket when a row changes.

```js
import { buildBoardRowPushWith, boardRowPushSchema } from '@rinkkasatiainen/cfb-session-discovery-contracts'
```

## Shape

```js
{
  type: 'session',                 // exactly('session')
  session: <buildBoardRowWith(overrides)>,   // matching(boardRowSchema) — closed
}
```

The top level is closed too: `{ type, session }` and nothing else. For the `session` fields, see
[`buildBoardRowWith`](build-board-row-with.md).

## Using it

`overrides` go to the **inner row**, not the frame:

```js
const frame = buildBoardRowPushWith({ sessionId: 's-0142', interestCount: 2 })
frame.session.interestCount   // 2
frame.type                    // 'session'

// To test a wrong frame type, change it after building
const wrong = { ...buildBoardRowPushWith(), type: 'section' }
```

A client-side consumer test typically sends `JSON.stringify(frame)` through a fake or real socket and asserts
what the board renders.

## Verifying the shape

There is no `isValidBoardRowPush`. Use the schema:

```js
import { conformsTo } from '@rinkkasatiainen/cfb-schema-matcher'

expect(frame).to.matchSchema(boardRowPushSchema)   // chai
conformsTo(frame, boardRowPushSchema)              // throws on mismatch
```

On the provider side, check each frame read off the socket the same way. Parse it first. The schema
checks objects, not JSON strings.
