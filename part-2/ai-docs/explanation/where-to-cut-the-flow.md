# Where to cut the flow — breadth, not just fidelity

> AI-facing explanation, self-contained.

`testing-levels.md` draws one axis — how real the edges are. This is the other one, at right
angles, that decides whether a *component* test stays a component test.

```
            breadth ▲ the whole capability pipeline (several reactions, wired together)
                    │
   one reaction ────┼────────▶ fidelity
   at its own seam  │        nullable ──▶ real
```

Fidelity is the cost of the edge. Breadth is the number of *decisions* a test drags in. They are
independent.

## The smell: a component test that needs a database

The board's live update is **two reactions**, not one:

- **`materializeBoard`** — reacts to `session-change-noted`, folds the row, writes the view
  (`upsertView`), announces `view-updated`. **Owns the store.**
- **`pushBoardRow`** — reacts to `view-updated`, reads the fresh row back (`board.get`), sends it
  on the channel. **Owns a read, nothing more.**

Testing *delivery* by driving the whole chain (`session-proposed → reaction → relay → materialize
→ view-updated → push`) needs a store, a relay and a materialized board **before it reaches the
line it cares about** — infrastructure that serves `materializeBoard`, a reaction the test is not
about. **If a component test must stand up infrastructure belonging to a reaction it is not
testing, the breadth is wrong.** The fix is not a lighter DB double — it is to cut at the reaction
boundary and test one reaction.

## The cut

`pushBoardRow` takes `view-updated` in, makes a push out. Test exactly that: drive `view-updated`
on a nullable bus; hand it a board that is **only a read port** (a `get`-stub returning a canned
row — a *view*, not a database); observe the push on the real channel via `channel.trackChanges()`.
No store, no relay, no materialized view. `materializeBoard` gets its *own* component test at *its*
seam (`session-change-noted` in, `view-updated` out), and that one may touch the view, because
materializing is what it is for.

**Test boundaries mirror reaction boundaries.** When they can't, the design is telling you two
concerns are coupled.

## "component-integration": the wide test, and the name trap

Sometimes the subject genuinely *is* the wiring — does the fact one half wrote reach the other
half, end to end. A test that boots several units together, still on nullable infra, is a
**component-integration** test: *wide on breadth, left on fidelity*. In this repo
`proposal-command-to-bus.component-integration.test.js` is the worked case — **the weld**: a real
command core + a real relay + one shared real-twin store (`createInMemoryEventStore`), a nullable
producer, and the relay driven **by hand** (`relayOnce()`, no timer). It proves the fact the
command *appended* is, unchanged, the fact the relay *publishes* — something neither the HTTP→append
component test (stops at the write) nor the relay test (starts from a hand-built event) can.

**Mind the name: it is NOT the integration *tier*.** The integration tier (real Postgres, real
Rabbit) moves on the *fidelity* axis. A component-integration test moves on the *breadth* axis
(several units, nullable edges). Same word, two axes.

Prefer not to live wide-and-nullable: it pays the breadth cost (store, relay, slower setup, vaguer
failure) without buying fidelity. Usually the honest home for "the whole flow really connects" is
the **integration tier**, where a real edge turns the cost into information. The weld is the
exception that earns it — it isolates one specific claim (append identity survives onto the bus)
that the real tier would prove more expensively and less precisely.

## Rules of thumb

- **One reaction per component test.** Drive its inbound seam; observe its outbound seam.
- **The DB smell.** Needing a store/relay/view to reach the assertion = you swept in a reaction
  you are not testing. Cut the flow.
- **Read-only reactions are easy** — a delivery or projection-read reaction needs only a stub of
  what it reads, never the machinery that filled it.
- **Go wide only for wiring**, and ask whether the integration tier is the truer home.
- **Watch the word "integration."** Breadth (several units) and fidelity (real infra) are
  different axes that share a name.
