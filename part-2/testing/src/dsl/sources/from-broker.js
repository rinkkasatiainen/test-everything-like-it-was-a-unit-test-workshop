/**
 * Source: what the in-memory exchange ACCEPTED, read off `broker.trackChanges()` — an OutputTracker
 * over the broker's publishes (James-Shore output tracking), NOT the raw `broker.published` array.
 * Shaped for the tracking package's spy engine: `elements()` yields the RAW `{ routingKey, event }`
 * records, and the test's own matcher picks the altitude.
 *
 *   const tracker = broker.trackChanges()                   // attach before the capability publishes
 *   const ofType = type => ({ matches: r => r.event?.metaData?.type === type })
 *   await createTrackerSpy(fromBroker(tracker)).matching(ofType('session-proposed')).waitUntilFound(1)
 *
 * The tracker observes the real exchange, so it must be attached BEFORE the act. `.data()` is
 * synchronous truth once `broker.settled()` (or the host's `settle()`) has run. No Docker, no socket.
 */
export const fromBroker = tracker => ({
  elements: () => tracker.data(),
  liveStream: cb => tracker.liveStream(cb),
  close: () => tracker.close(),
})
