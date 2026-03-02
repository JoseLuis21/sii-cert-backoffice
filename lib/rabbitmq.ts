import amqp, { type Channel, type ChannelModel } from "amqplib";

declare global {
  var __rabbitConnectionPromise__: Promise<ChannelModel> | undefined;
  var __rabbitChannelPromise__: Promise<Channel> | undefined;
}

function getRabbitUrl(): string {
  const url = process.env.RABBITMQ_URL;
  if (!url) {
    throw new Error("Missing RABBITMQ_URL in environment variables");
  }
  return url;
}

export function getRabbitQueueName(): string {
  return process.env.RABBITMQ_QUEUE ?? "certificacion";
}

async function getConnection(): Promise<ChannelModel> {
  const existing = global.__rabbitConnectionPromise__;
  if (existing) {
    return existing;
  }

  const connectionPromise = amqp.connect(getRabbitUrl());
  global.__rabbitConnectionPromise__ = connectionPromise;
  return connectionPromise;
}

export async function getRabbitChannel(): Promise<Channel> {
  const existing = global.__rabbitChannelPromise__;
  if (existing) {
    return existing;
  }

  const channelPromise = getConnection().then((connection) =>
    connection.createChannel()
  );
  global.__rabbitChannelPromise__ = channelPromise;
  return channelPromise;
}

export async function enqueueCertification(certificationId: string) {
  const queueName = getRabbitQueueName();
  const channel = await getRabbitChannel();
  await channel.assertQueue(queueName, { durable: true });

  const payload = Buffer.from(
    JSON.stringify({
      certificationId,
      enqueuedAt: new Date().toISOString(),
    })
  );

  const ok = channel.sendToQueue(queueName, payload, {
    persistent: true,
    contentType: "application/json",
  });

  if (!ok) {
    throw new Error("No se pudo publicar el mensaje en RabbitMQ");
  }

  return queueName;
}
