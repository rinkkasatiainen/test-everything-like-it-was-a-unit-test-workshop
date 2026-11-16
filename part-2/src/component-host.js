/**
 * componentHost — the component-tier wiring for ONE capability.
 *
 * It is NOT a factory that hides a bus. The TEST builds the ports — the inbound `consumer` and
 * the outbound `producer` (both nullable, James-Shore style) and the event `store` — and injects
 * them, exactly the way a real host hands them to `SessionDiscoveryModule`. The host's only job
 * is what a host actually does: subscribe the capability's reaction onto the consumer, and run
 * the outbox relay (store → producer). So the test reads in the vocabulary of the ports it owns:
 *
 *   const store = createInMemoryEventStore()
 *   const consumer = RabbitConsumer.createNull({ consumerGroup: CAPABILITY })
 *   const producer = RabbitProducer.createNull()
 *   const { settle, close } = await componentHost({ module: SessionDiscoveryModule, store, consumer, producer })
 *   try {
 *     await consumer.simulate(aFactFromAnotherCapability)   // a message ARRIVES, reaction runs
 *     await settle()                                         // the host's relay drains the outbox
 *     await createTrackerSpy(fromProducer(producer.trackChanges())).ofChannel('session-change-noted').waitUntilFound(1)
 *   } finally { await close() }
 *
 * Standalone ports (the default) do not loop back — the producer's output does not reach the
 * consumer, which is right for a reaction whose OUTPUT we assert. When a test needs the capability
 * to react to its own emitted fact, build the consumer and producer on one shared `inMemoryBroker`
 * and drive the inbound through `broker.simulate`; this wiring is unchanged either way.
 *
 * The INTEGRATION tier uses this SAME fixture, SAME shape — the test still builds and owns the
 * ports. It just builds REAL ones: a Postgres-backed `store`, `RabbitConsumer.of(...)` and
 * `RabbitProducer.of(...)` on one exchange. `simulate` is a nullable affordance, so the real tier
 * arranges by PUBLISHING the inbound fact through the producer (a real channel, the way the host
 * and any other capability do) and asserts with `fromRabbit`, not `fromProducer`. `settle()` still
 * pumps the relay — once by hand in the component tier, on a timer in the integration tier, because
 * a real broker delivers asynchronously. The fixture does not change; the ports and the cadence do.
 *
 * The module is driven through its REAL `activate(ctx)` with `{ eventStore, consumer }` — the
 * path `session-discovery-module.test.js` exercises. `apiServedLocally: false` keeps the HTTP
 * routes (and their Postgres pool) out of the way: this fixture is about the bus, not the
 * catalogue. A capability whose module takes different option names needs its own shaping here.
 *
 * A reaction that OWNS A STORE (the board materializer, seam 3) needs two more ports: the `board`
 * it writes and the DELIVERY producer it announces `view-updated` on. Hand in a `board` and a
 * `deliveryProducer` and the host hands them to the module the way a real host does — the module's
 * own `#delivery`/`subscribeBoard` wiring threads the delivery producer into `materializeBoard`.
 * The test reads the announcement off that same `deliveryProducer` with `fromProducer`. The
 * delivery CONSUMER (b11c, the socket push) is left null on purpose: that is a different seam with
 * its own test, so `subscribeDelivery` no-ops and this fixture asserts only the announcement.
 */
import { createInMemoryEventStore } from '@rinkkasatiainen/cfb-event-sourcing-testing'
import { RabbitProducer, RabbitConsumer } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'
import { createRelay } from '@rinkkasatiainen/cfb-event-sourcing-relay'

const valueOf = async eventually => (await eventually).fold(
  reason => { throw new Error(reason?.message ?? reason?.code ?? JSON.stringify(reason)) },
  value => value,
)

const fixedClock = () => '2026-11-06T10:00:00+02:00'

export const componentHost = async ({
  module: Module,
  store = createInMemoryEventStore(),
  consumer = RabbitConsumer.createNull({ consumerGroup: 'cfb-session-discovery' }),
  producer = RabbitProducer.createNull(),
  board = null,
  deliveryProducer = null,
  clock = fixedClock,
} = {}) => {
  const relay = createRelay({ store, producer, batchSize: 10 })

  // The board materializer announces `view-updated` on its OWN delivery producer, not the outbox
  // `producer`. When a test wires a board it hands in that producer to read the announcement off;
  // the delivery consumer stays null so the socket-push reaction (a different seam) does not wire.
  const deliveryBus = board
    ? { producer: deliveryProducer ?? RabbitProducer.createNull(), consumer: null, close: async () => {} }
    : undefined

  const module = new Module({ eventStore: store, consumer, board, deliveryBus, log: false, clock })
  await module.activate({ router: {}, apiServedLocally: false })

  // Pump the outbox onto the producer until nothing new is published. The reaction has already
  // appended to the store (the test awaited `consumer.simulate`); each `relayOnce` publishes what
  // is waiting, and a fixpoint on the producer's published count ends it. A real producer has no
  // recording channel, so the count stays 0 and one pass runs — the integration tier drives that
  // single pass on a timer, because its inbound fact arrives asynchronously.
  const publishedCount = () => (producer.channel?.published ?? []).length
  const settle = async () => {
    let before = -1
    for (let guard = 0; publishedCount() !== before && guard < 20; guard += 1) {
      before = publishedCount()
      await valueOf(relay.relayOnce())
    }
  }

  return {
    settle,
    store,
    deliveryProducer: deliveryBus?.producer ?? null,
    close: async () => {
      await module.close?.()
      await consumer.close?.()
      await producer.close?.()
    },
  }
}
