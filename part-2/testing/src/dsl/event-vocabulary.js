import { conformsTo } from '@rinkkasatiainen/cfb-schema-matcher'

/**
 * The event vocabulary — the fluent sugar the spy engine mixes on when the records are BARE wire
 * events ({ metaData, payload }), the shape a real-transport source (fromRabbit / fromWebSocket)
 * buffers off the wire. It is the integration-tier twin of the component tier's `messageVocabulary`
 * (which reads `{ routingKey, event }`); here the record IS the event, so `.ofChannel` matches
 * `metaData.type` and `.matchingPayload` narrows `payload`.
 *
 * A vocabulary is a map of { fluentName: (...args) => matcher }, and a matcher is
 * `{ matches: (record) => boolean }` — exactly what `createSpy` / `createLiveSpy` consume.
 */
export const eventVocabulary = {
  ofChannel: type => ({ matches: e => e?.metaData?.type === type }),
  ofCapability: capability => ({ matches: e => e?.metaData?.capability === capability }),
  withPayload: (key = 'payload') => ({ matches: e => e?.[key] !== undefined }),
  where: predicate => ({ matches: predicate }),

  // Closed match on the payload: conformsTo throws on a mismatch, which we read as "not a match".
  matchingPayload: schema => ({
    matches: e => {
      try {
        conformsTo(e?.payload, schema)
        return true
      } catch {
        return false
      }
    },
  }),
}
