# How to write an end-to-end test

> AI-facing recipe, self-contained. Poke a **whole running host** from outside, like a browser —
> HTTP in, WebSocket out. Prove the parts are actually plugged together.

## Before you start

A host must already be running. Simplest for a workshop room is the no-Docker one — from `../host`:

```bash
yarn start:memory      # whole board, pglite + nullable bus, on http://localhost:3001
```

Or the real stack: `yarn db:up && yarn start:local`. The e2e test does not care which — it is a
client either way. Point it at the host:

```bash
CFB_BASE_URL=http://localhost:3001 yarn test:e2e
```

## The flow: HTTP → … → WebSocket

A proposed session travels: `POST` → fact on the bus → Discovery reacts → the board projection
updates → the live channel pushes to every connected client. The e2e test checks the two ends and
lets the middle be real.

1. **Connect a client first**, before you poke — a late client misses the push:
   ```js
   const board = eventStream(await fromWebSocket(`${wsBase}/api/event/${eventId}/sessions/live`))
   ```
2. **Mint a correlation id** you can recognise among everyone else's traffic:
   ```js
   const mine = `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`
   ```
3. **Act** over real HTTP against the running host:
   ```js
   await request(baseUrl).post('/api/commands/propose-session')
     .send({ title: 'Live from e2e', day: 'd-tue', correlationId: mine })
   ```
4. **Wait for your frame** — matched by *your* id, tolerant of everything else on the channel:
   ```js
   await board.where(frame => frame?.correlationId === mine).waitUntilFound(1, { timeout: 8000 })
   ```
5. **Close** the socket in `afterEach`.

## The rules that keep e2e from flaking (literal)

- **Tolerant assertions, always.** The host has state from every other poke in the room. Match
  *your* event by *your* correlation id. **Never** `expect(frames).to.have.length(1)` — assert
  "found at least one that is mine".
- **Connect before you act.** On a running host the channel seeds/replays; a client that connects
  after the push can miss it. Open the socket, *then* post.
- **Expect replays and seeds.** The live channel seeds a new client from the current query, then
  sends upserts. Your `where(...)` filter already handles this — it ignores everything not yours.
- **Keep them few.** One or two e2e tests prove the wiring. They are the worst tool for *locating* a
  bug — when one goes red, a component test tells you where. Let e2e answer only "is it plugged in".

## The WebSocket frame shape

The board frame is `{ type: 'session', session: { … } }`. Top-level `type` is the literal
`'session'`, not an event type with `metaData`, so `.ofChannel` does not match and `.matchingPayload`
reads the wrong key. Narrow with `.where(f => f.type === 'session' && f.session?.sessionId === mine)`.

## Status note

The HTTP half works against any running host today. If the host has **no live channel endpoint yet**,
the `fromWebSocket` steps are pending — the HTTP-and-query half stands alone: poke, then poll the
board query until your session appears.

## See also

- `../explanation/testing-levels.md` — why e2e is few and tolerant.
- `../reference/event-stream-dsl.md` — `fromWebSocket`, `eventStream`, `.where`.
