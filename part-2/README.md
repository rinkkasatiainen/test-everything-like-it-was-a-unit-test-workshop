# test-everything-like-it-was-a-unit-test-workshop

A working repo for the workshop titled 'Test everything like (it was) a unit test'.

It runs the CodeFreeze Board locally via the published `@rinkkasatiainen/cfb-local-host`
package — the whole board (UI + API) on one port, `http://localhost:3001`.

## Install

The board packages live in GitHub Packages, so npm needs a token with `read:packages`:

```bash
cp .npmrc.example .npmrc
export NODE_AUTH_TOKEN=ghp_your_read_packages_token
npm install
```

## Run

**Zero setup — nothing external:**

```bash
npm start
```

The datastore is an in-process pglite (seeded automatically), the event bus is in-memory, and
login uses a local table. No Docker, no Postgres, no RabbitMQ. Open http://localhost:3001 and
sign in as `casey` or `quinn`. Password for both is 'CfbBoardPassword123'

**Against Docker Postgres + RabbitMQ:**

```bash
npm run start:pg
```

This brings up Postgres + RabbitMQ (`npm run db:up`, using the compose file bundled in the
`cfb-local-host` package — Postgres is seeded on first start), then runs the host against them.
Stop the containers with `npm run db:down`; wipe and re-seed with `npm run db:reset`.

## How it is wired

| Script | What it does |
|---|---|
| `npm start` | assembles the UI, then starts the host in memory mode (`.env.memory`) |
| `npm run start:pg` | brings up the DB stack, assembles the UI, starts the host (`.env`) |
| `npm run ui:build` | assembles `public/` — the servable UI — from the installed `cfb-ui` |
| `npm run db:up` / `db:down` / `db:reset` | the bundled Postgres + RabbitMQ stack |
| `npm run clean` | removes the generated `public/` |

The UI is served as static files from `public/`, which `ui:build` assembles from the installed
`@rinkkasatiainen/cfb-ui` package plus its browser dependencies (the host's static server refuses
to serve anything outside its root, so the files are copied in rather than symlinked). `public/`
is generated and git-ignored — `npm start` rebuilds it every time.

Configuration lives in `.env` (Docker stack) and `.env.memory` (zero-setup); `scripts/start.mjs`
loads the chosen one and makes it authoritative over any stray shell environment variables.
