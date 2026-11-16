/**
 * The send DSL — the mirror of the listen DSL. Where `eventStream` reads facts off a source,
 * `emit` puts a fact onto a producer. It is the "arrange" for a bus → bus or bus → WebSocket test:
 * publish an inbound fact the way another capability would, then spy for what the capability under
 * test does in response.
 *
 * Two ways in — a ready-made fact (from a contracts builder, the preferred source of truth):
 *
 *   import { buildSessionScheduledFactWith, WellKnown } from '@rinkkasatiainen/cfb-session-scheduling-contracts'
 *   await emit(host.broker.producer).publish(buildSessionScheduledFactWith(WellKnown.SessionScheduled.CaseyTue))
 *
 * or built fluently, for a shape no builder owns yet:
 *
 *   await emit(producer)
 *     .aFact('session-proposed')
 *     .forCapability('cfb-session-proposal')
 *     .onStream('s-0142').version(1)
 *     .by('u-casey')
 *     .withPayload({ sessionId: 's-0142', title: 'ES 101', userId: 'u-casey' })
 *     .publish()
 *
 * `publish()` returns the producer's Eventually (resolve = broker accepted; reject = nack), so a
 * caller folds it as it would any port result. The chain is immutable — each step returns a new
 * builder.
 */

const factBuilder = (producer, event) => {
  const withMeta = patch => factBuilder(producer, { ...event, metaData: { ...event.metaData, ...patch } })
  return {
    forCapability: capability => withMeta({ capability }),
    onStream: (streamId, version = 1) => withMeta({ streamId, version }),
    version: version => withMeta({ version }),
    by: userId => withMeta({ userId }),
    at: timestamp => withMeta({ timestamp }),
    causedBy: causationId => withMeta({ causationId }),
    correlatedBy: correlationId => withMeta({ correlationId }),
    withPayload: payload => factBuilder(producer, { ...event, payload }),

    /** The event as built — for an assertion, or to hand elsewhere. */
    build: () => event,

    /** Publish it. Returns the producer's Eventually. */
    publish: () => producer.publish(event),
  }
}

export const emit = producer => ({
  /** Publish a ready-made fact (e.g. from a contracts builder). Returns the producer's Eventually. */
  publish: event => producer.publish(event),

  /** Start building a fact of this type fluently. */
  aFact: type => factBuilder(producer, { metaData: { type }, payload: {} }),
})
