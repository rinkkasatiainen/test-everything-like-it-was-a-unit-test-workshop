/**
 * Source: what a capability PUSHED on the live board channel, read off the channel's OutputTracker —
 * the delivery-side twin of `fromProducer`. `channel.trackChanges()` observes the REAL channel
 * (James-Shore output tracking), so a component test reads push INTENT with no socket and no bound
 * port. Shaped for the tracking spy engine: `elements()` yields the RAW `{ eventId, message }`
 * records, and the test's own matcher reads `r.message`.
 *
 *   const tracker = channel.trackChanges()
 *   const session = id => ({ matches: r => r.message?.session?.sessionId === id })
 *   await createTrackerSpy(fromChannel(tracker)).matching(session(mine)).waitUntilFound(1)
 *   // the matched frame, for a deep assertion, is read straight off the tracker:
 *   const { message } = tracker.data().find(r => r.message?.session?.sessionId === mine)
 *
 * The channel tracker exposes `data()` + `stop()` (no `liveStream`); it also accepts a null channel's
 * `.published` recording directly.
 */
export const fromChannel = trackerOrNullChannel => ({
  elements: () =>
    (typeof trackerOrNullChannel.data === 'function'
      ? trackerOrNullChannel.data()
      : trackerOrNullChannel.published ?? []),
  close: () => trackerOrNullChannel.stop?.(),
})
