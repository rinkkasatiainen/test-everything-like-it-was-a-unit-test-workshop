#!/usr/bin/env node
// Loads an env file and starts the host. Unlike `node --env-file`, this *overrides* any variable
// already in the environment, so a stray `CFB_DEMO_PROFILE` left exported in someone's shell (or
// by direnv) cannot silently flip the profile out from under the chosen file.
//
//   node scripts/start.mjs .env.memory   # zero-setup (pglite + in-memory broker)
//   node scripts/start.mjs .env          # against Docker Postgres + RabbitMQ
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envFile = path.resolve(repoRoot, process.argv[2] ?? '.env')

for (const raw of readFileSync(envFile, 'utf8').split('\n')) {
  const line = raw.trim()
  if (line === '' || line.startsWith('#')) {
    continue
  }
  const eq = line.indexOf('=')
  if (eq === -1) {
    continue
  }
  process.env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
}

console.log(`start: ${path.basename(envFile)} — profile=${process.env.CFB_PROFILE} db=${process.env.CFB_DB ?? 'postgres'} bus=${process.env.CFB_DEMO_PROFILE}`)

// Imported after the env is set, so the host and every capability read the chosen values. The
// bin owns the start + graceful-shutdown wiring.
await import('@rinkkasatiainen/cfb-local-host/bin/cfb-local.js')
