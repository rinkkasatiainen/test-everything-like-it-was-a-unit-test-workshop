/**
 * Source: a browser-shaped WebSocket client (flow 3), shaped like an OutputTracker so the SAME spy
 * engine the component tier uses reads it. Connects, parses each frame as JSON, buffers it, and
 * pushes it to any live subscriber. Needs a host with a bound port — so not the unlistened component
 * host; a host started with `listen: true`, or a running one (e2e). Non-JSON frames are ignored.
 *
 *   // the board live channel — note the /api prefix the module registers under
 *   const source = await fromWebSocket(`ws://localhost:${host.port}/api/event/${eventId}/sessions/live`)
 *   try {
 *     await emit(host.broker.producer).publish(sessionChangeNoted({ sessionId: mine }))
 *     await eventStream(source).where(f => f.session?.sessionId === mine).waitUntilFound(5)
 *     const [frame] = source.elements().filter(f => f.session?.sessionId === mine) // for a deep assert
 *   } finally { await source.close() }
 *
 * The board channel pushes the WHOLE session, framed as `{ type: 'session', session: { ... } }`
 * (board-channel-listener.js). Top-level `type` is the literal string 'session', NOT an event type
 * with metaData, so `.ofChannel(...)` does not bite here — narrow with `.withPayload('session')`
 * (the payload lives under `session`) or `.where(f => f.session?.sessionId === mine)`.
 *
 * Nothing is sent on connect — the client seeds from the board query, then the socket carries pushes
 * only. So connect BEFORE you poke: a late client misses the push, and there is no replay. Like
 * fromRabbit, `elements()` is eventually consistent, never synchronous truth.
 */
export const fromWebSocket = async (url, { parse = JSON.parse, headers } = {}) => {
  const { default: WebSocket } = await import('ws')
  const frames = []
  const subscribers = new Set()
  // `headers` rides on the upgrade request — the board channel authorizes the handshake off the
  // BFF session cookie (4001 for an anonymous socket), so an e2e client passes `{ Cookie }` here.
  const ws = new WebSocket(url, headers ? { headers } : undefined)

  ws.on('message', data => {
    try {
      const frame = parse(data.toString())
      frames.push(frame)            // the buffering spy re-reads this
      for (const cb of subscribers) {
        cb(frame)                   // the live spy resolves on the first match
      }
    } catch {
      // a non-JSON frame is not ours to assert on — ignore it
    }
  })

  await new Promise((resolve, reject) => {
    ws.once('open', resolve)
    ws.once('error', reject)
  })

  return {
    elements: () => frames.slice(),
    liveStream: cb => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    defaultTimeout: 5000,
    close: () =>
      new Promise(resolve => {
        subscribers.clear()
        ws.once('close', resolve)
        ws.close()
      }),
  }
}
