import amqp from 'amqplib';

const EXCHANGE = process.env.CFB_WORKSHOP_EXCHANGE ?? 'cfb-session-scheduling-events'
const CAPABILITY = 'cfb-session-discovery'

async function listen() {
  const connection = await amqp.connect('amqp://localhost');
  const channel = await connection.createChannel();

  const exchange = EXCHANGE
  const routingKey = CAPABILITY

  // await channel.assertExchange(exchange, 'topic', { durable: true });

  const { queue } = await channel.assertQueue('', {
    exclusive: true
  });

  await channel.bindQueue(queue, exchange, '#');

  console.log(`Listening on topic: ${routingKey}`);

  channel.consume(queue, async (msg) => {
    if (msg !== null) {
      const data = await JSON.parse(msg.content.toString());

      const { metaData, payload } = data

      console.log(`Received message: ${metaData?.capability}-${metaData?.type}`);

      channel.ack(msg);
    }
  });
}

listen().catch(console.error);
