# Nullable: event store (the DB edge)

Nullable Event Store, in this context, in CodeFreeze board, is a way to safely - without real DB - to track what's
actually being stored, or queried, in the database.

The way nullables are used, is that we first need to create one, and we do it in the code snippet below:

```javascript
import { createPostgresStore } from '@rinkkasatiainen/cfb-event-sourcing-store-postgres'

const store = createPostgresStore.createNull()   // real store SQL, database removed — keeps NO state
```

This creates us a nullable event store, that behaves exacly like production DB, with the exception that there is no
data actually stored anywhere. But all the production code - until the nullable adapter - is executed always 100% the
same way.

This means that we're not injecting any spies instead of our own DB adapter (because with spies, you only fake something
you own, never a 3rd party library - meaning there's always part of code not tested). But for that, we have implemented
a pattern called **Output Tracker**. With that, we can register a listener for certain events - like writing into a DB.

We do it as follows:

```javascript
const outputTracker = store.trackChanges()
// const outputTracker = store.trackChanges('WRITE') // you can explicity say 'WRITE', which is default
```

Then we have an outputTracker that listens to all `WRITE` operations - and logs them internally until you `close()` the
tracker.

This is pretty useful because there are test helpers creating _fluent API_ for verifying messages.
`await createTrackerSpy(fromStore(outputTracker))`. This creates a spy that we can start adding filters after filters of
what kind of messages we're expecting: 

```javascript
      // make the incoming message here.
      await createTrackerSpy(fromStore(output))
        .matching(ofOp('append'))    // must be an 'append' DB operation (this is something that shoudl be documented by the postgres Store
        .matching(appendedType('session-proposed'))  // the type of the event is 'session-proposed' -> all other events are filtered out
        .matching(appendedPayload({  // and the payload must match this shape
          sessionId: command.sessionId,
          title: 'ES 101',
          userId: 'u-casey',
          duration: 60,
        }))
        .waitUntilFound(1) // and this is the final method that says how long are you allowign it to wait, in seconds
```

another way to use the spies is to listen a live stream:

```javascript
       const fn = createLiveStreamTracker(fromStore( store.trackChanges()))
        .matching(ofOp('append'))
        .matching(appendedType('session-proposed'))
        .matching(appendedPayload({
          sessionId: command.sessionId,
          title: 'ES 101',
          userId: 'u-casey',
          duration: 60,
        })).receivedWithinSeconds(1)

      // make the incoming message here 
      await fn;
```

See [`README.md`](README.md) for the spy engines and the factory / real-API / nullable-only split.

The core concept of this _fluent api is_: define your expectations for the shape, and wait for it to eventually happen.
