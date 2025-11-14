require('dotenv').config();
const express = require('express');
const taskRoutes = require('./routes/tasks');

const app = express();
const PORT = process.env.TASK_SERVICE_PORT || 3002;

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'task-service' });
});

// Task routes
app.use('/tasks', taskRoutes);

// Error handling
app.use((err, req, res, next) => {
  console.error('Task service error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`✅ Task Service running on port ${PORT}`);
  console.log(`SQS Queue: ${process.env.AWS_SQS_QUEUE_URL}`);
});