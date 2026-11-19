# Live channel (websocket out)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.
 
See [`README.md`](README.md) for the spy engines.

```js
import { createLiveChannel } from '@rinkkasatiainen/cfb-session-discovery-node-js'
const channel = createLiveChannel()   // the REAL channel, just observed
```

- **Observe (output tracking — a production seam):** `channel.trackChanges()` → a tracker (uses
  `.data()` / `.stop()`, not `.close()`).
- **Spy:** `createTrackerSpy(fromChannel(channel.trackChanges())).matching(…).waitUntilFound(1)`.
  Record: `{ eventId, message }` — the pushed frame is under `message`.
