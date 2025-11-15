const AWS = require('aws-sdk');
const { createClient } = require('@supabase/supabase-js');

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

// Use service role key for server-side operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const generateNotificationMessage = (event, task) => {
  const messages = {
    'task.created': `New task created: "${task.title}"`,
    'task.updated': `Task updated: "${task.title}" is now ${task.status}`,
    'task.deleted': `Task deleted: "${task.title}"`
  };
  
  return messages[event] || `Task event: ${event}`;
};

const saveNotification = async (eventData) => {
  try {
    const { event, task, userId } = eventData;
    
    const notification = {
      user_id: userId,
      event_type: event,
      message: generateNotificationMessage(event, task),
      task_id: task.id
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();

    if (error) throw error;

    console.log(`✉️  Notification saved:`, {
      id: data.id,
      event: event,
      user: userId,
      task: task.title
    });

    return data;
  } catch (error) {
    console.error('Error saving notification:', error);
    throw error;
  }
};

const pollQueue = async () => {
  const params = {
    QueueUrl: process.env.AWS_SQS_QUEUE_URL,
    MaxNumberOfMessages: 10,
    WaitTimeSeconds: 20, // Long polling
    VisibilityTimeout: 30
  };

  try {
    const data = await sqs.receiveMessage(params).promise();

    if (data.Messages && data.Messages.length > 0) {
      console.log(`📥 Received ${data.Messages.length} message(s) from SQS`);

      for (const message of data.Messages) {
        try {
          const eventData = JSON.parse(message.Body);
          console.log('Processing event:', eventData.event);

          // Save notification to database
          await saveNotification(eventData);

          // Delete message from queue after successful processing
          await sqs.deleteMessage({
            QueueUrl: process.env.AWS_SQS_QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle
          }).promise();

          console.log(`✅ Message processed and deleted from queue`);
        } catch (error) {
          console.error('Error processing message:', error);
          // Message will become visible again after VisibilityTimeout
        }
      }
    }
  } catch (error) {
    console.error('Error polling SQS:', error);
  }
};

const startConsumer = () => {
  console.log('🎧 Starting SQS consumer...');
  console.log(`Queue URL: ${process.env.AWS_SQS_QUEUE_URL}`);
  
  // Poll continuously
  const poll = async () => {
    await pollQueue();
    // Immediately poll again (long polling handles the wait)
    setImmediate(poll);
  };
  
  poll();
};

module.exports = { startConsumer, saveNotification };
