# What is a capability? — the box you draw around

> AI-facing explanation, self-contained. The whole of Part 2 says *"draw a box around a
> capability"* — this file gives the coach enough to use the term operationally. The **authoritative,
> human-facing definition** of a business capability *and the composition story behind the board*
> is Aki's own write-up:
> [`human-docs/explanation/capabilities-and-composition.md`](../../human-docs/explanation/capabilities-and-composition.md).
> **Send the participant there to read it** — this file only distills what the coach needs to draw a
> box. Source pictures:
> [`images/capability-map-whole.png`](../../../images/capability-map-whole.png) and
> [`images/capability-map-l2.png`](../../../images/capability-map-l2.png).

## The definition

A **business capability** (the definition from the human doc, coined at SoCraTes 2026):

> **What we must do as an org … to achieve our purpose … for our beneficiaries.**

It describes **what** we do, not **how** — no technical jargon — and it is **inherently stable** over
time. Running an unconference needs *Session Proposal* whether the board is physical sticky notes at
SoCraTes or this app at CodeFreeze; the capability is the same, only the *how* differs.

For the coach that turns into one operational tell: in this system a capability is named as a *doing*
(Session **Proposal**, **Scheduling**, **Discovery**) and it **owns one event stream and the read
model built from it** — its **own fact to publish** (`session-proposed`, `session-scheduled`) and its
**own read side** nobody else writes. Not a screen, not a table, not a class. Cross into another
fact or another read side and you have left the capability — that edge is the wall of the box.

## The capability map — the whole business, one level down

The map is a tree. The root — *Running an Unconference* — is itself a capability; the middle row is
its **sub-capabilities**; the leaves are the fine-grained capabilities (lettered A–S). Running an
unconference has **four** sub-capabilities — **Session Programme, Community, Conference Management,
Venue** — present at SoCraTes too. **Provisions** is a fifth, **CodeFreeze-specific** one (the
groceries-in-the-fjells reality), which is why the map tints it differently.

```
                         Running an Unconference
      ┌──────────────┬──────────────┬───────────────┬──────────┬────────────┐
 Session Programme  Community   Conference Mgmt    Venue     Provisions
   A Session Proposal   G Interest Marking   F Week Setup   N Venue Arr.   O Grocery List
   B Session Scheduling H Learning Capture                  Q Location Def. P Cost Sharing
   C Session Location…  R Session Conversation
   D Session Announcement  I Shared Moment Alerting
   E Session Discovery  J Moment Sharing …
   S Session Notification
```

Read one leaf card and you see everything a capability carries:

- **ID + name** — `A — Session Proposal`. The name is a capability, i.e. a *doing*.
- **Type** — `core` / `supporting` / `generic`. How much this capability *differentiates* the
  product (DDD subdomains): **core** = the reason the product exists (Session Scheduling, Discovery),
  build it best and in-house; **supporting** = needed but not special (Session Proposal, Announcement);
  **generic** = could be bought or outsourced (Chat Access, Cost Sharing). Type hints at how much test
  effort a capability earns.
- **Personas + arrows** — who acts, and whether they *command* (`!`, changes something) or *query*
  (`?`, reads something). `everyone → host` means everyone's action crosses to the host's capability.
- **Stages** — build order (`host 1 · alex 7b`, `build-first`). The sequence the workshop and the
  product grow in.

### "outside" boxes are not capabilities

The blue boxes — **Hold the session (outside)**, **Place the order (outside)**, **Mix in, go
outdoors (outside)** — sit past the system boundary. They are real-world steps the software does not
do. You never draw a Part 2 box around one; they mark where the software stops.

## A capability owns a lane — and may not reach into another's

In the [event model](event-model.md) each capability is a **lane**. The lane is the box drawn out
over time. Three rules fall straight out of "owns one stream":

1. **A capability publishes its own facts** into its own lane. That fact is the arrow *out*.
2. **A capability never reads another capability's raw event stream** — forbidden. To use another's
   work it either **listens to its published fact** (*listen-to-react*) or **asks its read side**
   (*ask-to-read*, the ◆). This is exactly why a test asserts the *fact at the edge*, not a reach
   into the neighbour (see [`nullables-not-mocks.md`](nullables-not-mocks.md):
   *"outgoing on your side is incoming on theirs"*).
3. **A screen that shows several capabilities at once is a *composition*, not a capability.** It owns
   no lane, emits no fact, keeps no stream — it only asks each capability's read side and assembles
   the view. Do not box a composition as if it were one capability. (Composition runs deeper than the
   screen: the whole board is a *composition* of autonomous capabilities, and monolith-vs-microservice
   becomes a deployment/financial choice over the same domain code — the full story is in
   [`capabilities-and-composition.md`](../../human-docs/explanation/capabilities-and-composition.md).)

## Why this is the Part 2 pivot: one capability = one box = one test

When a participant says *"I want to propose a session and see it in my browser"*, they have named
**two** capabilities and a composition:

| What they said | Really is | Lane / flow |
|---|---|---|
| "propose a session" | **A — Session Proposal** | HTTP → bus (`propose-session` → `session-proposed`) |
| "…and see it on the board" | **E — Session Discovery** + the board **composition** | bus → read model → WebSocket |

That is too big for the **first** test — not wrong, just more than one box. Split it by capability,
pick one to start, and box that. There will be more boxes; the map tells you how many and in what
order. One capability, one flow, one test — then the next.

## The CodeFreeze capabilities you will actually test

The workshop board implements a handful of the map's leaves. These are the ones you draw boxes
around in Part 2:

- **A — Session Proposal** — `propose-session` ⟶ `session-proposed`.
- **B — Session Scheduling** — `schedule-session` ⟶ `session-scheduled`; `unschedule-session` ⟶
  `session-unscheduled`.
- **C — Session Location Assignment** — a session is given a place.
- **E — Session Discovery** — reacts to others' facts (`note-session-change` ⟶ `session-change-noted`),
  feeds the **board projection** read model.
- **F — Week Setup** — the `week's days` the board is laid out on.

Next: see those same capabilities drawn as beats over time, and how each coloured transition becomes
a box, in [`event-model.md`](event-model.md). To decide *which kind* of test a box is once drawn,
go to [`which-test-is-this-box.md`](which-test-is-this-box.md).
