import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { faker } from "@faker-js/faker";
import { ulid } from "ulid";

const TOPIC_ARN =
  "arn:aws:sns:us-east-1:147515533111:notify-create-invoice-demo-topic";
const PUBLISH_INTERVAL = 1000;

console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY);

const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

/* const snsClient = new SNSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  endpoint: "http://localhost:4566",
}); */

console.log("Generando mensajes...");
let contador = 0;

async function publishMessage() {
  try {
    const body = JSON.stringify({
      resourceType: "invoice",
      id: ulid(),
      idCompany: ulid(),
      idLocal: ulid(),
      document: "ABC123",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Invoice data
      number: faker.finance.accountNumber(),
      invoiceNumber: faker.number.int(),
      name: faker.person.fullName(),
      identification: faker.string.alphanumeric(10),
      date: faker.date.recent(),
      dueDate: faker.date.soon({ days: 20 }),
      status: faker.helpers.arrayElement(["pending", "paid"]),
    });
    const command = new PublishCommand({
      TopicArn: TOPIC_ARN,
      Message: `Nuevo mensaje ${contador}`,
    });
    const response = await snsClient.send(command);
    console.log(
      "Mensaje publicado en SNS:",
      response.MessageId,
      `Hora: ${new Date().toISOString()}`
    );

    contador++;
  } catch (error) {
    console.error("Error al publicar mensaje:", error);
  }
}

setInterval(publishMessage, PUBLISH_INTERVAL);
