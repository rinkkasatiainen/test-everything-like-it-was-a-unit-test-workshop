/**
 * Source: what a capability PUBLISHED, read off its producer's OutputTracker (James-Shore output
 * tracking). Shaped for the tracking package's spy engine (`createTrackerSpy` / `createLiveStreamTracker`
 * from `@rinkkasatiainen/cfb-event-sourcing-testing`): `elements()` hands back the RAW records, so a
 * matcher sees the whole `{ routingKey, event }` and the test decides the altitude it cares about.
 *
 * Attach the tracker BEFORE the act — an OutputTracker collects from the moment it subscribes:
 *
 *   const producer = RabbitProducer.createNull()
 *   const tracker = producer.trackChanges()                 // attach before the relay publishes
 *   const ofType = type => ({ matches: r => r.event?.metaData?.type === type })  // altitude lives here
 *   await createTrackerSpy(fromProducer(tracker)).matching(ofType('session-change-noted')).waitUntilFound(1)
 *
 * The tracker observes the REAL producer, so this points at a nullable OR a real producer unchanged —
 * no reaching into a null channel's `.published`. `liveStream` is exposed for the live spy.
 */
export const fromProducer = tracker => ({
  elements: () => tracker.data(),
  liveStream: cb => tracker.liveStream(cb),
  close: () => tracker.close(),
})
