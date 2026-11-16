# Which test is this box? — classifying what you drew

> AI-facing explanation, self-contained. This is the hard part of Part 2: once a participant has
> drawn a box around a capability and named the arrows, *what kind of test is it?* — component,
> component-integration, integration, e2e, contract, or resilience. Use this as the decision
> procedure the coach walks. There is no single question that settles it; there are two axes and a
> couple of off-axis questions, and you ask them in order.

## First, the two off-axis questions — they short-circuit everything

Most boxes are "does my capability behave correctly?" But two kinds of box are a *different
question*, and if the box is one of them, stop here — the tier grid does not apply.

**Q-A. Is the subject an AGREEMENT between two capabilities — do they still agree on the shape of
the message that passes between them?** Tells: you are worried about *drift* (a producer renames a
field and a consumer breaks); you are talking about a schema, a payload shape, a builder, a
well-known example; nobody is "behaving", you are checking a contract.
→ **Contract test.** Off the tiers entirely. See `contract-testing.md`. It needs no host and no
Docker; it validates the provider's published kit against itself.

**Q-B. Is the subject a FAILURE at the edge — what the capability does when a publish drops, nacks,
or retries?** Tells: the word "drop", "lost", "retry", "nack", "silent", "at-least-once"; you want
to prove data is *not* lost, or *is* redelivered.
→ **Resilience test.** A fault-injecting double (`silentlyDrops`, `succeedsOnAttempt`) decorates
the producer *port*; the same test shape runs at component or integration fidelity. See
`../how-to/inject-a-failure.md`.

If neither fits, the box is a behaviour box. Now the two axes.

## The two axes of a behaviour box

```
            BREADTH ▲  several reactions/units wired together (output of one feeds the next)
                    │
      one unit ─────┼─────────▶ FIDELITY
      at its seam   │       nullable (in-process) ───▶ real (Docker) ───▶ whole running host
                    │
```

- **Fidelity** = how real the edges are: nullable → real Postgres/Rabbit → a whole running host.
- **Breadth** = how many of the capability's *decisions* are in one test: one reaction, or a
  pipeline of them.

The four behaviour tiers are positions on this grid:

| | one unit (narrow) | several units (wide) |
|---|---|---|
| **nullable edges** | **component** | **component-integration** (the "weld") |
| **real edges (one capability)** | **integration** | **integration** (still one capability) |
| **whole running host, outside** | — | **e2e** |

## The decision procedure, in order

**1. How much of the capability is in the box?**
- *One* reaction / command / query, driven at its own inbound seam, observed at its own outbound
  seam → **narrow**. Go to step 2.
- *Several* units wired so one's output drives the next (materialize → push; command → relay →
  bus) → **wide**. Go to step 3.
- The *whole system*, and you are an outside client making HTTP calls and listening on a socket →
  **e2e**. Done.

**2. Narrow — how real are the edges?**
- Nullable (in-process, no Docker; `createNull()`, `inMemoryBroker`) → **component**.
- Real Postgres + real RabbitMQ, one capability → **integration** (narrow, real).

**3. Wide — how real are the edges, and should it be wide at all?**
- First challenge the breadth: *do you need the second unit, or did it sweep in because you are
  reaching past where this reaction stops?* If the box needs a store/relay/view only to serve a
  reaction you are not testing → **cut it** and you are back to a narrow **component** test
  (`where-to-cut-the-flow.md`).
- If the wiring genuinely *is* the subject:
  - Nullable edges, relay driven by hand, one shared real-twin store → **component-integration**
    (the weld). Use only to isolate one specific wiring claim.
  - Real Postgres + Rabbit → **integration**. Usually the truer home for "the whole flow really
    connects", because the real edge turns the cost into information.

## The question that trips everyone: "where does the box stop?"

A component test **stops at the capability's own output** — the write it makes, or the fact it
publishes on *its* producer. It does **not** prove the written fact reaches the real bus (a
nullable store keeps no state, so the relay drains nothing). The moment the box's assertion is
"the fact reached the bus / the other reaction / the socket", you have crossed out of the plain
component tier:

| The claim you want to assert | The box it makes |
|---|---|
| "the reaction wrote the right fact" | **component** (assert the write off the store tracker) |
| "the command's written fact, unchanged, reaches the bus" | **component-integration** (the weld; nullable, hand relay) |
| "the real broker routes it to a bound queue" | **integration** |
| "a connected browser receives the push, whole system up" | **e2e** |
| "the producer and consumer agree on the fact's shape" | **contract** (off-axis) |
| "a silent drop loses the fact with no error" | **resilience** (off-axis) |

## Worked classifications (the answer-key tests)

| Test | Off-axis? | Breadth | Fidelity | → Tier |
|---|---|---|---|---|
| `GET /sessions` returns board rows | no | one query | nullable (read stubs) | **component** |
| `propose-session` → appends `session-proposed` | no | one command | nullable | **component** |
| `session-proposed` → appends `session-change-noted` | no | one reaction | nullable | **component** |
| `view-updated` → push on channel | no | one reaction | nullable (read stub + real channel spy) | **component** |
| command's fact, unchanged, reaches the bus | no | command + relay (wide) | nullable, hand relay | **component-integration** |
| Discovery emits over a **real** broker | no | one reaction | real pg+rabbit | **integration** |
| proposed session pushed live to a `ws` client | no | whole pipeline | whole running host | **e2e** |
| provider+consumer agree on `session-proposed` | **yes (agreement)** | — | — | **contract** |
| a `drop`-payload fact vanishes with no error | **yes (failure)** | — | — | **resilience** |

## See also

- `testing-levels.md` — the fidelity axis in full
- `where-to-cut-the-flow.md` — the breadth axis, and why wide-nullable is usually the wrong home
- `contract-testing.md` — the agreement axis
- `../how-to/inject-a-failure.md` — the failure axis
