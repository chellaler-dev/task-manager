require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.API_GATEWAY_PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Service URLs
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3001';
const TASK_SERVICE_URL = process.env.TASK_SERVICE_URL || 'http://localhost:3002';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3003';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Proxy helper function
const proxyRequest = async (req, res, serviceUrl, path) => {
  try {
    const config = {
      method: req.method,
      url: `${serviceUrl}${path}`,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization && { 'Authorization': req.headers.authorization })
      },
      ...(req.body && Object.keys(req.body).length > 0 && { data: req.body }),
      ...(req.query && Object.keys(req.query).length > 0 && { params: req.query })
    };

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(`Proxy error for ${serviceUrl}${path}:`, error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(503).json({ error: 'Service unavailable', details: error.message });
    }
  }
};

// Auth routes (public)
app.post('/auth/register', (req, res) => 
  proxyRequest(req, res, USER_SERVICE_URL, '/auth/register')
);

app.post('/auth/login', (req, res) => 
  proxyRequest(req, res, USER_SERVICE_URL, '/auth/login')
);

app.post('/auth/logout', verifyToken, (req, res) => 
  proxyRequest(req, res, USER_SERVICE_URL, '/auth/logout')
);

// User routes (protected)
app.get('/users/me', verifyToken, (req, res) => 
  proxyRequest(req, res, USER_SERVICE_URL, '/users/me')
);

// Task routes (protected)
app.get('/tasks', verifyToken, (req, res) => 
  proxyRequest(req, res, TASK_SERVICE_URL, '/tasks')
);

app.post('/tasks', verifyToken, (req, res) => 
  proxyRequest(req, res, TASK_SERVICE_URL, '/tasks')
);

app.get('/tasks/:id', verifyToken, (req, res) => 
  proxyRequest(req, res, TASK_SERVICE_URL, `/tasks/${req.params.id}`)
);

app.put('/tasks/:id', verifyToken, (req, res) => 
  proxyRequest(req, res, TASK_SERVICE_URL, `/tasks/${req.params.id}`)
);

app.delete('/tasks/:id', verifyToken, (req, res) => 
  proxyRequest(req, res, TASK_SERVICE_URL, `/tasks/${req.params.id}`)
);

// Notification routes (protected)
app.get('/notifications', verifyToken, (req, res) => 
  proxyRequest(req, res, NOTIFICATION_SERVICE_URL, '/notifications')
);

app.put('/notifications/:id/read', verifyToken, (req, res) => 
  proxyRequest(req, res, NOTIFICATION_SERVICE_URL, `/notifications/${req.params.id}/read`)
);

// Error handling
app.use((err, req, res, next) => {
  console.error('Gateway error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`User Service: ${USER_SERVICE_URL}`);
  console.log(`Task Service: ${TASK_SERVICE_URL}`);
  console.log(`Notification Service: ${NOTIFICATION_SERVICE_URL}`);
});