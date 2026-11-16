# ai-docs — the AI-facing corpus for Part 2

A **generic, tool-agnostic** set of prompts and condensed docs that let any AI assistant coach a
participant through Part 2 — Copilot, Cursor, Claude (new or older), or a raw chat window. Nothing
here depends on a single vendor's skill format; the tool-specific files elsewhere are thin shims
that point back here.

> This corpus is meant to **stand alone** once the human `docs/` folder is removed. It carries the
> whole body of knowledge — every tier, the contract axis, the resilience axis — condensed for the
> model: terse, imperative, self-contained, so an assistant can act on one file without chasing
> links. Each file names its longer human counterpart under `docs/` for provenance.

## What's here

```
ai-docs/
  coach/
    draw-the-box.md          # the Socratic ENTRY POINT: gate → draw box → classify → redirect → write
    nullables.md             # focused sub-lesson: nullables / spies / why no mocks
  explanation/               # WHY — the mental models
    which-test-is-this-box.md  # the hard part: classify the box (contract/resilience, breadth × fidelity)
    testing-levels.md          # the fidelity axis: component / integration / e2e
    where-to-cut-the-flow.md   # the breadth axis; the "component-integration" name trap
    contract-testing.md        # the agreement axis; the closed loop; why four happy cases
    anatomy-of-a-component-test.md  # the method: contract → builder → component
    nullables-not-mocks.md     # the one distinction the whole approach turns on
  how-to/                    # DO — one recipe per kind of test
    write-a-component-test.md          # five shapes: bus→append, HTTP→append, HTTP→query, materialize, push
    write-a-component-integration-test.md  # the weld (wide, nullable, hand-driven relay)
    write-an-integration-test.md       # real Postgres + RabbitMQ
    write-an-e2e-test.md               # whole running host, poked from outside
    write-a-contract-test.md           # the kit self-test: four happy + failures
    inject-a-failure.md                # resilience: silent drop, transient nack
    build-a-fact-from-a-contract.md    # the one habit: never hand-roll a message
  reference/                 # LOOK UP — the API as built
    event-stream-dsl.md        # the two spy engines, the sources, emit, the two waitUntilFound
    component-host-fixture.md  # the componentHost fixture and the port vocabulary
    contract-packages.md       # what each capability's contract kit ships
```

## Point your AI here

The one source of truth is `coach/draw-the-box.md`. Every tool below just routes to it.

| Tool | How | Shim |
|---|---|---|
| **GitHub Copilot** | In Copilot Chat, run `/draw-the-box` (needs `chat.promptFiles: true` in VS Code). If prompt files are off, open the coach doc and paste it. | `.github/prompts/draw-the-box.prompt.md` |
| **Claude Code** (new or older models) | The `part-2-draw-the-box` skill triggers on Part 2 testing work; it opens the coach doc. | `.claude/skills/part-2-draw-the-box/SKILL.md` |
| **Cursor / other** | Paste `coach/draw-the-box.md`, or reference it from a project rule. | — |
| **Any chat** | Paste the contents of `coach/draw-the-box.md`. It is self-contained. | `coach/draw-the-box.md` |

Adding a new tool is a one-file shim: a few lines that say "read `coach/draw-the-box.md` and follow
it." **Do not copy the coaching content into a shim** — keep one source of truth.

## The flow the coach runs

1. **Gate** — *are you on Part 2?* If not, stop. (Never skipped.)
2. **Draw the box** — one capability, one flow; name the arrows in / out / hidden.
3. **Classify** — which kind of test is this box? (`explanation/which-test-is-this-box.md`) — the
   hard part: contract or resilience off-axis, else breadth × fidelity, and *where does the box
   stop?*
4. **Redirect** — when an answer is off, point at the smallest doc; **if they still disagree,
   follow them.**
5. **Write** — route to the matching `how-to/`, and let the participant write the test.

## The two rules the whole corpus enforces

1. **The gate.** The coach asks, every time, whether the participant is on Part 2, and stops if not.
2. **Coach, not author.** The AI asks, classifies, redirects, and holds back the test code. The
   participant writes the test. If an assistant starts writing the solution, it has broken the
   exercise. (Weaker/older models drift here — the rule is stated plainly and repeatedly on purpose.)

## Coverage

The corpus is meant to be **sufficient to build every test in the answer key** — component
(reaction, command, query, materialize, push, idempotency, selectivity), component-integration (the
weld), integration (bus→bus, HTTP→bus, bus→WebSocket), contract (per capability, with variants),
resilience (silent drop, transient nack), and e2e. If a dry run finds a test the coach cannot lead a
participant to build, that gap is a missing or thin doc — fix it here.

> **Pending (separate task):** a `capability` explainer — what a "capability" *is* in the CodeFreeze
> board — is not yet written. The whole corpus says "draw a box around a capability" but never
> defines the term. Tracked to build on its own.
