# ai-docs — the AI-facing corpus for Part 2

A **generic, tool-agnostic** set of prompts and condensed docs that let any AI assistant coach a
participant through Part 2 — Copilot, Cursor, Claude (new or older), or a raw chat window. Nothing
here depends on a single vendor's skill format; the tool-specific files elsewhere are thin shims
that point back here.

> This corpus carries the whole body of knowledge — every tier, the contract axis, the resilience
> axis — condensed for the model: terse, imperative, self-contained, so an assistant can act on one
> file without chasing links. It is **for the assistant to reason from, not for participants to
> read.** The participant-facing docs live in `part-2/human-docs/`. Where a file has a human
> counterpart, its header says **"Send the participant to: …"**, and the full ai-docs → human-docs
> map is at the top of [`coach/draw-the-box.md`](coach/draw-the-box.md). Where there is no human
> page yet, the coach explains the topic in its own words.

## What's here

```
ai-docs/
  coach/
    draw-the-box.md          # the Socratic ENTRY POINT: gate → draw box → classify → redirect → write
    nullables.md             # focused sub-lesson: nullables / spies / why no mocks
  explanation/               # WHY — the mental models
    capabilities.md            # what a "capability" IS — the box you draw around (the capability map)
    event-model.md             # what the system actually does — the box map; beats = the three flows
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
    ports.md                   # the port vocabulary: nullable vs real builders, how to observe each
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
4. **Redirect** — when an answer is off, point at the smallest **human-docs** page; **if they still
   disagree, follow them.**
5. **Write** — route to the matching page in `part-2/human-docs/`, and let the participant write the
   test.

## The two rules the whole corpus enforces

1. **The gate.** The coach asks, every time, whether the participant is on Part 2, and stops if not.
2. **Coach first, author on request.** The AI asks, classifies, redirects, and holds back the test
   code — the participant tries first ("if you don't manage, come back and we'll do it together").
   The AI writes test code **only when the participant explicitly asks for it**, and then gives
   copy-pasteable code that fits their file, and explains it. Either way it always reads the
   participant's test file and helps make it pass. Offering the solution unasked breaks the
   exercise. (Weaker/older models drift here — the rule is stated plainly on purpose.)

## Coverage

The corpus is meant to be **sufficient to build every test in the answer key** — component
(reaction, command, query, materialize, push, idempotency, selectivity), component-integration (the
weld), integration (bus→bus, HTTP→bus, bus→WebSocket), contract (per capability, with variants),
resilience (silent drop, transient nack), and e2e. If a dry run finds a test the coach cannot lead a
participant to build, that gap is a missing or thin doc — fix it here.

> **The ground the box sits on.** Two explanation docs define the terms the whole corpus leans on:
> [`explanation/capabilities.md`](explanation/capabilities.md) — what a "capability" *is* in the
> CodeFreeze board (the capability map) — and [`explanation/event-model.md`](explanation/event-model.md)
> — what the system actually does, drawn as beats, where each coloured transition is a candidate box
> and the three beats are the three Part 2 flows. Start a participant here when "draw a box around a
> capability" is still abstract. Source pictures live in `images/` (`capability-map-*.png`,
> `event-model-*.png`).
