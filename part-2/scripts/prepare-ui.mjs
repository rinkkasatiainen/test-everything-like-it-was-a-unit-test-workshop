#!/usr/bin/env node
// Assembles a servable UI tree in ./public from the installed @rinkkasatiainen/cfb-ui package.
//
// Why a copy and not a symlink: the host's static server (cfb-server-shell) realpaths every
// requested path and 404s anything that resolves OUTSIDE the static root. cfb-ui's import map
// asks for `./node_modules/@rinkkasatiainen/cfb-*-ui/...` *relative to the served root*, so those
// packages must physically live under ./public. We copy cfb-ui's own files, then copy each of
// its browser dependencies into ./public/node_modules/@rinkkasatiainen/ as real files.
//
// The import map is left untouched (unlike cfb-ui's build.sh, which flattens it for CDN
// deployment): served by the local host, `import.meta.env?.DEV` is undefined, so the UI talks to
// the real /api/* the host answers rather than loading MSW mocks.
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const publicDir = path.join(repoRoot, 'public')

// Where cfb-ui is installed, and its package metadata (the dependency list is the exact set the
// browser import map references).
const cfbUiPackageJson = require.resolve('@rinkkasatiainen/cfb-ui/package.json')
const cfbUiDir = path.dirname(cfbUiPackageJson)
const cfbUi = JSON.parse(readFileSync(cfbUiPackageJson, 'utf8'))

// cfb-ui files that are not part of the served app.
const SKIP = new Set([
  'node_modules', 'build', '_fakes', 'package.json', 'build.sh', 'bundle-aws-sdk.js',
  'ui.code-workspace', 'index-dev.html', 'index-example.html', 'preview.html',
])

console.log(`prepare-ui: cfb-ui @ ${cfbUiDir}`)
rmSync(publicDir, { recursive: true, force: true })
mkdirSync(publicDir, { recursive: true })

for (const entry of readdirSync(cfbUiDir)) {
  if (SKIP.has(entry)) {
    continue
  }
  cpSync(path.join(cfbUiDir, entry), path.join(publicDir, entry), { recursive: true, dereference: true })
}

// An empty appsettings.json is not valid JSON; the UI fetches it, so ship `{}`.
const appSettings = path.join(publicDir, 'appsettings.json')
if (!existsSync(appSettings) || readFileSync(appSettings, 'utf8').trim() === '') {
  writeFileSync(appSettings, '{}\n')
}

// The browser dependencies, copied in as real files so they sit under the static root.
const deps = Object.keys(cfbUi.dependencies ?? {})
for (const dep of deps) {
  const from = path.join(repoRoot, 'node_modules', ...dep.split('/'))
  if (!existsSync(from)) {
    console.error(`prepare-ui: missing dependency ${dep} at ${from} — run \`npm install\` first`)
    process.exit(1)
  }
  const to = path.join(publicDir, 'node_modules', ...dep.split('/'))
  mkdirSync(path.dirname(to), { recursive: true })
  cpSync(from, to, { recursive: true, dereference: true })
}

console.log(`prepare-ui: wrote ${publicDir} (cfb-ui + ${deps.length} browser packages)`)
