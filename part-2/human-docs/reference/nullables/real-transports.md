# Real transports (integration tier — no nullable)

> ⚠️ Mostly AI-written and not yet reviewed by a human. Use it as an orientation; for anything
> load-bearing, go to James Shore's own writing, linked at the end.

See [`README.md`](README.md) for the spy engines.

Here you observe the real thing, so you use `eventStream`, not `createTrackerSpy`:

```js
const listener = await fromRabbit({ url, exchange, binding: { capability, type } }) // throwaway queue
const socket   = await fromWebSocket(url)                                           // a ws client
await eventStream(listener).ofCapability(cap).ofChannel(type).waitUntilFound(3)     // seconds
```

Both expose `.elements()` and `await .close()` (call it in teardown). Build the listener **before** you
act — a real subscription has no replay for a late bind.
