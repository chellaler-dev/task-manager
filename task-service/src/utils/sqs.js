const AWS = require('aws-sdk');

// Configure AWS SDK for LocalStack
const sqsConfig = {
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
};

// Add endpoint if using LocalStack
if (process.env.AWS_ENDPOINT_URL) {
  sqsConfig.endpoint = process.env.AWS_ENDPOINT_URL;
  sqsConfig.s3ForcePathStyle = true;
}

AWS.config.update(sqsConfig);

const sqs = new AWS.SQS();

const publishTaskEvent = async (eventType, taskData, userId) => {
  try {
    const message = {
      event: eventType,
      task: taskData,
      userId: userId,
      timestamp: new Date().toISOString()
    };

    const params = {
      QueueUrl: process.env.AWS_SQS_QUEUE_URL,
      MessageBody: JSON.stringify(message),
      MessageAttributes: {
        'eventType': {
          DataType: 'String',
          StringValue: eventType
        },
        'userId': {
          DataType: 'String',
          StringValue: userId
        }
      }
    };

    const result = await sqs.sendMessage(params).promise();
    console.log(`📤 Published ${eventType} event to SQS:`, result.MessageId);
    return result;
  } catch (error) {
    console.error('Error publishing to SQS:', error);
    throw error;
  }
};

module.exports = { publishTaskEvent };