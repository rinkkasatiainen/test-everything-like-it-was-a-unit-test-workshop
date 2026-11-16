/**
 * Source: what a capability WROTE, read off its event store's OutputTracker (James-Shore output
 * tracking). The store-side sibling of `fromProducer`: `store.trackChanges()` records each write
 * that LANDED — `{ op, capability, streamId, events }` for an append, `{ op, ... }` for a mark or an
 * upsertView — so a component test asserts the capability's write WITHOUT reading rows back. That is
 * exactly what keeps the component tier honest: the nullable postgres adapter (createPostgresStore.
 * createNull) runs the REAL store SQL but keeps no state, so there is nothing to read back — only
 * output to observe.
 *
 * Shaped for the tracking spy engine (`createTrackerSpy`): `elements()` hands back the RAW write
 * records, so a matcher sees the whole record and the test decides the altitude it cares about
 * (`.ofOp`, the stream, the appended event's payload).
 *
 *   const store = createPostgresStore.createNull()
 *   const output = store.trackChanges()                       // attach before the act
 *   const ofOp = op => ({ matches: r => r.op === op })        // altitude lives here
 *   await createTrackerSpy(fromStore(output)).matching(ofOp('append')).waitUntilFound(1)
 *
 * The tracker observes the REAL store, so this points at a nullable OR a real store unchanged.
 */
export const fromStore = tracker => ({
  elements: () => tracker.data(),
  liveStream: cb => tracker.liveStream(cb),
  close: () => tracker.close(),
})
