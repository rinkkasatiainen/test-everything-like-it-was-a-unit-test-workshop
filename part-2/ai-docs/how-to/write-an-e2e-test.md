# How to write an end-to-end test

> AI-facing recipe, self-contained. Poke a **whole running host** from outside, like a browser —
> sign in, HTTP in, WebSocket out. Prove the parts are actually plugged together.
>
> **Send the participant to:** [`human-docs/how-to/write-an-e2e-test.md`](../../human-docs/how-to/write-an-e2e-test.md) (setup to paste, the journey, the hints). This file is for the coach.

## Before you start

From `part-2/`, in one terminal:

```bash
npm run start:pg       # db:up + ui:build + host on http://localhost:3001, reading Docker Postgres
```

and in another:

```bash
npm run test:e2e       # mocha 'test/e2e/**/*.test.js'
```

**`start:pg`, not `npm start`.** The test makes its own event by inserting a `conferences` row into the
Docker Postgres; the in-memory host (`npm start`, pglite) never reads it, so the event is unknown to it.
Overrides: `CFB_BASE_URL` (default `http://localhost:3001`), `CFB_DATABASE_URL` (default
`postgres://cfb:cfb-local-dev@localhost:55432/cfb_local`).

Worked answer (answer key): `test/e2e/board.e2e.test.js`.

## The setup (the participant pastes it from the human how-to)

- **Sign in** like the login form: `POST /api/auth/login`, `application/x-www-form-urlencoded`,
  `{ username: 'casey', password: 'CfbBoardPassword123', returnTo: '/' }`, `redirect: 'manual'`.
  Success = 302 + `set-cookie`; failure = 302 to `?error=…`, no cookie. Keep `name=value` of the cookie
  and send it as `Cookie:` on every later request — identity comes from the cookie, **never from the
  body**.
- **Clean room**: a random slug `uniqueId('e2e-event')`, inserted in `before`:
  `insert into conferences (slug, name, starts_on, ends_on) values ($1, $2, '2027-01-11', '2027-01-19')`;
  deleted in `after` (`conferences` and `board where event_id = $1`), then `pool.end()`. The backend
  does not invent events — an unknown slug is 404 on the query and close code 4004 on the socket.
- Helpers: `postCommand(cookie, path, body)` (JSON POST), `getSessions(cookie, eventId)` →
  `GET /api/event/{eventId}/sessions` → `{ sessions: [...] }`.

## The journey (one `it`, `this.timeout(20000)`)

1. **Empty board**: `getSessions` → 200 and `sessions` empty.
2. **Connect first**: `board = await fromWebSocket(\`${WS_BASE}/api/event/${eventId}/sessions/live\`, { headers: { Cookie: cookie } })`.
   No replay for a late client.
3. **Propose** — a **flat** body: `POST /api/commands/propose-session`
   `{ eventId, sessionId, title, commandId }` → 200.
4. **Schedule** — a **`{ payload }`** body: `POST /api/commands/schedule-session`
   `{ payload: { eventId, sessionId, day: 'd-jan14', time: '13:00', commandId, correlationId } }` → 200.
   `d-jan14` is Thursday: every event gets the same hard-coded week (2027-01-09…16).
5. **The push** (participant writes it):
   ```js
   await eventStream(board)
     .where(f => f.session?.sessionId === sessionId && f.session?.day === THURSDAY)
     .waitUntilFound(15)                       // SECONDS
   const frame = board.elements().find(f => f.session?.sessionId === sessionId && f.session?.day === THURSDAY)
   expect(frame.session).to.include({ sessionId, title, day: THURSDAY, time: TIME, status: 'scheduled' })
   ```
   The propose can push a frame first (no day yet) — filtering on `day` waits for the scheduled one.
6. **The query agrees** (participant writes it): `getSessions` again, find by `sessionId`,
   `to.include({ title, day, time })`.

Steps 1–4 are given in the human how-to; 5–6 are the exercise. Command bodies may be built with
`commandWith(...)` / `scheduleSessionCommandWith({ payload: ... })` with the ids and `eventId`
overridden.

## The WebSocket frame shape

`{ type: 'session', session: { …the whole board row… } }`. Top-level `type` is the literal
`'session'`, no `metaData` — `.ofChannel` does not match and `.matchingPayload` reads the wrong key.
Narrow with `.where(...)`; deep-assert on `board.elements()` after the wait.

## The rules that keep e2e from flaking (literal)

- **Tolerant assertions.** The host has everyone's state. Match *your* session by *your* id; never
  `to.have.length(1)` on frames.
- **Connect before you act.**
- **Own clean room** — a fresh event per run, cleaned up after.
- **Keep them few.** One or two prove the wiring; when one goes red, a component or integration test
  locates the bug.

## When the participant is stuck — check these first

No host / `npm start` instead of `npm run start:pg` · sign-in refused (unseeded DB → `npm run db:reset`)
· socket opened after the commands · filter matching the propose frame, not the scheduled one ·
schedule body not wrapped in `payload` · `waitUntilFound` read as a count · the test's own 20 s timeout
missing (mocha default here is 10 s).

## See also

- `../explanation/testing-levels.md` — why e2e is few and tolerant.
- `../reference/event-stream-dsl.md` — `fromWebSocket`, `eventStream`, `.where`.
