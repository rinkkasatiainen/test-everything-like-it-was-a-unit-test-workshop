import { Eventually } from '@rinkkasatiainen/cfb-functional'

/**
 * Fault-injecting decorators for a bus producer. Each wraps ANY producer that satisfies the
 * relay's contract — `publish(event) -> Eventually` (resolve = broker durably accepted; reject =
 * nack) — so the same double works over the in-memory broker (component tier) and a real
 * RabbitProducer (integration). It decorates the port, never the implementation.
 *
 * None of these THROW. The relay treats a thrown error as a whole-pass store failure; these speak
 * its message-level failure channel instead — a resolved or rejected Eventually. See
 * cfb-event-sourcing/packages/relay/src/relay.js and docs/how-to/inject-a-failure.md.
 *
 * The trigger travels in the payload: a message whose payload contains the word is the one that
 * misbehaves. That keeps a test self-contained — no out-of-band configuration — and is the
 * workshop device. The word is a default; pass your own `when` predicate to change it.
 */

// Default trigger words. `drop` tells the truth about silent drop: nothing fails, the message
// just vanishes — so the word is not `fails`, which would prime the wrong mental model.
export const DROP_WORD = 'drop'

export const payloadHasWord = word => event =>
  JSON.stringify(event?.payload ?? {}).includes(word)

const keyOf = event => {
  const { capability, streamId, version } = event.metaData ?? {}
  return `${capability}/${streamId}#${version}`
}

/**
 * Silent drop. `publish` resolves as if the broker accepted it, but sends NOTHING. The relay
 * believes the publish succeeded, so it marks the event published and never retries it.
 *
 * Result: the event is durably in the store, the store's outbox says it is delivered, and the bus
 * never received it — a lost message with no symptom anywhere. This is the failure the outbox
 * cannot recover from, precisely because the "published" bookkeeping has been corrupted.
 *
 * Delegates `publish` only on the untriggered path; `close` (and `send`, if the real producer has
 * one) pass straight through so composition and teardown are unaffected.
 */
export const silentlyDrops = (producer, { when = payloadHasWord(DROP_WORD) } = {}) => ({
  publish: event => (when(event) ? Eventually.resolve() : producer.publish(event)),
  send: (...args) => producer.send?.(...args),
  close: () => producer.close(),
})

/**
 * Transient failure. Nacks (rejects — NOT throws) the first `attempt - 1` tries of a triggered
 * message, then delivers on the `attempt`th. The relay holds the event unpublished across the
 * nacks and redelivers it each pass, so it lands on the nth pass. Counts attempts per event by its
 * natural key, so a redelivery of the same event advances the counter.
 *
 * NOTE (next slice): kept here for symmetry with silentlyDrops; the workshop starts with silent
 * drop. The resilience test list currently exercises silentlyDrops only.
 */
export const succeedsOnAttempt = (
  producer,
  { when = payloadHasWord('retry'), attempt = 5 } = {},
) => {
  const seen = new Map()
  return {
    publish: event => {
      if (!when(event)) {
        return producer.publish(event)
      }
      const n = (seen.get(keyOf(event)) ?? 0) + 1
      seen.set(keyOf(event), n)
      return n < attempt
        ? Eventually.reject({ kind: 'Nack', attempt: n, of: attempt })
        : producer.publish(event)
    },
    send: (...args) => producer.send?.(...args),
    close: () => producer.close(),
  }
}
