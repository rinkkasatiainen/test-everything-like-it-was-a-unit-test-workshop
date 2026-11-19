# Writing a component test — a participant's guide

⚠️ This is vocabulary most natural to you - if you have your own that does not match the one I'm describing,
please go ahead and rename the folders to follow the names that mostly resonates with you. Names are important,
and you working with the names from your context matters.

This guide will explain you my take on _component test_, and the _how to setup component test in this context_. The
latter part is there because you don't know the implementation details you might need in order to run tests.

## What a component test is, in one breath

A component test, in this context while using _my vocabulary_, is testing a "bigger whole" - a small part of a journey,
without any infrastructure attached to it. So, no DB, no AMQP - none of that. Having said that, a component test is a
test that goes through an end-2-end of a part of the system. So it needs then the whole component running, as if it
was running in a real app.

The bootup sequence happens in the `before` block of each test, where the test setup should wire up all the relevant
and required infrastructure assets as _nullables_ - this way we're testing our real production code, but we just use
a **nullable adapter** instead of the real 3rd party library adapter.

If you want to understand more about nullabled (which totally is not needed for this workshop), you might want to read
a bit in the [`../reference/nullables`](../reference/nullables/README.md) on what it means in this context.

In this context, a component is a capability, booted exactly the same way a real host would boot it up. This way the
component test actually tests the actual production behavior. The architecture of this application is event-based. That
means that capabilities discuss with each other by sending/receiving commands/events. (You might remember
Object-Oriented
Programming to be about _sending and receiving messages_ - and this is exactly the fractal nature I mentioned earlier)

A capability, let's say 'SessionProposal' understands how to respond to command _Propose a Session_ and it does send an
outgoing event `session-proposed`. The shape that is so similar to OOP, that it's mind-blowing for me. Thus, and this
is the big thing for me, because we learned the 3-by-2 matrix of unit testing OOP - and this is **exactly the same
shape**, we can test the components exactly the same way as we test unit tests. **Magic in it's best.**

So, in short, a component test is _sending a message_ to a _partially running application_ and _verifying the behavior
using the 3-by-2 matrix_. From now on, I start talking about a 'capablility', and a word 'component' could be used
interchangeably in many cases. I just want to bring this vocabulary for peoples' minds.

## Incoming message.

The incoming messages for a capability come in two different shapes (in this workshop).

It either is a command - a user doing something in the app, like _proposing a session_, or _scheduling it on Tuesday
morning at 10:15am_.
or it comes as an event - a business decision. An example of business decisions encoded into an event is
`session-proposed` event, that SessionProposal capability sends - and a capability SessionDiscovery receives (and
reacts).

I hope you really see the 'sending and receiving messages' here.

### Building a message.

Now comes and interesting question - if I am to test a capability, how can I be sure that I'm sending a message of
correct shape - how can I be sure that the event I'm reacting to is valid? Because if I just manually create an event,
or a command, and send that to my capability - how can I be sure that it's actually what is actually being sent in
production code. Because the production code-test code drift is so easy to happen. So so easy.

Enter Contract Testing (an explanation to be added later into this repo).

Because we have published npm package of each contract - every single capability has their contracts published together
with:

- example JSON files of valid shapes
- schemas of valid shapes (that you can use to validate that you get valid commands/events)
- a test data builder that is guaranteed to build valid shapes
- an a set of well-known examples that are 1-1 match with the example JSONs.

With these packages, we can take the builder, and build example commands/events that we send - and we can build example
events we expect to have been sent (as outgoing message) on the other side of the test. This way, we can be sure that
our component tests are working on the correct data.

For example, to build a 'ProposeSession' command, you can just:

```js
import { commandWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'

const command = commandWith({ title: 'ES 101' })   // a valid propose-session command
```

in your setup / test function, and it will make you a valid command for the rest of your test execution.

So when you wondered "how do I know what the request looks like?" — this is the answer: **the contract package is the
source of truth for the message shape.** And the same for checking the message that is sent out - you can use the
contract package to just plainly verify that the message is of correct shape.

## Setup — paste this and move on

Here is a setup for a test of the first beat -> a _Propose Session_ command to `session-proposed` event. So, to use it,
just make a new file under `test/component` (you can call it whatever-you-like.test.js, and it will be executed), and
just copy-past the block below.

```js
import { SessionProposalModule } from '@rinkkasatiainen/cfb-session-proposal-node-js'
import { commandWith } from '@rinkkasatiainen/cfb-session-proposal-contracts'
import { Router, createHttpHost } from '@rinkkasatiainen/cfb-server-shell'
import { createPostgresStore } from '@rinkkasatiainen/cfb-event-sourcing-store-postgres'
import { RabbitProducer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { inMemoryBroker, createTrackerSpy } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import request from 'supertest'

import { fromStore } from '../../src/dsl/index.js'

// Helpers for verifying that correct message is sent. Remember - your AI coach will help you with these. Just ask them.
const ofOp = op => ({ matches: r => r.op === op })
const appendedType = type => ({ matches: r => (r.events ?? []).some(e => e.metaData?.type === type) })
const appendedPayload = expected => ({
  matches: r => (r.events ?? []).some(e =>
    e.payload && Object.keys(expected).every(key => e.payload[key] === expected[key])),
})

const EXCHANGE = 'cfb-session-proposal-events'

describe('SessionProposal capability', () => {
  let store
  let producer
  let output
  let producerTracker
  let httpEndpoint

  before(async () => {
    store = createPostgresStore.createNull()

    const router = new Router()
    httpEndpoint = request(createHttpHost(router)) // unlistened; supertest drives it directly

    const module = new SessionProposalModule({
      store, clock: () => '2026-11-06T10:00:00+02:00',
    })
    await module.register()
    await module.activate({ router, auth: { userIdFromRequest: async () => 'u-casey' } })
  })

  // Open the tracker before the act — it records from the moment it subscribes.
  beforeEach(() => {
    output = store.trackChanges()
  })

  afterEach(() => {
    output?.close()
  })

  // your test goes here
})
```

Let's explain that code piece by piece.

### before -block

It starts with `store = createPostgresStore.createNull()` - this is all production code, and our way of saying that
_instead of using a real PostgresDB, use this nullable that sort of acts like one_. Our side of production code does
not change a bit.

Second step is that we need to wire up HTTP endpoint for our tests. We do that by

```javascript
    const router = new Router()
httpEndpoint = request(createHttpHost(router)) // unlistened; supertest drives it directly
```

Just having this piece of code, makes our _composition root_ - the "app" we're wiring, to know how to handle HTTP calls,
like `await httpEndpoint.post('/api/commands/propose-session').send(command).expect(200)` that we use in the test.

The next part is an interesting part, considering **Capabilities and Composition** (see explanations):

```javascript
    const module = new SessionProposalModule({
  store, clock: () => '2026-11-06T10:00:00+02:00',
})
await module.register()
await module.activate({ router, auth: { userIdFromRequest: async () => 'u-casey' } })
```

This is where we register & activate the SessionProposal capability for our application. This is what also happens (with
a bit of added sugar), in the real app when we're starting it up.

After this, we are ready for our tests.

### test setup & teardown, beforeEach & afterEach

The beforeEach and afterEach blocks are executed around the tests, and they basically makes sure that each or our test
runs gets a fresh _output tracker_ - a sort of spy, but a real production instance.

```javascript
  beforeEach(() => {
  output = store.trackChanges()
})

afterEach(() => {
  output?.close()
})
```

## Now write the test.

Remember Sandi Metz and what Object-Oriented Programming is about. Sending and receiving messages. Remember the 3-by-2
matrix.

What do we test? What is the _incoming message_? And because this is a component test, it mostly does have an outgoing
message that has a side-effect. What is the _outgoing command_? Then we just verify that that command is being sent.

And similarly as in the Part-1, we test that with a spy. 

So, the test is: 

1) send a _Propose Session_ command
2) verify that an event is stored in the Event Store of the SessionProposal event store.

```js
it('appends a session-proposed fact when a valid command is posted', async () => {
  const command = commandWith({ title: 'ES 101' })

  await httpEndpoint.post('/api/commands/propose-session').send(command).expect(200)

  // ← your assertion: read the output off `fromStore(output)` with `createTrackerSpy`,
  //    and check the fact type and the payload fields you named when you drew the box.
})
```

### Verifying that message is sent

To actually verify that an event is stored in the Event Store, in _this context_, please go ahead and read 
[about Nullable Event Store](../reference/nullables/event-store.md)



### How does the fluent api work

(this part belongs somewhere else, a reference most likely.)
 
To see how this language works, I let you explore it a bit. What you can do is to run tests (they are quick) and modify
the test setup a bit:

```javascript
// this should succeed if there is any message sent to output (verify by commenting the post method, and the test should fail)
createTrackerSpy(fromStore(output)).waitUntilFound(1)
```

To learn how the `matching` works, you can start by exploring that a bit: Maybe it takes a function

```javascript
    await createTrackerSpy(fromStore(output))
  // this is a test of the 'vocabulary' of `matching` function.
  .matching(it => true)
  .waitUntilFound(1)
```

Unfortunately that's an error, but looking at the code it looks like it needs something it can send message called
`matches`:

```javascript
    await createTrackerSpy(fromStore(output))
  .matching({ matches: it => true })
  .waitUntilFound(1)
```

Now this is a method that also matches any element. But now you can start logging what's happening - what is actually
being received:

```javascript
await createTrackerSpy(fromStore(output))
  .matching({
    matches: it => {
      console.log('matches to ', it)
      return true
    }
  })
  .waitUntilFound(1)
```

This is exploration around the testing tools/frameworks. It might be useful to play around with this a bit.

## The rules of thumb

1. Build the message from the contract **builder**, never by hand.
2. The spy is already opened for you in `beforeEach` — *before* the act. Keep it that way.
3. Let each matcher read only the part it cares about.
4. Assert the **output** (what crossed), not the **interaction** (how it was called).

## Stuck?

Writing the assertion yourself *is* the exercise — so have a go before asking. But if you get wedged —
a spy that finds nothing, an assertion that won't go green — **come back to the coach with a link to
your test** and say where it's stuck. The coach can then read it and help you work out *what's* wrong —
usually which of the rules above it's bumping into — without writing it for you.

## See also

- [`../reference/nullables`](../reference/nullables/README.md) — for every *other*
  edge (the outbound producer, the inbound consumer/bus, the in-memory broker, the live websocket
  channel, read-model/query ports, and the integration-tier real transports): how to build each one
  nullable, how to drive it, and how to register a spy on it.
