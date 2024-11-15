import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";

console.log("Listening for messages...");

const QUEUE_URL =
  "https://sqs.us-east-1.amazonaws.com/147515533111/create-invoice-search-demo-queue";

const sqsClient = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN, // Incluye el token si es una sesión temporal
  },
});

async function receiveMessages() {
  while (true) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: 10,
      });

      const response = await sqsClient.send(command);

      if (response.Messages) {
        for (const message of response.Messages) {
          const snsMessage = JSON.parse(message.Body);
          const originalMessage = JSON.parse(snsMessage.Message);

          console.log("================================");
          console.log("Mensaje recibido:", originalMessage);

          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });
          await sqsClient.send(deleteCommand);
          console.log("Mensaje eliminado de la cola");
        }
      }
    } catch (error) {
      console.error("Error al recibir mensajes:", error);
    }
  }
}

receiveMessages();
