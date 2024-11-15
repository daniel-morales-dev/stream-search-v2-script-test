import {
  SNSClient,
  CreateTopicCommand,
  SubscribeCommand,
  PublishCommand,
} from "@aws-sdk/client-sns";
import {
  SQSClient,
  CreateQueueCommand,
  GetQueueAttributesCommand,
  SetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";

const config = {
  endpoint: "http://localhost:4566",
  region: "us-east-1",
  credentials: {
    accessKeyId: "test",
    secretAccessKey: "test",
  },
  forcePathStyle: true,
};

const snsClient = new SNSClient(config);
const sqsClient = new SQSClient(config);

async function setupAWSServices() {
  try {
    console.log("Creando tópico SNS...");
    const createTopicResponse = await snsClient.send(
      new CreateTopicCommand({
        Name: "notify-create-invoice-topic",
      })
    );
    const topicArn = createTopicResponse.TopicArn;
    console.log("Tópico SNS creado:", topicArn);

    console.log("\nCreando cola SQS...");
    const createQueueResponse = await sqsClient.send(
      new CreateQueueCommand({
        QueueName: "create-invoice-search-demo-queue",
        Attributes: {
          DelaySeconds: "0",
          MessageRetentionPeriod: "86400",
        },
      })
    );
    const queueUrl = createQueueResponse.QueueUrl;
    console.log("Cola SQS creada:", queueUrl);

    const queueAttributesResponse = await sqsClient.send(
      new GetQueueAttributesCommand({
        QueueUrl: queueUrl,
        AttributeNames: ["QueueArn"],
      })
    );
    const queueArn = queueAttributesResponse.Attributes.QueueArn;
    console.log("ARN de la cola:", queueArn);

    const queuePolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "allow-sns-messages",
          Effect: "Allow",
          Principal: "*",
          Action: "sqs:SendMessage",
          Resource: queueArn,
          Condition: {
            ArnEquals: {
              "aws:SourceArn": topicArn,
            },
          },
        },
      ],
    };

    await sqsClient.send(
      new SetQueueAttributesCommand({
        QueueUrl: queueUrl,
        Attributes: {
          Policy: JSON.stringify(queuePolicy),
        },
      })
    );
    console.log("\nPolítica de cola actualizada");

    console.log("\nSuscribiendo la cola al tópico SNS...");
    const subscribeResponse = await snsClient.send(
      new SubscribeCommand({
        TopicArn: topicArn,
        Protocol: "sqs",
        Endpoint: queueArn,
      })
    );
    console.log("Suscripción creada:", subscribeResponse.SubscriptionArn);

    console.log("\nEnviando mensaje de prueba...");
    await snsClient.send(
      new PublishCommand({
        TopicArn: topicArn,
        Message: "Este es un mensaje de prueba",
      })
    );
    console.log("Mensaje de prueba enviado");

    return {
      topicArn,
      queueUrl,
      queueArn,
    };
  } catch (error) {
    console.error("Error durante la configuración:", error);
    throw error;
  }
}

// Ejecutar la configuración
try {
  const results = await setupAWSServices();
  console.log("\nConfiguración completada exitosamente");
  console.log("Resultados:", results);
} catch (error) {
  console.error("Error en la configuración:", error);
}
