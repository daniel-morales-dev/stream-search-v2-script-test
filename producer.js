import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";

const QUEUE_URL =
  "http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/test-queue";

const sqsClient = new SQSClient({
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
});

async function sendMessage() {
  try {
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify({
        message: "Hola desde el productor",
        timestamp: new Date().toISOString(),
      }),
    });

    const response = await sqsClient.send(command);
    console.log(
      "Mensaje enviado:",
      response.MessageId,
      `Hora: ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error("Error al enviar mensaje:", error);
  }
}

sendMessage();
