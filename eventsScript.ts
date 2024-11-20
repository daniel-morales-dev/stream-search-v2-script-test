import * as dotenv from "dotenv";
dotenv.config();
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import { faker } from "@faker-js/faker";
import { ulid } from "ulid";
import { performance } from "perf_hooks";

const sns = new SNSClient({
  region: "us-east-1",
});

// Tipos de eventos que podemos generar
const eventTypes = ["CREATE", "UPDATE", "DELETE"] as const;

// Interfaces
interface SimulatorConfig {
  topicArn: string;
  eventsPerSecond: number;
  duration: number; // en segundos
  parallel: number;
}

interface Event {
  id: string;
  companyId: string;
  resourceType: EResourceType;
  userId: string;
  timestamp: string;
  data: Record<string, any>;
}

interface LoadTestMetrics {
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  avgLatency: number;
  maxLatency: number;
  minLatency: number;
  errorDetails: string[];
}

export enum EResourceType {
  INVOICES = "invoices",
  BILLS = "bills",
  CLIENTS = "clients",
  ESTIMATES = "estimates",
  ITEMS = "items",
  REMISSIONS = "remissions",
  PAYMENTS = "payments",
  CREDIT_NOTES = "creditNotes",
  DEBIT_NOTES = "debitNotes", // Income
  ACCOUNTS = "accounts",
  ALL = "all",
}

const resourceTypes = Object.values(EResourceType);

const companies = [
  "01JD51HXTTA1GMNN422DVK6483",
  "01JD51J4ZE8H1Z6N6764BBZZ34",
  "01JD51J9N66M4X8PG6VV68HFD2",
  "01JD51JD1S0BXQF0XBAKXT02ZR",
  "01JD51JKJGVBR7Z29ZTNXVHTRE",
  "01JD51JR5SREPS9V28KJ6F2CZ9",
  "01JD51JW5XGRJQAXE78Z4M0HVA",
];

// Generador de eventos aleatorios
const generateRandomEvent = (): Event => {
  const type = eventTypes[Math.floor(Math.random() * eventTypes.length)];

  return {
    id: ulid(),
    companyId: companies[Math.floor(Math.random() * companies.length)],
    userId: ulid(),
    timestamp: new Date().toISOString(),
    resourceType:
      resourceTypes[Math.floor(Math.random() * resourceTypes.length)],
    data: {
      name: faker.person.fullName(),
      email: faker.internet.email(),
      address: faker.location.streetAddress(),
      company: faker.company.name(),
    },
  };
};

// Función para publicar un evento en SNS
const publishEvent = async (topicArn: string, event: Event): Promise<void> => {
  try {
    const command = new PublishCommand({
      TopicArn: topicArn,
      Message: JSON.stringify(event),
    });

    await sns.send(command);

    console.log(`✓ Event published: ${event.id}(${event.resourceType})`);
  } catch (error) {
    console.error(`✗ Failed to publish event ${event.id}:`, error);
    throw error;
  }
};

// Función para esperar un tiempo específico
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Simulador mejorado con métricas de rendimiento
async function runEnhancedSimulator(
  config: SimulatorConfig
): Promise<LoadTestMetrics> {
  const metrics: LoadTestMetrics = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    avgLatency: 0,
    maxLatency: 0,
    minLatency: Infinity,
    errorDetails: [],
  };

  const latencies: number[] = [];

  const startTime = Date.now();
  const endTime = startTime + config.duration * 1000;

  console.log(`
🚀 Starting enhanced event simulator
━━━━━━━━━━━━━━━━━━━━━━━━━━━
* Topic ARN: ${config.topicArn}
* Events/sec: ${config.eventsPerSecond}
* Duration: ${config.duration}s
* Parallel: ${config.parallel}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  const publishEventWithMetrics = async (topicArn: string, event: Event) => {
    const start = performance.now();

    try {
      await publishEvent(topicArn, event);
      const latency = performance.now() - start;

      metrics.successfulEvents++;
      latencies.push(latency);
      metrics.maxLatency = Math.max(metrics.maxLatency || 0, latency);
      metrics.minLatency = Math.min(metrics.minLatency, latency);
    } catch (error) {
      metrics.failedEvents++;
      metrics.errorDetails.push(String(error));
    }
  };

  const sendBatch = async () => {
    while (Date.now() < endTime) {
      const batchPromises = Array(config.parallel)
        .fill(null)
        .map(() => {
          metrics.totalEvents++;
          return publishEventWithMetrics(
            config.topicArn,
            generateRandomEvent()
          );
        });

      await Promise.all(batchPromises);

      // Esperar para mantener la tasa de eventos por segundo
      await sleep(1000 / (config.eventsPerSecond / config.parallel));
    }
  };

  await sendBatch();

  // Calcular métricas finales
  metrics.avgLatency =
    latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;

  console.log(`
📊 Simulation completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━
* Total events: ${metrics.totalEvents}
* Successful events: ${metrics.successfulEvents}
* Failed events: ${metrics.failedEvents}
* Avg latency: ${metrics.avgLatency.toFixed(2)}ms
* Max latency: ${metrics.maxLatency.toFixed(2)}ms
* Min latency: ${metrics.minLatency.toFixed(2)}ms
* Actual duration: ${((Date.now() - startTime) / 1000).toFixed(2)}s
* Avg events/sec: ${(metrics.successfulEvents / config.duration).toFixed(2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  return metrics;
}

async function main() {
  const config: SimulatorConfig = {
    topicArn: process.env.SNS_TOPIC_ARN!,
    eventsPerSecond: parseInt(process.env.EVENTS_PER_SECOND || "10"),
    duration: parseInt(process.env.DURATION_SECONDS || "60"),
    parallel: parseInt(process.env.PARALLEL_EXECUTIONS || "5"),
  };

  if (!config.topicArn) {
    throw new Error("SNS_TOPIC_ARN environment variable is required");
  }

  const metrics = await runEnhancedSimulator(config);

  if (metrics.failedEvents > 0) {
    console.error("Errores detectados:", metrics.errorDetails);
  }
}

// Ejecutar el script
main().catch(console.error);
