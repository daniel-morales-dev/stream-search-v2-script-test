import * as dotenv from 'dotenv';
dotenv.config();

import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { faker } from '@faker-js/faker';
import { ulid } from 'ulid';

// Configuración de AWS SDK
const sns = new SNSClient({
  region: 'us-east-1',
});

// Tipos de eventos que podemos generar
const eventTypes = ['CREATE', 'UPDATE', 'DELETE'] as const;

// Interfaces
interface SimulatorConfig {
  topicArn: string;
  eventsPerSecond: number;
  duration: number; // en segundos
  parallel: number;
}

interface Event {
  id: string;
  type: typeof eventTypes[number];
  payload: {
    userId: string;
    timestamp: string;
    data: Record<string, any>;
  };
}

// Generador de eventos aleatorios
const generateRandomEvent = (): Event => {
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  return {
    id: ulid(),
    type,
    payload: {
      userId: ulid(),
      timestamp: new Date().toISOString(),
      data: {
        name: faker.person.fullName(),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        company: faker.company.name(),
      }
    }
  };
};

// Función para publicar un evento en SNS
const publishEvent = async (topicArn: string, event: Event): Promise<void> => {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
      MessageAttributes: {
        eventType: {
          DataType: 'String',
          StringValue: event.type
        }
      }
    });

    await sns.send(command);

    console.log(`✓ Event published: ${event.id}(${event.type})`);
  } catch (error) {
    console.error(`✗ Failed to publish event ${event.id}:`, error);
  }
};

// Función para esperar un tiempo específico
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Simulador principal
async function runSimulator(config: SimulatorConfig) {
  const startTime = Date.now();
  const endTime = startTime + (config.duration * 1000);
  let eventsSent = 0;

  console.log(`
🚀 Starting event simulator
━━━━━━━━━━━━━━━━━━━━━━━━━━━
* Topic ARN: ${config.topicArn}
* Events/sec: ${config.eventsPerSecond}
* Duration: ${config.duration}s
* Parallel: ${config.parallel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  const sendBatch = async () => {
    while (Date.now() < endTime) {
      const batchPromises = Array(config.parallel)
        .fill(null)
        .map(() => publishEvent(config.topicArn, generateRandomEvent()));

      await Promise.all(batchPromises);
      eventsSent += config.parallel;

      // Esperar para mantener la tasa de eventos por segundo
      await sleep(1000 / (config.eventsPerSecond / config.parallel));
    }
  };

  await sendBatch();

  console.log(`
📊 Simulation completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━
* Total events sent: ${eventsSent}
* Actual duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s
* Avg events/sec: ${(eventsSent / config.duration).toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
}

// Script principal
async function main() {
  const config: SimulatorConfig = {
    topicArn: process.env.SNS_TOPIC_ARN!,
    eventsPerSecond: parseInt(process.env.EVENTS_PER_SECOND || '10'),
    duration: parseInt(process.env.DURATION_SECONDS || '60'),
    parallel: parseInt(process.env.PARALLEL_EXECUTIONS || '5')
  };

  if (!config.topicArn) {
    throw new Error('SNS_TOPIC_ARN environment variable is required');
  }

  await runSimulator(config);
}

// Ejecutar el script
main().catch(console.error);
