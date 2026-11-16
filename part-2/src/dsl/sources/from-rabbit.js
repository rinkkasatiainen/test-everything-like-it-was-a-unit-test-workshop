import { routingKeyFor } from '@rinkkasatiainen/cfb-event-sourcing-bus-rabbitmq'

/**
 * Source: a real RabbitMQ subscription (integration tier), shaped like an OutputTracker so the SAME
 * spy engine the component tier uses reads it. A throwaway observer of facts off the real exchange.
 * Needs Docker.
 *
 * It exposes the tracking source interface — `elements()` (a snapshot of what has arrived) and
 * `liveStream(cb)` (pushes each new record, returns an unsubscribe) — so it feeds BOTH engines:
 *
 *   const source = await fromRabbit({ url, exchange, binding: { capability, type } })
 *   try {
 *     await eventStream(source).ofChannel(type).waitUntilFound(8)        // buffering (createSpy)
 *     // or, push-based, resolve on the first match:
 *     // await liveEventStream(source).ofChannel(type).receivedWithinSeconds(8)
 *   } finally { await source.close() }
 *
 * The records are BARE wire events ({ metaData, payload }) — what came off the socket — so the event
 * vocabulary applies: `.ofChannel` reads `metaData.type`, `.matching` narrows `payload`.
 *
 * UNLIKE a component OutputTracker, `elements()` is NOT synchronous truth — it is eventually
 * consistent. A real consumer receives only what is published AFTER it binds, there is no replay for
 * a late one, and a freshly-bound queue can still miss the first single-shot fact until the binding
 * is live on the broker. So build the source BEFORE you act, and confirm the wiring with an example
 * event before driving the real scenario (see the integration test). Always close() in teardown.
 *
 * Its queue is EXCLUSIVE and server-named: private to this one connection, and the broker DELETES
 * it the moment the connection closes. That is the whole point of a throwaway observer — it leaves
 * nothing behind. A spy on a durable, named queue is the trap: `close()` drops the consumer but the
 * queue lingers, still bound, and every later publish fans a copy into it. A suite that opens one
 * such spy per test leaks a queue per test, and the growing fan-out eventually starves the broker
 * and the live spies miss their message. Exclusive queues cannot accumulate.
 */
export const fromRabbit = async ({ url, exchange, binding }) => {
  const received = []
  const subscribers = new Set()
  const amqp = await import('amqplib')
  const connection = await amqp.connect(url)
  const channel = await connection.createChannel()
  await channel.assertExchange(exchange, 'topic', { durable: true })

  // '' asks the broker to name the queue; exclusive => private to this connection and auto-deleted
  // when it closes. No consumerGroup, no durable name — nothing a later run could inherit.
  const { queue } = await channel.assertQueue('', { exclusive: true })
  await channel.bindQueue(queue, exchange, routingKeyFor(binding))

  const { consumerTag } = await channel.consume(queue, msg => {
    if (!msg) {
      return // consumer cancelled by the broker
    }
    try {
      const event = JSON.parse(msg.content.toString())
      received.push(event)          // the buffering spy re-reads this
      for (const cb of subscribers) {
        cb(event)                   // the live spy resolves on the first match
      }
    } catch {
      // a frame that is not our JSON event — ignore it, it is not what any assertion waits for
    }
    channel.ack(msg) // the spy only observes; it accepts everything
  })

  return {
    elements: () => received.slice(),
    liveStream: cb => {
      subscribers.add(cb)
      return () => subscribers.delete(cb)
    },
    defaultTimeout: 3000,
    close: async () => {
      subscribers.clear()
      try {
        await channel.cancel(consumerTag)
      } catch {
        // the connection may already be going down — the exclusive queue dies with it regardless
      }
      await connection.close() // exclusive queue auto-deleted on disconnect
    },
  }
}
