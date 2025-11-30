# Task Manager

A distributed microservices-based task management system with real-time notifications, user authentication, and scalable architecture.

## What the Project Does

Task Manager is a modern, cloud-native task management platform built with a microservices architecture. It provides a complete solution for managing tasks with user authentication, real-time notifications, and asynchronous task processing using AWS SQS. The system is containerized with Docker and includes Kubernetes deployment configurations for production environments.

## Key Features

- **🔐 User Authentication**: Secure authentication using Supabase
- **✅ Task Management**: Create, read, update, and delete tasks with ease
- **🔔 Real-time Notifications**: Async notification system powered by AWS SQS
- **🌐 API Gateway**: Centralized entry point with rate limiting and security headers
- **📦 Microservices Architecture**: Loosely coupled, independently deployable services
- **🐳 Docker Support**: Complete Docker and Docker Compose setup for local development
- **☸️ Kubernetes Ready**: Production-ready Kubernetes manifests including HPA, ConfigMaps, and Secrets
- **🔒 Security**: Helmet middleware for HTTP headers, CORS support, and JWT token validation
- **⚡ LocalStack Integration**: Local AWS SQS emulation for development

## Architecture

The system consists of four main microservices:

```
┌─────────────┐
│ API Gateway │ (Port 3000) - Request routing & security
└──────┬──────┘
       │
   ┌───┴────┬──────────┬──────────────┐
   │        │          │              │
┌──▼──┐ ┌──▼──┐ ┌──▼──────┐ ┌──▼──────────┐
│User │ │Task │ │Supabase │ │Notification │
│Svc  │ │Svc  │ │         │ │Service      │
└─────┘ └─────┘ └─────────┘ └─────────────┘
   (3001)  (3002)           (3003)
              │
         ┌────▼─────┐
         │LocalStack │ (AWS SQS)
         │   (4566)  │
         └───────────┘
```

**Services:**

- **API Gateway**: Express.js application serving as the main entry point with routing, rate limiting, and security middleware
- **User Service**: Handles user authentication and profile management using Supabase
- **Task Service**: Manages task CRUD operations and publishes task events to SQS
- **Notification Service**: Consumes messages from SQS queue and sends notifications to users

## Getting Started

### Prerequisites

- Docker and Docker Compose (v20.10+)
- Node.js 20+ (for local development without Docker)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd task-manager
   ```

2. **Set up environment variables**

   The project includes a `.env` file with pre-configured values for local development:

   ```bash
   # Supabase credentials (for authentication)
   SUPABASE_URL=https://your-supabase-url.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key

   # AWS/LocalStack configuration
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=test
   AWS_SECRET_ACCESS_KEY=test
   AWS_ENDPOINT=http://localstack:4566
   AWS_SQS_QUEUE_URL=http://localstack:4566/000000000000/my-queue

   # Service ports
   API_GATEWAY_PORT=3000
   USER_SERVICE_PORT=3001
   TASK_SERVICE_PORT=3002
   NOTIFICATION_SERVICE_PORT=3003
   ```

### Quick Start with Docker Compose

Start all services with a single command:

```bash
docker-compose up -d
```

This will:
- Build all service images
- Start all microservices
- Initialize LocalStack with an SQS queue
- Create the microservices network

Verify all services are running:

```bash
docker-compose ps
```

### Local Development (without Docker)

1. **Install dependencies for each service**

   ```bash
   # API Gateway
   cd api-gateway && npm install && cd ..

   # User Service
   cd user-service && npm install && cd ..

   # Task Service
   cd task-service && npm install && cd ..

   # Notification Service
   cd notification-service && npm install && cd ..
   ```

2. **Update `.env` for local development**

   ```bash
   # Use localhost instead of service names
   USER_SERVICE_URL=http://localhost:3001
   TASK_SERVICE_URL=http://localhost:3002
   NOTIFICATION_SERVICE_URL=http://localhost:3003
   AWS_ENDPOINT=http://localhost:4566
   ```

3. **Start LocalStack (for SQS)**

   ```bash
   docker run -d -p 4566:4566 localstack/localstack:latest
   ```

   Create the SQS queue:

   ```bash
   docker exec <localstack-container-id> awslocal sqs create-queue --queue-name my-queue
   ```

4. **Start each service in separate terminals**

   ```bash
   # Terminal 1 - API Gateway
   cd api-gateway && npm run dev

   # Terminal 2 - User Service
   cd user-service && npm run dev

   # Terminal 3 - Task Service
   cd task-service && npm run dev

   # Terminal 4 - Notification Service
   cd notification-service && npm run dev
   ```

### Usage Examples

#### Health Check

All services expose a health endpoint:

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "service": "api-gateway"
}
```

#### User Authentication (via API Gateway)

Register a new user:

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure-password"
  }'
```

#### Task Management

Create a task:

```bash
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "Complete project documentation",
    "description": "Write comprehensive README",
    "priority": "high"
  }'
```

Get all tasks:

```bash
curl http://localhost:3000/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Deployment

### Kubernetes Deployment

The project includes Kubernetes manifests in the `k8s/` directory for production deployment:

- **api-gateway.yaml**: API Gateway deployment with service
- **task-service.yaml**: Task Service deployment
- **user-service.yaml**: User Service deployment
- **notification-service.yaml**: Notification Service deployment
- **localstack-deployment.yaml**: LocalStack for development/testing
- **configmap.yaml**: Application configuration
- **secrets.yaml**: Sensitive data (credentials)
- **hpa.yaml**: Horizontal Pod Autoscaler for auto-scaling

Deploy to Kubernetes:

```bash
kubectl apply -f k8s/
```

## Project Structure

```
task-manager/
├── api-gateway/              # Central API gateway service
│   ├── src/
│   │   ├── index.js         # Main server file
│   │   └── middleware/
│   │       └── auth.js      # JWT authentication middleware
│   ├── Dockerfile
│   └── package.json
├── user-service/            # User management service
│   ├── src/
│   │   ├── index.js         # User service server
│   │   └── routes/
│   │       └── auth.js      # Authentication routes
│   ├── Dockerfile
│   └── package.json
├── task-service/            # Task management service
│   ├── src/
│   │   ├── index.js         # Task service server
│   │   ├── routes/
│   │   │   └── tasks.js     # Task CRUD routes
│   │   └── utils/
│   │       └── sqs.js       # SQS utilities
│   ├── Dockerfile
│   └── package.json
├── notification-service/    # Notification service
│   ├── src/
│   │   ├── index.js         # Notification server
│   │   └── workers/
│   │       └── sqsConsumer.js  # SQS message consumer
│   ├── Dockerfile
│   └── package.json
├── localstack-init/         # LocalStack initialization
│   └── 01-create-queue.sh   # SQS queue creation script
├── k8s/                     # Kubernetes manifests
├── docker-compose.yml       # Docker Compose configuration
├── .env                     # Environment variables
└── README.md               # This file
```

## Technology Stack

- **Runtime**: Node.js 20
- **Framework**: Express.js
- **Authentication**: Supabase
- **Database**: Supabase (PostgreSQL)
- **Message Queue**: AWS SQS (LocalStack for local development)
- **Containerization**: Docker, Docker Compose
- **Orchestration**: Kubernetes
- **Security**: Helmet, CORS, Rate Limiting, JWT
- **HTTP Client**: Axios

## Support

### Getting Help

- **Issues**: Report bugs or request features in the GitHub Issues section
- **Documentation**: Check the inline code comments and this README for detailed explanations
- **Environment Setup**: See the `.env` file for all configuration options

### Common Issues

**Services won't start**
- Ensure Docker and Docker Compose are installed and running
- Check port conflicts: `lsof -i :3000` (replace with appropriate port)
- Verify `.env` file is present in the root directory

**SQS Connection Issues**
- Ensure LocalStack is healthy: `docker-compose ps`
- Check the queue exists: `docker-compose exec localstack awslocal sqs list-queues`
- Recreate queue: `docker-compose exec localstack awslocal sqs create-queue --queue-name my-queue`

**Authentication Failures**
- Verify Supabase credentials in `.env` are correct
- Check JWT token format in Authorization header: `Bearer <token>`
- Ensure token hasn't expired

### Development Workflow

- Follow Node.js/Express.js best practices
- Add appropriate error handling
- Update tests and documentation
- Ensure services remain loosely coupled
- Use environment variables for configuration

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Maintainers

- **chellaler-dev** - Initial development and architecture

For questions or collaboration, please open an issue or contact the maintainers.

---

**Last Updated**: December 2025

