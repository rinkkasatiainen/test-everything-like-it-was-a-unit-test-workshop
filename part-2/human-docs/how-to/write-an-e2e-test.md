# Writing an end-to-end test — a participant's guide

> ⚠️ Mostly AI-written and not yet reviewed by a human. To be reviewed later

⚠️ This uses my vocabulary. If yours differs, rename the folders to the names that work for you.
Names matter, and working with the names from your own context matters.

> Your on-ramp for the e2e tier. The **setup is given to you, ready to paste**: signing in, talking HTTP,
> a fresh event to work in. What you write is the **assertion**: what the user should see happen. If you
> get stuck, see the "Stuck?" section at the bottom.

## What an e2e test is, in one breath

An e2e test **boots nothing**. A whole board host is already running, and your test is just a
**client** of it, the way a browser is. It signs in, POSTs commands over HTTP, and listens on the live
WebSocket. Everything in between is real: the capabilities, the store, the bus, the relay, the board
projection.

So where a component test asks *"does my capability do the right thing?"*, an e2e test asks only
**"is it all plugged together?"** That makes e2e tests the worst tool for *finding* a bug. When one goes
red, it doesn't tell you where; a component or integration test does. **Keep them few**, one or two per
journey.

## Before you start — a running host

The test needs a host on `http://localhost:3001` that reads the **Docker Postgres**:

```bash
npm run start:pg      # brings up Postgres + RabbitMQ, builds the UI, starts the host on :3001
```

Leave that running, and in another terminal:

```bash
npm run test:e2e      # runs test/e2e/**/*.test.js
```

Use `start:pg`, not plain `npm start`. The test creates its own event by inserting a row straight
into the Docker Postgres (see below), and the in-memory host from `npm start` never reads that database.

Two environment variables point the test elsewhere if you need to: `CFB_BASE_URL` (default
`http://localhost:3001`) and `CFB_DATABASE_URL` (default the local Docker Postgres).

## Setup — paste this and move on

This setup is for the **whole journey**: sign in, propose a session, schedule it for Thursday, and see
the board update live. Make a new file under `test/e2e` (call it `whatever-you-like.test.js` and it will
run), and paste this block:

```js
import pg from 'pg'
import { expect } from 'chai'

import { eventStream, fromWebSocket } from '../../src/dsl/index.js'

const BASE_URL = process.env.CFB_BASE_URL ?? 'http://localhost:3001'
const WS_BASE = BASE_URL.replace(/^http/, 'ws')
const DATABASE_URL = process.env.CFB_DATABASE_URL ?? 'postgres://cfb:cfb-local-dev@localhost:55432/cfb_local'

// A seeded user — the same one you sign in as in the browser.
const CREDENTIALS = { username: 'casey', password: 'CfbBoardPassword123' }

// Every event gets the same week (2027-01-09…16), so Thursday is always this day id.
const THURSDAY = 'd-jan14'
const TIME = '13:00'
const TITLE = 'Test everything like (it was) a unit test'

const uniqueId = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`

// Sign in like the login form does; keep the session cookie for every later request.
const signIn = async () => {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...CREDENTIALS, returnTo: '/' }).toString(),
    redirect: 'manual',
  })
  const location = res.headers.get('location') ?? ''
  if (location.includes('error=')) {
    throw new Error(`sign-in refused for ${CREDENTIALS.username}: ${location}`)
  }
  const setCookie = res.headers.get('set-cookie')
  if (!setCookie) {
    throw new Error(`no session cookie set (status ${res.status}, location ${location || 'none'})`)
  }
  return setCookie.split(';')[0]
}

const postCommand = (cookie, path, command) => fetch(`${BASE_URL}${path}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify(command),
})

const getSessions = async (cookie, eventId) => {
  const res = await fetch(`${BASE_URL}/api/event/${eventId}/sessions`, { headers: { Cookie: cookie } })
  return { status: res.status, body: res.status === 200 ? await res.json() : null }
}

describe('e2e · the board, end to end  (needs: npm run start:pg)', () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL })
  const eventId = uniqueId('e2e-event')
  let cookie
  let board // the live WebSocket client

  before(async () => {
    // Make a brand-new event, so this test starts from an empty board.
    await pool.query(
      'insert into conferences (slug, name, starts_on, ends_on) values ($1, $2, $3, $4)',
      [eventId, `E2E ${eventId}`, '2027-01-11', '2027-01-19'],
    )
    cookie = await signIn()
  })

  after(async () => {
    await board?.close()
    await pool.query('delete from conferences where slug = $1', [eventId]).catch(() => {})
    await pool.query('delete from board where event_id = $1', [eventId]).catch(() => {})
    await pool.end()
  })

  // your test goes here
})
```

Let's go through that code piece by piece.

### The helpers — talking to the host like a browser

- **`signIn()`** posts the same form the login page posts. On success the host answers with a redirect
  and a **session cookie**, and everything after that sends the cookie along. Your identity comes from
  the cookie. A command body never says who you are.
- **`postCommand(cookie, path, command)`** sends a command as JSON, for example to
  `/api/commands/propose-session`.
- **`getSessions(cookie, eventId)`** asks the board query what's on the board. The answer is
  `{ sessions: [...] }`.

### before & after — a fresh event of your own

The host is shared. Other tests, and other people in the room, have already put sessions on it. To get
a **clean room**, the test creates its own event with a random slug, by inserting one row into the
`conferences` table, and deletes it again in `after`. That makes "the board starts empty" literally true.

(The backend doesn't invent events. The board query and the live socket both refuse a slug they don't
know, with a 404 or a WebSocket close code 4004. Inserting the row is the only way to make a new event
today.)

## Now write the test

Picture the user's journey and mark the **incoming** and **outgoing** messages:

1. A fresh event has an **empty board**.
2. **Connect the live socket first.** Nothing is replayed to a client that joins late.
3. **Propose** a session (incoming: an HTTP command).
4. **Schedule** it for Thursday 13:00 (incoming: another HTTP command).
5. The live channel **pushes** the scheduled session (outgoing: a WebSocket frame).
6. The board query **agrees** (outgoing: the durable state).

Steps 1–4 are the act, and they're given below. Steps 5 and 6 are yours.

```js
it('signs in, starts empty, proposes and schedules a session, and sees it pushed live for Thursday', async function () {
  this.timeout(20000) // real sockets, a real relay: give it more than mocha's default 10 s

  const sessionId = uniqueId('s')

  // 1) a fresh event starts with an empty board
  const before = await getSessions(cookie, eventId)
  expect(before.status).to.equal(200)
  expect(before.body.sessions).to.be.an('array').that.is.empty

  // 2) connect BEFORE acting
  board = await fromWebSocket(`${WS_BASE}/api/event/${eventId}/sessions/live`, { headers: { Cookie: cookie } })

  // 3) propose — a flat body
  const proposed = await postCommand(cookie, '/api/commands/propose-session', {
    eventId, sessionId, title: TITLE, commandId: uniqueId('c'),
  })
  expect(proposed.status).to.equal(200)

  // 4) schedule — this command is wrapped in { payload }
  const scheduled = await postCommand(cookie, '/api/commands/schedule-session', {
    payload: { eventId, sessionId, day: THURSDAY, time: TIME, commandId: uniqueId('c'), correlationId: uniqueId('r') },
  })
  expect(scheduled.status).to.equal(200)

  // 5) ← your assertion: wait on `eventStream(board)` for the frame that is YOUR session on THURSDAY,
  //    then read it off `board.elements()` and check what the user would see (title, day, time, status).
  // 6) ← and then: does `getSessions(cookie, eventId)` agree with what the socket showed?
})
```

Hints for steps 5 and 6:

- A frame is `{ type: 'session', session: { …the whole session… } }`. Pick yours with
  `.where(f => f.session?.sessionId === sessionId && f.session?.day === THURSDAY)`. `.ofChannel(...)`
  doesn't apply, because a frame has no `metaData`. The frame shape is described in
  [`buildBoardRowPushWith`](../reference/builders/session-discovery/build-board-row-push-with.md).
- The **propose** can push a frame of its own first (no day yet). That's why the filter includes
  `day === THURSDAY`: the scheduled state is the one you're waiting for.
- `waitUntilFound(n)` takes **seconds**. Over a real socket, give it plenty, say `15`.
- For the deep check, find the frame in `board.elements()` after waiting, and
  `expect(frame.session).to.include({ ... })`.

The two command shapes differ, and that's not a typo. Propose is **flat**
([`commandWith`](../reference/builders/session-proposal/command-with.md)), and schedule is wrapped in
**`{ payload }`**
([`scheduleSessionCommandWith`](../reference/builders/session-scheduling/schedule-session-command-with.md)).
You *can* build both bodies with those builders instead of literals. Just override the ids and the
`eventId` to your own.

## The rules that keep e2e from flaking

- **Tolerant assertions, always.** The host has state from everyone else. Match *your* session by
  *your* id, and never assert "exactly one frame arrived".
- **Connect before you act.** A late socket misses the push.
- **Make your own clean room**, a fresh event per run, and clean it up afterwards.
- **Keep them few.** One or two e2e tests prove the wiring. Everything else belongs a tier down.

## Stuck?

Writing the assertion yourself *is* the exercise, so have a go before asking. If you get wedged, **come
back to the coach with a link to your test** and say where it's stuck. The coach will read it and help
you work out what's wrong. If you'd rather, ask it to do it together with you.

The usual suspects at this tier: no host running (or `npm start` instead of `npm run start:pg`); a
sign-in error because the database wasn't seeded (`npm run db:reset` re-seeds it); the socket opened
after the commands; a filter that catches the propose frame instead of the scheduled one; or
`waitUntilFound` given a count instead of seconds.

## See also

- [`write-an-integration-test.md`](write-an-integration-test.md) — one capability over real edges, a tier
  down and much better at locating a bug.
- [`write-a-component-test.md`](write-a-component-test.md) — the same flows, nullable, fastest feedback.
- [`../reference/nullables/real-transports.md`](../reference/nullables/real-transports.md) —
  `fromWebSocket` and `eventStream`.
