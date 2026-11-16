import { createSpy, createLiveSpy } from '@rinkkasatiainen/cfb-event-sourcing-tracking'
import { eventVocabulary } from './event-vocabulary.js'

/**
 * The listen DSL for the integration / e2e tier — now a THIN factory over the SAME spy engine the
 * component tier uses (`createSpy` / `createLiveSpy` from the tracking package), carrying the event
 * vocabulary. The bespoke polling-and-filtering loop this file used to hold is gone: one engine
 * serves both tiers, and only the SOURCE (a real transport vs. an OutputTracker) and the VOCABULARY
 * (bare event vs. `{ routingKey, event }`) differ.
 *
 *   await eventStream(source)                  // source: fromRabbit / fromWebSocket (tracker-shaped)
 *     .ofCapability('cfb-session-discovery')
 *     .ofChannel('session-change-noted')
 *     .withPayload()
 *     .matching({ sessionId: exactly(id) })
 *     .waitUntilFound(8)                        // SECONDS (the engine's convention), not { timeout }
 *
 * `waitUntilFound(seconds)` asserts "at least one match within the window" and resolves. To make a
 * DEEP assertion on the matched record, read it straight off the source after the wait —
 * `source.elements().find(...)` — the same idiom the component tier uses with `tracker.data().find`.
 *
 * Build the stream BEFORE you act — a real source only buffers from the moment it is created.
 */
export const eventStream = source => createSpy(source, eventVocabulary)

/**
 * The push-based twin: resolves on the FIRST record that matches every filter, over the source's
 * `liveStream`, and detaches — the honest shape for a real transport, where polling a buffer is the
 * wrong one. Available now that fromRabbit / fromWebSocket expose `liveStream`.
 *
 *   await liveEventStream(source).ofChannel('session-change-noted').receivedWithinSeconds(8)
 */
export const liveEventStream = source => createLiveSpy(source, eventVocabulary)
